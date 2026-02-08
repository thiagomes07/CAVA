package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

// S3Adapter implementa o storage service usando MinIO/S3
type S3Adapter struct {
	client    *minio.Client
	bucket    string
	publicURL string
	logger    *zap.Logger
}

// Config contém configurações para S3/MinIO
type Config struct {
	Endpoint   string
	AccessKey  string
	SecretKey  string
	BucketName string
	Region     string
	UseSSL     bool
	PublicURL  string
}

// NewS3Adapter cria novo adapter S3/MinIO
func NewS3Adapter(cfg *Config, logger *zap.Logger) (*S3Adapter, error) {
	// Parsear endpoint para extrair host:port (remover http:// ou https://)
	endpoint := cfg.Endpoint
	useSSL := cfg.UseSSL

	if parsedURL, err := url.Parse(cfg.Endpoint); err == nil && parsedURL.Host != "" {
		endpoint = parsedURL.Host
		if parsedURL.Scheme == "https" {
			useSSL = true
		}
	}

	// Escolher credenciais baseado na configuração:
	// - Com AccessKey/SecretKey: credenciais estáticas (dev com MinIO ou S3 explícito)
	// - Sem credenciais: IAM Role (produção na AWS - ECS Task Role / EC2 Instance Profile)
	var creds *credentials.Credentials
	if cfg.AccessKey != "" && cfg.SecretKey != "" {
		creds = credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, "")
	} else {
		// IAM credentials chain: env vars → shared credentials → IAM Role
		creds = credentials.NewIAM("")
		logger.Info("usando IAM credentials para storage (sem AccessKey/SecretKey explícitas)")
	}

	// Inicializar cliente MinIO (compatível com S3)
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  creds,
		Secure: useSSL,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("erro ao criar cliente MinIO: %w", err)
	}

	adapter := &S3Adapter{
		client:    client,
		bucket:    cfg.BucketName,
		publicURL: cfg.PublicURL,
		logger:    logger,
	}

	// Verificar se bucket existe
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	exists, err := client.BucketExists(ctx, cfg.BucketName)
	if err != nil {
		return nil, fmt.Errorf("erro ao verificar bucket: %w", err)
	}

	if !exists {
		logger.Warn("bucket não existe, criando...", zap.String("bucket", cfg.BucketName))
		if err := client.MakeBucket(ctx, cfg.BucketName, minio.MakeBucketOptions{Region: cfg.Region}); err != nil {
			return nil, fmt.Errorf("erro ao criar bucket: %w", err)
		}
		logger.Info("bucket criado com sucesso", zap.String("bucket", cfg.BucketName))
	}

	logger.Info("S3 adapter inicializado",
		zap.String("endpoint", cfg.Endpoint),
		zap.String("bucket", cfg.BucketName),
		zap.Bool("ssl", cfg.UseSSL),
	)

	return adapter, nil
}

// UploadFile faz upload de arquivo para S3/MinIO
func (s *S3Adapter) UploadFile(ctx context.Context, bucket, key string, reader io.Reader, contentType string, size int64) (string, error) {
	// Usar bucket configurado se não especificado
	if bucket == "" {
		bucket = s.bucket
	}

	// Upload do arquivo
	_, err := s.client.PutObject(ctx, bucket, key, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		s.logger.Error("erro ao fazer upload",
			zap.Error(err),
			zap.String("bucket", bucket),
			zap.String("key", key),
		)
		return "", fmt.Errorf("erro ao fazer upload: %w", err)
	}

	// Gerar URL pública
	url := s.generatePublicURL(key)

	s.logger.Info("arquivo enviado com sucesso",
		zap.String("bucket", bucket),
		zap.String("key", key),
		zap.String("url", url),
	)

	return url, nil
}

// UploadProductMedia faz upload de mídia de produto
func (s *S3Adapter) UploadProductMedia(ctx context.Context, productID string, reader io.Reader, filename, contentType string, size int64) (string, error) {
	// Gerar key: products/{productID}/{timestamp}_{filename}
	ext := filepath.Ext(filename)
	timestamp := time.Now().Unix()
	sanitized := sanitizeFilename(strings.TrimSuffix(filename, ext))
	key := fmt.Sprintf("products/%s/%d_%s%s", productID, timestamp, sanitized, ext)

	return s.UploadFile(ctx, s.bucket, key, reader, contentType, size)
}

// UploadBatchMedia faz upload de mídia de lote
func (s *S3Adapter) UploadBatchMedia(ctx context.Context, batchID string, reader io.Reader, filename, contentType string, size int64) (string, error) {
	// Gerar key: batches/{batchID}/{timestamp}_{filename}
	ext := filepath.Ext(filename)
	timestamp := time.Now().Unix()
	sanitized := sanitizeFilename(strings.TrimSuffix(filename, ext))
	key := fmt.Sprintf("batches/%s/%d_%s%s", batchID, timestamp, sanitized, ext)

	return s.UploadFile(ctx, s.bucket, key, reader, contentType, size)
}

