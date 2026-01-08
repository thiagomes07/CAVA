package utils

import (
	"github.com/google/uuid"
	appErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

// GenerateUUID gera um novo UUID v4
func GenerateUUID() string {
	return uuid.New().String()
}

// IsValidUUID verifica se uma string é um UUID válido
func IsValidUUID(str string) bool {
	_, err := uuid.Parse(str)
	return err == nil
}

// ParseUUID faz parse de uma string UUID e retorna erro se inválido
func ParseUUID(str string) (uuid.UUID, error) {
	id, err := uuid.Parse(str)
	if err != nil {
		return uuid.Nil, appErrors.ValidationError("UUID inválido")
	}
	return id, nil
}

// MustParseUUID faz parse de uma string UUID e entra em panic se inválido
// Use apenas quando tiver certeza que o UUID é válido
func MustParseUUID(str string) uuid.UUID {
	id, err := uuid.Parse(str)
	if err != nil {
		panic("UUID inválido: " + str)
	}
	return id
}

// NewUUIDFromString cria um UUID a partir de uma string
// Retorna nil UUID se inválido
func NewUUIDFromString(str string) *string {
	if !IsValidUUID(str) {
		return nil
	}
	return &str
}