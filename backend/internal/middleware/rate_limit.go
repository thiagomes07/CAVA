package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// RateLimiter implementa rate limiting usando token bucket
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.RWMutex
	rps      rate.Limit
	burst    int
	logger   *zap.Logger
}

func NewRateLimiter(requestsPerMinute int, logger *zap.Logger) *RateLimiter {
	// Converter requests/minuto para requests/segundo
	rps := rate.Limit(float64(requestsPerMinute) / 60.0)

	return &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rps:      rps,
		burst:    requestsPerMinute, // Burst = total de requests por minuto
		logger:   logger,
	}
}

// getLimiter retorna ou cria um limiter para o identificador
func (rl *RateLimiter) getLimiter(identifier string) *rate.Limiter {
	rl.mu.RLock()
	limiter, exists := rl.limiters[identifier]
	rl.mu.RUnlock()

	if exists {
		return limiter
	}

	// Criar novo limiter
	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Double-check após obter lock de escrita
	limiter, exists = rl.limiters[identifier]
	if exists {
		return limiter
	}

	limiter = rate.NewLimiter(rl.rps, rl.burst)
	rl.limiters[identifier] = limiter

	return limiter
}

// Limit aplica rate limiting baseado no identificador
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Determinar identificador (IP + UserID se autenticado)
		identifier := rl.getIdentifier(r)

		// Obter limiter para este identificador
		limiter := rl.getLimiter(identifier)

		// Verificar se permite requisição
		if !limiter.Allow() {
			rl.logger.Warn("rate limit exceeded",
				zap.String("identifier", identifier),
				zap.String("path", r.URL.Path),
			)

			// Headers de rate limit
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", rl.burst))
			w.Header().Set("X-RateLimit-Remaining", "0")
			w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(time.Minute).Unix()))

			response.TooManyRequests(w)
			return
		}

		// Headers de rate limit
		tokens := int(limiter.Tokens())
		w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", rl.burst))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", tokens))

		next.ServeHTTP(w, r)
	})
}

// getIdentifier retorna identificador único para rate limiting
func (rl *RateLimiter) getIdentifier(r *http.Request) string {
	// IP do cliente
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		ip = r.RemoteAddr
	}

	// Se autenticado, adicionar user ID
	userID := GetUserID(r.Context())
	if userID != "" {
		return fmt.Sprintf("%s:%s", ip, userID)
	}

	return ip
}

// Cleanup remove limiters inativos (executar periodicamente)
func (rl *RateLimiter) Cleanup(maxAge time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Remover limiters que não foram usados recentemente
	// Nota: golang.org/x/time/rate.Limiter não expõe última vez usado
	// Para implementação completa, usar estrutura custom com timestamp
	
	rl.logger.Debug("rate limiter cleanup executed",
		zap.Int("limiters_count", len(rl.limiters)),
	)
}