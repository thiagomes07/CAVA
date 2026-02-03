package middleware

import (
	"net/http"
)

// NoOpCSRFMiddleware é um middleware que não faz nada (usado quando CSRF está desabilitado)
type NoOpCSRFMiddleware struct{}

func NewNoOpCSRFMiddleware() *NoOpCSRFMiddleware {
	return &NoOpCSRFMiddleware{}
}

// SetCSRFCookie não faz nada
func (m *NoOpCSRFMiddleware) SetCSRFCookie(next http.Handler) http.Handler {
	return next
}

// ValidateCSRF não faz nada
func (m *NoOpCSRFMiddleware) ValidateCSRF(next http.Handler) http.Handler {
	return next
}
