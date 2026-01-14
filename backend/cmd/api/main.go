package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/config"
	domainRepo "github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	domainService "github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/internal/handler"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/internal/repository"
	"github.com/thiagomes07/CAVA/backend/internal/service"
	"github.com/thiagomes07/CAVA/backend/internal/storage"
	"github.com/thiagomes07/CAVA/backend/pkg/jwt"
	"github.com/thiagomes07/CAVA/backend/pkg/password"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	// ============================================
	// 1. INICIALIZAR LOGGER
	// ============================================
	logger := initLogger()
	defer logger.Sync()

	logger.Info("iniciando CAVA API...")

	// ============================================
	// 2. CARREGAR CONFIGURAÇÕES
	// ============================================
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("erro ao carregar configurações", zap.Error(err))
	}

	logger.Info("configurações carregadas",
		zap.String("env", cfg.App.Env),
		zap.String("host", cfg.Server.Host),
		zap.Int("port", cfg.Server.Port),
	)

	// ============================================
	// 3. CONECTAR AO POSTGRESQL
	// ============================================
	dbConfig := &repository.Config{
		Host:            cfg.Database.Host,
		Port:            cfg.Database.Port,
		User:            cfg.Database.User,
		Password:        cfg.Database.Password,
		Database:        cfg.Database.Name,
		SSLMode:         cfg.Database.SSLMode,
		MaxOpenConns:    cfg.Database.MaxOpenConns,
		MaxIdleConns:    cfg.Database.MaxIdleConns,
		ConnMaxLifetime: cfg.Database.ConnMaxLifetime,
	}

	db, err := repository.NewDB(dbConfig, logger)
	if err != nil {
		logger.Fatal("erro ao conectar ao PostgreSQL", zap.Error(err))
	}
	defer func() {
		if err := db.Close(); err != nil {
			logger.Error("erro ao fechar conexão com PostgreSQL", zap.Error(err))
		}
	}()

	logger.Info("conexão com PostgreSQL estabelecida")

	// ============================================
	// 4. CONECTAR AO MINIO/S3
	// ============================================
	storageConfig := &storage.Config{
		Endpoint:   cfg.Storage.Endpoint,
		AccessKey:  cfg.Storage.AccessKey,
		SecretKey:  cfg.Storage.SecretKey,
		BucketName: cfg.Storage.BucketName,
		Region:     cfg.Storage.Region,
		UseSSL:     cfg.Storage.UseSSL,
		PublicURL:  cfg.Storage.PublicURL,
	}

	s3Adapter, err := storage.NewS3Adapter(storageConfig, logger)
	if err != nil {
		logger.Fatal("erro ao conectar ao MinIO/S3", zap.Error(err))
	}

	logger.Info("conexão com MinIO/S3 estabelecida",
		zap.String("bucket", cfg.Storage.BucketName),
	)

	// ============================================
	// 5. INICIALIZAR UTILITÁRIOS
	// ============================================
	// Token Manager (JWT)
	tokenManager := jwt.NewTokenManager(
		cfg.Auth.JWTSecret,
		cfg.Auth.JWTAccessTokenDuration,
		cfg.Auth.JWTRefreshTokenDuration,
	)

	// Password Hasher (Argon2)
	hasher := password.NewHasher(password.DefaultParams(), cfg.Auth.PasswordPepper)

	// Validator
	v := validator.New()

	// ============================================
	// 6. INICIALIZAR REPOSITORIES
	// ============================================
	repos := initRepositories(db)

	logger.Info("repositories inicializados")

	// ============================================
	// 7. INICIALIZAR SERVICES
	// ============================================
	services := initServices(repos, tokenManager, hasher, s3Adapter, cfg, logger)

	logger.Info("services inicializados")

	// ============================================
	// 8. INICIALIZAR MIDDLEWARES
	// ============================================
	middlewares := initMiddlewares(tokenManager, cfg, logger)

	logger.Info("middlewares inicializados")

	// ============================================
	// 9. INICIALIZAR HEALTH HANDLER
	// ============================================
	healthHandler := handler.NewHealthHandler(repos.DB, s3Adapter)

	// ============================================
	// 10. INICIALIZAR HANDLERS E ROUTER
	// ============================================
	handlerConfig := handler.Config{
		Logger:          logger,
		Validator:       v,
		AllowedOrigins:  cfg.Server.AllowedOrigins,
		CookieDomain:    cfg.Auth.CookieDomain,
		CookieSecure:    cfg.Auth.CookieSecure,
		CSRFSecret:      cfg.Auth.CSRFSecret,
		AccessTokenTTL:  tokenManager.AccessTTL(),
		RefreshTokenTTL: tokenManager.RefreshTTL(),
	}

	h := handler.NewHandler(handlerConfig, services, healthHandler)
	router := handler.SetupRouter(h, middlewares, handlerConfig)

	logger.Info("router configurado")

	// ============================================
	// 10.1 INICIAR JOB DE EXPIRAÇÃO DE RESERVAS
	// ============================================
	reservationExpirationCtx, cancelExpiration := context.WithCancel(context.Background())
	go startReservationExpirationJob(reservationExpirationCtx, services.Reservation, logger)

	logger.Info("job de expiração de reservas iniciado")

	// ============================================
	// 11. CONFIGURAR E INICIAR SERVIDOR HTTP
	// ============================================
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	server := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Canal para erros do servidor
	serverErrors := make(chan error, 1)

	// Iniciar servidor em goroutine
	go func() {
		logger.Info("servidor HTTP iniciado",
			zap.String("addr", addr),
			zap.Bool("development", cfg.IsDevelopment()),
		)
		serverErrors <- server.ListenAndServe()
	}()

	// ============================================
	// 12. GRACEFUL SHUTDOWN
	// ============================================
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		if err != nil && err != http.ErrServerClosed {
			logger.Fatal("erro no servidor HTTP", zap.Error(err))
		}

	case sig := <-shutdown:
		logger.Info("iniciando graceful shutdown",
			zap.String("signal", sig.String()),
		)

		// Cancelar job de expiração de reservas
		cancelExpiration()

		// Contexto com timeout para shutdown
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		// Tentar graceful shutdown
		if err := server.Shutdown(ctx); err != nil {
			logger.Error("erro durante shutdown",
				zap.Error(err),
			)
			// Forçar close se shutdown falhar
			if err := server.Close(); err != nil {
				logger.Error("erro ao forçar close do servidor", zap.Error(err))
			}
		}
	}

	logger.Info("servidor encerrado com sucesso")
}

