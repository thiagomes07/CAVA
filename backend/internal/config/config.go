package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config contém todas as configurações da aplicação
type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Storage  StorageConfig
	Auth     AuthConfig
	Server   ServerConfig
	Email    EmailConfig
}

// AppConfig contém configurações gerais da aplicação
type AppConfig struct {
	Env               string
	LogLevel          string
	LogFormat         string
	MigrationsPath    string
	AutoMigrate       bool
	PublicLinkBaseURL string
}

// DatabaseConfig contém configurações do banco de dados
type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	Name            string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// StorageConfig contém configurações de storage (S3/MinIO)
type StorageConfig struct {
	Type       string // "minio" ou "s3"
	Endpoint   string
	AccessKey  string
	SecretKey  string
	BucketName string
	Region     string
	UseSSL     bool
	PublicURL  string
}

// AuthConfig contém configurações de autenticação
type AuthConfig struct {
	JWTSecret               string
	JWTAccessTokenDuration  time.Duration
	JWTRefreshTokenDuration time.Duration
	PasswordPepper          string
	CSRFSecret              string
	CookieSecure            bool
	CookieDomain            string
}

// ServerConfig contém configurações do servidor HTTP
type ServerConfig struct {
	Host                      string
	Port                      int
	FrontendURL               string
	AllowedOrigins            []string
	RateLimitAuthRPM          int
	RateLimitPublicRPM        int
	RateLimitAuthenticatedRPM int
}

// EmailConfig contém configurações de email (opcional para MVP)
type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	EmailFrom    string
}

// Load carrega as configurações das variáveis de ambiente
func Load() (*Config, error) {
	// Tentar carregar .env (ignorar erro se não existir em produção)
	_ = godotenv.Load()

	cfg := &Config{
		App:      loadAppConfig(),
		Database: loadDatabaseConfig(),
		Storage:  loadStorageConfig(),
		Auth:     loadAuthConfig(),
		Server:   loadServerConfig(),
		Email:    loadEmailConfig(),
	}

	// Validar configurações obrigatórias
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("configuração inválida: %w", err)
	}

	return cfg, nil
}

// Validate valida as configurações obrigatórias
func (c *Config) Validate() error {
	// Database
	if c.Database.Host == "" {
		return fmt.Errorf("DB_HOST é obrigatório")
	}
	if c.Database.User == "" {
		return fmt.Errorf("DB_USER é obrigatório")
	}
	if c.Database.Password == "" {
		return fmt.Errorf("DB_PASSWORD é obrigatório")
	}
	if c.Database.Name == "" {
		return fmt.Errorf("DB_NAME é obrigatório")
	}

	// Storage
	if c.Storage.Type == "" {
		return fmt.Errorf("STORAGE_TYPE é obrigatório")
	}
	if c.Storage.AccessKey == "" {
		return fmt.Errorf("STORAGE_ACCESS_KEY é obrigatório")
	}
	if c.Storage.SecretKey == "" {
		return fmt.Errorf("STORAGE_SECRET_KEY é obrigatório")
	}
	if c.Storage.BucketName == "" {
		return fmt.Errorf("STORAGE_BUCKET_NAME é obrigatório")
	}

	// Auth
	if c.Auth.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET é obrigatório")
	}
	if len(c.Auth.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET deve ter pelo menos 32 caracteres")
	}
	if c.Auth.PasswordPepper == "" {
		return fmt.Errorf("PASSWORD_PEPPER é obrigatório")
	}
	if len(c.Auth.PasswordPepper) < 16 {
		return fmt.Errorf("PASSWORD_PEPPER deve ter pelo menos 16 caracteres")
	}
	if c.Auth.CSRFSecret == "" {
		return fmt.Errorf("CSRF_SECRET é obrigatório")
	}
	if len(c.Auth.CSRFSecret) < 32 {
		return fmt.Errorf("CSRF_SECRET deve ter pelo menos 32 caracteres")
	}
	if c.Auth.CookieDomain == "" {
		return fmt.Errorf("COOKIE_DOMAIN é obrigatório")
	}

	// Server
	if c.Server.FrontendURL == "" {
		return fmt.Errorf("FRONTEND_URL é obrigatório")
	}

	return nil
}

// GetDSN retorna a string de conexão do PostgreSQL
func (c *Config) GetDSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.SSLMode,
	)
}

