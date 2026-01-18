package errors

import (
	"fmt"
	"net/http"
)

// AppError representa um erro de aplicação com contexto
type AppError struct {
	Code       string                 `json:"code"`
	Message    string                 `json:"message"`
	Details    map[string]interface{} `json:"details,omitempty"`
	StatusCode int                    `json:"-"`
	Err        error                  `json:"-"`
}

// Error implementa a interface error
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap retorna o erro encapsulado
func (e *AppError) Unwrap() error {
	return e.Err
}

// NewAppError cria um novo AppError
func NewAppError(code, message string, statusCode int, err error) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
		Err:        err,
	}
}

// WithDetails adiciona detalhes ao erro
func (e *AppError) WithDetails(details map[string]interface{}) *AppError {
	e.Details = details
	return e
}

// =============================================
// ERROS DE VALIDAÇÃO
// =============================================

// NewValidationError cria um erro de validação
func NewValidationError(message string, details map[string]interface{}) *AppError {
	return &AppError{
		Code:       "VALIDATION_ERROR",
		Message:    message,
		Details:    details,
		StatusCode: http.StatusBadRequest,
	}
}

// ValidationError cria um erro de validação simples
func ValidationError(message string) *AppError {
	return NewValidationError(message, nil)
}

// NewBadRequestError cria um erro de requisição inválida genérico
func NewBadRequestError(message string) *AppError {
	return &AppError{
		Code:       "BAD_REQUEST",
		Message:    message,
		StatusCode: http.StatusBadRequest,
	}
}

// =============================================
// ERROS DE NOT FOUND
// =============================================

// NewNotFoundError cria um erro de recurso não encontrado
func NewNotFoundError(resource string) *AppError {
	return &AppError{
		Code:       "NOT_FOUND",
		Message:    fmt.Sprintf("%s não encontrado", resource),
		StatusCode: http.StatusNotFound,
	}
}

// NotFoundError cria um erro de not found genérico
func NotFoundError(message string) *AppError {
	return &AppError{
		Code:       "NOT_FOUND",
		Message:    message,
		StatusCode: http.StatusNotFound,
	}
}

// =============================================
// ERROS DE CONFLITO
// =============================================

// NewConflictError cria um erro de conflito
func NewConflictError(message string) *AppError {
	return &AppError{
		Code:       "CONFLICT",
		Message:    message,
		StatusCode: http.StatusConflict,
	}
}

// ConflictError cria um erro de conflito com detalhes
func ConflictError(message string, details map[string]interface{}) *AppError {
	return &AppError{
		Code:       "CONFLICT",
		Message:    message,
		Details:    details,
		StatusCode: http.StatusConflict,
	}
}

// =============================================
// ERROS DE AUTENTICAÇÃO
// =============================================

// NewUnauthorizedError cria um erro de autenticação
func NewUnauthorizedError(message string) *AppError {
	return &AppError{
		Code:       "UNAUTHORIZED",
		Message:    message,
		StatusCode: http.StatusUnauthorized,
	}
}

// UnauthorizedError cria um erro de não autorizado
func UnauthorizedError() *AppError {
	return NewUnauthorizedError("Autenticação necessária")
}

// InvalidCredentialsError cria um erro de credenciais inválidas
func InvalidCredentialsError() *AppError {
	return NewUnauthorizedError("Email ou senha inválidos")
}

// =============================================
// ERROS DE AUTORIZAÇÃO
// =============================================

// NewForbiddenError cria um erro de permissão negada
func NewForbiddenError(message string) *AppError {
	return &AppError{
		Code:       "FORBIDDEN",
		Message:    message,
		StatusCode: http.StatusForbidden,
	}
}

// ForbiddenError cria um erro de permissão padrão
func ForbiddenError() *AppError {
	return NewForbiddenError("Você não tem permissão para acessar este recurso")
}

// =============================================
// ERROS DE NEGÓCIO
// =============================================