// DeleteFile deleta arquivo do storage
func (s *S3Adapter) DeleteFile(ctx context.Context, bucket, key string) error {
	if bucket == "" {
		bucket = s.bucket
	}

	err := s.client.RemoveObject(ctx, bucket, key, minio.RemoveObjectOptions{})
	if err != nil {
		s.logger.Error("erro ao deletar arquivo",
			zap.Error(err),
			zap.String("bucket", bucket),
			zap.String("key", key),
		)
		return fmt.Errorf("erro ao deletar arquivo: %w", err)
	}

	s.logger.Info("arquivo deletado",
		zap.String("bucket", bucket),
		zap.String("key", key),
	)

	return nil
}

// FileExists verifica se arquivo existe
func (s *S3Adapter) FileExists(ctx context.Context, bucket, key string) (bool, error) {
	if bucket == "" {
		bucket = s.bucket
	}

	_, err := s.client.StatObject(ctx, bucket, key, minio.StatObjectOptions{})
	if err != nil {
		errResponse := minio.ToErrorResponse(err)
		if errResponse.Code == "NoSuchKey" {
			return false, nil
		}
		return false, fmt.Errorf("erro ao verificar arquivo: %w", err)
	}

	return true, nil
}

// GeneratePresignedURL gera URL pre-assinada (para downloads privados)
func (s *S3Adapter) GeneratePresignedURL(ctx context.Context, bucket, key string, expiration int) (string, error) {
	if bucket == "" {
		bucket = s.bucket
	}

	url, err := s.client.PresignedGetObject(ctx, bucket, key, time.Duration(expiration)*time.Second, nil)
	if err != nil {
		s.logger.Error("erro ao gerar URL presigned",
			zap.Error(err),
			zap.String("bucket", bucket),
			zap.String("key", key),
		)
		return "", fmt.Errorf("erro ao gerar URL presigned: %w", err)
	}

	return url.String(), nil
}

// ExtractKeyFromURL extrai a key do storage a partir da URL
func (s *S3Adapter) ExtractKeyFromURL(url string) (string, error) {
	// Remove o public URL base
	if s.publicURL != "" && strings.HasPrefix(url, s.publicURL) {
		key := strings.TrimPrefix(url, s.publicURL)
		key = strings.TrimPrefix(key, "/")
		return key, nil
	}

	// Tentar extrair da URL do MinIO/S3
	// Formato típico: http://endpoint/bucket/key
	parts := strings.Split(url, "/")
	if len(parts) >= 2 {
		// Assumir que bucket é a primeira parte e key é o resto
		key := strings.Join(parts[len(parts)-2:], "/")
		return key, nil
	}

	return "", fmt.Errorf("não foi possível extrair key da URL: %s", url)
}

// ValidateFileType valida tipo de arquivo
func (s *S3Adapter) ValidateFileType(contentType string, allowedTypes []string) bool {
	for _, allowed := range allowedTypes {
		if contentType == allowed {
			return true
		}
	}
	return false
}

// ValidateFileSize valida tamanho do arquivo
func (s *S3Adapter) ValidateFileSize(size int64, maxSize int64) bool {
	return size > 0 && size <= maxSize
}

// HealthCheck verifica saúde da conexão com o storage
func (s *S3Adapter) HealthCheck(ctx context.Context) error {
	// Verificar se conseguimos listar buckets (operação leve)
	_, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		s.logger.Error("health check falhou",
			zap.Error(err),
			zap.String("bucket", s.bucket),
		)
		return fmt.Errorf("storage health check failed: %w", err)
	}
	return nil
}

// generatePublicURL gera URL pública para o arquivo
func (s *S3Adapter) generatePublicURL(key string) string {
	if s.publicURL != "" {
		return fmt.Sprintf("%s/%s", strings.TrimRight(s.publicURL, "/"), key)
	}
	// Fallback para URL do MinIO
	return fmt.Sprintf("%s/%s/%s", s.client.EndpointURL(), s.bucket, key)
}

// sanitizeFilename remove caracteres inválidos do nome do arquivo
func sanitizeFilename(filename string) string {
	// Remover espaços e caracteres especiais
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
	)
	sanitized := replacer.Replace(filename)

	// Converter para lowercase
	sanitized = strings.ToLower(sanitized)

	// Remover múltiplos hífens consecutivos
	for strings.Contains(sanitized, "--") {
		sanitized = strings.ReplaceAll(sanitized, "--", "-")
	}

	// Remover hífens no início e fim
	sanitized = strings.Trim(sanitized, "-")

	return sanitized
}
