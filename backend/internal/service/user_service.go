package service

import (
	"context"
	"crypto/rand"
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

func (s *userService) CreateSeller(ctx context.Context, industryID string, input entity.CreateSellerInput) (*entity.User, error) {
	// Determinar role baseado no campo isAdmin
	role := entity.RoleVendedorInterno
	if input.IsAdmin {
		role = entity.RoleAdminIndustria
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

	// Gerar senha temporária
	temporaryPassword := s.generateTemporaryPassword()

	// Hash da senha temporária
	hashedPassword, err := s.hasher.Hash(temporaryPassword)
	if err != nil {
		s.logger.Error("erro ao fazer hash da senha temporária", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	// Criar usuário vendedor ou admin
	user := &entity.User{
		ID:         uuid.New().String(),
		IndustryID: &industryID,
		Name:       input.Name,
		Email:      input.Email,
		Password:   hashedPassword,
		Phone:      input.Phone,
		Role:       role,
		IsActive:   true,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		s.logger.Error("erro ao criar vendedor interno", zap.Error(err))
		return nil, err
	}

	// Limpar senha antes de retornar
	user.Password = ""

	roleDesc := "vendedor interno"
	if input.IsAdmin {
		roleDesc = "admin"
	}

	s.logger.Info(roleDesc+" criado com sucesso",
		zap.String("userId", user.ID),
		zap.String("email", user.Email),
		zap.String("industryId", industryID),
		zap.Bool("isAdmin", input.IsAdmin),
	)

	// Nota: Aqui seria enviado email com a senha temporária
	s.logger.Warn("senha temporária gerada para "+roleDesc+" (deve ser enviada por email)",
		zap.String("userId", user.ID),
		zap.String("temporaryPassword", temporaryPassword),
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

func (s *userService) ListByIndustry(ctx context.Context, industryID string, role *entity.UserRole) ([]entity.User, error) {
	users, err := s.userRepo.ListByIndustry(ctx, industryID, role)
	if err != nil {
		s.logger.Error("erro ao listar usuários por indústria",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
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
	// Buscar usuário para verificar role antes de alterar status
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Impedir inativação de contas admin
	if !isActive && user.Role == entity.RoleAdminIndustria {
		s.logger.Warn("tentativa de inativar conta admin bloqueada",
			zap.String("userId", id),
			zap.String("email", user.Email),
		)
		return nil, domainErrors.NewForbiddenError("Não é possível inativar contas de administrador")
	}

	// Atualizar status
	if err := s.userRepo.UpdateStatus(ctx, id, isActive); err != nil {
		s.logger.Error("erro ao atualizar status do usuário",
			zap.String("userId", id),
			zap.Bool("isActive", isActive),
			zap.Error(err),
		)
		return nil, err
	}

	// Atualizar objeto user com novo status
	user.IsActive = isActive
	user.Password = "" // Limpar senha

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

func (s *userService) ResendInvite(ctx context.Context, userID string, newEmail *string) (*entity.User, error) {
	// Buscar usuário
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Verificar se usuário já logou
	if user.FirstLoginAt != nil {
		s.logger.Warn("tentativa de reenviar convite para usuário que já logou",
			zap.String("userId", userID),
		)
		return nil, domainErrors.NewBadRequestError("Não é possível reenviar convite para usuário que já acessou o sistema")
	}

	// Se novo email foi fornecido, verificar se é diferente e se já existe
	if newEmail != nil && *newEmail != "" {
		// Verificar se é igual ao email atual
		if *newEmail == user.Email {
			return nil, domainErrors.NewBadRequestError("O novo email deve ser diferente do email atual")
		}

		exists, err := s.userRepo.ExistsByEmail(ctx, *newEmail)
		if err != nil {
			s.logger.Error("erro ao verificar email existente", zap.Error(err))
			return nil, domainErrors.InternalError(err)
		}
		if exists {
			return nil, domainErrors.EmailExistsError(*newEmail)
		}

		// Atualizar email
		if err := s.userRepo.UpdateEmail(ctx, userID, *newEmail); err != nil {
			s.logger.Error("erro ao atualizar email", zap.Error(err))
			return nil, err
		}
		user.Email = *newEmail
	}

	// Gerar nova senha temporária
	temporaryPassword := s.generateTemporaryPassword()

	// Hash da senha temporária
	hashedPassword, err := s.hasher.Hash(temporaryPassword)
	if err != nil {
		s.logger.Error("erro ao fazer hash da senha temporária", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	// Atualizar senha
	if err := s.userRepo.UpdatePassword(ctx, userID, hashedPassword); err != nil {
		s.logger.Error("erro ao atualizar senha", zap.Error(err))
		return nil, err
	}

	// Limpar senha antes de retornar
	user.Password = ""

	s.logger.Info("convite reenviado com sucesso",
		zap.String("userId", userID),
		zap.String("email", user.Email),
	)

	// Nota: Aqui seria enviado email com a senha temporária
	s.logger.Warn("senha temporária gerada para reenvio (deve ser enviada por email)",
		zap.String("userId", userID),
		zap.String("temporaryPassword", temporaryPassword),
	)

	return user, nil
}

func (s *userService) UpdateEmail(ctx context.Context, userID string, email string) (*entity.User, error) {
	// Buscar usuário
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Verificar se usuário já logou
	if user.FirstLoginAt != nil {
		s.logger.Warn("tentativa de atualizar email de usuário que já logou",
			zap.String("userId", userID),
		)
		return nil, domainErrors.NewBadRequestError("Não é possível alterar email de usuário que já acessou o sistema")
	}

	// Verificar se email é diferente
	if email == user.Email {
		return user, nil
	}

	// Verificar se novo email já existe
	exists, err := s.userRepo.ExistsByEmail(ctx, email)
	if err != nil {
		s.logger.Error("erro ao verificar email existente", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}
	if exists {
		return nil, domainErrors.EmailExistsError(email)
	}

	// Atualizar email
	if err := s.userRepo.UpdateEmail(ctx, userID, email); err != nil {
		s.logger.Error("erro ao atualizar email", zap.Error(err))
		return nil, err
	}

	user.Email = email
	user.Password = ""

	s.logger.Info("email atualizado com sucesso",
		zap.String("userId", userID),
		zap.String("newEmail", email),
	)

	return user, nil
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

	// Gerar bytes aleatórios
	randomBytes := make([]byte, length)
	_, _ = rand.Read(randomBytes)

	// Garantir pelo menos 1 maiúscula no índice 0
	password[0] = uppercase[int(randomBytes[0])%len(uppercase)]
	// Garantir pelo menos 1 número no índice 1
	password[1] = numbers[int(randomBytes[1])%len(numbers)]
	// Garantir pelo menos 1 minúscula no índice 2
	password[2] = lowercase[int(randomBytes[2])%len(lowercase)]

	// Preencher o resto com mix aleatório de caracteres
	charset := uppercase + lowercase + numbers + special
	for i := 3; i < length; i++ {
		password[i] = charset[int(randomBytes[i])%len(charset)]
	}

	// Embaralhar senha para não ter padrão previsível
	for i := length - 1; i > 0; i-- {
		j := int(randomBytes[i]) % (i + 1)
		password[i], password[j] = password[j], password[i]
	}

	return string(password)
}
