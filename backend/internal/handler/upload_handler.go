package handler

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
)

// UploadHandler gerencia uploads de mídia
type UploadHandler struct {
	storageService service.StorageService
	productService service.ProductService
	batchService   service.BatchService
	mediaRepo      repository.MediaRepository
	logger         *zap.Logger
}

// NewUploadHandler cria uma nova instância de UploadHandler
func NewUploadHandler(
	storageService service.StorageService,
	productService service.ProductService,
	batchService service.BatchService,
	mediaRepo repository.MediaRepository,
	logger *zap.Logger,
) *UploadHandler {
	return &UploadHandler{
		storageService: storageService,
		productService: productService,
		batchService:   batchService,
		mediaRepo:      mediaRepo,
		logger:         logger,
	}
}

const (
	maxUploadSize    = 5 << 20 // 5MB
	maxFilesPerBatch = 10
)

var allowedContentTypes = []string{
	"image/jpeg",
	"image/png",
	"image/webp",
}

var allowedExtensions = []string{
	".jpg",
	".jpeg",
	".png",
	".webp",
}

// isAllowedExtension verifica se a extensão do arquivo é permitida
func isAllowedExtension(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	for _, allowed := range allowedExtensions {
		if ext == allowed {
			return true
		}
	}
	return false
}

// sanitizeFilename remove caracteres perigosos do nome do arquivo para prevenir path traversal
func sanitizeUploadFilename(filename string) string {
	// Remove path separators e caracteres perigosos
	filename = filepath.Base(filename)
	filename = strings.ReplaceAll(filename, "..", "")
	filename = strings.ReplaceAll(filename, "/", "")
	filename = strings.ReplaceAll(filename, "\\", "")
	return filename
}

