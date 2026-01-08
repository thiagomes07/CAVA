package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type reservationRepository struct {
	db *DB
}

func NewReservationRepository(db *DB) *reservationRepository {
	return &reservationRepository{db: db}
}

func (r *reservationRepository) Create(ctx context.Context, tx *sql.Tx, reservation *entity.Reservation) error {
	query := `
		INSERT INTO reservations (
			id, batch_id, reserved_by_user_id, lead_id, status, notes, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at
	`

	err := tx.QueryRowContext(ctx, query,
		reservation.ID, reservation.BatchID, reservation.ReservedByUserID,
		reservation.LeadID, reservation.Status, reservation.Notes,
		reservation.ExpiresAt,
	).Scan(&reservation.CreatedAt)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *reservationRepository) FindByID(ctx context.Context, id string) (*entity.Reservation, error) {
	query := `
		SELECT id, batch_id, reserved_by_user_id, lead_id, status, notes,
		       expires_at, created_at, is_active
		FROM reservations
		WHERE id = $1
	`

	res := &entity.Reservation{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&res.ID, &res.BatchID, &res.ReservedByUserID, &res.LeadID,
		&res.Status, &res.Notes, &res.ExpiresAt, &res.CreatedAt, &res.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Reserva")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return res, nil
}

func (r *reservationRepository) FindByBatchID(ctx context.Context, batchID string) ([]entity.Reservation, error) {
	query := `
		SELECT id, batch_id, reserved_by_user_id, lead_id, status, notes,
		       expires_at, created_at, is_active
		FROM reservations
		WHERE batch_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, batchID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanReservations(rows)
}

func (r *reservationRepository) FindActive(ctx context.Context, userID string) ([]entity.Reservation, error) {
	query := `
		SELECT id, batch_id, reserved_by_user_id, lead_id, status, notes,
		       expires_at, created_at, is_active
		FROM reservations
		WHERE reserved_by_user_id = $1 
		  AND status = 'ATIVA'
		  AND is_active = TRUE
		  AND expires_at > CURRENT_TIMESTAMP
		ORDER BY expires_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanReservations(rows)
}

func (r *reservationRepository) FindExpired(ctx context.Context) ([]entity.Reservation, error) {
	query := `
		SELECT id, batch_id, reserved_by_user_id, lead_id, status, notes,
		       expires_at, created_at, is_active
		FROM reservations
		WHERE status = 'ATIVA'
		  AND expires_at < CURRENT_TIMESTAMP
		ORDER BY expires_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanReservations(rows)
}

func (r *reservationRepository) Update(ctx context.Context, reservation *entity.Reservation) error {
	query := `
		UPDATE reservations
		SET notes = $1, expires_at = $2, status = $3
		WHERE id = $4
	`

	result, err := r.db.ExecContext(ctx, query,
		reservation.Notes, reservation.ExpiresAt, reservation.Status, reservation.ID,
	)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Reserva")
	}

	return nil
}

func (r *reservationRepository) UpdateStatus(ctx context.Context, tx *sql.Tx, id string, status entity.ReservationStatus) error {
	query := `
		UPDATE reservations
		SET status = $1
		WHERE id = $2
	`

	var result sql.Result
	var err error

	if tx != nil {
		result, err = tx.ExecContext(ctx, query, status, id)
	} else {
		result, err = r.db.ExecContext(ctx, query, status, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Reserva")
	}

	return nil
}

func (r *reservationRepository) Cancel(ctx context.Context, tx *sql.Tx, id string) error {
	query := `
		UPDATE reservations
		SET status = 'CANCELADA', is_active = FALSE
		WHERE id = $1
	`

	var result sql.Result
	var err error

	if tx != nil {
		result, err = tx.ExecContext(ctx, query, id)
	} else {
		result, err = r.db.ExecContext(ctx, query, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Reserva")
	}

	return nil
}

func (r *reservationRepository) List(ctx context.Context, filters entity.ReservationFilters) ([]entity.Reservation, error) {
	query := `
		SELECT id, batch_id, reserved_by_user_id, lead_id, status, notes,
		       expires_at, created_at, is_active
		FROM reservations
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 1

	if filters.BatchID != nil {
		query += ` AND batch_id = $` + string(rune('0'+argCount))
		args = append(args, *filters.BatchID)
		argCount++
	}

	if filters.Status != nil {
		query += ` AND status = $` + string(rune('0'+argCount))
		args = append(args, *filters.Status)
		argCount++
	}

	// Paginação
	offset := (filters.Page - 1) * filters.Limit
	query += ` ORDER BY created_at DESC`
	query += ` LIMIT $` + string(rune('0'+argCount))
	args = append(args, filters.Limit)
	argCount++
	query += ` OFFSET $` + string(rune('0'+argCount))
	args = append(args, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanReservations(rows)
}

func (r *reservationRepository) scanReservations(rows *sql.Rows) ([]entity.Reservation, error) {
	reservations := []entity.Reservation{}
	for rows.Next() {
		var res entity.Reservation
		if err := rows.Scan(
			&res.ID, &res.BatchID, &res.ReservedByUserID, &res.LeadID,
			&res.Status, &res.Notes, &res.ExpiresAt, &res.CreatedAt, &res.IsActive,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		reservations = append(reservations, res)
	}
	return reservations, nil
}