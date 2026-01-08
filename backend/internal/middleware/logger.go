package middleware

import (
	"net/http"
	"time"

	"go.uber.org/zap"
)

// LoggerMiddleware loga todas as requisições HTTP
type LoggerMiddleware struct {
	logger *zap.Logger
}

func NewLoggerMiddleware(logger *zap.Logger) *LoggerMiddleware {
	return &LoggerMiddleware{logger: logger}
}

// responseWriter wrapper para capturar status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	bytes      int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.bytes += n
	return n, err
}

func (m *LoggerMiddleware) Log(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrapper para capturar status code
		rw := &responseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK, // Default
		}

		// Extrair request ID do contexto (se disponível)
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = "unknown"
		}

		// Processar requisição
		next.ServeHTTP(rw, r)

		// Calcular duração
		duration := time.Since(start)

		// Extrair user ID do contexto (se autenticado)
		userID := GetUserID(r.Context())

		// Log fields
		fields := []zap.Field{
			zap.String("request_id", requestID),
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.String("query", r.URL.RawQuery),
			zap.Int("status", rw.statusCode),
			zap.Int("bytes", rw.bytes),
			zap.Duration("duration", duration),
			zap.String("ip", m.getClientIP(r)),
			zap.String("user_agent", r.UserAgent()),
		}

		if userID != "" {
			fields = append(fields, zap.String("user_id", userID))
		}

		// Determinar nível de log baseado no status code
		switch {
		case rw.statusCode >= 500:
			m.logger.Error("request completed with error", fields...)
		case rw.statusCode >= 400:
			m.logger.Warn("request completed with client error", fields...)
		default:
			m.logger.Info("request completed", fields...)
		}
	})
}

// getClientIP extrai o IP do cliente
func (m *LoggerMiddleware) getClientIP(r *http.Request) string {
	// Tentar X-Forwarded-For (proxy/load balancer)
	ip := r.Header.Get("X-Forwarded-For")
	if ip != "" {
		return ip
	}

	// Tentar X-Real-IP
	ip = r.Header.Get("X-Real-IP")
	if ip != "" {
		return ip
	}

	// Fallback para RemoteAddr
	return r.RemoteAddr
}