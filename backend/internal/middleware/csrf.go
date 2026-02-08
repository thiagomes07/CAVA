package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
)

// CSRFMiddleware protege contra ataques CSRF
type CSRFMiddleware struct {
	secret       []byte
	cookieDomain string
	cookieSecure bool
	logger       *zap.Logger
}

func NewCSRFMiddleware(secret, cookieDomain string, cookieSecure bool, logger *zap.Logger) *CSRFMiddleware {
	return &CSRFMiddleware{
		secret:       []byte(secret),
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
			// Gerar novo token assinado com segredo (evita tampering)
			token, genErr := m.generateToken()
			if genErr != nil {
				m.logger.Error("erro ao gerar csrf token", zap.Error(genErr))
				response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Erro ao gerar token CSRF", nil)
				return
			}

			// Setar cookie
			http.SetCookie(w, &http.Cookie{
				Name:     "csrf_token",
				Value:    token,
				Path:     "/",
				Domain:   m.cookieDomain,
				MaxAge:   86400, // 24 horas
				Secure:   m.cookieSecure,
				HttpOnly: false, // Precisa ser acessível via JS
				SameSite: http.SameSiteLaxMode,
			})

			m.logger.Debug("csrf token gerado")
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

		// Validar assinatura HMAC para prevenir tampering
		if !m.verifyToken(headerToken) {
			m.logger.Warn("csrf token com assinatura inválida",
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

// generateToken cria token aleatório e assinado (nonce.assinatura) usando HMAC-SHA256
func (m *CSRFMiddleware) generateToken() (string, error) {
	nonce := uuid.New().String()
	signature := m.signNonce(nonce)
	return base64.RawURLEncoding.EncodeToString([]byte(nonce)) + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

// verifyToken valida assinatura HMAC do token
func (m *CSRFMiddleware) verifyToken(token string) bool {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return false
	}

	nonceBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return false
	}

	signatureBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return false
	}

	expected := m.signNonce(string(nonceBytes))
	return hmac.Equal(signatureBytes, expected)
}

// signNonce gera assinatura HMAC do nonce usando segredo compartilhado
func (m *CSRFMiddleware) signNonce(nonce string) []byte {
	h := hmac.New(sha256.New, m.secret)
	h.Write([]byte(nonce))
	return h.Sum(nil)
}
