package repository

import (
	"context"
	"database/sql"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type leadInteractionRepository struct {
	db *DB
}

func NewLeadInteractionRepository(db *DB) *leadInteractionRepository {
	return &leadInteractionRepository{db: db}
}

func (r *leadInteractionRepository) Create(ctx context.Context, tx *sql.Tx, interaction *entity.LeadInteraction) error {
	query := `
		INSERT INTO lead_interactions (
			id, lead_id, sales_link_id, target_batch_id, target_product_id,
			message, interaction_type
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			interaction.ID, interaction.LeadID, interaction.SalesLinkID,
			interaction.TargetBatchID, interaction.TargetProductID,
			interaction.Message, interaction.InteractionType,
		).Scan(&interaction.CreatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			interaction.ID, interaction.LeadID, interaction.SalesLinkID,
			interaction.TargetBatchID, interaction.TargetProductID,
			interaction.Message, interaction.InteractionType,
		).Scan(&interaction.CreatedAt)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *leadInteractionRepository) FindByLeadID(ctx context.Context, leadID string) ([]entity.LeadInteraction, error) {
	query := `
		SELECT id, lead_id, sales_link_id, target_batch_id, target_product_id,
		       message, interaction_type, created_at
		FROM lead_interactions
		WHERE lead_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, leadID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanInteractions(rows)
}

func (r *leadInteractionRepository) FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.LeadInteraction, error) {
	query := `
		SELECT id, lead_id, sales_link_id, target_batch_id, target_product_id,
		       message, interaction_type, created_at
		FROM lead_interactions
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

func (r *leadInteractionRepository) FindByID(ctx context.Context, id string) (*entity.LeadInteraction, error) {
	query := `
		SELECT id, lead_id, sales_link_id, target_batch_id, target_product_id,
		       message, interaction_type, created_at
		FROM lead_interactions
		WHERE id = $1
	`

	interaction := &entity.LeadInteraction{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&interaction.ID, &interaction.LeadID, &interaction.SalesLinkID,
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

func (r *leadInteractionRepository) scanInteractions(rows *sql.Rows) ([]entity.LeadInteraction, error) {
	interactions := []entity.LeadInteraction{}
	for rows.Next() {
		var i entity.LeadInteraction
		if err := rows.Scan(
			&i.ID, &i.LeadID, &i.SalesLinkID, &i.TargetBatchID,
			&i.TargetProductID, &i.Message, &i.InteractionType, &i.CreatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		interactions = append(interactions, i)
	}
	return interactions, nil
}