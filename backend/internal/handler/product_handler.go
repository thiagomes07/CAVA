package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// ProductHandler gerencia requisições de produtos
type ProductHandler struct {
	productService service.ProductService
	validator      *validator.Validator
	logger         *zap.Logger
}

// NewProductHandler cria uma nova instância de ProductHandler
func NewProductHandler(
	productService service.ProductService,
	validator *validator.Validator,
	logger *zap.Logger,
) *ProductHandler {
	return &ProductHandler{
		productService: productService,
		validator:      validator,
		logger:         logger,
	}
}

// List godoc
// @Summary Lista produtos
// @Description Lista produtos com filtros e paginação
// @Tags products
// @Produce json
// @Param search query string false "Buscar por nome"
// @Param material query string false "Filtrar por material"
// @Param page query int false "Número da página"
// @Param limit query int false "Itens por página"
// @Success 200 {object} entity.ProductListResponse
// @Router /api/products [get]
func (h *ProductHandler) List(w http.ResponseWriter, r *http.Request) {
	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Extrair filtros da query string
	filters := entity.ProductFilters{
		Page:  1,
		Limit: 24,
	}

	if search := r.URL.Query().Get("search"); search != "" {
		filters.Search = &search
	}

	if material := r.URL.Query().Get("material"); material != "" {
		mat := entity.MaterialType(material)
		if mat.IsValid() {
			filters.Material = &mat
		}
	}

	if page := r.URL.Query().Get("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			filters.Page = p
		}
	}

	if limit := r.URL.Query().Get("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			filters.Limit = l
		}
	}

	// Validar filtros
	if err := h.validator.Validate(filters); err != nil {
		response.HandleError(w, err)
		return
	}

	// Buscar produtos
	result, err := h.productService.List(r.Context(), industryID, filters)
	if err != nil {
		h.logger.Error("erro ao listar produtos",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, result)
}

// GetByID godoc
// @Summary Busca produto por ID
// @Description Retorna detalhes de um produto específico
// @Tags products
// @Produce json
// @Param id path string true "ID do produto"
// @Success 200 {object} entity.Product
// @Failure 404 {object} response.ErrorResponse
// @Router /api/products/{id} [get]
func (h *ProductHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do produto é obrigatório", nil)
		return
	}

	product, err := h.productService.GetByID(r.Context(), id)
	if err != nil {
		h.logger.Error("erro ao buscar produto",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, product)
}

// Create godoc
// @Summary Cria um novo produto
// @Description Cria um novo produto no catálogo
// @Tags products
// @Accept json
// @Produce json
// @Param body body entity.CreateProductInput true "Dados do produto"
// @Success 201 {object} entity.Product
// @Failure 400 {object} response.ErrorResponse
// @Router /api/products [post]
func (h *ProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input entity.CreateProductInput

	// Parse JSON body
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Criar produto
	product, err := h.productService.Create(r.Context(), industryID, input)
	if err != nil {
		h.logger.Error("erro ao criar produto",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("produto criado",
		zap.String("productId", product.ID),
		zap.String("name", product.Name),
	)

	response.Created(w, product)
}

// Update godoc
// @Summary Atualiza um produto
// @Description Atualiza dados de um produto existente
// @Tags products
// @Accept json
// @Produce json
// @Param id path string true "ID do produto"
// @Param body body entity.UpdateProductInput true "Dados do produto"
// @Success 200 {object} entity.Product
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/products/{id} [put]
func (h *ProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do produto é obrigatório", nil)
		return
	}

	var input entity.UpdateProductInput

	// Parse JSON body
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Atualizar produto
	product, err := h.productService.Update(r.Context(), id, input)
	if err != nil {
		h.logger.Error("erro ao atualizar produto",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("produto atualizado",
		zap.String("productId", id),
	)

	response.OK(w, product)
}

// Delete godoc
// @Summary Remove um produto
// @Description Desativa um produto (soft delete)
// @Tags products
// @Produce json
// @Param id path string true "ID do produto"
// @Success 200 {object} map[string]bool
// @Failure 404 {object} response.ErrorResponse
// @Router /api/products/{id} [delete]
func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do produto é obrigatório", nil)
		return
	}

	// Deletar produto (soft delete)
	if err := h.productService.Delete(r.Context(), id); err != nil {
		h.logger.Error("erro ao deletar produto",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("produto deletado",
		zap.String("productId", id),
	)

	response.OK(w, map[string]bool{"success": true})
}