// initLogger inicializa o logger zap
func initLogger() *zap.Logger {
	env := os.Getenv("APP_ENV")

	var logger *zap.Logger
	var err error

	if env == "production" {
		// Logger de produção (JSON, nível info)
		config := zap.NewProductionConfig()
		config.EncoderConfig.TimeKey = "timestamp"
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		logger, err = config.Build()
	} else {
		// Logger de desenvolvimento (console, colorido, nível debug)
		config := zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		logger, err = config.Build()
	}

	if err != nil {
		panic(fmt.Sprintf("erro ao inicializar logger: %v", err))
	}

	return logger
}

// Repositories agrupa todos os repositories
type Repositories struct {
	User               domainRepo.UserRepository
	Session            domainRepo.SessionRepository
	Product            domainRepo.ProductRepository
	Batch              domainRepo.BatchRepository
	Media              domainRepo.MediaRepository
	Reservation        domainRepo.ReservationRepository
	SalesLink          domainRepo.SalesLinkRepository
	Cliente            domainRepo.ClienteRepository
	ClienteInteraction domainRepo.ClienteInteractionRepository
	SalesHistory       domainRepo.SalesHistoryRepository
	SharedInventory    domainRepo.SharedInventoryRepository
	Industry           domainRepo.IndustryRepository
	DB                 *repository.DB
}

// initRepositories inicializa todos os repositories
func initRepositories(db *repository.DB) Repositories {
	return Repositories{
		User:               repository.NewUserRepository(db),
		Session:            repository.NewSessionRepository(db),
		Product:            repository.NewProductRepository(db),
		Batch:              repository.NewBatchRepository(db),
		Media:              repository.NewMediaRepository(db),
		Reservation:        repository.NewReservationRepository(db),
		SalesLink:          repository.NewSalesLinkRepository(db),
		Cliente:            repository.NewClienteRepository(db),
		ClienteInteraction: repository.NewClienteInteractionRepository(db),
		SalesHistory:       repository.NewSalesHistoryRepository(db),
		SharedInventory:    repository.NewSharedInventoryRepository(db),
		Industry:           repository.NewIndustryRepository(db),
		DB:                 db,
	}
}

