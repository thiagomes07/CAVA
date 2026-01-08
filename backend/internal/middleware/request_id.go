package middleware

import (
	"net/http"

	"github.com/google/uuid"
)

// RequestIDMiddleware gera e propaga Request ID
type RequestIDMiddleware struct{}

func NewRequestIDMiddleware() *RequestIDMiddleware {
	return &RequestIDMiddleware{}
}

func (m *RequestIDMiddleware) AddRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verificar se cliente enviou Request ID
		requestID := r.Header.Get("X-Request-ID")

		// Se não enviou, gerar novo
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Adicionar ao header da requisição (para propagação)
		r.Header.Set("X-Request-ID", requestID)

		// Adicionar ao header da resposta
		w.Header().Set("X-Request-ID", requestID)

		next.ServeHTTP(w, r)
	})
}