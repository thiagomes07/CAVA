package middleware

import (
	"net/http"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
)

// RBACMiddleware controla acesso baseado em roles
type RBACMiddleware struct {
	logger *zap.Logger
}

func NewRBACMiddleware(logger *zap.Logger) *RBACMiddleware {
	return &RBACMiddleware{logger: logger}
}

// RequireRoles restringe acesso a roles específicas
func (m *RBACMiddleware) RequireRoles(allowedRoles ...entity.UserRole) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extrair role do contexto (injetado pelo auth middleware)
			roleStr := GetUserRole(r.Context())
			if roleStr == "" {
				m.logger.Warn("role não encontrado no contexto",
					zap.String("path", r.URL.Path),
				)
				response.Forbidden(w, "Acesso negado")
				return
			}

			userRole := entity.UserRole(roleStr)

			// Verificar se role está na lista de permitidas
			for _, allowedRole := range allowedRoles {
				if userRole == allowedRole {
					m.logger.Debug("acesso autorizado",
						zap.String("role", roleStr),
						zap.String("path", r.URL.Path),
					)
					next.ServeHTTP(w, r)
					return
				}
			}

			// Role não autorizado
			m.logger.Warn("acesso negado por role",
				zap.String("role", roleStr),
				zap.Strings("allowed_roles", rolesToStrings(allowedRoles)),
				zap.String("path", r.URL.Path),
			)
			response.Forbidden(w, "Você não tem permissão para acessar este recurso")
		})
	}
}

// RequireAdmin restringe acesso apenas para ADMIN_INDUSTRIA
func (m *RBACMiddleware) RequireAdmin(next http.Handler) http.Handler {
	return m.RequireRoles(entity.RoleAdminIndustria)(next)
}

// RequireIndustryUser restringe acesso para ADMIN_INDUSTRIA e VENDEDOR_INTERNO
func (m *RBACMiddleware) RequireIndustryUser(next http.Handler) http.Handler {
	return m.RequireRoles(entity.RoleAdminIndustria, entity.RoleVendedorInterno)(next)
}

// RequireBroker restringe acesso apenas para BROKER
func (m *RBACMiddleware) RequireBroker(next http.Handler) http.Handler {
	return m.RequireRoles(entity.RoleBroker)(next)
}

// RequireAnyAuthenticated permite qualquer usuário autenticado
func (m *RBACMiddleware) RequireAnyAuthenticated(next http.Handler) http.Handler {
	return m.RequireRoles(
		entity.RoleAdminIndustria,
		entity.RoleVendedorInterno,
		entity.RoleBroker,
	)(next)
}

// rolesToStrings converte slice de UserRole para slice de strings
func rolesToStrings(roles []entity.UserRole) []string {
	result := make([]string, len(roles))
	for i, role := range roles {
		result[i] = string(role)
	}
	return result
}