// UploadProductMedias godoc
// @Summary Faz upload de mídias de produto
// @Description Faz upload de imagens para um produto
// @Tags uploads
// @Accept multipart/form-data
// @Produce json
// @Param productId formData string true "ID do produto"
// @Param medias formData file true "Arquivos de mídia"
// @Success 201 {object} entity.UploadMediaResponse
// @Failure 400 {object} response.ErrorResponse
// @Router /api/upload/product-medias [post]
func (h *UploadHandler) UploadProductMedias(w http.ResponseWriter, r *http.Request) {
	// Limitar tamanho do request
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize*maxFilesPerBatch)

	// Parse multipart form
	if err := r.ParseMultipartForm(maxUploadSize * maxFilesPerBatch); err != nil {
		h.logger.Error("erro ao parsear multipart form",
			zap.Error(err),
		)
		response.BadRequest(w, "Arquivo muito grande. Máximo 5MB por arquivo", nil)
		return
	}

	// Obter product ID
	productID := r.FormValue("productId")
	if productID == "" {
		response.BadRequest(w, "Product ID é obrigatório", nil)
		return
	}

	// Obter arquivos
	files := r.MultipartForm.File["medias"]
	if len(files) == 0 {
		response.BadRequest(w, "Nenhum arquivo enviado", nil)
		return
	}

	if len(files) > maxFilesPerBatch {
		response.BadRequest(w, "Máximo 10 arquivos por upload", nil)
		return
	}

	// Buscar mídias existentes para obter o próximo displayOrder
	existingMedias, err := h.mediaRepo.FindProductMedias(r.Context(), productID)
	if err != nil {
		h.logger.Error("erro ao buscar mídias existentes",
			zap.String("productId", productID),
			zap.Error(err),
		)
	}
	startDisplayOrder := len(existingMedias)

	// Processar cada arquivo
	var urls []string
	for _, fileHeader := range files {
		// Sanitizar nome do arquivo para prevenir path traversal
		safeFilename := sanitizeUploadFilename(fileHeader.Filename)

		// Validar extensão do arquivo (não confiar apenas no Content-Type)
		if !isAllowedExtension(safeFilename) {
			response.BadRequest(w, "Extensão de arquivo inválida. Use .jpg, .jpeg, .png ou .webp", nil)
			return
		}

		// Validar tamanho
		if fileHeader.Size > maxUploadSize {
			response.BadRequest(w, "Arquivo muito grande. Máximo 5MB por arquivo", nil)
			return
		}

		// Abrir arquivo
		file, err := fileHeader.Open()
		if err != nil {
			h.logger.Error("erro ao abrir arquivo",
				zap.String("filename", safeFilename),
				zap.Error(err),
			)
			response.BadRequest(w, "Erro ao processar arquivo", nil)
			return
		}
		defer file.Close()

		// Validar tipo do arquivo (Content-Type)
		contentType := fileHeader.Header.Get("Content-Type")
		if !h.storageService.ValidateFileType(contentType, allowedContentTypes) {
			response.BadRequest(w, "Formato inválido. Use JPEG, PNG ou WebP", nil)
			return
		}

		// Fazer upload
		url, err := h.storageService.UploadProductMedia(
			r.Context(),
			productID,
			file,
			safeFilename,
			contentType,
			fileHeader.Size,
		)
		if err != nil {
			h.logger.Error("erro ao fazer upload",
				zap.String("filename", fileHeader.Filename),
				zap.Error(err),
			)
			response.HandleError(w, err)
			return
		}

		urls = append(urls, url)
	}

	// Persistir URLs no banco de dados
	var mediasToCreate []entity.CreateMediaInput
	for i, url := range urls {
		mediasToCreate = append(mediasToCreate, entity.CreateMediaInput{
			URL:          url,
			DisplayOrder: startDisplayOrder + i,            // Continua a partir das mídias existentes
			IsCover:      startDisplayOrder == 0 && i == 0, // Primeira imagem é capa apenas se não houver mídias existentes
		})
	}

	if err := h.productService.AddMedias(r.Context(), productID, mediasToCreate); err != nil {
		h.logger.Error("erro ao persistir mídias no banco",
			zap.String("productId", productID),
			zap.Error(err),
		)
		// Não retorna erro pois o upload já foi feito com sucesso
		// As URLs ainda serão retornadas, mas um warning é logado
	}

	h.logger.Info("mídias de produto enviadas e persistidas",
		zap.String("productId", productID),
		zap.Int("count", len(urls)),
	)

	response.Created(w, entity.UploadMediaResponse{URLs: urls})
}

