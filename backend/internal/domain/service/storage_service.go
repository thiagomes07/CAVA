package service

import (
	"context"
	"io"
)

// StorageService define o contrato para operações de storage (S3/MinIO)
type StorageService interface {
	// UploadFile faz upload de um arquivo
	UploadFile(ctx context.Context, bucket, key string, reader io.Reader, contentType string, size int64) (string, error)

	// UploadProductMedia faz upload de mídia de produto
	UploadProductMedia(ctx context.Context, productID string, reader io.Reader, filename, contentType string, size int64) (string, error)

	// UploadBatchMedia faz upload de mídia de lote
	UploadBatchMedia(ctx context.Context, batchID string, reader io.Reader, filename, contentType string, size int64) (string, error)

	// UploadIndustryLogo faz upload da logo da indústria
	UploadIndustryLogo(ctx context.Context, industryID string, reader io.Reader, filename, contentType string, size int64) (string, error)

	// DeleteFile deleta um arquivo
	DeleteFile(ctx context.Context, bucket, key string) error

	// FileExists verifica se arquivo existe
	FileExists(ctx context.Context, bucket, key string) (bool, error)

	// GeneratePresignedURL gera URL pre-assinada (para invoices)
	GeneratePresignedURL(ctx context.Context, bucket, key string, expiration int) (string, error)

	// ExtractKeyFromURL extrai a key do storage a partir da URL
	ExtractKeyFromURL(url string) (string, error)

	// ValidateFileType valida tipo de arquivo
	ValidateFileType(contentType string, allowedTypes []string) bool

	// ValidateFileSize valida tamanho do arquivo
	ValidateFileSize(size int64, maxSize int64) bool
}