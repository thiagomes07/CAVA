package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	domainService "github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/internal/infra/email"
	"github.com/thiagomes07/CAVA/backend/pkg/jwt"
	"github.com/thiagomes07/CAVA/backend/pkg/password"
	"go.uber.org/zap"
)

type authService struct {
	userRepo     repository.UserRepository
	sessionRepo  repository.SessionRepository
	tokenManager *jwt.TokenManager
	hasher       *password.Hasher
	logger       *zap.Logger
	emailSender  domainService.EmailSender
	frontendURL  string
}

const (
	maxActiveSessions       = 5
	passwordResetCodeTTL    = 15 * time.Minute // código válido por 15 minutos
	passwordResetCodeLength = 6
)

// NewAuthService cria uma nova instância do AuthService
func NewAuthService(
	userRepo repository.UserRepository,
	sessionRepo repository.SessionRepository,
	tokenManager *jwt.TokenManager,
	hasher *password.Hasher,
	logger *zap.Logger,
	emailSender domainService.EmailSender,
	frontendURL string,
) *authService {
	return &authService{
		userRepo:     userRepo,
		sessionRepo:  sessionRepo,
		tokenManager: tokenManager,
		hasher:       hasher,
		logger:       logger,
		emailSender:  emailSender,
		frontendURL:  frontendURL,
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

	refreshToken, err := s.tokenManager.GenerateRefreshToken(user.ID, string(user.Role), user.IndustryID)
	if err != nil {
		s.logger.Error("erro ao gerar refresh token", zap.Error(err))
		return nil, "", "", domainErrors.InternalError(err)
	}

	// Armazenar sessão no banco (refresh token rotation)
	if s.sessionRepo != nil {
		session := &entity.UserSession{
			ID:               uuid.New().String(),
			UserID:           user.ID,
			RefreshTokenHash: s.hashToken(refreshToken),
			ExpiresAt:        time.Now().Add(s.tokenManager.RefreshTTL()),
			IsActive:         true,
		}

		if err := s.sessionRepo.Create(ctx, session); err != nil {
			s.logger.Error("erro ao criar sessão", zap.Error(err))
			// Continuar mesmo se falhar - token JWT ainda é válido
		}

		// Limitar quantidade de sessões ativas (device limit)
		if err := s.sessionRepo.EnforceSessionLimit(ctx, user.ID, maxActiveSessions); err != nil {
			s.logger.Warn("erro ao aplicar limite de sessões ativas", zap.Error(err))
		}
	}

	// Limpar senha antes de retornar
	user.Password = ""

	// Registrar primeiro login se ainda não ocorreu
	if user.FirstLoginAt == nil {
		if err := s.userRepo.SetFirstLoginAt(ctx, user.ID); err != nil {
			s.logger.Warn("erro ao registrar primeiro login", zap.Error(err))
			// Continuar mesmo se falhar
		}
		now := time.Now()
		user.FirstLoginAt = &now
	}

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
	// Invalidar sessão no banco
	if s.sessionRepo != nil && refreshToken != "" {
		tokenHash := s.hashToken(refreshToken)
		if err := s.sessionRepo.InvalidateByTokenHash(ctx, tokenHash); err != nil {
			s.logger.Debug("erro ao invalidar sessão (ignorado)", zap.Error(err))
		}
	}

	s.logger.Info("logout realizado com sucesso")
	return nil
}

func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (*entity.User, string, string, error) {
	// Validar refresh token JWT
	claims, err := s.tokenManager.ValidateRefreshToken(refreshToken)
	if err != nil {
		s.logger.Warn("tentativa de refresh com token JWT inválido", zap.Error(err))
		return nil, "", "", domainErrors.NewUnauthorizedError("Refresh token inválido ou expirado")
	}

	// Verificar sessão no banco (se disponível)
	if s.sessionRepo != nil {
		tokenHash := s.hashToken(refreshToken)
		session, err := s.sessionRepo.FindByTokenHash(ctx, tokenHash)
		if err != nil {
			s.logger.Warn("sessão não encontrada no banco",
				zap.String("userId", claims.UserID),
				zap.Error(err),
			)
			return nil, "", "", domainErrors.NewUnauthorizedError("Sessão inválida ou expirada")
		}

		// Verificar se sessão expirou
		if time.Now().After(session.ExpiresAt) {
			s.logger.Warn("sessão expirada", zap.String("sessionId", session.ID))
			return nil, "", "", domainErrors.NewUnauthorizedError("Sessão expirada")
		}

		// Invalidar sessão antiga (rotation)
		if err := s.sessionRepo.Invalidate(ctx, session.ID); err != nil {
			s.logger.Error("erro ao invalidar sessão antiga", zap.Error(err))
		}
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

	newRefreshToken, err := s.tokenManager.GenerateRefreshToken(user.ID, string(user.Role), user.IndustryID)
	if err != nil {
		s.logger.Error("erro ao gerar novo refresh token", zap.Error(err))
		return nil, "", "", domainErrors.InternalError(err)
	}

	// Criar nova sessão
	if s.sessionRepo != nil {
		session := &entity.UserSession{
			ID:               uuid.New().String(),
			UserID:           user.ID,
			RefreshTokenHash: s.hashToken(newRefreshToken),
			ExpiresAt:        time.Now().Add(s.tokenManager.RefreshTTL()),
			IsActive:         true,
		}

		if err := s.sessionRepo.Create(ctx, session); err != nil {
			s.logger.Error("erro ao criar nova sessão", zap.Error(err))
		}

		// Garantir limite de sessões ativas por usuário
		if err := s.sessionRepo.EnforceSessionLimit(ctx, user.ID, maxActiveSessions); err != nil {
			s.logger.Warn("erro ao aplicar limite de sessões ativas", zap.Error(err))
		}
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
	// Gerar senha temporária com 12 caracteres usando crypto/rand
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%"
	const length = 12

	b := make([]byte, length)
	charsetLen := len(charset)

	// Gerar bytes aleatórios seguros
	randomBytes := make([]byte, length)
	if _, err := rand.Read(randomBytes); err != nil {
		// Fallback para UUID se crypto/rand falhar (extremamente raro)
		return uuid.New().String()[:length]
	}

	for i := 0; i < length; i++ {
		b[i] = charset[int(randomBytes[i])%charsetLen]
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

// hashToken gera hash SHA-256 do token para armazenamento seguro
func (s *authService) hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// generateResetCode gera um código de 6 dígitos para recuperação de senha
func (s *authService) generateResetCode() (string, error) {
	code := ""
	for i := 0; i < passwordResetCodeLength; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		code += fmt.Sprintf("%d", num.Int64())
	}
	return code, nil
}

// ForgotPassword gera código de recuperação e envia por email
func (s *authService) ForgotPassword(ctx context.Context, emailAddr string) error {
	// Sempre retornar sucesso para não revelar se email existe (segurança)
	user, err := s.userRepo.FindByEmail(ctx, emailAddr)
	if err != nil {
		s.logger.Debug("forgot password para email não encontrado", zap.String("email", emailAddr))
		// Retorna nil para não revelar que o email não existe
		return nil
	}

	if !user.IsActive {
		s.logger.Debug("forgot password para usuário inativo", zap.String("userId", user.ID))
		return nil
	}

	// Invalidar tokens anteriores
	if err := s.userRepo.InvalidatePasswordResetTokens(ctx, user.ID); err != nil {
		s.logger.Error("erro ao invalidar tokens anteriores", zap.Error(err))
		// Continuar mesmo se falhar
	}

	// Gerar código de 6 dígitos
	code, err := s.generateResetCode()
	if err != nil {
		s.logger.Error("erro ao gerar código de reset", zap.Error(err))
		return domainErrors.InternalError(err)
	}

	// Criar token de reset
	token := &entity.PasswordResetToken{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		Code:      code,
		TokenHash: s.hashToken(code),
		ExpiresAt: time.Now().Add(passwordResetCodeTTL),
	}

	if err := s.userRepo.CreatePasswordResetToken(ctx, token); err != nil {
		s.logger.Error("erro ao criar token de reset", zap.Error(err))
		return domainErrors.InternalError(err)
	}

	// Renderizar template de email
	resetURL := fmt.Sprintf("%s/forgot-password?email=%s&code=%s", s.frontendURL, emailAddr, code)
	htmlBody, textBody, err := email.RenderPasswordResetEmail(email.PasswordResetData{
		UserName:  user.Name,
		ResetURL:  resetURL,
		ExpiresIn: "15 minutos",
	})
	if err != nil {
		s.logger.Error("erro ao renderizar email de reset", zap.Error(err))
		return domainErrors.InternalError(err)
	}

	// Enviar email
	msg := domainService.EmailMessage{
		To:       emailAddr,
		Subject:  fmt.Sprintf("CAVA - Seu código de recuperação: %s", code),
		HTMLBody: htmlBody,
		TextBody: textBody,
	}

	if err := s.emailSender.Send(ctx, msg); err != nil {
		s.logger.Error("erro ao enviar email de reset", zap.Error(err))
		// Ainda assim retornar nil para não revelar erro ao atacante
		return nil
	}

	s.logger.Info("email de recuperação enviado",
		zap.String("userId", user.ID),
		zap.String("email", emailAddr),
	)

	return nil
}

// ResetPassword verifica código e atualiza senha
func (s *authService) ResetPassword(ctx context.Context, emailAddr, code, newPassword string) error {
	// Validar força da nova senha
	if err := password.ValidatePasswordStrength(newPassword); err != nil {
		return domainErrors.ValidationError(err.Error())
	}

	// Buscar token válido
	token, err := s.userRepo.GetValidPasswordResetToken(ctx, emailAddr, code)
	if err != nil {
		s.logger.Warn("código de reset inválido ou expirado",
			zap.String("email", emailAddr),
			zap.Error(err),
		)
		return domainErrors.NewBadRequestError("Código inválido ou expirado")
	}

	// Verificar expiração novamente (double check)
	if token.IsExpired() {
		s.logger.Warn("token de reset expirado", zap.String("tokenId", token.ID))
		return domainErrors.NewBadRequestError("Código expirado. Solicite um novo.")
	}

	// Hash da nova senha
	hashedPassword, err := s.hasher.Hash(newPassword)
	if err != nil {
		s.logger.Error("erro ao fazer hash da nova senha", zap.Error(err))
		return domainErrors.InternalError(err)
	}

	// Atualizar senha
	if err := s.userRepo.UpdatePassword(ctx, token.UserID, hashedPassword); err != nil {
		s.logger.Error("erro ao atualizar senha", zap.Error(err))
		return domainErrors.InternalError(err)
	}

	// Marcar token como usado
	if err := s.userRepo.MarkPasswordResetTokenUsed(ctx, token.ID); err != nil {
		s.logger.Error("erro ao marcar token como usado", zap.Error(err))
		// Continuar mesmo se falhar
	}

	// Invalidar todas as sessões do usuário (segurança)
	if s.sessionRepo != nil {
		if err := s.sessionRepo.InvalidateAllByUserID(ctx, token.UserID); err != nil {
			s.logger.Warn("erro ao invalidar sessões após reset", zap.Error(err))
		}
	}

	s.logger.Info("senha redefinida com sucesso",
		zap.String("userId", token.UserID),
		zap.String("email", emailAddr),
	)

	return nil
}