// IsDevelopment verifica se está em ambiente de desenvolvimento
func (c *Config) IsDevelopment() bool {
	return c.App.Env == "development"
}

// IsProduction verifica se está em ambiente de produção
func (c *Config) IsProduction() bool {
	return c.App.Env == "production"
}

// loadAppConfig carrega configurações da aplicação
func loadAppConfig() AppConfig {
	return AppConfig{
		Env:               getEnv("APP_ENV", "development"),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
		LogFormat:         getEnv("LOG_FORMAT", "text"),
		MigrationsPath:    getEnv("MIGRATIONS_PATH", "file://migrations"),
		AutoMigrate:       getEnvAsBool("AUTO_MIGRATE", true),
		PublicLinkBaseURL: getEnv("PUBLIC_LINK_BASE_URL", "http://localhost:3000"),
	}
}

// loadDatabaseConfig carrega configurações do banco de dados
func loadDatabaseConfig() DatabaseConfig {
	return DatabaseConfig{
		Host:            getEnv("DB_HOST", "postgres"),
		Port:            getEnvAsInt("DB_PORT", 5432),
		User:            getEnv("DB_USER", "cava_user"),
		Password:        getEnv("DB_PASSWORD", ""),
		Name:            getEnv("DB_NAME", "cava_db"),
		SSLMode:         getEnv("DB_SSL_MODE", "disable"),
		MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 25),
		MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 5),
		ConnMaxLifetime: getEnvAsDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
	}
}

// loadStorageConfig carrega configurações de storage
func loadStorageConfig() StorageConfig {
	return StorageConfig{
		Type:       getEnv("STORAGE_TYPE", "minio"),
		Endpoint:   getEnv("STORAGE_ENDPOINT", "http://minio:9000"),
		AccessKey:  getEnv("STORAGE_ACCESS_KEY", ""),
		SecretKey:  getEnv("STORAGE_SECRET_KEY", ""),
		BucketName: getEnv("STORAGE_BUCKET_NAME", "cava-media"),
		Region:     getEnv("STORAGE_REGION", "us-east-1"),
		UseSSL:     getEnvAsBool("STORAGE_USE_SSL", false),
		PublicURL:  getEnv("STORAGE_PUBLIC_URL", "http://localhost:9000/cava-media"),
	}
}

// loadAuthConfig carrega configurações de autenticação
func loadAuthConfig() AuthConfig {
	appEnv := getEnv("APP_ENV", "development")
	defaultSecure := appEnv == "production"

	return AuthConfig{
		JWTSecret:               getEnv("JWT_SECRET", ""),
		JWTAccessTokenDuration:  getEnvAsDuration("JWT_ACCESS_TOKEN_DURATION", 15*time.Minute),
		JWTRefreshTokenDuration: getEnvAsDuration("JWT_REFRESH_TOKEN_DURATION", 168*time.Hour), // 7 dias
		PasswordPepper:          getEnv("PASSWORD_PEPPER", ""),
		CSRFSecret:              getEnv("CSRF_SECRET", ""),
		CookieSecure:            getEnvAsBool("COOKIE_SECURE", defaultSecure),
		CookieDomain:            getEnv("COOKIE_DOMAIN", "localhost"),
	}
}

// loadServerConfig carrega configurações do servidor
func loadServerConfig() ServerConfig {
	allowedOrigins := strings.Split(
		getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"),
		",",
	)

	return ServerConfig{
		Host:                      getEnv("APP_HOST", "0.0.0.0"),
		Port:                      getEnvAsInt("APP_PORT", 3001),
		FrontendURL:               getEnv("FRONTEND_URL", "http://localhost:3000"),
		AllowedOrigins:            allowedOrigins,
		RateLimitAuthRPM:          getEnvAsInt("RATE_LIMIT_AUTH_RPM", 5),
		RateLimitPublicRPM:        getEnvAsInt("RATE_LIMIT_PUBLIC_RPM", 30),
		RateLimitAuthenticatedRPM: getEnvAsInt("RATE_LIMIT_AUTHENTICATED_RPM", 100),
	}
}

// loadEmailConfig carrega configurações de email
func loadEmailConfig() EmailConfig {
	return EmailConfig{
		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnvAsInt("SMTP_PORT", 587),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		EmailFrom:    getEnv("EMAIL_FROM", "noreply@cava.com.br"),
	}
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.ParseBool(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value, err := time.ParseDuration(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}
