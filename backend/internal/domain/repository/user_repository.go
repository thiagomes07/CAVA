package repository

import (
	"context"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// UserRepository define o contrato para operações com usuários
type UserRepository interface {
	// Create cria um novo usuário
	Create(ctx context.Context, user *entity.User) error

	// FindByID busca usuário por ID
	FindByID(ctx context.Context, id string) (*entity.User, error)

	// FindByEmail busca usuário por email (para login)
	FindByEmail(ctx context.Context, email string) (*entity.User, error)

	// FindByIndustryID busca usuários por indústria
	FindByIndustryID(ctx context.Context, industryID string) ([]entity.User, error)

	// FindByRole busca usuários por role
	FindByRole(ctx context.Context, role entity.UserRole) ([]entity.User, error)

	// FindBrokers busca todos os brokers com estatísticas
	FindBrokers(ctx context.Context, industryID string) ([]entity.BrokerWithStats, error)

	// Update atualiza os dados do usuário
	Update(ctx context.Context, user *entity.User) error

	// UpdatePassword atualiza a senha do usuário
	UpdatePassword(ctx context.Context, id string, hashedPassword string) error

	// UpdateStatus atualiza o status ativo/inativo do usuário
	UpdateStatus(ctx context.Context, id string, isActive bool) error

	// ExistsByEmail verifica se o email já está cadastrado
	ExistsByEmail(ctx context.Context, email string) (bool, error)

	// ExistsByNameInIndustry verifica se o nome já está cadastrado na indústria
	ExistsByNameInIndustry(ctx context.Context, name string, industryID string) (bool, error)

	// ExistsByNameGlobally verifica se o nome já está cadastrado globalmente
	ExistsByNameGlobally(ctx context.Context, name string) (bool, error)

	// List lista todos os usuários com filtros opcionais
	List(ctx context.Context, role *entity.UserRole) ([]entity.User, error)

	// ListByIndustry lista usuários por industryID com filtro de role opcional
	ListByIndustry(ctx context.Context, industryID string, role *entity.UserRole) ([]entity.User, error)

	// ListByIndustryWithFilters lista usuários com filtros, busca, ordenação e paginação
	ListByIndustryWithFilters(ctx context.Context, industryID string, filters entity.UserFilters) ([]entity.User, int, error)

	// FindBrokersWithFilters busca brokers com filtros, busca, ordenação e paginação
	FindBrokersWithFilters(ctx context.Context, industryID string, filters entity.UserFilters) ([]entity.BrokerWithStats, int, error)

	// UpdateEmail atualiza o email do usuário
	UpdateEmail(ctx context.Context, id string, email string) error

	// SetFirstLoginAt define a data do primeiro login
	SetFirstLoginAt(ctx context.Context, id string) error

	// Delete deleta um usuário
	Delete(ctx context.Context, id string) error

	// =============================================
	// PASSWORD RESET TOKENS
	// =============================================

	// CreatePasswordResetToken cria um novo token de recuperação de senha
	CreatePasswordResetToken(ctx context.Context, token *entity.PasswordResetToken) error

	// GetPasswordResetToken busca token por email e hash do código
	GetPasswordResetToken(ctx context.Context, userID, tokenHash string) (*entity.PasswordResetToken, error)

	// GetValidPasswordResetToken busca token válido (não usado e não expirado) por email e código
	GetValidPasswordResetToken(ctx context.Context, email, code string) (*entity.PasswordResetToken, error)

	// MarkPasswordResetTokenUsed marca o token como utilizado
	MarkPasswordResetTokenUsed(ctx context.Context, tokenID string) error

	// InvalidatePasswordResetTokens invalida todos os tokens ativos de um usuário
	InvalidatePasswordResetTokens(ctx context.Context, userID string) error
}
