package repository

import (
	"context"
	"database/sql"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// BatchRepository define o contrato para operações com lotes
type BatchRepository interface {
	// Create cria um novo lote
	Create(ctx context.Context, batch *entity.Batch) error

	// FindByID busca lote por ID
	FindByID(ctx context.Context, id string) (*entity.Batch, error)

	// FindByIDForUpdate busca lote por ID com lock pessimista (SELECT FOR UPDATE)
	FindByIDForUpdate(ctx context.Context, tx *sql.Tx, id string) (*entity.Batch, error)

	// FindByProductID busca lotes por produto
	FindByProductID(ctx context.Context, productID string) ([]entity.Batch, error)

	// FindByStatus busca lotes por status
	FindByStatus(ctx context.Context, industryID string, status entity.BatchStatus) ([]entity.Batch, error)

	// FindAvailable busca lotes disponíveis (com chapas disponíveis)
	FindAvailable(ctx context.Context, industryID string) ([]entity.Batch, error)

	// FindByCode busca lotes por código (busca parcial)
	FindByCode(ctx context.Context, industryID, code string) ([]entity.Batch, error)

	// List lista lotes com filtros e paginação
	List(ctx context.Context, industryID string, filters entity.BatchFilters) ([]entity.Batch, int, error)

	// Update atualiza os dados do lote
	Update(ctx context.Context, batch *entity.Batch) error

	// UpdateStatus atualiza apenas o status do lote
	UpdateStatus(ctx context.Context, tx *sql.Tx, id string, status entity.BatchStatus) error

	// UpdateAvailableSlabs atualiza a quantidade de chapas disponíveis
	UpdateAvailableSlabs(ctx context.Context, tx *sql.Tx, id string, availableSlabs int) error

	// UpdateSlabCounts atualiza a distribuição de chapas
	UpdateSlabCounts(ctx context.Context, tx *sql.Tx, id string, available, reserved, sold, inactive int) error

	// DecrementAvailableSlabs decrementa a quantidade de chapas disponíveis
	DecrementAvailableSlabs(ctx context.Context, tx *sql.Tx, id string, quantity int) error

	// IncrementAvailableSlabs incrementa a quantidade de chapas disponíveis
	IncrementAvailableSlabs(ctx context.Context, tx *sql.Tx, id string, quantity int) error

	// CountByStatus conta lotes por status
	CountByStatus(ctx context.Context, industryID string, status entity.BatchStatus) (int, error)

	// ExistsByCode verifica se o código de lote já existe na indústria
	ExistsByCode(ctx context.Context, industryID, code string) (bool, error)

	// Archive arquiva um lote (soft delete)
	Archive(ctx context.Context, id string) error

	// Restore restaura um lote arquivado
	Restore(ctx context.Context, id string) error

	// Delete remove permanentemente um lote
	Delete(ctx context.Context, id string) error
}
