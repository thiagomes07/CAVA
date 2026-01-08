package pagination

import (
	"strconv"
)

const (
	// DefaultPage é a página padrão
	DefaultPage = 1
	
	// DefaultLimit é o limite padrão de itens por página
	DefaultLimit = 25
	
	// MaxLimit é o limite máximo de itens por página
	MaxLimit = 100
	
	// MinPage é a página mínima
	MinPage = 1
	
	// MinLimit é o limite mínimo de itens por página
	MinLimit = 1
)

// Params representa os parâmetros de paginação
type Params struct {
	Page   int `json:"page"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// Metadata representa os metadados de paginação na resposta
type Metadata struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// NewParams cria novos parâmetros de paginação com valores validados
func NewParams(page, limit int) *Params {
	// Validar e ajustar page
	if page < MinPage {
		page = DefaultPage
	}
	
	// Validar e ajustar limit
	if limit < MinLimit {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	
	// Calcular offset
	offset := (page - 1) * limit
	
	return &Params{
		Page:   page,
		Limit:  limit,
		Offset: offset,
	}
}

// NewParamsFromStrings cria parâmetros de paginação a partir de strings
func NewParamsFromStrings(pageStr, limitStr string) *Params {
	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)
	
	return NewParams(page, limit)
}

// NewMetadata cria metadados de paginação
func NewMetadata(page, limit, total int) *Metadata {
	totalPages := calculateTotalPages(total, limit)
	
	return &Metadata{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}
}

// calculateTotalPages calcula o número total de páginas
func calculateTotalPages(total, limit int) int {
	if limit == 0 {
		return 0
	}
	
	pages := total / limit
	if total%limit > 0 {
		pages++
	}
	
	return pages
}

// HasNextPage verifica se há próxima página
func (m *Metadata) HasNextPage() bool {
	return m.Page < m.TotalPages
}

// HasPreviousPage verifica se há página anterior
func (m *Metadata) HasPreviousPage() bool {
	return m.Page > 1
}

// NextPage retorna o número da próxima página
func (m *Metadata) NextPage() int {
	if !m.HasNextPage() {
		return m.Page
	}
	return m.Page + 1
}

// PreviousPage retorna o número da página anterior
func (m *Metadata) PreviousPage() int {
	if !m.HasPreviousPage() {
		return m.Page
	}
	return m.Page - 1
}

// Response representa uma resposta paginada genérica
type Response struct {
	Data     interface{} `json:"data"`
	Metadata *Metadata   `json:"metadata"`
}

// NewResponse cria uma nova resposta paginada
func NewResponse(data interface{}, page, limit, total int) *Response {
	return &Response{
		Data:     data,
		Metadata: NewMetadata(page, limit, total),
	}
}

// ValidatePage valida o número da página
func ValidatePage(page int) int {
	if page < MinPage {
		return DefaultPage
	}
	return page
}

// ValidateLimit valida o limite de itens por página
func ValidateLimit(limit int) int {
	if limit < MinLimit {
		return DefaultLimit
	}
	if limit > MaxLimit {
		return MaxLimit
	}
	return limit
}

// CalculateOffset calcula o offset baseado na página e limite
func CalculateOffset(page, limit int) int {
	return (page - 1) * limit
}

// GetPageRange retorna o range de itens da página atual
func GetPageRange(page, limit int) (start, end int) {
	start = (page - 1) * limit
	end = start + limit
	return start, end
}

// IsValidPageNumber verifica se o número da página é válido
func IsValidPageNumber(page, totalPages int) bool {
	return page >= MinPage && page <= totalPages
}