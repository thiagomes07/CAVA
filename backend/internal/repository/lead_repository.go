package repository

import (
	"context"
	"database/sql"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type clienteRepository struct {
	db *DB
}

func NewClienteRepository(db *DB) *clienteRepository {
	return &clienteRepository{db: db}
}

func (r *clienteRepository) Create(ctx context.Context, tx *sql.Tx, cliente *entity.Cliente) error {
	query := `
		INSERT INTO clientes (
			id, sales_link_id, name, contact, message, marketing_opt_in, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at, last_interaction
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			cliente.ID, cliente.SalesLinkID, cliente.Name, cliente.Contact,
			cliente.Message, cliente.MarketingOptIn, cliente.Status,
		).Scan(&cliente.CreatedAt, &cliente.UpdatedAt, &cliente.UpdatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			cliente.ID, cliente.SalesLinkID, cliente.Name, cliente.Contact,
			cliente.Message, cliente.MarketingOptIn, cliente.Status,
		).Scan(&cliente.CreatedAt, &cliente.UpdatedAt, &cliente.UpdatedAt)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *clienteRepository) FindByID(ctx context.Context, id string) (*entity.Cliente, error) {
	query := `
		SELECT id, sales_link_id, name, contact, message, marketing_opt_in,
		       status, created_at, updated_at
		FROM clientes
		WHERE id = $1
	`

	cliente := &entity.Cliente{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&cliente.ID, &cliente.SalesLinkID, &cliente.Name, &cliente.Contact,
		&cliente.Message, &cliente.MarketingOptIn, &cliente.Status,
		&cliente.CreatedAt, &cliente.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Cliente")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return cliente, nil
}

func (r *clienteRepository) FindByContact(ctx context.Context, contact string) (*entity.Cliente, error) {
	query := `
		SELECT id, sales_link_id, name, contact, message, marketing_opt_in,
		       status, created_at, updated_at
		FROM clientes
		WHERE contact = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	cliente := &entity.Cliente{}
	err := r.db.QueryRowContext(ctx, query, contact).Scan(
		&cliente.ID, &cliente.SalesLinkID, &cliente.Name, &cliente.Contact,
		&cliente.Message, &cliente.MarketingOptIn, &cliente.Status,
		&cliente.CreatedAt, &cliente.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Cliente")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return cliente, nil
}

func (r *clienteRepository) FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.Cliente, error) {
	query := `
		SELECT id, sales_link_id, name, contact, message, marketing_opt_in,
		       status, created_at, updated_at
		FROM clientes
		WHERE sales_link_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, salesLinkID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanClientes(rows)
}

func (r *clienteRepository) List(ctx context.Context, filters entity.ClienteFilters) ([]entity.Cliente, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	query := psql.Select(
		"id", "sales_link_id", "name", "contact", "message",
		"marketing_opt_in", "status", "created_at", "updated_at",
	).From("clientes")

	if filters.LinkID != nil {
		query = query.Where(sq.Eq{"sales_link_id": *filters.LinkID})
	}

	if filters.Status != nil {
		query = query.Where(sq.Eq{"status": *filters.Status})
	}

	if filters.OptIn != nil {
		query = query.Where(sq.Eq{"marketing_opt_in": *filters.OptIn})
	}

	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		query = query.Where(sq.Or{
			sq.ILike{"name": search},
			sq.ILike{"contact": search},
		})
	}

	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			query = query.Where(sq.GtOrEq{"created_at": startDate})
		}
	}

	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			query = query.Where(sq.LtOrEq{"created_at": endDate})
		}
	}

	// Count
	countQuery := psql.Select("COUNT(*)").From("clientes")
	if filters.LinkID != nil {
		countQuery = countQuery.Where(sq.Eq{"sales_link_id": *filters.LinkID})
	}
	if filters.Status != nil {
		countQuery = countQuery.Where(sq.Eq{"status": *filters.Status})
	}
	if filters.OptIn != nil {
		countQuery = countQuery.Where(sq.Eq{"marketing_opt_in": *filters.OptIn})
	}
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		countQuery = countQuery.Where(sq.Or{
			sq.ILike{"name": search},
			sq.ILike{"contact": search},
		})
	}
	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			countQuery = countQuery.Where(sq.GtOrEq{"created_at": startDate})
		}
	}
	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			countQuery = countQuery.Where(sq.LtOrEq{"created_at": endDate})
		}
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Pagination
	offset := (filters.Page - 1) * filters.Limit
	query = query.OrderBy("created_at DESC").Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	clientes, err := r.scanClientes(rows)
	if err != nil {
		return nil, 0, err
	}

	return clientes, total, nil
}

func (r *clienteRepository) Update(ctx context.Context, tx *sql.Tx, cliente *entity.Cliente) error {
	query := `
		UPDATE clientes
		SET name = $1, contact = $2, message = $3, marketing_opt_in = $4,
		    status = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
		RETURNING updated_at
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			cliente.Name, cliente.Contact, cliente.Message, cliente.MarketingOptIn,
			cliente.Status, cliente.ID,
		).Scan(&cliente.UpdatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			cliente.Name, cliente.Contact, cliente.Message, cliente.MarketingOptIn,
			cliente.Status, cliente.ID,
		).Scan(&cliente.UpdatedAt)
	}

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Cliente")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *clienteRepository) UpdateStatus(ctx context.Context, id string, status entity.ClienteStatus) error {
	query := `
		UPDATE clientes
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Cliente")
	}

	return nil
}

func (r *clienteRepository) UpdateLastInteraction(ctx context.Context, tx *sql.Tx, id string) error {
	query := `
		UPDATE clientes
		SET last_interaction = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	var err error
	if tx != nil {
		_, err = tx.ExecContext(ctx, query, id)
	} else {
		_, err = r.db.ExecContext(ctx, query, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *clienteRepository) CountByIndustry(ctx context.Context, industryID string) (int, error) {
	query := `
		SELECT COUNT(DISTINCT l.id)
		FROM clientes l
		INNER JOIN sales_links sl ON l.sales_link_id = sl.id
		WHERE sl.industry_id = $1
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, industryID).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

func (r *clienteRepository) scanClientes(rows *sql.Rows) ([]entity.Cliente, error) {
	clientes := []entity.Cliente{}
	for rows.Next() {
		var l entity.Cliente
		if err := rows.Scan(
			&l.ID, &l.SalesLinkID, &l.Name, &l.Contact, &l.Message,
			&l.MarketingOptIn, &l.Status, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		clientes = append(clientes, l)
	}
	return clientes, nil
}