// UploadBatchMedias godoc
// @Summary Faz upload de mídias de lote
// @Description Faz upload de imagens para um lote
// @Tags uploads
// @Accept multipart/form-data
// @Produce json
// @Param batchId formData string true "ID do lote"
// @Param medias formData file true "Arquivos de mídia"
// @Success 201 {object} entity.UploadMediaResponse
// @Failure 400 {object} response.ErrorResponse
// @Router /api/upload/batch-medias [post]
func (h *UploadHandler) UploadBatchMedias(w http.ResponseWriter, r *http.Request) {
	// Limitar tamanho do request
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize*maxFilesPerBatch)

	// Parse multipart form
	if err := r.ParseMultipartForm(maxUploadSize * maxFilesPerBatch); err != nil {
		h.logger.Error("erro ao parsear multipart form",
			zap.Error(err),
		)
		response.BadRequest(w, "Arquivo muito grande. Máximo 5MB por arquivo", nil)
		return
	}

	// Obter batch ID
	batchID := r.FormValue("batchId")
	if batchID == "" {
		response.BadRequest(w, "Batch ID é obrigatório", nil)
		return
	}

	// Obter arquivos
	files := r.MultipartForm.File["medias"]
	if len(files) == 0 {
		response.BadRequest(w, "Nenhum arquivo enviado", nil)
		return
	}

	if len(files) > maxFilesPerBatch {
		response.BadRequest(w, "Máximo 10 arquivos por upload", nil)
		return
	}

	// Buscar mídias existentes para obter o próximo displayOrder
	existingMedias, err := h.mediaRepo.FindBatchMedias(r.Context(), batchID)
	if err != nil {
		h.logger.Error("erro ao buscar mídias existentes do lote",
			zap.String("batchId", batchID),
			zap.Error(err),
		)
	}
	startDisplayOrder := len(existingMedias)

	// Processar cada arquivo
	var urls []string
	for _, fileHeader := range files {
		// Sanitizar nome do arquivo para prevenir path traversal
		safeFilename := sanitizeUploadFilename(fileHeader.Filename)

		// Validar extensão do arquivo (não confiar apenas no Content-Type)
		if !isAllowedExtension(safeFilename) {
			response.BadRequest(w, "Extensão de arquivo inválida. Use .jpg, .jpeg, .png ou .webp", nil)
			return
		}

		// Validar tamanho
		if fileHeader.Size > maxUploadSize {
			response.BadRequest(w, "Arquivo muito grande. Máximo 5MB por arquivo", nil)
			return
		}

		// Abrir arquivo
		file, err := fileHeader.Open()
		if err != nil {
			h.logger.Error("erro ao abrir arquivo",
				zap.String("filename", safeFilename),
				zap.Error(err),
			)
			response.BadRequest(w, "Erro ao processar arquivo", nil)
			return
		}
		defer file.Close()

		// Validar tipo do arquivo (Content-Type)
		contentType := fileHeader.Header.Get("Content-Type")
		if !h.storageService.ValidateFileType(contentType, allowedContentTypes) {
			response.BadRequest(w, "Formato inválido. Use JPEG, PNG ou WebP", nil)
			return
		}

		// Fazer upload
		url, err := h.storageService.UploadBatchMedia(
			r.Context(),
			batchID,
			file,
			safeFilename,
			contentType,
			fileHeader.Size,
		)
		if err != nil {
			h.logger.Error("erro ao fazer upload",
				zap.String("filename", fileHeader.Filename),
				zap.Error(err),
			)
			response.HandleError(w, err)
			return
		}

		urls = append(urls, url)
	}

	// Persistir URLs no banco de dados
	var mediasToCreate []entity.CreateMediaInput
	for i, url := range urls {
		mediasToCreate = append(mediasToCreate, entity.CreateMediaInput{
			URL:          url,
			DisplayOrder: startDisplayOrder + i, // Continua a partir das mídias existentes
			IsCover:      false,
		})
	}

	if err := h.batchService.AddMedias(r.Context(), batchID, mediasToCreate); err != nil {
		h.logger.Error("erro ao persistir mídias no banco",
			zap.String("batchId", batchID),
			zap.Error(err),
		)
		// Não retorna erro pois o upload já foi feito com sucesso
		// As URLs ainda serão retornadas, mas um warning é logado
	}

	h.logger.Info("mídias de lote enviadas e persistidas",
		zap.String("batchId", batchID),
		zap.Int("count", len(urls)),
	)

	response.Created(w, entity.UploadMediaResponse{URLs: urls})
}

