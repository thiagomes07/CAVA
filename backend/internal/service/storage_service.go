package service

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"go.uber.org/zap"
)

// StorageAdapter define a interface para o adapter de storage (S3/MinIO)
type StorageAdapter interface {
	UploadFile(ctx context.Context, bucket, key string, reader io.Reader, contentType string, size int64) (string, error)
	DeleteFile(ctx context.Context, bucket, key string) error
	FileExists(ctx context.Context, bucket, key string) (bool, error)
	GeneratePresignedURL(ctx context.Context, bucket, key string, expiration int) (string, error)
	ExtractKeyFromURL(url string) (string, error)
}

type storageService struct {
	adapter    StorageAdapter
	bucketName string
	logger     *zap.Logger
}

func NewStorageService(
	adapter StorageAdapter,
	bucketName string,
	logger *zap.Logger,
) *storageService {
	return &storageService{
		adapter:    adapter,
		bucketName: bucketName,
		logger:     logger,
	}
}

func (s *storageService) UploadFile(ctx context.Context, bucket, key string, reader io.Reader, contentType string, size int64) (string, error) {
	// Validar tamanho do arquivo
	if !s.ValidateFileSize(size, 10*1024*1024) { // 10MB máximo
		return "", domainErrors.ValidationError("Arquivo muito grande. Tamanho máximo: 10MB")
	}

	// Validar tipo de arquivo
	allowedTypes := []string{
		"image/jpeg",
		"image/png",
		"image/webp",
		"application/pdf",
	}
	if !s.ValidateFileType(contentType, allowedTypes) {
		return "", domainErrors.ValidationError("Tipo de arquivo não permitido")
	}

	// Upload do arquivo
	url, err := s.adapter.UploadFile(ctx, bucket, key, reader, contentType, size)
	if err != nil {
		s.logger.Error("erro ao fazer upload do arquivo",
			zap.String("key", key),
			zap.Error(err),
		)
		return "", domainErrors.StorageError(err)
	}

	s.logger.Info("arquivo enviado com sucesso",
		zap.String("key", key),
		zap.String("url", url),
	)

	return url, nil
}

func (s *storageService) UploadProductMedia(ctx context.Context, productID string, reader io.Reader, filename, contentType string, size int64) (string, error) {
	// Validar tipo de arquivo (apenas imagens para produtos)
	allowedTypes := []string{"image/jpeg", "image/png", "image/webp"}
	if !s.ValidateFileType(contentType, allowedTypes) {
		return "", domainErrors.ValidationError("Apenas imagens são permitidas para produtos")
	}

	// Validar tamanho (5MB máximo para imagens)
	if !s.ValidateFileSize(size, 5*1024*1024) {
		return "", domainErrors.ValidationError("Imagem muito grande. Tamanho máximo: 5MB")
	}

	// Gerar key única
	key := s.generateProductMediaKey(productID, filename)

	return s.UploadFile(ctx, s.bucketName, key, reader, contentType, size)
}

func (s *storageService) UploadBatchMedia(ctx context.Context, batchID string, reader io.Reader, filename, contentType string, size int64) (string, error) {
	// Validar tipo de arquivo (apenas imagens para lotes)
	allowedTypes := []string{"image/jpeg", "image/png", "image/webp"}
	if !s.ValidateFileType(contentType, allowedTypes) {
		return "", domainErrors.ValidationError("Apenas imagens são permitidas para lotes")
	}

	// Validar tamanho (5MB máximo para imagens)
	if !s.ValidateFileSize(size, 5*1024*1024) {
		return "", domainErrors.ValidationError("Imagem muito grande. Tamanho máximo: 5MB")
	}

	// Gerar key única
	key := s.generateBatchMediaKey(batchID, filename)

	return s.UploadFile(ctx, s.bucketName, key, reader, contentType, size)
}

func (s *storageService) UploadIndustryLogo(ctx context.Context, industryID string, reader io.Reader, filename, contentType string, size int64) (string, error) {
	// Validar tipo de arquivo
	allowedTypes := []string{"image/jpeg", "image/png", "image/webp"}
	if !s.ValidateFileType(contentType, allowedTypes) {
		return "", domainErrors.ValidationError("Apenas imagens são permitidas para a logo")
	}

	// Validar tamanho (2MB máximo para logo)
	if !s.ValidateFileSize(size, 2*1024*1024) {
		return "", domainErrors.ValidationError("Imagem muito grande. Tamanho máximo: 2MB")
	}

	// Gerar key única
	key := s.generateIndustryLogoKey(industryID, filename)

	return s.UploadFile(ctx, s.bucketName, key, reader, contentType, size)
}

