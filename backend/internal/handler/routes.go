package handler

import (
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	chiCors "github.com/go-chi/cors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	appMiddleware "github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// Handler agrupa todos os handlers da aplicação
type Handler struct {
	Auth            *AuthHandler
	User            *UserHandler
	Product         *ProductHandler
	Batch           *BatchHandler
	Reservation     *ReservationHandler
	Dashboard       *DashboardHandler
	SalesLink       *SalesLinkHandler
	Cliente         *ClienteHandler
	SalesHistory    *SalesHistoryHandler
	SharedInventory *SharedInventoryHandler
	Upload          *UploadHandler
	Public          *PublicHandler
	Health          *HealthHandler
}

// Config contém as configurações para os handlers
type Config struct {
	Logger          *zap.Logger
	Validator       *validator.Validator
	AllowedOrigins  []string
	CookieDomain    string
	CookieSecure    bool
	CSRFSecret      string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
}

// Services agrupa todos os serviços necessários
type Services struct {
	Auth            service.AuthService
	User            service.UserService
	Product         service.ProductService
	Batch           service.BatchService
	Reservation     service.ReservationService
	Dashboard       service.DashboardService
	SalesLink       service.SalesLinkService
	Cliente         service.ClienteService
	SalesHistory    service.SalesHistoryService
	SharedInventory service.SharedInventoryService
	Storage         service.StorageService
	MediaRepo       repository.MediaRepository
}

// NewHandler cria uma nova instância de Handler com todos os handlers
func NewHandler(cfg Config, services Services, healthHandler *HealthHandler) *Handler {
	return &Handler{
		Auth:            NewAuthHandler(services.Auth, cfg.Validator, cfg.Logger, cfg.CookieDomain, cfg.CookieSecure, cfg.AccessTokenTTL, cfg.RefreshTokenTTL),
		User:            NewUserHandler(services.User, cfg.Validator, cfg.Logger),
		Product:         NewProductHandler(services.Product, cfg.Validator, cfg.Logger),
		Batch:           NewBatchHandler(services.Batch, cfg.Validator, cfg.Logger),
		Reservation:     NewReservationHandler(services.Reservation, cfg.Validator, cfg.Logger),
		Dashboard:       NewDashboardHandler(services.Dashboard, cfg.Logger),
		SalesLink:       NewSalesLinkHandler(services.SalesLink, cfg.Validator, cfg.Logger),
		Cliente:         NewClienteHandler(services.Cliente, cfg.Validator, cfg.Logger),
		SalesHistory:    NewSalesHistoryHandler(services.SalesHistory, cfg.Validator, cfg.Logger),
		SharedInventory: NewSharedInventoryHandler(services.SharedInventory, cfg.Validator, cfg.Logger),
		Upload:          NewUploadHandler(services.Storage, services.Product, services.Batch, services.MediaRepo, cfg.Logger),
		Public:          NewPublicHandler(services.SalesLink, services.Cliente, cfg.Validator, cfg.Logger),
		Health:          healthHandler,
	}
}

// Middlewares contém todos os middlewares da aplicação
type Middlewares struct {
	Auth     *appMiddleware.AuthMiddleware
	RBAC     *appMiddleware.RBACMiddleware
	CSRF     *appMiddleware.CSRFMiddleware
	RateAuth *appMiddleware.RateLimiter
	RatePub  *appMiddleware.RateLimiter
	RateApi  *appMiddleware.RateLimiter
}

// SetupRouter configura todas as rotas da aplicação
func SetupRouter(h *Handler, m Middlewares, cfg Config) *chi.Mux {
	r := chi.NewRouter()

	// Middlewares globais
	r.Use(appMiddleware.NewRecoveryMiddleware(cfg.Logger).Recover)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(appMiddleware.NewLoggerMiddleware(cfg.Logger).Log)

	// CORS
	r.Use(chiCors.Handler(chiCors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(m.CSRF.SetCSRFCookie)

	// Health check (público) - GET e HEAD para healthchecks Docker
	r.Get("/health", h.Health.Check)
	r.Head("/health", h.Health.Check)

	// API Routes
	r.Route("/api", func(r chi.Router) {
		// ============================================
		// ROTAS PÚBLICAS
		// ============================================
		r.Route("/public", func(r chi.Router) {
			r.Use(m.RatePub.Limit)

			// Links públicos
			r.Get("/links/{slug}", h.Public.GetLinkBySlug)

			// Captura de clientes
			r.Post("/clientes/interest", h.Public.CaptureClienteInterest)
		})

		// ============================================
		// ROTAS DE AUTENTICAÇÃO
		// ============================================
		r.Route("/auth", func(r chi.Router) {
			r.Use(m.RateAuth.Limit)

			r.Post("/login", h.Auth.Login)
			r.Post("/refresh", h.Auth.Refresh)
			r.With(m.Auth.Authenticate, m.CSRF.ValidateCSRF).Post("/logout", h.Auth.Logout)
		})

		// ============================================
		// ROTAS AUTENTICADAS
		// ============================================
		r.Group(func(r chi.Router) {
			r.Use(m.Auth.Authenticate)
			r.Use(m.RateApi.Limit)
			r.Use(m.CSRF.ValidateCSRF)

			// ----------------------------------------
			// DASHBOARD
			// ----------------------------------------
			r.Route("/dashboard", func(r chi.Router) {
				r.With(m.RBAC.RequireIndustryUser).Get("/metrics", h.Dashboard.GetIndustryMetrics)
				r.With(m.RBAC.RequireIndustryUser).Get("/recent-activities", h.Dashboard.GetRecentActivities)
			})

			// Dashboard Broker
			r.Route("/broker/dashboard", func(r chi.Router) {
				r.With(m.RBAC.RequireBroker).Get("/metrics", h.Dashboard.GetBrokerMetrics)
			})

			// ----------------------------------------
			// PRODUCTS
			// ----------------------------------------
			r.Route("/products", func(r chi.Router) {
				// Leitura permitida para VENDEDOR_INTERNO (necessário para filtros de inventário)
				r.With(m.RBAC.RequireIndustryUser).Get("/", h.Product.List)
				r.With(m.RBAC.RequireIndustryUser).Get("/{id}", h.Product.GetByID)
				// Escrita restrita a ADMIN
				r.With(m.RBAC.RequireAdmin).Post("/", h.Product.Create)
				r.With(m.RBAC.RequireAdmin).Put("/{id}", h.Product.Update)
				r.With(m.RBAC.RequireAdmin).Delete("/{id}", h.Product.Delete)
			})

			// ----------------------------------------
			// BATCHES
			// ----------------------------------------
			r.Route("/batches", func(r chi.Router) {
				r.With(m.RBAC.RequireIndustryUser).Get("/", h.Batch.List)
				r.With(m.RBAC.RequireAdmin).Post("/", h.Batch.Create)
				r.With(m.RBAC.RequireIndustryUser).Get("/{id}", h.Batch.GetByID)
				r.With(m.RBAC.RequireRoles(entity.RoleAdminIndustria, entity.RoleVendedorInterno, entity.RoleBroker)).Get("/{id}/status", h.Batch.CheckStatus)
				r.With(m.RBAC.RequireRoles(entity.RoleAdminIndustria, entity.RoleVendedorInterno, entity.RoleBroker)).Get("/{id}/check-availability", h.Batch.CheckAvailability)
				r.With(m.RBAC.RequireAdmin).Put("/{id}", h.Batch.Update)
				r.With(m.RBAC.RequireAdmin).Patch("/{id}/status", h.Batch.UpdateStatus)
				r.With(m.RBAC.RequireAdmin).Patch("/{id}/availability", h.Batch.UpdateAvailability)
			})

			// ----------------------------------------
			// RESERVATIONS
			// ----------------------------------------
			r.Route("/reservations", func(r chi.Router) {
				r.With(m.RBAC.RequireRoles(entity.RoleAdminIndustria, entity.RoleVendedorInterno, entity.RoleBroker)).Post("/", h.Reservation.Create)
				r.With(m.RBAC.RequireRoles(entity.RoleAdminIndustria, entity.RoleVendedorInterno, entity.RoleBroker)).Post("/{id}/confirm-sale", h.Reservation.ConfirmSale)
				r.With(m.RBAC.RequireRoles(entity.RoleAdminIndustria, entity.RoleVendedorInterno, entity.RoleBroker)).Delete("/{id}", h.Reservation.Cancel)
			})

			// ----------------------------------------
			// USERS
			// ----------------------------------------
			r.Route("/users", func(r chi.Router) {
				// Leitura permitida para VENDEDOR_INTERNO (necessário para filtro de vendedores)
				r.With(m.RBAC.RequireIndustryUser).Get("/", h.User.List)
				// Demais operações restritas a ADMIN
				r.With(m.RBAC.RequireAdmin).Post("/", h.User.Create)
				r.With(m.RBAC.RequireAnyAuthenticated).Get("/{id}", h.User.GetByID)
				r.With(m.RBAC.RequireAdmin).Patch("/{id}/status", h.User.UpdateStatus)
			})

			// ----------------------------------------
			// BROKERS
			// ----------------------------------------
			r.Route("/brokers", func(r chi.Router) {
				r.With(m.RBAC.RequireAdmin).Get("/", h.User.ListBrokers)
				r.With(m.RBAC.RequireAdmin).Post("/invite", h.User.InviteBroker)
				r.With(m.RBAC.RequireAdmin).Get("/{brokerId}/shared-inventory", h.SharedInventory.GetBrokerSharedInventory)
			})

			// ----------------------------------------
			// SHARED INVENTORY (Admin)
			// ----------------------------------------
			r.Route("/shared-inventory-batches", func(r chi.Router) {
				r.With(m.RBAC.RequireAdmin).Post("/", h.SharedInventory.ShareBatch)
				r.With(m.RBAC.RequireAdmin).Delete("/{id}", h.SharedInventory.RemoveSharedBatch)
			})

			// ----------------------------------------
			// SHARED INVENTORY (Broker)
			// ----------------------------------------
			r.Route("/broker/shared-inventory", func(r chi.Router) {
				r.With(m.RBAC.RequireBroker).Get("/", h.SharedInventory.GetMySharedInventory)
				r.With(m.RBAC.RequireBroker).Patch("/{id}/price", h.SharedInventory.UpdateNegotiatedPrice)
			})

			// ----------------------------------------
			// SALES LINKS
			// ----------------------------------------
			r.Route("/sales-links", func(r chi.Router) {
				r.With(m.RBAC.RequireAnyAuthenticated).Get("/", h.SalesLink.List)
				r.With(m.RBAC.RequireAnyAuthenticated).Post("/", h.SalesLink.Create)
				r.With(m.RBAC.RequireAnyAuthenticated).Get("/validate-slug", h.SalesLink.ValidateSlug)
				r.With(m.RBAC.RequireAnyAuthenticated).Get("/{id}", h.SalesLink.GetByID)
				r.With(m.RBAC.RequireAnyAuthenticated).Patch("/{id}", h.SalesLink.Update)
				r.With(m.RBAC.RequireAnyAuthenticated).Delete("/{id}", h.SalesLink.Delete)
			})

			// ----------------------------------------
			// CLIENTES
			// ----------------------------------------
			r.Route("/clientes", func(r chi.Router) {
				r.With(m.RBAC.RequireIndustryUser).Get("/", h.Cliente.List)
				r.With(m.RBAC.RequireIndustryUser).Get("/{id}", h.Cliente.GetByID)
				r.With(m.RBAC.RequireIndustryUser).Get("/{id}/interactions", h.Cliente.GetInteractions)
				r.With(m.RBAC.RequireIndustryUser).Patch("/{id}/status", h.Cliente.UpdateStatus)
			})

			// ----------------------------------------
			// SALES HISTORY
			// ----------------------------------------
			r.Route("/sales-history", func(r chi.Router) {
				r.With(m.RBAC.RequireIndustryUser).Get("/", h.SalesHistory.List)
				r.With(m.RBAC.RequireIndustryUser).Get("/summary", h.SalesHistory.GetSummary)
				r.With(m.RBAC.RequireIndustryUser).Get("/{id}", h.SalesHistory.GetByID)
			})

			// Broker sales
			r.With(m.RBAC.RequireBroker).Get("/broker/sales", h.SalesHistory.GetBrokerSales)

			// ----------------------------------------
			// UPLOADS
			// ----------------------------------------
			r.Route("/upload", func(r chi.Router) {
				r.With(m.RBAC.RequireAdmin).Post("/product-medias", h.Upload.UploadProductMedias)
				r.With(m.RBAC.RequireAdmin).Post("/batch-medias", h.Upload.UploadBatchMedias)
			})

			// Delete medias
			r.With(m.RBAC.RequireAdmin).Delete("/product-medias/{id}", h.Upload.DeleteProductMedia)
			r.With(m.RBAC.RequireAdmin).Delete("/batch-medias/{id}", h.Upload.DeleteBatchMedia)

			// Update media order
			r.With(m.RBAC.RequireAdmin).Patch("/product-medias/order", h.Upload.UpdateProductMediasOrder)
			r.With(m.RBAC.RequireAdmin).Patch("/batch-medias/order", h.Upload.UpdateBatchMediasOrder)
		})
	})

	return r
}
