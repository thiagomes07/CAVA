package utils

import (
	"regexp"
	"strings"

	"github.com/gosimple/slug"
)

var (
	// Regex para validar formato de slug
	slugRegex = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	
	// Regex para caracteres não permitidos
	invalidCharsRegex = regexp.MustCompile(`[^a-z0-9-]`)
	
	// Regex para múltiplos hífens consecutivos
	multipleHyphensRegex = regexp.MustCompile(`-+`)
)

// GenerateSlug gera um slug a partir de uma string
func GenerateSlug(s string) string {
	// Usar biblioteca gosimple/slug para conversão básica
	generated := slug.Make(s)
	
	// Garantir que está em lowercase
	generated = strings.ToLower(generated)
	
	// Limpar caracteres inválidos
	generated = invalidCharsRegex.ReplaceAllString(generated, "")
	
	// Remover múltiplos hífens consecutivos
	generated = multipleHyphensRegex.ReplaceAllString(generated, "-")
	
	// Remover hífens no início e fim
	generated = strings.Trim(generated, "-")
	
	return generated
}

// IsValidSlug verifica se um slug é válido
func IsValidSlug(s string) bool {
	// Verificar tamanho
	if len(s) < 3 || len(s) > 50 {
		return false
	}
	
	// Verificar formato
	return slugRegex.MatchString(s)
}

// SanitizeSlug sanitiza um slug removendo caracteres inválidos
func SanitizeSlug(s string) string {
	// Converter para lowercase
	s = strings.ToLower(s)
	
	// Remover espaços extras
	s = strings.TrimSpace(s)
	
	// Substituir espaços por hífens
	s = strings.ReplaceAll(s, " ", "-")
	
	// Remover caracteres inválidos
	s = invalidCharsRegex.ReplaceAllString(s, "")
	
	// Remover múltiplos hífens consecutivos
	s = multipleHyphensRegex.ReplaceAllString(s, "-")
	
	// Remover hífens no início e fim
	s = strings.Trim(s, "-")
	
	return s
}

// GenerateUniqueSlug gera um slug único adicionando sufixo numérico se necessário
func GenerateUniqueSlug(base string, existsFn func(string) bool) string {
	slug := GenerateSlug(base)
	
	if !existsFn(slug) {
		return slug
	}
	
	// Adicionar sufixo numérico até encontrar slug único
	counter := 1
	for {
		candidate := slug + "-" + string(rune(counter))
		if !existsFn(candidate) {
			return candidate
		}
		counter++
		
		// Limite de segurança
		if counter > 1000 {
			// Adicionar timestamp para garantir unicidade
			return slug + "-" + GenerateRandomSlug(6)
		}
	}
}

// GenerateRandomSlug gera um slug aleatório com tamanho específico
func GenerateRandomSlug(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	
	for i := range result {
		result[i] = charset[i%len(charset)]
	}
	
	return string(result)
}

// TruncateSlug trunca um slug para um tamanho máximo mantendo formato válido
func TruncateSlug(s string, maxLength int) string {
	if len(s) <= maxLength {
		return s
	}
	
	// Truncar
	truncated := s[:maxLength]
	
	// Remover hífen no final se houver
	truncated = strings.TrimRight(truncated, "-")
	
	return truncated
}

// ValidateSlugFormat valida o formato de um slug e retorna erro descritivo
func ValidateSlugFormat(s string) error {
	if len(s) < 3 {
		return ErrSlugTooShort
	}
	
	if len(s) > 50 {
		return ErrSlugTooLong
	}
	
	if !slugRegex.MatchString(s) {
		if strings.HasPrefix(s, "-") || strings.HasSuffix(s, "-") {
			return ErrSlugInvalidBoundary
		}
		
		if strings.Contains(s, "--") {
			return ErrSlugConsecutiveHyphens
		}
		
		return ErrSlugInvalidCharacters
	}
	
	return nil
}

// Erros de validação de slug
var (
	ErrSlugTooShort           = &SlugError{Message: "slug deve ter pelo menos 3 caracteres"}
	ErrSlugTooLong            = &SlugError{Message: "slug deve ter no máximo 50 caracteres"}
	ErrSlugInvalidCharacters  = &SlugError{Message: "slug deve conter apenas letras minúsculas, números e hífens"}
	ErrSlugInvalidBoundary    = &SlugError{Message: "slug não pode começar ou terminar com hífen"}
	ErrSlugConsecutiveHyphens = &SlugError{Message: "slug não pode conter hífens consecutivos"}
)

// SlugError representa um erro de validação de slug
type SlugError struct {
	Message string
}

func (e *SlugError) Error() string {
	return e.Message
}