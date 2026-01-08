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

	// UpdateStatus atualiza o status ativo/inativo do usuário
	UpdateStatus(ctx context.Context, id string, isActive bool) error

	// ExistsByEmail verifica se o email já está cadastrado
	ExistsByEmail(ctx context.Context, email string) (bool, error)

	// List lista todos os usuários com filtros opcionais
	List(ctx context.Context, role *entity.UserRole) ([]entity.User, error)
}