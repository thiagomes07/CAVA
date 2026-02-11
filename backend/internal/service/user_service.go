package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	domainService "github.com/thiagomes07/CAVA/backend/internal/domain/service"
	infraEmail "github.com/thiagomes07/CAVA/backend/internal/infra/email"
	"github.com/thiagomes07/CAVA/backend/pkg/password"
	"go.uber.org/zap"
)

type userService struct {
	userRepo    repository.UserRepository
	hasher      *password.Hasher
	emailSender domainService.EmailSender
	frontendURL string
	logger      *zap.Logger
}

func NewUserService(
	userRepo repository.UserRepository,
	hasher *password.Hasher,
	emailSender domainService.EmailSender,
	frontendURL string,
	logger *zap.Logger,
) *userService {
	return &userService{
		userRepo:    userRepo,
		hasher:      hasher,
		emailSender: emailSender,
		frontendURL: frontendURL,
		logger:      logger,
	}
}

func (s *userService) Create(ctx context.Context, input entity.CreateUserInput) (*entity.User, error) {
	if input.PreferredCurrency == "" {
		input.PreferredCurrency = entity.CurrencyBRL
	}

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
		PreferredCurrency: input.PreferredCurrency,
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
	if input.PreferredCurrency == "" {
		input.PreferredCurrency = entity.CurrencyBRL
	}

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

	// Verificar se nome já existe na indústria
	nameExists, err := s.userRepo.ExistsByNameInIndustry(ctx, input.Name, industryID)
	if err != nil {
		s.logger.Error("erro ao verificar nome existente", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}
	if nameExists {
		return nil, domainErrors.ValidationError("Já existe um usuário com este nome nesta indústria")
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
		PreferredCurrency: input.PreferredCurrency,
		Password:   hashedPassword,
		Phone:      input.Phone,
		Whatsapp:   input.Whatsapp,
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

	// Enviar email com senha temporária
	if err := s.sendInviteEmail(ctx, user.Email, user.Name, temporaryPassword, roleDesc); err != nil {
		// Log do erro, mas não falha a operação - usuário foi criado
		s.logger.Error("erro ao enviar email de convite",
			zap.String("userId", user.ID),
			zap.String("email", user.Email),
			zap.Error(err),
		)
	}

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
	if input.Name != nil && *input.Name != user.Name {
		// Verificar se novo nome já existe
		var nameExists bool
		if user.IndustryID != nil {
			nameExists, err = s.userRepo.ExistsByNameInIndustry(ctx, *input.Name, *user.IndustryID)
		} else {
			nameExists, err = s.userRepo.ExistsByNameGlobally(ctx, *input.Name)
		}

		if err != nil {
			s.logger.Error("erro ao verificar duplicidade de nome", zap.Error(err))
			return nil, domainErrors.InternalError(err)
		}
		if nameExists {
			return nil, domainErrors.ValidationError("Já existe um usuário com este nome")
		}

		user.Name = *input.Name
	}

	if input.Phone != nil {
		user.Phone = input.Phone
	}

	if input.Whatsapp != nil {
		user.Whatsapp = input.Whatsapp
	}

	if input.PreferredCurrency != nil {
		if !input.PreferredCurrency.IsValid() {
			return nil, domainErrors.ValidationError("Moeda preferida inválida")
		}
		user.PreferredCurrency = *input.PreferredCurrency
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
	if input.PreferredCurrency == "" {
		input.PreferredCurrency = entity.CurrencyBRL
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

	// Verificar se nome já existe globalmente (brokers não têm industry_id)
	nameExists, err := s.userRepo.ExistsByNameGlobally(ctx, input.Name)
	if err != nil {
		s.logger.Error("erro ao verificar nome existente", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}
	if nameExists {
		return nil, domainErrors.ValidationError("Já existe um usuário com este nome")
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
		PreferredCurrency: input.PreferredCurrency,
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

	// Enviar email com senha temporária
	if err := s.sendInviteEmail(ctx, user.Email, user.Name, temporaryPassword, "broker"); err != nil {
		// Log do erro, mas não falha a operação - usuário foi criado
		s.logger.Error("erro ao enviar email de convite para broker",
			zap.String("brokerId", user.ID),
			zap.String("email", user.Email),
			zap.Error(err),
		)
	}

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

	// Enviar email com nova senha temporária
	if err := s.sendInviteEmail(ctx, user.Email, user.Name, temporaryPassword, "usuário"); err != nil {
		// Log do erro, mas não falha a operação
		s.logger.Error("erro ao reenviar email de convite",
			zap.String("userId", userID),
			zap.String("email", user.Email),
			zap.Error(err),
		)
	}

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

// sendInviteEmail envia email de convite com senha temporária
func (s *userService) sendInviteEmail(ctx context.Context, email, name, temporaryPassword, roleDesc string) error {
	// Se não houver email sender configurado, apenas log
	if s.emailSender == nil {
		s.logger.Warn("email sender não configurado - convite não enviado",
			zap.String("email", email),
			zap.String("temporaryPassword", temporaryPassword),
		)
		return nil
	}

	loginURL := s.frontendURL + "/login"

	// Mapear roleDesc para descrição amigável
	roleDescription := s.getRoleDescription(roleDesc)

	// Usar template padronizado
	htmlBody, textBody, err := infraEmail.RenderInviteEmail(infraEmail.InviteEmailData{
		UserName:          name,
		RoleDescription:   roleDescription,
		Email:             email,
		TemporaryPassword: temporaryPassword,
		LoginURL:          loginURL,
	})
	if err != nil {
		s.logger.Error("erro ao renderizar template de convite", zap.Error(err))
		return fmt.Errorf("falha ao renderizar email de convite: %w", err)
	}

	// Enviar email
	msg := domainService.EmailMessage{
		To:       email,
		Subject:  "Convite para acessar CAVA - Stone Platform",
		HTMLBody: htmlBody,
		TextBody: textBody,
	}

	if err := s.emailSender.Send(ctx, msg); err != nil {
		return fmt.Errorf("falha ao enviar email de convite: %w", err)
	}

	s.logger.Info("email de convite enviado com sucesso",
		zap.String("email", email),
		zap.String("roleDesc", roleDesc),
	)

	return nil
}

// getRoleDescription converte role técnico para descrição amigável
func (s *userService) getRoleDescription(roleDesc string) string {
	switch roleDesc {
	case "broker":
		return "Vendedor Parceiro"
	case "admin":
		return "Administrador"
	case "vendedor interno":
		return "Vendedor Interno"
	default:
		return "Usuário"
	}
}

func (s *userService) ListByIndustryWithFilters(ctx context.Context, industryID string, filters entity.UserFilters) ([]entity.User, int, error) {
	users, total, err := s.userRepo.ListByIndustryWithFilters(ctx, industryID, filters)
	if err != nil {
		s.logger.Error("erro ao listar usuários com filtros",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		return nil, 0, err
	}

	// Limpar senhas antes de retornar
	for i := range users {
		users[i].Password = ""
	}

	return users, total, nil
}

func (s *userService) GetBrokersWithFilters(ctx context.Context, industryID string, filters entity.UserFilters) ([]entity.BrokerWithStats, int, error) {
	brokers, total, err := s.userRepo.FindBrokersWithFilters(ctx, industryID, filters)
	if err != nil {
		s.logger.Error("erro ao buscar brokers com filtros",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		return nil, 0, err
	}

	// Limpar senhas antes de retornar
	for i := range brokers {
		brokers[i].Password = ""
	}

	return brokers, total, nil
}

func (s *userService) UpdateBroker(ctx context.Context, id string, input entity.UpdateBrokerInput) (*entity.User, error) {
	// Buscar usuário
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Verificar se é realmente um broker
	if user.Role != entity.RoleBroker {
		s.logger.Warn("tentativa de atualizar não-broker através do endpoint de broker",
			zap.String("userId", id),
			zap.String("role", string(user.Role)),
		)
		return nil, domainErrors.NewBadRequestError("Usuário não é um broker")
	}

	// Verificar se nome mudou e se já existe
	if input.Name != user.Name {
		nameExists, err := s.userRepo.ExistsByNameGlobally(ctx, input.Name)
		if err != nil {
			s.logger.Error("erro ao verificar nome existente", zap.Error(err))
			return nil, domainErrors.InternalError(err)
		}
		if nameExists {
			return nil, domainErrors.ValidationError("Já existe um usuário com este nome")
		}
		user.Name = input.Name
	}

	// Atualizar telefones
	user.Phone = input.Phone
	user.Whatsapp = input.Whatsapp
	user.UpdatedAt = time.Now()

	// Salvar alterações
	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Error("erro ao atualizar broker",
			zap.String("brokerId", id),
			zap.Error(err),
		)
		return nil, err
	}

	// Limpar senha antes de retornar
	user.Password = ""

	s.logger.Info("broker atualizado com sucesso", zap.String("brokerId", id))
	return user, nil
}

func (s *userService) DeleteBroker(ctx context.Context, id string) error {
	// Buscar usuário
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	// Verificar se é realmente um broker
	if user.Role != entity.RoleBroker {
		s.logger.Warn("tentativa de deletar não-broker através do endpoint de broker",
			zap.String("userId", id),
			zap.String("role", string(user.Role)),
		)
		return domainErrors.NewBadRequestError("Usuário não é um broker")
	}

	// Verificar se há lotes compartilhados ativos
	// Buscar broker específico para verificar shared batches count
	brokers, _, err := s.userRepo.FindBrokersWithFilters(ctx, "", entity.UserFilters{
		Page:  1,
		Limit: 100, // Suficiente para encontrar o broker
	})
	if err != nil {
		s.logger.Error("erro ao verificar lotes compartilhados",
			zap.String("brokerId", id),
			zap.Error(err),
		)
		return domainErrors.InternalError(err)
	}

	// Encontrar este broker específico na lista
	for _, b := range brokers {
		if b.ID == id && b.SharedBatchesCount > 0 {
			return domainErrors.NewBadRequestError(
				fmt.Sprintf("Não é possível excluir broker com %d lote(s) compartilhado(s) ativo(s)", b.SharedBatchesCount),
			)
		}
	}

	// Deletar broker
	if err := s.userRepo.Delete(ctx, id); err != nil {
		s.logger.Error("erro ao deletar broker",
			zap.String("brokerId", id),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("broker deletado com sucesso", zap.String("brokerId", id))
	return nil
}

func (s *userService) UpdateSeller(ctx context.Context, id string, industryID string, input entity.UpdateSellerInput) (*entity.User, error) {
	// Buscar usuário
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Verificar se pertence à indústria
	if user.IndustryID == nil || *user.IndustryID != industryID {
		s.logger.Warn("tentativa de atualizar usuário de outra indústria",
			zap.String("userId", id),
			zap.String("requestedIndustryId", industryID),
		)
		return nil, domainErrors.NewForbiddenError("Usuário não pertence a esta indústria")
	}

	// Verificar se é vendedor interno ou admin
	if user.Role != entity.RoleVendedorInterno && user.Role != entity.RoleAdminIndustria {
		s.logger.Warn("tentativa de atualizar usuário com role incorreto",
			zap.String("userId", id),
			zap.String("role", string(user.Role)),
		)
		return nil, domainErrors.NewBadRequestError("Usuário não é um vendedor interno ou admin")
	}

	// Verificar se nome mudou e se já existe
	if input.Name != user.Name {
		nameExists, err := s.userRepo.ExistsByNameInIndustry(ctx, input.Name, industryID)
		if err != nil {
			s.logger.Error("erro ao verificar nome existente", zap.Error(err))
			return nil, domainErrors.InternalError(err)
		}
		if nameExists {
			return nil, domainErrors.ValidationError("Já existe um usuário com este nome")
		}
		user.Name = input.Name
	}

	// Atualizar telefones
	user.Phone = input.Phone
	user.Whatsapp = input.Whatsapp
	user.UpdatedAt = time.Now()

	// Salvar alterações
	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Error("erro ao atualizar vendedor",
			zap.String("userId", id),
			zap.Error(err),
		)
		return nil, err
	}

	// Limpar senha antes de retornar
	user.Password = ""

	s.logger.Info("vendedor atualizado com sucesso", zap.String("userId", id))
	return user, nil
}

func (s *userService) DeleteUser(ctx context.Context, id string, industryID string) error {
	// Buscar usuário
	user, err := s.userRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	// Verificar se pertence à indústria
	if user.IndustryID == nil || *user.IndustryID != industryID {
		s.logger.Warn("tentativa de deletar usuário de outra indústria",
			zap.String("userId", id),
			zap.String("requestedIndustryId", industryID),
		)
		return domainErrors.NewForbiddenError("Usuário não pertence a esta indústria")
	}

	// Não permitir excluir admins
	if user.Role == entity.RoleAdminIndustria {
		s.logger.Warn("tentativa de deletar administrador bloqueada",
			zap.String("userId", id),
		)
		return domainErrors.NewForbiddenError("Não é possível excluir administradores")
	}

	// Deletar usuário
	if err := s.userRepo.Delete(ctx, id); err != nil {
		s.logger.Error("erro ao deletar usuário",
			zap.String("userId", id),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("usuário deletado com sucesso", zap.String("userId", id))
	return nil
}
