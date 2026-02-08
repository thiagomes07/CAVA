package middleware

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

// limiterEntry wraps a rate.Limiter with a last-seen timestamp for cleanup
type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimiter implementa rate limiting usando token bucket
type RateLimiter struct {
	limiters map[string]*limiterEntry
	mu       sync.RWMutex
	rps      rate.Limit
	burst    int
	logger   *zap.Logger
}

func NewRateLimiter(requestsPerMinute int, logger *zap.Logger) *RateLimiter {
	return NewRateLimiterWithBurst(requestsPerMinute, requestsPerMinute, logger)
}

// NewRateLimiterWithBurst creates a rate limiter with separate RPM and burst values
func NewRateLimiterWithBurst(requestsPerMinute, burst int, logger *zap.Logger) *RateLimiter {
	// Converter requests/minuto para requests/segundo
	rps := rate.Limit(float64(requestsPerMinute) / 60.0)

	return &RateLimiter{
		limiters: make(map[string]*limiterEntry),
		rps:      rps,
		burst:    burst,
		logger:   logger,
	}
}

// getLimiter retorna ou cria um limiter para o identificador
func (rl *RateLimiter) getLimiter(identifier string) *rate.Limiter {
	now := time.Now()

	rl.mu.RLock()
	entry, exists := rl.limiters[identifier]
	rl.mu.RUnlock()

	if exists {
		rl.mu.Lock()
		entry.lastSeen = now
		rl.mu.Unlock()
		return entry.limiter
	}

	// Criar novo limiter
	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Double-check após obter lock de escrita
	entry, exists = rl.limiters[identifier]
	if exists {
		entry.lastSeen = now
		return entry.limiter
	}

	limiter := rate.NewLimiter(rl.rps, rl.burst)
	rl.limiters[identifier] = &limiterEntry{
		limiter:  limiter,
		lastSeen: now,
	}

	return limiter
}

// Limit aplica rate limiting baseado no identificador
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Determinar identificador (IP + UserID se autenticado)
		identifier := rl.getIdentifier(r)

		// Obter limiter para este identificador
		limiter := rl.getLimiter(identifier)

		resetAt := time.Now().Truncate(time.Minute).Add(time.Minute)

		// Verificar se permite requisição
		if !limiter.Allow() {
			rl.logger.Warn("rate limit exceeded",
				zap.String("identifier", identifier),
				zap.String("path", r.URL.Path),
			)

			// Headers de rate limit
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", rl.burst))
			w.Header().Set("X-RateLimit-Remaining", "0")
			w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", resetAt.Unix()))

			response.TooManyRequests(w)
			return
		}

		// Headers de rate limit
		remaining := int(limiter.Tokens())
		w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", rl.burst))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", resetAt.Unix()))

		next.ServeHTTP(w, r)
	})
}

// getIdentifier retorna identificador único para rate limiting.
// Usa r.RemoteAddr diretamente pois o middleware.RealIP do Chi já
// processa X-Forwarded-For/X-Real-IP e define o RemoteAddr correto.
// Ler os headers manualmente poderia resultar em chaves inconsistentes
// (e.g., valores multi-IP com vírgulas) e permitir spoofing.
func (rl *RateLimiter) getIdentifier(r *http.Request) string {
	ip := r.RemoteAddr

	// Se autenticado, adicionar user ID
	userID := GetUserID(r.Context())
	if userID != "" {
		return fmt.Sprintf("%s:%s", ip, userID)
	}

	return ip
}

// Cleanup remove limiters inativos que não foram acessados dentro de maxAge
func (rl *RateLimiter) Cleanup(maxAge time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	evicted := 0

	for id, entry := range rl.limiters {
		if now.Sub(entry.lastSeen) > maxAge {
			delete(rl.limiters, id)
			evicted++
		}
	}

	rl.logger.Debug("rate limiter cleanup executed",
		zap.Int("evicted", evicted),
		zap.Int("remaining", len(rl.limiters)),
	)
}

// StartCleanupRoutine starts a background goroutine that periodically cleans up stale entries
func (rl *RateLimiter) StartCleanupRoutine(ctx context.Context, interval, maxAge time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				rl.Cleanup(maxAge)
			}
		}
	}()
}
