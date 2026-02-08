package middleware

import (
	"net/http"

	"github.com/thiagomes07/CAVA/backend/pkg/response"
)

const (
	// DefaultMaxBodySize é o limite padrão para requisições JSON da API (1 MB)
	DefaultMaxBodySize int64 = 1 << 20 // 1 MB

	// UploadMaxBodySize é o limite para uploads de arquivos (50 MB)
	UploadMaxBodySize int64 = 50 << 20 // 50 MB
)

// MaxBodySize limita o tamanho do body de requisições HTTP para prevenir
// ataques de exaustão de memória (envio de payloads gigantes).
// Deve ser aplicado ANTES dos handlers que fazem parsing do body.
func MaxBodySize(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Apenas limitar se houver body (POST, PUT, PATCH)
			if r.Body != nil && r.ContentLength != 0 {
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}

			next.ServeHTTP(w, r)
		})
	}
}

// DefaultBodyLimit aplica o limite padrão de 1 MB
func DefaultBodyLimit(next http.Handler) http.Handler {
	return MaxBodySize(DefaultMaxBodySize)(next)
}

// UploadBodyLimit aplica o limite de 50 MB para uploads
func UploadBodyLimit(next http.Handler) http.Handler {
	return MaxBodySize(UploadMaxBodySize)(next)
}

// MaxBytesErrorHandler é um middleware que intercepta erros de MaxBytesReader
// e retorna uma resposta 413 amigável em vez de erro genérico.
// Deve ser usado DEPOIS de MaxBodySize na chain de middlewares.
func MaxBytesErrorHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}

// HandleMaxBytesError verifica se um erro é de limite de body excedido
// e pode ser usado nos handlers para retornar erro 413 apropriado.
func HandleMaxBytesError(w http.ResponseWriter, err error) bool {
	if err != nil && err.Error() == "http: request body too large" {
		response.Error(w, http.StatusRequestEntityTooLarge, "BODY_TOO_LARGE",
			"O tamanho da requisição excede o limite permitido", nil)
		return true
	}
	return false
}
