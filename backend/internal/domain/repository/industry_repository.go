package repository

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// IndustryRepository define o contrato para operações com indústrias
type IndustryRepository interface {
	// Create cria uma nova indústria
	Create(ctx context.Context, industry *entity.Industry) error

	// FindByID busca indústria por ID
	FindByID(ctx context.Context, id string) (*entity.Industry, error)

	// FindBySlug busca indústria por slug
	FindBySlug(ctx context.Context, slug string) (*entity.Industry, error)

	// FindByCNPJ busca indústria por CNPJ
	FindByCNPJ(ctx context.Context, cnpj string) (*entity.Industry, error)

	// Update atualiza os dados da indústria
	Update(ctx context.Context, industry *entity.Industry) error

	// ExistsBySlug verifica se o slug já está em uso
	ExistsBySlug(ctx context.Context, slug string) (bool, error)

	// ExistsByCNPJ verifica se o CNPJ já está cadastrado
	ExistsByCNPJ(ctx context.Context, cnpj string) (bool, error)

	// List lista todas as indústrias
	List(ctx context.Context) ([]entity.Industry, error)

	// FindPublicDeposits busca depósitos públicos com preview de fotos
	FindPublicDeposits(ctx context.Context, search *string) ([]entity.PublicDeposit, error)

	// FindPublicDepositBySlug busca um depósito público por slug
	FindPublicDepositBySlug(ctx context.Context, slug string) (*entity.PublicDeposit, error)
}