// initServices inicializa todos os services
func initServices(
	repos Repositories,
	tokenManager *jwt.TokenManager,
	hasher *password.Hasher,
	s3Adapter *storage.S3Adapter,
	cfg *config.Config,
	logger *zap.Logger,
) handler.Services {
	// Auth Service
	authService := service.NewAuthService(
		repos.User,
		repos.Session,
		tokenManager,
		hasher,
		logger,
	)

	// User Service
	userService := service.NewUserService(
		repos.User,
		hasher,
		logger,
	)

	// Product Service
	productService := service.NewProductService(
		repos.Product,
		repos.Media,
		logger,
	)

	// Batch Service
	batchService := service.NewBatchService(
		repos.Batch,
		repos.Product,
		repos.Media,
		logger,
	)

	// Reservation Service
	reservationService := service.NewReservationService(
		repos.Reservation,
		repos.Batch,
		repos.Cliente,
		repos.SalesHistory,
		repos.DB,
		logger,
	)

	// Dashboard Service
	dashboardService := service.NewDashboardService(
		repos.Batch,
		repos.SalesHistory,
		repos.SalesLink,
		repos.Cliente,
		repos.SharedInventory,
		logger,
	)

	// Sales Link Service
	salesLinkService := service.NewSalesLinkService(
		repos.SalesLink,
		repos.Batch,
		repos.Product,
		cfg.App.PublicLinkBaseURL,
		logger,
	)

	// Cliente Service
	clienteService := service.NewClienteService(
		repos.Cliente,
		repos.ClienteInteraction,
		repos.SalesLink,
		newDBExecutorAdapter(repos.DB),
		logger,
	)

	// Sales History Service
	salesHistoryService := service.NewSalesHistoryService(
		repos.SalesHistory,
		repos.Batch,
		repos.User,
		repos.Cliente,
		logger,
	)

	// Shared Inventory Service
	sharedInventoryService := service.NewSharedInventoryService(
		repos.SharedInventory,
		repos.Batch,
		repos.User,
		logger,
	)

	// Storage Service
	storageService := service.NewStorageService(
		s3Adapter,
		cfg.Storage.BucketName,
		logger,
	)

	return handler.Services{
		Auth:            authService,
		User:            userService,
		Product:         productService,
		Batch:           batchService,
		Reservation:     reservationService,
		Dashboard:       dashboardService,
		SalesLink:       salesLinkService,
		Cliente:         clienteService,
		SalesHistory:    salesHistoryService,
		SharedInventory: sharedInventoryService,
		Storage:         storageService,
		MediaRepo:       repos.Media,
	}
}

// initMiddlewares inicializa todos os middlewares
func initMiddlewares(
	tokenManager *jwt.TokenManager,
	cfg *config.Config,
	logger *zap.Logger,
) handler.Middlewares {
	// Auth Middleware
	authMiddleware := middleware.NewAuthMiddleware(tokenManager, logger)

	// RBAC Middleware
	rbacMiddleware := middleware.NewRBACMiddleware(logger)

	// CSRF Middleware
	csrfMiddleware := middleware.NewCSRFMiddleware(
		cfg.Auth.CSRFSecret,
		cfg.Auth.CookieDomain,
		cfg.Auth.CookieSecure,
		logger,
	)

	// Rate Limiters
	rateAuth := middleware.NewRateLimiter(cfg.Server.RateLimitAuthRPM, logger)
	ratePub := middleware.NewRateLimiter(cfg.Server.RateLimitPublicRPM, logger)
	rateApi := middleware.NewRateLimiter(cfg.Server.RateLimitAuthenticatedRPM, logger)

	return handler.Middlewares{
		Auth:     authMiddleware,
		RBAC:     rbacMiddleware,
		CSRF:     csrfMiddleware,
		RateAuth: rateAuth,
		RatePub:  ratePub,
		RateApi:  rateApi,
	}
}

// dbExecutorAdapter adapta repository.DB para service.DatabaseExecutor
type dbExecutorAdapter struct {
	db *repository.DB
}

func newDBExecutorAdapter(db *repository.DB) *dbExecutorAdapter {
	return &dbExecutorAdapter{db: db}
}

func (a *dbExecutorAdapter) ExecuteInTx(ctx context.Context, fn func(tx interface{}) error) error {
	return a.db.ExecuteInTx(ctx, func(tx *sql.Tx) error {
		return fn(tx)
	})
}

// startReservationExpirationJob executa periodicamente a expiração de reservas vencidas
func startReservationExpirationJob(ctx context.Context, reservationService domainService.ReservationService, logger *zap.Logger) {
	ticker := time.NewTicker(1 * time.Hour) // Executar a cada hora
	defer ticker.Stop()

	logger.Info("job de expiração de reservas configurado para executar a cada 1 hora")

	for {
		select {
		case <-ctx.Done():
			logger.Info("job de expiração de reservas encerrado")
			return
		case <-ticker.C:
			logger.Info("executando job de expiração de reservas")
			count, err := reservationService.ExpireReservations(ctx)
			if err != nil {
				logger.Error("erro ao executar job de expiração", zap.Error(err))
			} else {
				logger.Info("job de expiração de reservas concluído",
					zap.Int("expiredCount", count),
				)
			}
		}
	}
}
