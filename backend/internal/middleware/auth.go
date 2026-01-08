package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/thiagomes07/CAVA/backend/pkg/jwt"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
)

type contextKey string

const (
	UserIDKey     contextKey = "userID"
	UserRoleKey   contextKey = "userRole"
	IndustryIDKey contextKey = "industryID"
)

// AuthMiddleware valida JWT e injeta dados do usuário no contexto
type AuthMiddleware struct {
	tokenManager *jwt.TokenManager
	logger       *zap.Logger
}

func NewAuthMiddleware(tokenManager *jwt.TokenManager, logger *zap.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		tokenManager: tokenManager,
		logger:       logger,
	}
}

func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extrair token do cookie (prioridade) ou header Authorization
		token := m.extractToken(r)
		if token == "" {
			response.Unauthorized(w, "Token de autenticação ausente")
			return
		}

		// Validar token
		claims, err := m.tokenManager.ValidateAccessToken(token)
		if err != nil {
			m.logger.Warn("token inválido",
				zap.String("error", err.Error()),
				zap.String("path", r.URL.Path),
			)
			response.Unauthorized(w, "Token inválido ou expirado")
			return
		}

		// Injetar dados no contexto
		ctx := r.Context()
		ctx = context.WithValue(ctx, UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
		if claims.IndustryID != nil {
			ctx = context.WithValue(ctx, IndustryIDKey, *claims.IndustryID)
		}

		m.logger.Debug("usuário autenticado",
			zap.String("userId", claims.UserID),
			zap.String("role", claims.Role),
		)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) extractToken(r *http.Request) string {
	// 1. Tentar extrair do cookie (prioridade)
	cookie, err := r.Cookie("access_token")
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}

	// 2. Tentar extrair do header Authorization
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return ""
	}

	// Formato: Bearer <token>
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}

	return parts[1]
}

// GetUserID extrai userID do contexto
func GetUserID(ctx context.Context) string {
	userID, ok := ctx.Value(UserIDKey).(string)
	if !ok {
		return ""
	}
	return userID
}

// GetUserRole extrai role do contexto
func GetUserRole(ctx context.Context) string {
	role, ok := ctx.Value(UserRoleKey).(string)
	if !ok {
		return ""
	}
	return role
}

// GetIndustryID extrai industryID do contexto (pode ser vazio para brokers)
func GetIndustryID(ctx context.Context) string {
	industryID, ok := ctx.Value(IndustryIDKey).(string)
	if !ok {
		return ""
	}
	return industryID
}