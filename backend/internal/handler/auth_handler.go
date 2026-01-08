package handler

import (
	"net/http"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// AuthHandler gerencia requisições de autenticação
type AuthHandler struct {
	authService  service.AuthService
	validator    *validator.Validator
	logger       *zap.Logger
	cookieDomain string
	cookieSecure bool
}

// NewAuthHandler cria uma nova instância de AuthHandler
func NewAuthHandler(
	authService service.AuthService,
	validator *validator.Validator,
	logger *zap.Logger,
	cookieDomain string,
	cookieSecure bool,
) *AuthHandler {
	return &AuthHandler{
		authService:  authService,
		validator:    validator,
		logger:       logger,
		cookieDomain: cookieDomain,
		cookieSecure: cookieSecure,
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
		MaxAge:   900, // 15 minutos
		Secure:   h.cookieSecure,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	// Refresh token - 7 dias
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/api/auth",
		Domain:   h.cookieDomain,
		MaxAge:   604800, // 7 dias
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
		Path:     "/api/auth",
		Domain:   h.cookieDomain,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		Secure:   h.cookieSecure,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
}
