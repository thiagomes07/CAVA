package repository

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SalesLinkRepository define o contrato para operações com links de venda
type SalesLinkRepository interface {
	// Create cria um novo link de venda
	Create(ctx context.Context, link *entity.SalesLink) error

	// CreateWithItems cria um link de venda com múltiplos itens (transação)
	CreateWithItems(ctx context.Context, link *entity.SalesLink, items []entity.SalesLinkItem) error

	// FindByID busca link por ID
	FindByID(ctx context.Context, id string) (*entity.SalesLink, error)

	// FindBySlug busca link por slug (para landing page pública)
	FindBySlug(ctx context.Context, slug string) (*entity.SalesLink, error)

	// FindByCreatorID busca links criados por um usuário
	FindByCreatorID(ctx context.Context, userID string, filters entity.SalesLinkFilters) ([]entity.SalesLink, int, error)

	// FindByType busca links por tipo
	FindByType(ctx context.Context, linkType entity.LinkType) ([]entity.SalesLink, error)

	// List lista links com filtros e paginação
	List(ctx context.Context, filters entity.SalesLinkFilters) ([]entity.SalesLink, int, error)

	// Update atualiza os dados do link
	Update(ctx context.Context, link *entity.SalesLink) error

	// SoftDelete desativa o link (soft delete)
	SoftDelete(ctx context.Context, id string) error

	// ExistsBySlug verifica se o slug já está em uso
	ExistsBySlug(ctx context.Context, slug string) (bool, error)

	// IncrementViews incrementa o contador de visualizações atomicamente
	IncrementViews(ctx context.Context, id string) error

	// CountActive conta links ativos de um usuário
	CountActive(ctx context.Context, userID string) (int, error)

	// FindItemsByLinkID busca todos os itens de um link
	FindItemsByLinkID(ctx context.Context, linkID string) ([]entity.SalesLinkItem, error)
}