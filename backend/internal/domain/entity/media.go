package entity

import (
	"time"
)

// MediaType representa os tipos de mídia
type MediaType string

const (
	MediaTypeImage MediaType = "IMAGE"
	MediaTypeVideo MediaType = "VIDEO"
)

// IsValid verifica se o tipo de mídia é válido
func (m MediaType) IsValid() bool {
	switch m {
	case MediaTypeImage, MediaTypeVideo:
		return true
	}
	return false
}

// Media representa uma mídia (foto/vídeo)
type Media struct {
	ID           string    `json:"id"`
	URL          string    `json:"url"`
	DisplayOrder int       `json:"displayOrder"`
	IsCover      bool      `json:"isCover"`
	CreatedAt    time.Time `json:"createdAt"`
}

// ProductMedia representa uma mídia de produto
type ProductMedia struct {
	Media
	ProductID string    `json:"productId"`
	MediaType MediaType `json:"mediaType"`
}

// BatchMedia representa uma mídia de lote
type BatchMedia struct {
	Media
	BatchID string `json:"batchId"`
}

// CreateMediaInput representa os dados para criar uma mídia
type CreateMediaInput struct {
	URL          string `json:"url" validate:"required,url"`
	DisplayOrder int    `json:"displayOrder" validate:"min=0"`
	IsCover      bool   `json:"isCover"`
}

// UploadMediaResponse representa a resposta de upload de mídias
type UploadMediaResponse struct {
	URLs []string `json:"urls"`
}