package repository

import (
	"context"
	"database/sql"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type leadRepository struct {
	db *DB
}

func NewLeadRepository(db *DB) *leadRepository {
	return &leadRepository{db: db}
}

func (r *leadRepository) Create(ctx context.Context, tx *sql.Tx, lead *entity.Lead) error {
	query := `
		INSERT INTO leads (
			id, sales_link_id, name, contact, message, marketing_opt_in, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at, last_interaction
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			lead.ID, lead.SalesLinkID, lead.Name, lead.Contact,
			lead.Message, lead.MarketingOptIn, lead.Status,
		).Scan(&lead.CreatedAt, &lead.UpdatedAt, &lead.UpdatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			lead.ID, lead.SalesLinkID, lead.Name, lead.Contact,
			lead.Message, lead.MarketingOptIn, lead.Status,
		).Scan(&lead.CreatedAt, &lead.UpdatedAt, &lead.UpdatedAt)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *leadRepository) FindByID(ctx context.Context, id string) (*entity.Lead, error) {
	query := `
		SELECT id, sales_link_id, name, contact, message, marketing_opt_in,
		       status, created_at, updated_at
		FROM leads
		WHERE id = $1
	`

	lead := &entity.Lead{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&lead.ID, &lead.SalesLinkID, &lead.Name, &lead.Contact,
		&lead.Message, &lead.MarketingOptIn, &lead.Status,
		&lead.CreatedAt, &lead.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Lead")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return lead, nil
}

func (r *leadRepository) FindByContact(ctx context.Context, contact string) (*entity.Lead, error) {
	query := `
		SELECT id, sales_link_id, name, contact, message, marketing_opt_in,
		       status, created_at, updated_at
		FROM leads
		WHERE contact = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	lead := &entity.Lead{}
	err := r.db.QueryRowContext(ctx, query, contact).Scan(
		&lead.ID, &lead.SalesLinkID, &lead.Name, &lead.Contact,
		&lead.Message, &lead.MarketingOptIn, &lead.Status,
		&lead.CreatedAt, &lead.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Lead")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return lead, nil
}

func (r *leadRepository) FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.Lead, error) {
	query := `
		SELECT id, sales_link_id, name, contact, message, marketing_opt_in,
		       status, created_at, updated_at
		FROM leads
		WHERE sales_link_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, salesLinkID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanLeads(rows)
}

func (r *leadRepository) List(ctx context.Context, filters entity.LeadFilters) ([]entity.Lead, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	query := psql.Select(
		"id", "sales_link_id", "name", "contact", "message",
		"marketing_opt_in", "status", "created_at", "updated_at",
	).From("leads")

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
	countQuery := psql.Select("COUNT(*)").From("leads")
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

	leads, err := r.scanLeads(rows)
	if err != nil {
		return nil, 0, err
	}

	return leads, total, nil
}

func (r *leadRepository) Update(ctx context.Context, tx *sql.Tx, lead *entity.Lead) error {
	query := `
		UPDATE leads
		SET name = $1, contact = $2, message = $3, marketing_opt_in = $4,
		    status = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
		RETURNING updated_at
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			lead.Name, lead.Contact, lead.Message, lead.MarketingOptIn,
			lead.Status, lead.ID,
		).Scan(&lead.UpdatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			lead.Name, lead.Contact, lead.Message, lead.MarketingOptIn,
			lead.Status, lead.ID,
		).Scan(&lead.UpdatedAt)
	}

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Lead")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *leadRepository) UpdateStatus(ctx context.Context, id string, status entity.LeadStatus) error {
	query := `
		UPDATE leads
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
		return errors.NewNotFoundError("Lead")
	}

	return nil
}

func (r *leadRepository) UpdateLastInteraction(ctx context.Context, tx *sql.Tx, id string) error {
	query := `
		UPDATE leads
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

func (r *leadRepository) CountByIndustry(ctx context.Context, industryID string) (int, error) {
	query := `
		SELECT COUNT(DISTINCT l.id)
		FROM leads l
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

func (r *leadRepository) scanLeads(rows *sql.Rows) ([]entity.Lead, error) {
	leads := []entity.Lead{}
	for rows.Next() {
		var l entity.Lead
		if err := rows.Scan(
			&l.ID, &l.SalesLinkID, &l.Name, &l.Contact, &l.Message,
			&l.MarketingOptIn, &l.Status, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		leads = append(leads, l)
	}
	return leads, nil
}