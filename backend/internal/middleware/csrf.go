package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
)

// CSRFMiddleware protege contra ataques CSRF
type CSRFMiddleware struct {
	secret       string
	cookieDomain string
	cookieSecure bool
	logger       *zap.Logger
}

func NewCSRFMiddleware(secret, cookieDomain string, cookieSecure bool, logger *zap.Logger) *CSRFMiddleware {
	return &CSRFMiddleware{
		secret:       secret,
		cookieDomain: cookieDomain,
		cookieSecure: cookieSecure,
		logger:       logger,
	}
}

// SetCSRFCookie define o cookie CSRF na primeira requisição
func (m *CSRFMiddleware) SetCSRFCookie(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verificar se já tem cookie CSRF
		_, err := r.Cookie("csrf_token")
		if err != nil {
			// Gerar novo token
			token := uuid.New().String()

			// Setar cookie
			http.SetCookie(w, &http.Cookie{
				Name:     "csrf_token",
				Value:    token,
				Path:     "/",
				Domain:   m.cookieDomain,
				MaxAge:   86400, // 24 horas
				Secure:   m.cookieSecure,
				HttpOnly: false, // Precisa ser acessível via JS
				SameSite: http.SameSiteStrictMode,
			})

			m.logger.Debug("csrf token gerado", zap.String("token", token))
		}

		next.ServeHTTP(w, r)
	})
}

// ValidateCSRF valida token CSRF em requisições mutáveis
func (m *CSRFMiddleware) ValidateCSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Aplicar apenas em métodos mutáveis
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		// Extrair token do header
		headerToken := r.Header.Get("X-CSRF-Token")
		if headerToken == "" {
			m.logger.Warn("csrf token ausente no header",
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path),
			)
			response.Error(w, 419, "CSRF_TOKEN_MISSING", "Token CSRF ausente", nil)
			return
		}

		// Extrair token do cookie
		cookie, err := r.Cookie("csrf_token")
		if err != nil {
			m.logger.Warn("csrf token ausente no cookie",
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path),
			)
			response.Error(w, 419, "CSRF_TOKEN_MISSING", "Token CSRF ausente", nil)
			return
		}

		// Comparação constant-time para prevenir timing attacks
		if subtle.ConstantTimeCompare([]byte(headerToken), []byte(cookie.Value)) != 1 {
			m.logger.Warn("csrf token inválido",
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path),
			)
			response.Error(w, 419, "CSRF_TOKEN_INVALID", "Token CSRF inválido", nil)
			return
		}

		m.logger.Debug("csrf token validado com sucesso")
		next.ServeHTTP(w, r)
	})
}