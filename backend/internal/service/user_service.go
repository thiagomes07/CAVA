package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"github.com/thiagomes07/CAVA/backend/pkg/password"
	"go.uber.org/zap"
)

type userService struct {
	userRepo repository.UserRepository
	hasher   *password.Hasher
	logger   *zap.Logger
}

func NewUserService(
	userRepo repository.UserRepository,
	hasher *password.Hasher,
	logger *zap.Logger,
) *userService {
	return &userService{
		userRepo: userRepo,
		hasher:   hasher,
		logger:   logger,
	}
}

func (s *userService) Create(ctx context.Context, input entity.CreateUserInput) (*entity.User, error) {
	// Validar força da senha
	if err := password.ValidatePasswordStrength(input.Password); err != nil {
		return nil, domainErrors.ValidationError(err.Error())
	}

	// Verificar se email já existe
	exists, err := s.userRepo.ExistsByEmail(ctx, input.Email)
	if err != nil {
		s.logger.Error("erro ao verificar email existente", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}
	if exists {
		return nil, domainErrors.EmailExistsError(input.Email)
	}

	// Validar role
	if !input.Role.IsValid() {
		return nil, domainErrors.ValidationError("Role inválido")
	}

	// Hash da senha
	hashedPassword, err := s.hasher.Hash(input.Password)
	if err != nil {
		s.logger.Error("erro ao fazer hash da senha", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	// Criar usuário
	user := &entity.User{
		ID:         uuid.New().String(),
		IndustryID: input.IndustryID,
		Name:       input.Name,
		Email:      input.Email,
		Password:   hashedPassword,
		Phone:      input.Phone,
		Role:       input.Role,
		IsActive:   true,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		s.logger.Error("erro ao criar usuário", zap.Error(err))
		return nil, err
	}

	// Limpar senha antes de retornar
	user.Password = ""

	s.logger.Info("usuário criado com sucesso",
		zap.String("userId", user.ID),
		zap.String("email", user.Email),
		zap.String("role", string(user.Role)),
	)

	return user, nil
}

func (s *userService) GetByID(ctx context.Context, id string) (*entity.User, error) {
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Limpar senha
	user.Password = ""
	return user, nil
}

func (s *userService) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	// Limpar senha
	user.Password = ""
	return user, nil
}

func (s *userService) List(ctx context.Context, role *entity.UserRole) ([]entity.User, error) {
	users, err := s.userRepo.List(ctx, role)
	if err != nil {
		s.logger.Error("erro ao listar usuários", zap.Error(err))
		return nil, err
	}

	// Limpar senhas
	for i := range users {
		users[i].Password = ""
	}

	return users, nil
}

func (s *userService) Update(ctx context.Context, id string, input entity.UpdateUserInput) (*entity.User, error) {
	// Buscar usuário
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Atualizar campos
	if input.Name != nil {
		user.Name = *input.Name
	}
	if input.Phone != nil {
		user.Phone = input.Phone
	}

	user.UpdatedAt = time.Now()

	// Salvar alterações
	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Error("erro ao atualizar usuário",
			zap.String("userId", id),
			zap.Error(err),
		)
		return nil, err
	}

	// Limpar senha antes de retornar
	user.Password = ""

	s.logger.Info("usuário atualizado com sucesso", zap.String("userId", id))
	return user, nil
}

func (s *userService) UpdateStatus(ctx context.Context, id string, isActive bool) (*entity.User, error) {
	// Atualizar status
	if err := s.userRepo.UpdateStatus(ctx, id, isActive); err != nil {
		s.logger.Error("erro ao atualizar status do usuário",
			zap.String("userId", id),
			zap.Bool("isActive", isActive),
			zap.Error(err),
		)
		return nil, err
	}

	// Buscar usuário atualizado
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Limpar senha
	user.Password = ""

	status := "inativo"
	if isActive {
		status = "ativo"
	}

	s.logger.Info("status do usuário atualizado",
		zap.String("userId", id),
		zap.String("status", status),
	)

	return user, nil
}

func (s *userService) InviteBroker(ctx context.Context, industryID string, input entity.InviteBrokerInput) (*entity.User, error) {
	// Verificar se email já existe
	exists, err := s.userRepo.ExistsByEmail(ctx, input.Email)
	if err != nil {
		s.logger.Error("erro ao verificar email existente", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}
	if exists {
		return nil, domainErrors.EmailExistsError(input.Email)
	}

	// Gerar senha temporária
	temporaryPassword := s.generateTemporaryPassword()

	// Hash da senha temporária
	hashedPassword, err := s.hasher.Hash(temporaryPassword)
	if err != nil {
		s.logger.Error("erro ao fazer hash da senha temporária", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	// Criar usuário broker
	user := &entity.User{
		ID:         uuid.New().String(),
		IndustryID: nil, // Broker freelancer
		Name:       input.Name,
		Email:      input.Email,
		Password:   hashedPassword,
		Phone:      input.Phone,
		Role:       entity.RoleBroker,
		IsActive:   true,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		s.logger.Error("erro ao criar broker", zap.Error(err))
		return nil, err
	}

	// Limpar senha antes de retornar
	user.Password = ""

	s.logger.Info("broker convidado com sucesso",
		zap.String("brokerId", user.ID),
		zap.String("email", user.Email),
		zap.String("invitedBy", industryID),
	)

	// Nota: Aqui seria enviado email com a senha temporária
	// Por enquanto, apenas log
	s.logger.Warn("senha temporária gerada (deve ser enviada por email)",
		zap.String("brokerId", user.ID),
		zap.String("temporaryPassword", temporaryPassword),
	)

	return user, nil
}

func (s *userService) GetBrokers(ctx context.Context, industryID string) ([]entity.BrokerWithStats, error) {
	brokers, err := s.userRepo.FindBrokers(ctx, industryID)
	if err != nil {
		s.logger.Error("erro ao buscar brokers",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		return nil, err
	}

	return brokers, nil
}

func (s *userService) generateTemporaryPassword() string {
	// Gerar senha temporária com 12 caracteres
	// Garantir que tenha pelo menos 1 maiúscula e 1 número
	const (
		uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		lowercase = "abcdefghijklmnopqrstuvwxyz"
		numbers   = "0123456789"
		special   = "!@#$%"
		length    = 12
	)

	password := make([]byte, length)

	// Garantir pelo menos 1 de cada tipo
	password[0] = uppercase[0] // Pelo menos 1 maiúscula
	password[1] = numbers[0]   // Pelo menos 1 número

	// Preencher o resto com mix de caracteres
	charset := uppercase + lowercase + numbers + special
	for i := 2; i < length; i++ {
		password[i] = charset[i%len(charset)]
	}

	return string(password)
}