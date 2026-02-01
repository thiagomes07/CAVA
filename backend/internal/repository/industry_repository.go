package repository

import (
	"context"
	"database/sql"

	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type industryRepository struct {
	db *DB
}

func NewIndustryRepository(db *DB) *industryRepository {
	return &industryRepository{db: db}
}

func (r *industryRepository) Create(ctx context.Context, industry *entity.Industry) error {
	query := `
		INSERT INTO industries (id, name, cnpj, slug, contact_email, contact_phone, whatsapp,
			description, city, state, banner_url, logo_url, social_links,
			address_country, address_state, address_city, address_street, address_number, address_zip_code, is_public)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		industry.ID, industry.Name, industry.CNPJ, industry.Slug,
		industry.ContactEmail, industry.ContactPhone, industry.Whatsapp,
		industry.Description, industry.City, industry.State, industry.BannerURL, industry.LogoURL, industry.SocialLinks,
		industry.AddressCountry, industry.AddressState, industry.AddressCity, industry.AddressStreet,
		industry.AddressNumber, industry.AddressZipCode, industry.IsPublic,
	).Scan(&industry.CreatedAt, &industry.UpdatedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				if pqErr.Constraint == "industries_cnpj_key" {
					return errors.NewConflictError("CNPJ já cadastrado")
				}
				if pqErr.Constraint == "industries_slug_key" {
					return errors.NewConflictError("Slug já em uso")
				}
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *industryRepository) FindByID(ctx context.Context, id string) (*entity.Industry, error) {
	query := `
		SELECT id, name, cnpj, slug, contact_email, contact_phone, whatsapp,
		       description, city, state, banner_url, logo_url, social_links,
		       address_country, address_state, address_city, address_street, address_number, address_zip_code,
		       is_public, created_at, updated_at
		FROM industries
		WHERE id = $1
	`

	industry := &entity.Industry{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&industry.ID, &industry.Name, &industry.CNPJ, &industry.Slug,
		&industry.ContactEmail, &industry.ContactPhone, &industry.Whatsapp,
		&industry.Description, &industry.City, &industry.State, &industry.BannerURL, &industry.LogoURL, &industry.SocialLinks,
		&industry.AddressCountry, &industry.AddressState, &industry.AddressCity, &industry.AddressStreet,
		&industry.AddressNumber, &industry.AddressZipCode,
		&industry.IsPublic, &industry.CreatedAt, &industry.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Indústria")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return industry, nil
}

func (r *industryRepository) FindBySlug(ctx context.Context, slug string) (*entity.Industry, error) {
	query := `
		SELECT id, name, cnpj, slug, contact_email, contact_phone, whatsapp,
		       description, city, state, banner_url, logo_url, social_links,
		       address_country, address_state, address_city, address_street, address_number, address_zip_code,
		       is_public, created_at, updated_at
		FROM industries
		WHERE slug = $1
	`

	industry := &entity.Industry{}
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&industry.ID, &industry.Name, &industry.CNPJ, &industry.Slug,
		&industry.ContactEmail, &industry.ContactPhone, &industry.Whatsapp,
		&industry.Description, &industry.City, &industry.State, &industry.BannerURL, &industry.LogoURL, &industry.SocialLinks,
		&industry.AddressCountry, &industry.AddressState, &industry.AddressCity, &industry.AddressStreet,
		&industry.AddressNumber, &industry.AddressZipCode,
		&industry.IsPublic, &industry.CreatedAt, &industry.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Indústria")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return industry, nil
}

func (r *industryRepository) FindByCNPJ(ctx context.Context, cnpj string) (*entity.Industry, error) {
	query := `
		SELECT id, name, cnpj, slug, contact_email, contact_phone, whatsapp,
		       description, city, state, banner_url, logo_url, social_links,
		       address_country, address_state, address_city, address_street, address_number, address_zip_code,
		       is_public, created_at, updated_at
		FROM industries
		WHERE cnpj = $1
	`

	industry := &entity.Industry{}
	err := r.db.QueryRowContext(ctx, query, cnpj).Scan(
		&industry.ID, &industry.Name, &industry.CNPJ, &industry.Slug,
		&industry.ContactEmail, &industry.ContactPhone, &industry.Whatsapp,
		&industry.Description, &industry.City, &industry.State, &industry.BannerURL, &industry.LogoURL, &industry.SocialLinks,
		&industry.AddressCountry, &industry.AddressState, &industry.AddressCity, &industry.AddressStreet,
		&industry.AddressNumber, &industry.AddressZipCode,
		&industry.IsPublic, &industry.CreatedAt, &industry.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Indústria")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return industry, nil
}

func (r *industryRepository) Update(ctx context.Context, industry *entity.Industry) error {
	query := `
		UPDATE industries
		SET name = $1, contact_email = $2, contact_phone = $3, whatsapp = $4,
		    description = $5, city = $6, state = $7, banner_url = $8,
		    logo_url = $9, social_links = $10, address_country = $11, address_state = $12,
		    address_city = $13, address_street = $14, address_number = $15,
		    address_zip_code = $16, is_public = $17, updated_at = CURRENT_TIMESTAMP
		WHERE id = $18
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		industry.Name, industry.ContactEmail, industry.ContactPhone, industry.Whatsapp,
		industry.Description, industry.City, industry.State, industry.BannerURL,
		industry.LogoURL, industry.SocialLinks, industry.AddressCountry, industry.AddressState,
		industry.AddressCity, industry.AddressStreet, industry.AddressNumber,
		industry.AddressZipCode, industry.IsPublic, industry.ID,
	).Scan(&industry.UpdatedAt)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Indústria")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *industryRepository) ExistsBySlug(ctx context.Context, slug string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM industries WHERE slug = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, slug).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *industryRepository) ExistsByCNPJ(ctx context.Context, cnpj string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM industries WHERE cnpj = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, cnpj).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *industryRepository) List(ctx context.Context) ([]entity.Industry, error) {
	query := `
		SELECT id, name, cnpj, slug, contact_email, contact_phone, whatsapp,
		       description, city, state, banner_url, logo_url, social_links,
		       address_country, address_state, address_city, address_street, address_number, address_zip_code,
		       is_public, created_at, updated_at
		FROM industries
		ORDER BY name
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	industries := []entity.Industry{}
	for rows.Next() {
		var ind entity.Industry
		if err := rows.Scan(
			&ind.ID, &ind.Name, &ind.CNPJ, &ind.Slug,
			&ind.ContactEmail, &ind.ContactPhone, &ind.Whatsapp,
			&ind.Description, &ind.City, &ind.State, &ind.BannerURL, &ind.LogoURL, &ind.SocialLinks,
			&ind.AddressCountry, &ind.AddressState, &ind.AddressCity, &ind.AddressStreet,
			&ind.AddressNumber, &ind.AddressZipCode,
			&ind.IsPublic, &ind.CreatedAt, &ind.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		industries = append(industries, ind)
	}

	return industries, nil
}

func (r *industryRepository) FindPublicDeposits(ctx context.Context, search *string) ([]entity.PublicDeposit, error) {
	query := `
		SELECT DISTINCT
			i.name, i.slug, i.city, i.state, i.banner_url, i.logo_url
		FROM industries i
		WHERE i.is_public = TRUE
	`

	args := []interface{}{}

	if search != nil && *search != "" {
		query += ` AND (
			i.name ILIKE $1 OR
			i.city ILIKE $1 OR
			i.state ILIKE $1
		)`
		searchTerm := "%" + *search + "%"
		args = append(args, searchTerm)
	}

	query += ` ORDER BY i.name`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	deposits := []entity.PublicDeposit{}
	for rows.Next() {
		var dep entity.PublicDeposit
		if err := rows.Scan(
			&dep.Name, &dep.Slug, &dep.City, &dep.State, &dep.BannerURL, &dep.LogoURL,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}

		// Buscar preview de fotos (até 4) de lotes públicos deste depósito
		previewQuery := `
			SELECT bm.id, bm.url, bm.display_order
			FROM batch_medias bm
			INNER JOIN batches b ON bm.batch_id = b.id
			WHERE b.industry_id = (SELECT id FROM industries WHERE slug = $1)
				AND b.is_public = TRUE
				AND b.deleted_at IS NULL
				AND b.is_active = TRUE
			ORDER BY bm.display_order, bm.created_at
			LIMIT 4
		`

		previewRows, err := r.db.QueryContext(ctx, previewQuery, dep.Slug)
		if err == nil {
			defer previewRows.Close()
			for previewRows.Next() {
				var media entity.Media
				if err := previewRows.Scan(&media.ID, &media.URL, &media.DisplayOrder); err == nil {
					dep.Preview = append(dep.Preview, media)
				}
			}
		}

		deposits = append(deposits, dep)
	}

	return deposits, nil
}

func (r *industryRepository) FindPublicDepositBySlug(ctx context.Context, slug string) (*entity.PublicDeposit, error) {
	query := `
		SELECT name, slug, city, state, banner_url, logo_url
		FROM industries
		WHERE slug = $1 AND is_public = TRUE
	`

	deposit := &entity.PublicDeposit{}
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&deposit.Name, &deposit.Slug, &deposit.City, &deposit.State,
		&deposit.BannerURL, &deposit.LogoURL,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Depósito")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	// Buscar preview de fotos
	previewQuery := `
		SELECT bm.id, bm.url, bm.display_order
		FROM batch_medias bm
		INNER JOIN batches b ON bm.batch_id = b.id
		WHERE b.industry_id = (SELECT id FROM industries WHERE slug = $1)
			AND b.is_public = TRUE
			AND b.deleted_at IS NULL
			AND b.is_active = TRUE
		ORDER BY bm.display_order, bm.created_at
		LIMIT 4
	`

	previewRows, err := r.db.QueryContext(ctx, previewQuery, slug)
	if err == nil {
		defer previewRows.Close()
		for previewRows.Next() {
			var media entity.Media
			if err := previewRows.Scan(&media.ID, &media.URL, &media.DisplayOrder); err == nil {
				deposit.Preview = append(deposit.Preview, media)
			}
		}
	}

	return deposit, nil
}
