package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"github.com/thiagomes07/CAVA/backend/pkg/jwt"
	"github.com/thiagomes07/CAVA/backend/pkg/password"
	"go.uber.org/zap"
)

type authService struct {
	userRepo     repository.UserRepository
	tokenManager *jwt.TokenManager
	hasher       *password.Hasher
	logger       *zap.Logger
}

func NewAuthService(
	userRepo repository.UserRepository,
	tokenManager *jwt.TokenManager,
	hasher *password.Hasher,
	logger *zap.Logger,
) *authService {
	return &authService{
		userRepo:     userRepo,
		tokenManager: tokenManager,
		hasher:       hasher,
		logger:       logger,
	}
}

func (s *authService) Register(ctx context.Context, input entity.CreateUserInput) (*entity.User, error) {
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

	s.logger.Info("usuário registrado com sucesso",
		zap.String("userId", user.ID),
		zap.String("email", user.Email),
	)

	return user, nil
}

func (s *authService) Login(ctx context.Context, input entity.LoginInput) (*entity.LoginResponse, string, string, error) {
	// Buscar usuário por email
	user, err := s.userRepo.FindByEmail(ctx, input.Email)
	if err != nil {
		s.logger.Warn("tentativa de login com email não encontrado", zap.String("email", input.Email))
		return nil, "", "", domainErrors.InvalidCredentialsError()
	}

	// Verificar se usuário está ativo
	if !user.IsActive {
		s.logger.Warn("tentativa de login de usuário inativo",
			zap.String("userId", user.ID),
			zap.String("email", user.Email),
		)
		return nil, "", "", domainErrors.NewUnauthorizedError("Usuário inativo")
	}

	// Verificar senha
	if err := s.hasher.Verify(input.Password, user.Password); err != nil {
		s.logger.Warn("tentativa de login com senha incorreta",
			zap.String("userId", user.ID),
			zap.String("email", user.Email),
		)
		return nil, "", "", domainErrors.InvalidCredentialsError()
	}

	// Gerar tokens
	accessToken, err := s.tokenManager.GenerateAccessToken(user.ID, string(user.Role), user.IndustryID)
	if err != nil {
		s.logger.Error("erro ao gerar access token", zap.Error(err))
		return nil, "", "", domainErrors.InternalError(err)
	}

	refreshToken, err := s.tokenManager.GenerateRefreshToken(user.ID)
	if err != nil {
		s.logger.Error("erro ao gerar refresh token", zap.Error(err))
		return nil, "", "", domainErrors.InternalError(err)
	}

	// Limpar senha antes de retornar
	user.Password = ""

	s.logger.Info("login realizado com sucesso",
		zap.String("userId", user.ID),
		zap.String("email", user.Email),
		zap.String("role", string(user.Role)),
	)

	response := &entity.LoginResponse{
		User: *user,
		Role: user.Role,
	}

	return response, accessToken, refreshToken, nil
}

func (s *authService) Logout(ctx context.Context, refreshToken string) error {
	// Validar refresh token
	_, err := s.tokenManager.ValidateRefreshToken(refreshToken)
	if err != nil {
		// Token inválido, mas logout é idempotente
		s.logger.Debug("tentativa de logout com token inválido", zap.Error(err))
		return nil
	}

	// Nota: Invalidação de token seria feita aqui se tivéssemos blacklist/whitelist
	// Por enquanto, a invalidação é feita no client-side (remoção dos cookies)

	s.logger.Info("logout realizado com sucesso")
	return nil
}

func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (*entity.User, string, string, error) {
	// Validar refresh token
	claims, err := s.tokenManager.ValidateRefreshToken(refreshToken)
	if err != nil {
		s.logger.Warn("tentativa de refresh com token inválido", zap.Error(err))
		return nil, "", "", domainErrors.NewUnauthorizedError("Refresh token inválido ou expirado")
	}

	// Buscar usuário
	user, err := s.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		s.logger.Error("erro ao buscar usuário no refresh", zap.Error(err))
		return nil, "", "", err
	}

	// Verificar se usuário está ativo
	if !user.IsActive {
		s.logger.Warn("tentativa de refresh de usuário inativo", zap.String("userId", user.ID))
		return nil, "", "", domainErrors.NewUnauthorizedError("Usuário inativo")
	}

	// Gerar novos tokens (rotação de refresh token)
	newAccessToken, err := s.tokenManager.GenerateAccessToken(user.ID, string(user.Role), user.IndustryID)
	if err != nil {
		s.logger.Error("erro ao gerar novo access token", zap.Error(err))
		return nil, "", "", domainErrors.InternalError(err)
	}

	newRefreshToken, err := s.tokenManager.GenerateRefreshToken(user.ID)
	if err != nil {
		s.logger.Error("erro ao gerar novo refresh token", zap.Error(err))
		return nil, "", "", domainErrors.InternalError(err)
	}

	// Limpar senha antes de retornar
	user.Password = ""

	s.logger.Info("tokens renovados com sucesso",
		zap.String("userId", user.ID),
	)

	return user, newAccessToken, newRefreshToken, nil
}

func (s *authService) ChangePassword(ctx context.Context, userID string, input entity.ChangePasswordInput) error {
	// Buscar usuário
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	// Verificar senha atual
	if err := s.hasher.Verify(input.CurrentPassword, user.Password); err != nil {
		s.logger.Warn("tentativa de troca de senha com senha atual incorreta",
			zap.String("userId", userID),
		)
		return domainErrors.NewUnauthorizedError("Senha atual incorreta")
	}

	// Validar força da nova senha
	if err := password.ValidatePasswordStrength(input.NewPassword); err != nil {
		return domainErrors.ValidationError(err.Error())
	}

	// Hash da nova senha
	hashedPassword, err := s.hasher.Hash(input.NewPassword)
	if err != nil {
		s.logger.Error("erro ao fazer hash da nova senha", zap.Error(err))
		return domainErrors.InternalError(err)
	}

	// Atualizar senha
	user.Password = hashedPassword
	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Error("erro ao atualizar senha", zap.Error(err))
		return err
	}

	s.logger.Info("senha alterada com sucesso", zap.String("userId", userID))
	return nil
}

func (s *authService) ValidateToken(ctx context.Context, token string) (string, entity.UserRole, *string, error) {
	claims, err := s.tokenManager.ValidateAccessToken(token)
	if err != nil {
		return "", "", nil, domainErrors.NewUnauthorizedError("Token inválido")
	}

	return claims.UserID, entity.UserRole(claims.Role), claims.IndustryID, nil
}

func (s *authService) GenerateTemporaryPassword() string {
	// Gerar senha temporária com 12 caracteres
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%"
	const length = 12

	b := make([]byte, length)
	for i := range b {
		b[i] = charset[i%len(charset)]
	}

	return string(b)
}

func (s *authService) HashPassword(password string) (string, error) {
	hash, err := s.hasher.Hash(password)
	if err != nil {
		s.logger.Error("erro ao fazer hash de senha", zap.Error(err))
		return "", domainErrors.InternalError(err)
	}
	return hash, nil
}

func (s *authService) VerifyPassword(password, hash string) error {
	if err := s.hasher.Verify(password, hash); err != nil {
		return domainErrors.NewUnauthorizedError("Senha incorreta")
	}
	return nil
}