func (s *storageService) DeleteFile(ctx context.Context, bucket, key string) error {
	if err := s.adapter.DeleteFile(ctx, bucket, key); err != nil {
		s.logger.Error("erro ao deletar arquivo",
			zap.String("key", key),
			zap.Error(err),
		)
		return domainErrors.StorageError(err)
	}

	s.logger.Info("arquivo deletado com sucesso", zap.String("key", key))
	return nil
}

func (s *storageService) FileExists(ctx context.Context, bucket, key string) (bool, error) {
	exists, err := s.adapter.FileExists(ctx, bucket, key)
	if err != nil {
		s.logger.Error("erro ao verificar existência do arquivo",
			zap.String("key", key),
			zap.Error(err),
		)
		return false, domainErrors.StorageError(err)
	}
	return exists, nil
}

func (s *storageService) GeneratePresignedURL(ctx context.Context, bucket, key string, expiration int) (string, error) {
	url, err := s.adapter.GeneratePresignedURL(ctx, bucket, key, expiration)
	if err != nil {
		s.logger.Error("erro ao gerar URL presigned",
			zap.String("key", key),
			zap.Error(err),
		)
		return "", domainErrors.StorageError(err)
	}
	return url, nil
}

func (s *storageService) ExtractKeyFromURL(url string) (string, error) {
	key, err := s.adapter.ExtractKeyFromURL(url)
	if err != nil {
		return "", domainErrors.ValidationError("URL inválida")
	}
	return key, nil
}

func (s *storageService) ValidateFileType(contentType string, allowedTypes []string) bool {
	for _, allowed := range allowedTypes {
		if contentType == allowed {
			return true
		}
	}
	return false
}

func (s *storageService) ValidateFileSize(size int64, maxSize int64) bool {
	return size > 0 && size <= maxSize
}

// generateProductMediaKey gera a key para mídia de produto
// Formato: products/{productID}/{timestamp}_{uuid}_{filename}
func (s *storageService) generateProductMediaKey(productID, filename string) string {
	timestamp := time.Now().Unix()
	uniqueID := uuid.New().String()[:8] // Primeiros 8 caracteres do UUID
	sanitized := sanitizeFilename(filename)

	return fmt.Sprintf("products/%s/%d_%s_%s", productID, timestamp, uniqueID, sanitized)
}

// generateBatchMediaKey gera a key para mídia de lote
// Formato: batches/{batchID}/{timestamp}_{uuid}_{filename}
func (s *storageService) generateBatchMediaKey(batchID, filename string) string {
	timestamp := time.Now().Unix()
	uniqueID := uuid.New().String()[:8]
	sanitized := sanitizeFilename(filename)

	return fmt.Sprintf("batches/%s/%d_%s_%s", batchID, timestamp, uniqueID, sanitized)
}

// generateIndustryLogoKey gera a key para logo da indústria
// Formato: industries/{industryID}/logo_{timestamp}_{filename}
func (s *storageService) generateIndustryLogoKey(industryID, filename string) string {
	timestamp := time.Now().Unix()
	sanitized := sanitizeFilename(filename)

	return fmt.Sprintf("industries/%s/logo_%d_%s", industryID, timestamp, sanitized)
}

// sanitizeFilename remove caracteres inválidos e normaliza o nome do arquivo
func sanitizeFilename(filename string) string {
	// Extrair extensão
	ext := filepath.Ext(filename)
	name := strings.TrimSuffix(filename, ext)

	// Remover caracteres especiais
	replacer := strings.NewReplacer(
		" ", "-",
		"_", "-",
		"(", "",
		")", "",
		"[", "",
		"]", "",
		"{", "",
		"}", "",
		"'", "",
		"\"", "",
		"ç", "c",
		"Ç", "C",
		"á", "a",
		"à", "a",
		"ã", "a",
		"â", "a",
		"é", "e",
		"ê", "e",
		"í", "i",
		"ó", "o",
		"õ", "o",
		"ô", "o",
		"ú", "u",
	)
	name = replacer.Replace(name)

	// Converter para lowercase
	name = strings.ToLower(name)

	// Remover múltiplos hífens consecutivos
	for strings.Contains(name, "--") {
		name = strings.ReplaceAll(name, "--", "-")
	}

	// Remover hífens no início e fim
	name = strings.Trim(name, "-")

	// Limitar tamanho do nome
	if len(name) > 50 {
		name = name[:50]
	}

	return name + ext
}