// BatchNotAvailableError indica que o lote não está disponível
func BatchNotAvailableError() *AppError {
	return &AppError{
		Code:       "BATCH_NOT_AVAILABLE",
		Message:    "Lote não disponível para reserva",
		StatusCode: http.StatusBadRequest,
	}
}

// SlugExistsError indica que o slug já está em uso
func SlugExistsError(slug string) *AppError {
	return &AppError{
		Code:       "SLUG_EXISTS",
		Message:    "Este slug já está em uso",
		Details:    map[string]interface{}{"slug": slug},
		StatusCode: http.StatusConflict,
	}
}

// EmailExistsError indica que o email já está cadastrado
func EmailExistsError(email string) *AppError {
	return &AppError{
		Code:       "EMAIL_EXISTS",
		Message:    "Este email já está cadastrado",
		Details:    map[string]interface{}{"email": email},
		StatusCode: http.StatusConflict,
	}
}

// BatchCodeExistsError indica que o código do lote já existe
func BatchCodeExistsError(code string) *AppError {
	return &AppError{
		Code:       "BATCH_CODE_EXISTS",
		Message:    "Este código de lote já existe",
		Details:    map[string]interface{}{"batchCode": code},
		StatusCode: http.StatusConflict,
	}
}

// ReservationExpiredError indica que a reserva expirou
func ReservationExpiredError() *AppError {
	return &AppError{
		Code:       "RESERVATION_EXPIRED",
		Message:    "Esta reserva já expirou",
		StatusCode: http.StatusBadRequest,
	}
}

// InsufficientSlabsError indica que não há chapas suficientes para a operação
func InsufficientSlabsError(requested, available int) *AppError {
	return &AppError{
		Code:       "INSUFFICIENT_SLABS",
		Message:    fmt.Sprintf("Quantidade de chapas insuficiente: solicitado %d, disponível %d", requested, available),
		Details:    map[string]interface{}{"requested": requested, "available": available},
		StatusCode: http.StatusBadRequest,
	}
}

// InvalidPriceError indica que o preço é inválido
func InvalidPriceError(message string) *AppError {
	return &AppError{
		Code:       "INVALID_PRICE",
		Message:    message,
		StatusCode: http.StatusBadRequest,
	}
}

// =============================================
// ERROS DE CSRF
// =============================================

// CSRFTokenMissingError indica que o token CSRF está ausente
func CSRFTokenMissingError() *AppError {
	return &AppError{
		Code:       "CSRF_TOKEN_MISSING",
		Message:    "Token CSRF ausente",
		StatusCode: 419, // Status não padrão para CSRF
	}
}

// CSRFTokenInvalidError indica que o token CSRF é inválido
func CSRFTokenInvalidError() *AppError {
	return &AppError{
		Code:       "CSRF_TOKEN_INVALID",
		Message:    "Token CSRF inválido",
		StatusCode: 419,
	}
}

// =============================================
// ERROS DE RATE LIMIT
// =============================================

// RateLimitExceededError indica que o limite de requisições foi excedido
func RateLimitExceededError() *AppError {
	return &AppError{
		Code:       "RATE_LIMIT_EXCEEDED",
		Message:    "Limite de requisições excedido. Tente novamente mais tarde",
		StatusCode: http.StatusTooManyRequests,
	}
}

// =============================================
// ERROS INTERNOS
// =============================================

// NewInternalError cria um erro interno do servidor
func NewInternalError(message string, err error) *AppError {
	return &AppError{
		Code:       "INTERNAL_ERROR",
		Message:    message,
		StatusCode: http.StatusInternalServerError,
		Err:        err,
	}
}

// InternalError cria um erro interno genérico
func InternalError(err error) *AppError {
	return NewInternalError("Erro interno do servidor", err)
}

// DatabaseError cria um erro de banco de dados
func DatabaseError(err error) *AppError {
	return NewInternalError("Erro ao acessar banco de dados", err)
}

// StorageError cria um erro de storage
func StorageError(err error) *AppError {
	return NewInternalError("Erro ao acessar storage", err)
}
