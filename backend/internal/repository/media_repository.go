package repository

import (
	"context"
	"database/sql"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type mediaRepository struct {
	db *DB
}

func NewMediaRepository(db *DB) *mediaRepository {
	return &mediaRepository{db: db}
}

func (r *mediaRepository) FindProductMediaByID(ctx context.Context, id string) (*entity.ProductMedia, error) {
	query := `
		SELECT id, product_id, url, display_order, is_cover, created_at
		FROM product_medias
		WHERE id = $1
	`

	var m entity.ProductMedia
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&m.ID, &m.ProductID, &m.URL, &m.DisplayOrder, &m.IsCover, &m.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.NewNotFoundError("Mídia de produto")
		}
		return nil, errors.DatabaseError(err)
	}

	return &m, nil
}

func (r *mediaRepository) FindBatchMediaByID(ctx context.Context, id string) (*entity.BatchMedia, error) {
	query := `
		SELECT id, batch_id, url, display_order, created_at
		FROM batch_medias
		WHERE id = $1
	`

	var m entity.BatchMedia
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&m.ID, &m.BatchID, &m.URL, &m.DisplayOrder, &m.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.NewNotFoundError("Mídia de lote")
		}
		return nil, errors.DatabaseError(err)
	}

	return &m, nil
}

func (r *mediaRepository) CreateProductMedia(ctx context.Context, productID string, media *entity.CreateMediaInput) error {
	query := `
		INSERT INTO product_medias (id, product_id, url, display_order, is_cover)
		VALUES (gen_random_uuid(), $1, $2, $3, $4)
	`

	_, err := r.db.ExecContext(ctx, query,
		productID, media.URL, media.DisplayOrder, media.IsCover,
	)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *mediaRepository) CreateBatchMedia(ctx context.Context, batchID string, media *entity.CreateMediaInput) error {
	query := `
		INSERT INTO batch_medias (id, batch_id, url, display_order)
		VALUES (gen_random_uuid(), $1, $2, $3)
	`

	_, err := r.db.ExecContext(ctx, query,
		batchID, media.URL, media.DisplayOrder,
	)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *mediaRepository) FindProductMedias(ctx context.Context, productID string) ([]entity.Media, error) {
	query := `
		SELECT id, url, display_order, is_cover, created_at
		FROM product_medias
		WHERE product_id = $1
		ORDER BY display_order, created_at
	`

	rows, err := r.db.QueryContext(ctx, query, productID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	medias := []entity.Media{}
	for rows.Next() {
		var m entity.Media
		if err := rows.Scan(
			&m.ID, &m.URL, &m.DisplayOrder, &m.IsCover, &m.CreatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		medias = append(medias, m)
	}

	return medias, nil
}

func (r *mediaRepository) FindBatchMedias(ctx context.Context, batchID string) ([]entity.Media, error) {
	query := `
		SELECT id, url, display_order, created_at
		FROM batch_medias
		WHERE batch_id = $1
		ORDER BY display_order, created_at
	`

	rows, err := r.db.QueryContext(ctx, query, batchID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	medias := []entity.Media{}
	for rows.Next() {
		var m entity.Media
		m.IsCover = false // batch_medias não tem is_cover
		if err := rows.Scan(
			&m.ID, &m.URL, &m.DisplayOrder, &m.CreatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		medias = append(medias, m)
	}

	return medias, nil
}

func (r *mediaRepository) DeleteProductMedia(ctx context.Context, id string) error {
	query := `DELETE FROM product_medias WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Mídia")
	}

	return nil
}

func (r *mediaRepository) DeleteBatchMedia(ctx context.Context, id string) error {
	query := `DELETE FROM batch_medias WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Mídia")
	}

	return nil
}

func (r *mediaRepository) UpdateDisplayOrder(ctx context.Context, id string, order int) error {
	query := `
		UPDATE product_medias 
		SET display_order = $1 
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, order, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		// Tentar batch_medias
		query = `
			UPDATE batch_medias 
			SET display_order = $1 
			WHERE id = $2
		`
		result, err = r.db.ExecContext(ctx, query, order, id)
		if err != nil {
			return errors.DatabaseError(err)
		}

		rows, err = result.RowsAffected()
		if err != nil {
			return errors.DatabaseError(err)
		}

		if rows == 0 {
			return errors.NewNotFoundError("Mídia")
		}
	}

	return nil
}

func (r *mediaRepository) SetCover(ctx context.Context, productID, mediaID string) error {
	return r.db.ExecuteInTx(ctx, func(tx *sql.Tx) error {
		// Remover flag is_cover de todas as mídias do produto
		query1 := `
			UPDATE product_medias 
			SET is_cover = FALSE 
			WHERE product_id = $1
		`
		if _, err := tx.ExecContext(ctx, query1, productID); err != nil {
			return errors.DatabaseError(err)
		}

		// Setar nova capa
		query2 := `
			UPDATE product_medias 
			SET is_cover = TRUE 
			WHERE id = $1 AND product_id = $2
		`
		result, err := tx.ExecContext(ctx, query2, mediaID, productID)
		if err != nil {
			return errors.DatabaseError(err)
		}

		rows, err := result.RowsAffected()
		if err != nil {
			return errors.DatabaseError(err)
		}

		if rows == 0 {
			return errors.NewNotFoundError("Mídia")
		}

		return nil
	})
}
