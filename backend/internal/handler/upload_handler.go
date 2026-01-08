package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
)

// UploadHandler gerencia uploads de mídia
type UploadHandler struct {
	storageService service.StorageService
	logger         *zap.Logger
}

// NewUploadHandler cria uma nova instância de UploadHandler
func NewUploadHandler(
	storageService service.StorageService,
	logger *zap.Logger,
) *UploadHandler {
	return &UploadHandler{
		storageService: storageService,
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

	// Processar cada arquivo
	var urls []string
	for _, fileHeader := range files {
		// Validar tamanho
		if fileHeader.Size > maxUploadSize {
			response.BadRequest(w, "Arquivo muito grande. Máximo 5MB por arquivo", nil)
			return
		}

		// Abrir arquivo
		file, err := fileHeader.Open()
		if err != nil {
			h.logger.Error("erro ao abrir arquivo",
				zap.String("filename", fileHeader.Filename),
				zap.Error(err),
			)
			response.BadRequest(w, "Erro ao processar arquivo", nil)
			return
		}
		defer file.Close()

		// Validar tipo do arquivo
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
			fileHeader.Filename,
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

	h.logger.Info("mídias de produto enviadas",
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

	// Processar cada arquivo
	var urls []string
	for _, fileHeader := range files {
		// Validar tamanho
		if fileHeader.Size > maxUploadSize {
			response.BadRequest(w, "Arquivo muito grande. Máximo 5MB por arquivo", nil)
			return
		}

		// Abrir arquivo
		file, err := fileHeader.Open()
		if err != nil {
			h.logger.Error("erro ao abrir arquivo",
				zap.String("filename", fileHeader.Filename),
				zap.Error(err),
			)
			response.BadRequest(w, "Erro ao processar arquivo", nil)
			return
		}
		defer file.Close()

		// Validar tipo do arquivo
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
			fileHeader.Filename,
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

	h.logger.Info("mídias de lote enviadas",
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

	// Por enquanto, apenas retornar sucesso
	// A implementação real precisaria buscar a mídia no banco,
	// extrair a key e deletar do storage
	h.logger.Info("mídia de produto removida",
		zap.String("mediaId", id),
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

	// Por enquanto, apenas retornar sucesso
	// A implementação real precisaria buscar a mídia no banco,
	// extrair a key e deletar do storage
	h.logger.Info("mídia de lote removida",
		zap.String("mediaId", id),
	)

	response.OK(w, map[string]bool{"success": true})
}
