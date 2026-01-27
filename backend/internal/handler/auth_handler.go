package handler

import (
	"net/http"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// AuthHandler gerencia requisições de autenticação
type AuthHandler struct {
	authService  service.AuthService
	userService  service.UserService
	validator    *validator.Validator
	logger       *zap.Logger
	cookieDomain string
	cookieSecure bool
	accessTTL    time.Duration
	refreshTTL   time.Duration
}

// NewAuthHandler cria uma nova instância de AuthHandler
func NewAuthHandler(
	authService service.AuthService,
	userService service.UserService,
	validator *validator.Validator,
	logger *zap.Logger,
	cookieDomain string,
	cookieSecure bool,
	accessTTL time.Duration,
	refreshTTL time.Duration,
) *AuthHandler {
	return &AuthHandler{
		authService:  authService,
		userService:  userService,
		validator:    validator,
		logger:       logger,
		cookieDomain: cookieDomain,
		cookieSecure: cookieSecure,
		accessTTL:    accessTTL,
		refreshTTL:   refreshTTL,
	}
}

// Login godoc
// @Summary Realiza login do usuário
// @Description Valida credenciais e retorna tokens via cookies
// @Tags auth
// @Accept json
// @Produce json
// @Param body body entity.LoginInput true "Credenciais de login"
// @Success 200 {object} entity.LoginResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Router /api/auth/login [post]
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input entity.LoginInput

	// Parse JSON body
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Executar login
	loginResp, accessToken, refreshToken, err := h.authService.Login(r.Context(), input)
	if err != nil {
		h.logger.Warn("falha no login",
			zap.String("email", input.Email),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Definir cookies
	h.setAuthCookies(w, accessToken, refreshToken)

	h.logger.Info("login realizado com sucesso",
		zap.String("userId", loginResp.User.ID),
		zap.String("role", string(loginResp.Role)),
	)

	response.OK(w, loginResp)
}

// Refresh godoc
// @Summary Renova access token
// @Description Usa refresh token para gerar novo access token
// @Tags auth
// @Produce json
// @Success 200 {object} entity.RefreshTokenResponse
// @Failure 401 {object} response.ErrorResponse
// @Router /api/auth/refresh [post]
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	// Extrair refresh token do cookie
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		response.Unauthorized(w, "Refresh token ausente")
		return
	}

	refreshToken := cookie.Value
	if refreshToken == "" {
		response.Unauthorized(w, "Refresh token inválido")
		return
	}

	// Renovar tokens
	user, newAccessToken, newRefreshToken, err := h.authService.RefreshToken(r.Context(), refreshToken)
	if err != nil {
		h.logger.Warn("falha ao renovar token",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Definir novos cookies
	h.setAuthCookies(w, newAccessToken, newRefreshToken)

	h.logger.Debug("token renovado",
		zap.String("userId", user.ID),
	)

	response.OK(w, entity.RefreshTokenResponse{
		User: *user,
	})
}

// Logout godoc
// @Summary Realiza logout do usuário
// @Description Invalida refresh token e limpa cookies
// @Tags auth
// @Produce json
// @Success 200 {object} map[string]bool
// @Router /api/auth/logout [post]
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Extrair refresh token do cookie
	cookie, err := r.Cookie("refresh_token")
	if err == nil && cookie.Value != "" {
		// Invalidar refresh token no backend
		if err := h.authService.Logout(r.Context(), cookie.Value); err != nil {
			h.logger.Warn("erro ao invalidar refresh token",
				zap.Error(err),
			)
			// Continuar mesmo se falhar - limpar cookies é mais importante
		}
	}

	// Limpar cookies
	h.clearAuthCookies(w)

	h.logger.Debug("logout realizado")

	response.OK(w, map[string]bool{"success": true})
}

// setAuthCookies define os cookies de autenticação
func (h *AuthHandler) setAuthCookies(w http.ResponseWriter, accessToken, refreshToken string) {
	// Access token - 15 minutos
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		Domain:   h.cookieDomain,
		MaxAge:   int(h.accessTTL.Seconds()),
		Expires:  time.Now().Add(h.accessTTL),
		Secure:   h.cookieSecure,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	// Refresh token - 7 dias
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		Domain:   h.cookieDomain,
		MaxAge:   int(h.refreshTTL.Seconds()),
		Expires:  time.Now().Add(h.refreshTTL),
		Secure:   h.cookieSecure,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
}

// clearAuthCookies limpa os cookies de autenticação
func (h *AuthHandler) clearAuthCookies(w http.ResponseWriter) {
	// Limpar access token
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		Domain:   h.cookieDomain,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		Secure:   h.cookieSecure,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	// Limpar refresh token
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		Domain:   h.cookieDomain,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		Secure:   h.cookieSecure,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
}

// GetProfile godoc
// @Summary Obtém perfil do usuário logado
// @Description Retorna os dados do usuário autenticado
// @Tags profile
// @Produce json
// @Success 200 {object} entity.User
// @Failure 401 {object} response.ErrorResponse
// @Router /api/profile [get]
func (h *AuthHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	user, err := h.userService.GetByID(r.Context(), userID)
	if err != nil {
		h.logger.Error("erro ao buscar perfil",
			zap.String("userId", userID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, user)
}

// UpdateProfile godoc
// @Summary Atualiza perfil do usuário logado
// @Description Atualiza nome e telefone do usuário autenticado
// @Tags profile
// @Accept json
// @Produce json
// @Param body body entity.UpdateUserInput true "Dados a atualizar"
// @Success 200 {object} entity.User
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Router /api/profile [patch]
func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	var input entity.UpdateUserInput
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	user, err := h.userService.Update(r.Context(), userID, input)
	if err != nil {
		h.logger.Error("erro ao atualizar perfil",
			zap.String("userId", userID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("perfil atualizado",
		zap.String("userId", userID),
	)

	response.OK(w, user)
}

// ChangePassword godoc
// @Summary Altera senha do usuário logado
// @Description Permite ao usuário trocar sua senha
// @Tags profile
// @Accept json
// @Produce json
// @Param body body entity.ChangePasswordInput true "Senhas atual e nova"
// @Success 200 {object} map[string]bool
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Router /api/profile/password [patch]
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	var input entity.ChangePasswordInput
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	err := h.authService.ChangePassword(r.Context(), userID, input)
	if err != nil {
		h.logger.Warn("erro ao alterar senha",
			zap.String("userId", userID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("senha alterada com sucesso",
		zap.String("userId", userID),
	)

	response.OK(w, map[string]bool{"success": true})
}

// ForgotPassword godoc
// @Summary Solicita recuperação de senha
// @Description Envia código de verificação por email
// @Tags auth
// @Accept json
// @Produce json
// @Param body body entity.ForgotPasswordInput true "Email do usuário"
// @Success 200 {object} map[string]bool
// @Failure 400 {object} response.ErrorResponse
// @Router /api/auth/forgot-password [post]
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var input entity.ForgotPasswordInput

	// Parse JSON body
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Executar forgot password (sempre retorna sucesso para segurança)
	if err := h.authService.ForgotPassword(r.Context(), input.Email); err != nil {
		h.logger.Error("erro ao processar forgot password",
			zap.String("email", input.Email),
			zap.Error(err),
		)
		// Ainda retorna sucesso para não revelar se email existe
	}

	h.logger.Debug("forgot password processado",
		zap.String("email", input.Email),
	)

	// Sempre retorna sucesso para não revelar se email existe
	response.OK(w, map[string]bool{"success": true})
}

// ResetPassword godoc
// @Summary Redefine senha com código de verificação
// @Description Valida código e atualiza senha do usuário
// @Tags auth
// @Accept json
// @Produce json
// @Param body body entity.ResetPasswordInput true "Email, código e nova senha"
// @Success 200 {object} map[string]bool
// @Failure 400 {object} response.ErrorResponse
// @Router /api/auth/reset-password [post]
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var input entity.ResetPasswordInput

	// Parse JSON body
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Executar reset password
	if err := h.authService.ResetPassword(r.Context(), input.Email, input.Code, input.NewPassword); err != nil {
		h.logger.Warn("falha no reset password",
			zap.String("email", input.Email),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("senha redefinida com sucesso",
		zap.String("email", input.Email),
	)

	response.OK(w, map[string]bool{"success": true})
}
