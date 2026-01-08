package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
)

// RecoveryMiddleware captura panics e retorna erro 500
type RecoveryMiddleware struct {
	logger *zap.Logger
}

func NewRecoveryMiddleware(logger *zap.Logger) *RecoveryMiddleware {
	return &RecoveryMiddleware{logger: logger}
}

func (m *RecoveryMiddleware) Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				// Capturar stack trace
				stack := debug.Stack()

				// Extrair request ID
				requestID := r.Header.Get("X-Request-ID")
				if requestID == "" {
					requestID = "unknown"
				}

				// Log completo do panic
				m.logger.Error("panic recovered",
					zap.String("request_id", requestID),
					zap.String("method", r.Method),
					zap.String("path", r.URL.Path),
					zap.Any("panic", err),
					zap.String("stack", string(stack)),
				)

				// Garantir que não enviamos resposta duplicada
				if w.Header().Get("Content-Type") == "" {
					// Retornar erro 500 ao cliente (sem expor detalhes do panic)
					response.InternalServerError(w, fmt.Errorf("panic: %v", err))
				}
			}
		}()

		next.ServeHTTP(w, r)
	})
}