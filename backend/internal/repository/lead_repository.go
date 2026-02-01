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
			id, sales_link_id, name, email, phone, whatsapp, message, marketing_opt_in, created_by
		) VALUES ($1, CASE WHEN $2 = '' THEN NULL ELSE $2::uuid END, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at, last_interaction
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			cliente.ID, cliente.SalesLinkID, cliente.Name,
			cliente.Email, cliente.Phone, cliente.Whatsapp,
			cliente.Message, cliente.MarketingOptIn, cliente.CreatedByUserID,
		).Scan(&cliente.CreatedAt, &cliente.UpdatedAt, &cliente.UpdatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			cliente.ID, cliente.SalesLinkID, cliente.Name,
			cliente.Email, cliente.Phone, cliente.Whatsapp,
			cliente.Message, cliente.MarketingOptIn, cliente.CreatedByUserID,
		).Scan(&cliente.CreatedAt, &cliente.UpdatedAt, &cliente.UpdatedAt)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *clienteRepository) FindByID(ctx context.Context, id string) (*entity.Cliente, error) {
	query := `
		SELECT id, COALESCE(sales_link_id::text, ''), name, email, phone, whatsapp,
		       message, marketing_opt_in, created_at, updated_at, created_by
		FROM clientes
		WHERE id = $1
	`

	cliente := &entity.Cliente{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&cliente.ID, &cliente.SalesLinkID, &cliente.Name,
		&cliente.Email, &cliente.Phone, &cliente.Whatsapp,
		&cliente.Message, &cliente.MarketingOptIn,
		&cliente.CreatedAt, &cliente.UpdatedAt, &cliente.CreatedByUserID,
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
		SELECT id, COALESCE(sales_link_id::text, ''), name, email, phone, whatsapp,
		       message, marketing_opt_in, created_at, updated_at, created_by
		FROM clientes
		WHERE email = $1 OR phone = $1 OR whatsapp = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	cliente := &entity.Cliente{}
	err := r.db.QueryRowContext(ctx, query, contact).Scan(
		&cliente.ID, &cliente.SalesLinkID, &cliente.Name,
		&cliente.Email, &cliente.Phone, &cliente.Whatsapp,
		&cliente.Message, &cliente.MarketingOptIn,
		&cliente.CreatedAt, &cliente.UpdatedAt, &cliente.CreatedByUserID,
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
		SELECT id, COALESCE(sales_link_id::text, ''), name, email, phone, whatsapp,
		       message, marketing_opt_in, created_at, updated_at, created_by
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

	// Verifica se precisa fazer JOIN com sales_links para filtros de escopo
	needsJoin := filters.IndustryID != nil || filters.CreatedByUserID != nil

	var query sq.SelectBuilder
	if needsJoin {
		// Se tem filtros de escopo, fazemos JOIN com sales_links e users
		// LEFT JOIN sales_links sl ON c.sales_link_id = sl.id
		// LEFT JOIN users u ON c.created_by = u.id
		query = psql.Select(
			"c.id", "COALESCE(c.sales_link_id::text, '')", "c.name", "c.email", "c.phone", "c.whatsapp",
			"c.message", "c.marketing_opt_in", "c.created_at", "c.updated_at", "c.created_by",
		).From("clientes c").
			LeftJoin("sales_links sl ON c.sales_link_id = sl.id").
			LeftJoin("users u ON c.created_by = u.id")
	} else {
		query = psql.Select(
			"id", "COALESCE(sales_link_id::text, '')", "name", "email", "phone", "whatsapp",
			"message", "marketing_opt_in", "created_at", "updated_at", "created_by",
		).From("clientes")
	}

	// Aplicar filtros de escopo
	if filters.IndustryID != nil {
		// Cliente pertence à indústria se veio de um link da indústria OU foi criado por usuário da indústria
		query = query.Where(sq.Or{
			sq.Eq{"sl.industry_id": *filters.IndustryID},
			sq.Eq{"u.industry_id": *filters.IndustryID},
		})
	}
	if filters.CreatedByUserID != nil {
		// Cliente pertence ao usuário se veio de um link do usuário OU foi criado pelo usuário
		query = query.Where(sq.Or{
			sq.Eq{"sl.created_by_user_id": *filters.CreatedByUserID},
			sq.Eq{"c.created_by": *filters.CreatedByUserID},
		})
	}

	// Prefixo para colunas (depende do JOIN)
	colPrefix := ""
	if needsJoin {
		colPrefix = "c."
	}

	if filters.LinkID != nil {
		query = query.Where(sq.Eq{colPrefix + "sales_link_id": *filters.LinkID})
	}

	if filters.OptIn != nil {
		query = query.Where(sq.Eq{colPrefix + "marketing_opt_in": *filters.OptIn})
	}

	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		query = query.Where(sq.Or{
			sq.ILike{colPrefix + "name": search},
			sq.ILike{colPrefix + "email": search},
			sq.ILike{colPrefix + "phone": search},
		})
	}

	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			query = query.Where(sq.GtOrEq{colPrefix + "created_at": startDate})
		}
	}

	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			query = query.Where(sq.LtOrEq{colPrefix + "created_at": endDate})
		}
	}

	// Count query
	var countQuery sq.SelectBuilder
	if needsJoin {
		countQuery = psql.Select("COUNT(*)").From("clientes c").
			LeftJoin("sales_links sl ON c.sales_link_id = sl.id").
			LeftJoin("users u ON c.created_by = u.id")
	} else {
		countQuery = psql.Select("COUNT(*)").From("clientes")
	}

	// Aplicar mesmos filtros de escopo no count
	if filters.IndustryID != nil {
		countQuery = countQuery.Where(sq.Or{
			sq.Eq{"sl.industry_id": *filters.IndustryID},
			sq.Eq{"u.industry_id": *filters.IndustryID},
		})
	}
	if filters.CreatedByUserID != nil {
		countQuery = countQuery.Where(sq.Or{
			sq.Eq{"sl.created_by_user_id": *filters.CreatedByUserID},
			sq.Eq{"c.created_by": *filters.CreatedByUserID},
		})
	}
	if filters.LinkID != nil {
		countQuery = countQuery.Where(sq.Eq{colPrefix + "sales_link_id": *filters.LinkID})
	}
	if filters.OptIn != nil {
		countQuery = countQuery.Where(sq.Eq{colPrefix + "marketing_opt_in": *filters.OptIn})
	}
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		countQuery = countQuery.Where(sq.Or{
			sq.ILike{colPrefix + "name": search},
			sq.ILike{colPrefix + "email": search},
			sq.ILike{colPrefix + "phone": search},
		})
	}
	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			countQuery = countQuery.Where(sq.GtOrEq{colPrefix + "created_at": startDate})
		}
	}
	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			countQuery = countQuery.Where(sq.LtOrEq{colPrefix + "created_at": endDate})
		}
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Pagination
	offset := (filters.Page - 1) * filters.Limit

	// Validate and apply sorting
	sortBy := filters.GetSortBy()
	sortOrder := filters.GetSortOrder()
	if !filters.IsValidSortField() {
		sortBy = "created_at"
	}
	if !filters.IsValidSortOrder() {
		sortOrder = "desc"
	}

	query = query.OrderBy(colPrefix + sortBy + " " + sortOrder).Limit(uint64(filters.Limit)).Offset(uint64(offset))

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
		SET name = $1, email = $2, phone = $3, whatsapp = $4,
		    message = $5, marketing_opt_in = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $7
		RETURNING updated_at
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			cliente.Name, cliente.Email, cliente.Phone, cliente.Whatsapp,
			cliente.Message, cliente.MarketingOptIn, cliente.ID,
		).Scan(&cliente.UpdatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			cliente.Name, cliente.Email, cliente.Phone, cliente.Whatsapp,
			cliente.Message, cliente.MarketingOptIn, cliente.ID,
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
			&l.ID, &l.SalesLinkID, &l.Name, &l.Email, &l.Phone, &l.Whatsapp,
			&l.Message, &l.MarketingOptIn, &l.CreatedAt, &l.UpdatedAt, &l.CreatedByUserID,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		clientes = append(clientes, l)
	}
	return clientes, nil
}
