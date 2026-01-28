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
			description, logo_url, address_country, address_state, address_city, 
			address_street, address_number, address_zip_code)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		industry.Name, industry.CNPJ, industry.Slug,
		industry.ContactEmail, industry.ContactPhone, industry.Whatsapp,
		industry.Description, industry.LogoURL, industry.AddressCountry,
		industry.AddressState, industry.AddressCity, industry.AddressStreet,
		industry.AddressNumber, industry.AddressZipCode,
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
		       description, logo_url, address_country, address_state, address_city,
		       address_street, address_number, address_zip_code, 
		       created_at, updated_at
		FROM industries
		WHERE id = $1
	`

	industry := &entity.Industry{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&industry.ID, &industry.Name, &industry.CNPJ, &industry.Slug,
		&industry.ContactEmail, &industry.ContactPhone, &industry.Whatsapp,
		&industry.Description, &industry.LogoURL, &industry.AddressCountry,
		&industry.AddressState, &industry.AddressCity, &industry.AddressStreet,
		&industry.AddressNumber, &industry.AddressZipCode,
		&industry.CreatedAt, &industry.UpdatedAt,
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
		       description, logo_url, address_country, address_state, address_city,
		       address_street, address_number, address_zip_code, 
		       created_at, updated_at
		FROM industries
		WHERE slug = $1
	`

	industry := &entity.Industry{}
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&industry.ID, &industry.Name, &industry.CNPJ, &industry.Slug,
		&industry.ContactEmail, &industry.ContactPhone, &industry.Whatsapp,
		&industry.Description, &industry.LogoURL, &industry.AddressCountry,
		&industry.AddressState, &industry.AddressCity, &industry.AddressStreet,
		&industry.AddressNumber, &industry.AddressZipCode,
		&industry.CreatedAt, &industry.UpdatedAt,
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
		       description, logo_url, address_country, address_state, address_city,
		       address_street, address_number, address_zip_code, 
		       created_at, updated_at
		FROM industries
		WHERE cnpj = $1
	`

	industry := &entity.Industry{}
	err := r.db.QueryRowContext(ctx, query, cnpj).Scan(
		&industry.ID, &industry.Name, &industry.CNPJ, &industry.Slug,
		&industry.ContactEmail, &industry.ContactPhone, &industry.Whatsapp,
		&industry.Description, &industry.LogoURL, &industry.AddressCountry,
		&industry.AddressState, &industry.AddressCity, &industry.AddressStreet,
		&industry.AddressNumber, &industry.AddressZipCode,
		&industry.CreatedAt, &industry.UpdatedAt,
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
		    description = $5, logo_url = $6, address_country = $7, address_state = $8,
		    address_city = $9, address_street = $10, address_number = $11, 
		    address_zip_code = $12, updated_at = CURRENT_TIMESTAMP
		WHERE id = $13
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		industry.Name, industry.ContactEmail, industry.ContactPhone, industry.Whatsapp,
		industry.Description, industry.LogoURL, industry.AddressCountry, industry.AddressState,
		industry.AddressCity, industry.AddressStreet, industry.AddressNumber,
		industry.AddressZipCode, industry.ID,
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
		       description, logo_url, address_country, address_state, address_city,
		       address_street, address_number, address_zip_code, 
		       created_at, updated_at
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
			&ind.Description, &ind.LogoURL, &ind.AddressCountry,
			&ind.AddressState, &ind.AddressCity, &ind.AddressStreet,
			&ind.AddressNumber, &ind.AddressZipCode,
			&ind.CreatedAt, &ind.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		industries = append(industries, ind)
	}

	return industries, nil
}
