package repository

import (
	"context"
	"database/sql"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type clienteInteractionRepository struct {
	db *DB
}

func NewClienteInteractionRepository(db *DB) *clienteInteractionRepository {
	return &clienteInteractionRepository{db: db}
}

func (r *clienteInteractionRepository) Create(ctx context.Context, tx *sql.Tx, interaction *entity.ClienteInteraction) error {
	query := `
		INSERT INTO cliente_interactions (
			id, cliente_id, sales_link_id, target_batch_id, target_product_id,
			message, interaction_type
		) VALUES (
			$1, $2, 
			CASE WHEN $3 = '' THEN NULL ELSE $3::uuid END, 
			$4, $5, $6, $7
		)
		RETURNING created_at
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			interaction.ID, interaction.ClienteID, interaction.SalesLinkID,
			interaction.TargetBatchID, interaction.TargetProductID,
			interaction.Message, interaction.InteractionType,
		).Scan(&interaction.CreatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			interaction.ID, interaction.ClienteID, interaction.SalesLinkID,
			interaction.TargetBatchID, interaction.TargetProductID,
			interaction.Message, interaction.InteractionType,
		).Scan(&interaction.CreatedAt)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *clienteInteractionRepository) FindByClienteID(ctx context.Context, clienteID string) ([]entity.ClienteInteraction, error) {
	query := `
		SELECT id, cliente_id, sales_link_id, target_batch_id, target_product_id,
		       message, interaction_type, created_at
		FROM cliente_interactions
		WHERE cliente_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, clienteID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanInteractions(rows)
}

func (r *clienteInteractionRepository) FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.ClienteInteraction, error) {
	query := `
		SELECT id, cliente_id, sales_link_id, target_batch_id, target_product_id,
		       message, interaction_type, created_at
		FROM cliente_interactions
		WHERE sales_link_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, salesLinkID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanInteractions(rows)
}

func (r *clienteInteractionRepository) FindByID(ctx context.Context, id string) (*entity.ClienteInteraction, error) {
	query := `
		SELECT id, cliente_id, sales_link_id, target_batch_id, target_product_id,
		       message, interaction_type, created_at
		FROM cliente_interactions
		WHERE id = $1
	`

	interaction := &entity.ClienteInteraction{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&interaction.ID, &interaction.ClienteID, &interaction.SalesLinkID,
		&interaction.TargetBatchID, &interaction.TargetProductID,
		&interaction.Message, &interaction.InteractionType, &interaction.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Interação")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return interaction, nil
}

func (r *clienteInteractionRepository) scanInteractions(rows *sql.Rows) ([]entity.ClienteInteraction, error) {
	interactions := []entity.ClienteInteraction{}
	for rows.Next() {
		var i entity.ClienteInteraction
		if err := rows.Scan(
			&i.ID, &i.ClienteID, &i.SalesLinkID, &i.TargetBatchID,
			&i.TargetProductID, &i.Message, &i.InteractionType, &i.CreatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		interactions = append(interactions, i)
	}
	return interactions, nil
}