// DeleteProductMedia godoc
// @Summary Remove mídia de produto
// @Description Remove uma mídia do storage e banco de dados
// @Tags uploads
// @Produce json
// @Param id path string true "ID da mídia"
// @Success 200 {object} map[string]bool
// @Failure 404 {object} response.ErrorResponse
// @Router /api/product-medias/{id} [delete]
func (h *UploadHandler) DeleteProductMedia(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID da mídia é obrigatório", nil)
		return
	}

	ctx := r.Context()

	// Buscar mídia no banco para obter URL
	media, err := h.mediaRepo.FindProductMediaByID(ctx, id)
	if err != nil {
		h.logger.Error("erro ao buscar mídia de produto",
			zap.String("mediaId", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Extrair key do storage a partir da URL
	key, err := h.storageService.ExtractKeyFromURL(media.URL)
	if err != nil {
		h.logger.Error("erro ao extrair key da URL",
			zap.String("url", media.URL),
			zap.Error(err),
		)
		response.InternalServerError(w, err)
		return
	}

	// Deletar arquivo do storage (S3/MinIO)
	if err := h.storageService.DeleteFile(ctx, "", key); err != nil {
		h.logger.Error("erro ao deletar arquivo do storage",
			zap.String("key", key),
			zap.Error(err),
		)
		// Continua para deletar do banco mesmo se falhar no storage
	}

	// Deletar registro do banco de dados
	if err := h.mediaRepo.DeleteProductMedia(ctx, id); err != nil {
		h.logger.Error("erro ao deletar mídia do banco",
			zap.String("mediaId", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("mídia de produto removida",
		zap.String("mediaId", id),
		zap.String("productId", media.ProductID),
	)

	response.OK(w, map[string]bool{"success": true})
}

// DeleteBatchMedia godoc
// @Summary Remove mídia de lote
// @Description Remove uma mídia do storage e banco de dados
// @Tags uploads
// @Produce json
// @Param id path string true "ID da mídia"
// @Success 200 {object} map[string]bool
// @Failure 404 {object} response.ErrorResponse
// @Router /api/batch-medias/{id} [delete]
func (h *UploadHandler) DeleteBatchMedia(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID da mídia é obrigatório", nil)
		return
	}

	ctx := r.Context()

	// Buscar mídia no banco para obter URL
	media, err := h.mediaRepo.FindBatchMediaByID(ctx, id)
	if err != nil {
		h.logger.Error("erro ao buscar mídia de lote",
			zap.String("mediaId", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Extrair key do storage a partir da URL
	key, err := h.storageService.ExtractKeyFromURL(media.URL)
	if err != nil {
		h.logger.Error("erro ao extrair key da URL",
			zap.String("url", media.URL),
			zap.Error(err),
		)
		response.InternalServerError(w, err)
		return
	}

	// Deletar arquivo do storage (S3/MinIO)
	if err := h.storageService.DeleteFile(ctx, "", key); err != nil {
		h.logger.Error("erro ao deletar arquivo do storage",
			zap.String("key", key),
			zap.Error(err),
		)
		// Continua para deletar do banco mesmo se falhar no storage
	}

	// Deletar registro do banco de dados
	if err := h.mediaRepo.DeleteBatchMedia(ctx, id); err != nil {
		h.logger.Error("erro ao deletar mídia do banco",
			zap.String("mediaId", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("mídia de lote removida",
		zap.String("mediaId", id),
		zap.String("batchId", media.BatchID),
	)

	response.OK(w, map[string]bool{"success": true})
}

// UpdateBatchMediasOrder godoc
// @Summary Atualiza ordem das mídias de um lote
// @Description Atualiza a ordem de exibição das mídias de um lote
// @Tags uploads
// @Accept json
// @Produce json
// @Param body body []map[string]interface{} true "Array de mídias com id e displayOrder"
// @Success 200 {object} map[string]bool
// @Failure 400 {object} response.ErrorResponse
// @Router /api/batch-medias/order [patch]
func (h *UploadHandler) UpdateBatchMediasOrder(w http.ResponseWriter, r *http.Request) {
	var input []struct {
		ID           string `json:"id"`
		DisplayOrder int    `json:"displayOrder"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "JSON inválido", nil)
		return
	}

	if len(input) == 0 {
		response.BadRequest(w, "Lista de mídias vazia", nil)
		return
	}

	ctx := r.Context()

	for _, media := range input {
		if media.ID == "" {
			continue
		}

		if err := h.mediaRepo.UpdateDisplayOrder(ctx, media.ID, media.DisplayOrder); err != nil {
			h.logger.Error("erro ao atualizar ordem da mídia",
				zap.String("mediaId", media.ID),
				zap.Int("displayOrder", media.DisplayOrder),
				zap.Error(err),
			)
			// Continua para outras mídias mesmo se uma falhar
		}
	}

	h.logger.Info("ordem das mídias atualizada",
		zap.Int("count", len(input)),
	)

	response.OK(w, map[string]bool{"success": true})
}

// UpdateProductMediasOrder godoc
// @Summary Atualiza ordem das mídias de um produto
// @Description Atualiza a ordem de exibição das mídias de um produto
// @Tags uploads
// @Accept json
// @Produce json
// @Param body body []map[string]interface{} true "Array de mídias com id e displayOrder"
// @Success 200 {object} map[string]bool
// @Failure 400 {object} response.ErrorResponse
// @Router /api/product-medias/order [patch]
func (h *UploadHandler) UpdateProductMediasOrder(w http.ResponseWriter, r *http.Request) {
	var input []struct {
		ID           string `json:"id"`
		DisplayOrder int    `json:"displayOrder"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "JSON inválido", nil)
		return
	}

	if len(input) == 0 {
		response.BadRequest(w, "Lista de mídias vazia", nil)
		return
	}

	ctx := r.Context()

	for _, media := range input {
		if media.ID == "" {
			continue
		}

		if err := h.mediaRepo.UpdateDisplayOrder(ctx, media.ID, media.DisplayOrder); err != nil {
			h.logger.Error("erro ao atualizar ordem da mídia de produto",
				zap.String("mediaId", media.ID),
				zap.Int("displayOrder", media.DisplayOrder),
				zap.Error(err),
			)
			// Continua para outras mídias mesmo se uma falhar
		}
	}

	h.logger.Info("ordem das mídias de produto atualizada",
		zap.Int("count", len(input)),
	)

	response.OK(w, map[string]bool{"success": true})
}

// UploadIndustryLogo godoc
// @Summary Faz upload de logo da indústria
// @Description Faz upload da logo da indústria (Admin only)
// @Tags uploads
// @Accept multipart/form-data
// @Produce json
// @Param logo formData file true "Arquivo da logo"
// @Success 201 {object} entity.UploadMediaResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Router /api/upload/industry-logo [post]
func (h *UploadHandler) UploadIndustryLogo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	industryID := middleware.GetIndustryID(ctx)

	if industryID == "" {
		response.Unauthorized(w, "Usuário não possui indústria associada")
		return
	}

	// Limitar tamanho do request (5MB)
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// Parse multipart form
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		h.logger.Error("erro ao parsear multipart form",
			zap.Error(err),
		)
		if err.Error() == "http: request body too large" {
			response.BadRequest(w, "Arquivo muito grande. Máximo 5MB", nil)
		} else {
			response.BadRequest(w, "Erro ao processar envio do arquivo", map[string]interface{}{"error": err.Error()})
		}
		return
	}

	// Obter arquivo
	file, header, err := r.FormFile("logo")
	if err != nil {
		response.BadRequest(w, "Arquivo 'logo' é obrigatório", nil)
		return
	}
	defer file.Close()

	// Sanitizar nome do arquivo
	safeFilename := sanitizeUploadFilename(header.Filename)

	// Validar extensão
	if !isAllowedExtension(safeFilename) {
		response.BadRequest(w, "Extensão de arquivo inválida. Use .jpg, .jpeg, .png ou .webp", nil)
		return
	}

	// Validar Content-Type
	contentType := header.Header.Get("Content-Type")
	if !h.storageService.ValidateFileType(contentType, allowedContentTypes) {
		response.BadRequest(w, "Formato inválido. Use JPEG, PNG ou WebP", nil)
		return
	}

	// Fazer upload
	url, err := h.storageService.UploadIndustryLogo(
		ctx,
		industryID,
		file,
		safeFilename,
		contentType,
		header.Size,
	)
	if err != nil {
		h.logger.Error("erro ao fazer upload da logo",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("logo da indústria enviada",
		zap.String("industryId", industryID),
		zap.String("url", url),
	)

	response.Created(w, entity.UploadMediaResponse{URLs: []string{url}})
}
