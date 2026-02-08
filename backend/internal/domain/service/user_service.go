package service

import (
	"context"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// UserService define o contrato para operações com usuários
type UserService interface {
	// Create cria um novo usuário com validações de negócio (senha fornecida manualmente)
	Create(ctx context.Context, input entity.CreateUserInput) (*entity.User, error)

	// CreateSeller cria um vendedor interno com senha temporária gerada automaticamente
	CreateSeller(ctx context.Context, industryID string, input entity.CreateSellerInput) (*entity.User, error)

	// GetByID busca usuário por ID
	GetByID(ctx context.Context, id string) (*entity.User, error)

	// GetByEmail busca usuário por email
	GetByEmail(ctx context.Context, email string) (*entity.User, error)

	// List lista usuários com filtros
	List(ctx context.Context, role *entity.UserRole) ([]entity.User, error)

	// ListByIndustry lista usuários por indústria com filtro de role opcional
	ListByIndustry(ctx context.Context, industryID string, role *entity.UserRole) ([]entity.User, error)

	// ListByIndustryWithFilters lista usuários com filtros, busca, ordenação e paginação
	ListByIndustryWithFilters(ctx context.Context, industryID string, filters entity.UserFilters) ([]entity.User, int, error)

	// GetBrokersWithFilters lista brokers com filtros, busca, ordenação e paginação
	GetBrokersWithFilters(ctx context.Context, industryID string, filters entity.UserFilters) ([]entity.BrokerWithStats, int, error)

	// Update atualiza dados do usuário
	Update(ctx context.Context, id string, input entity.UpdateUserInput) (*entity.User, error)

	// UpdateStatus atualiza status ativo/inativo (com verificação de indústria)
	UpdateStatus(ctx context.Context, id string, industryID string, isActive bool) (*entity.User, error)

	// InviteBroker convida um broker (cria usuário, gera senha temporária, envia email)
	InviteBroker(ctx context.Context, industryID string, input entity.InviteBrokerInput) (*entity.User, error)

	// GetBrokers lista brokers com estatísticas
	GetBrokers(ctx context.Context, industryID string) ([]entity.BrokerWithStats, error)

	// ResendInvite reenvia convite (apenas se usuário nunca logou, com verificação de indústria)
	ResendInvite(ctx context.Context, userID string, industryID string, newEmail *string) (*entity.User, error)

	// UpdateEmail atualiza email do usuário (apenas se nunca logou)
	UpdateEmail(ctx context.Context, userID string, email string) (*entity.User, error)

	// UpdateBroker atualiza informações do broker
	UpdateBroker(ctx context.Context, id string, input entity.UpdateBrokerInput) (*entity.User, error)

	// DeleteBroker deleta um broker (se não houver dependências, com verificação de indústria)
	DeleteBroker(ctx context.Context, id string, industryID string) error

	// UpdateSeller atualiza informações do vendedor/admin (email não pode ser alterado)
	UpdateSeller(ctx context.Context, id string, industryID string, input entity.UpdateSellerInput) (*entity.User, error)

	// DeleteUser deleta um usuário (vendedor interno apenas, não admin)
	DeleteUser(ctx context.Context, id string, industryID string) error
}
