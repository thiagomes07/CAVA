package config

import (
    "fmt"
    "os"
    "strconv"
    "time"

    "github.com/joho/godotenv"
)

type Config struct {
    Database  DatabaseConfig
    Storage   StorageConfig
    Auth      AuthConfig
    App       AppConfig
    SMTP      SMTPConfig
}

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

type StorageConfig struct {
    Type          string
    Endpoint      string
    AccessKey     string
    SecretKey     string
    BucketName    string
    Region        string
    UseSSL        bool
    PublicURL     string
}

type AuthConfig struct {
    JWTSecret              string
    AccessTokenDuration    time.Duration
    RefreshTokenDuration   time.Duration
    PasswordPepper         string
    CSRFSecret            string
    CookieSecure          bool
    CookieDomain          string
    BcryptCost            int
}

type AppConfig struct {
    Env                        string
    Host                       string
    Port                       int
    FrontendURL               string
    PublicLinkBaseURL         string
    AllowedOrigins            []string
    RateLimitAuthRPM          int
    RateLimitPublicRPM        int
    RateLimitAuthenticatedRPM int
    LogLevel                  string
    LogFormat                 string
    MigrationsPath            string
    AutoMigrate               bool
}

type SMTPConfig struct {
    Host     string
    Port     int
    User     string
    Password string
    From     string
}

func Load() (*Config, error) {
    // Carregar .env se existir
    _ = godotenv.Load()

    cfg := &Config{
        Database: DatabaseConfig{
            Host:            getEnv("DB_HOST", "localhost"),
            Port:            getEnvAsInt("DB_PORT", 5432),
            User:            getEnv("DB_USER", "cava_user"),
            Password:        getEnv("DB_PASSWORD", ""),
            Name:            getEnv("DB_NAME", "cava_db"),
            SSLMode:         getEnv("DB_SSL_MODE", "disable"),
            MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 25),
            MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 5),
            ConnMaxLifetime: getEnvAsDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
        },
        Storage: StorageConfig{
            Type:       getEnv("STORAGE_TYPE", "minio"),
            Endpoint:   getEnv("STORAGE_ENDPOINT", "http://localhost:9000"),
            AccessKey:  getEnv("STORAGE_ACCESS_KEY", ""),
            SecretKey:  getEnv("STORAGE_SECRET_KEY", ""),
            BucketName: getEnv("STORAGE_BUCKET_NAME", "cava-media"),
            Region:     getEnv("STORAGE_REGION", "us-east-1"),
            UseSSL:     getEnvAsBool("STORAGE_USE_SSL", false),
            PublicURL:  getEnv("STORAGE_PUBLIC_URL", ""),
        },
        Auth: AuthConfig{
            JWTSecret:            getEnv("JWT_SECRET", ""),
            AccessTokenDuration:  getEnvAsDuration("JWT_ACCESS_TOKEN_DURATION", 15*time.Minute),
            RefreshTokenDuration: getEnvAsDuration("JWT_REFRESH_TOKEN_DURATION", 168*time.Hour),
            PasswordPepper:       getEnv("PASSWORD_PEPPER", ""),
            CSRFSecret:          getEnv("CSRF_SECRET", ""),
            CookieSecure:        getEnvAsBool("COOKIE_SECURE", false),
            CookieDomain:        getEnv("COOKIE_DOMAIN", "localhost"),
            BcryptCost:          getEnvAsInt("BCRYPT_COST", 12),
        },
        App: AppConfig{
            Env:                        getEnv("APP_ENV", "development"),
            Host:                       getEnv("APP_HOST", "0.0.0.0"),
            Port:                       getEnvAsInt("APP_PORT", 3001),
            FrontendURL:               getEnv("FRONTEND_URL", "http://localhost:3000"),
            PublicLinkBaseURL:         getEnv("PUBLIC_LINK_BASE_URL", "http://localhost:3000"),
            AllowedOrigins:            getEnvAsSlice("ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
            RateLimitAuthRPM:          getEnvAsInt("RATE_LIMIT_AUTH_RPM", 5),
            RateLimitPublicRPM:        getEnvAsInt("RATE_LIMIT_PUBLIC_RPM", 30),
            RateLimitAuthenticatedRPM: getEnvAsInt("RATE_LIMIT_AUTHENTICATED_RPM", 100),
            LogLevel:                  getEnv("LOG_LEVEL", "info"),
            LogFormat:                 getEnv("LOG_FORMAT", "json"),
            MigrationsPath:            getEnv("MIGRATIONS_PATH", "file://migrations"),
            AutoMigrate:               getEnvAsBool("AUTO_MIGRATE", true),
        },
        SMTP: SMTPConfig{
            Host:     getEnv("SMTP_HOST", ""),
            Port:     getEnvAsInt("SMTP_PORT", 587),
            User:     getEnv("SMTP_USER", ""),
            Password: getEnv("SMTP_PASSWORD", ""),
            From:     getEnv("EMAIL_FROM", ""),
        },
    }

    if err := cfg.Validate(); err != nil {
        return nil, err
    }

    return cfg, nil
}

func (c *Config) Validate() error {
    if c.Database.Password == "" {
        return fmt.Errorf("DB_PASSWORD é obrigatório")
    }
    if c.Auth.JWTSecret == "" {
        return fmt.Errorf("JWT_SECRET é obrigatório")
    }
    if c.Auth.PasswordPepper == "" {
        return fmt.Errorf("PASSWORD_PEPPER é obrigatório")
    }
    if c.Storage.AccessKey == "" {
        return fmt.Errorf("STORAGE_ACCESS_KEY é obrigatório")
    }
    if c.Storage.SecretKey == "" {
        return fmt.Errorf("STORAGE_SECRET_KEY é obrigatório")
    }
    return nil
}

// Helpers para parsing de env vars
func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
    if value := os.Getenv(key); value != "" {
        if intVal, err := strconv.Atoi(value); err == nil {
            return intVal
        }
    }
    return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
    if value := os.Getenv(key); value != "" {
        if boolVal, err := strconv.ParseBool(value); err == nil {
            return boolVal
        }
    }
    return defaultValue
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
    if value := os.Getenv(key); value != "" {
        if duration, err := time.ParseDuration(value); err == nil {
            return duration
        }
    }
    return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
    if value := os.Getenv(key); value != "" {
        return strings.Split(value, ",")
    }
    return defaultValue
}
