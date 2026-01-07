package errors

import "fmt"

type AppError struct {
    Code    string
    Message string
    Details map[string]interface{}
    Err     error
}

func (e *AppError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %v", e.Message, e.Err)
    }
    return e.Message
}

func NewNotFoundError(message string) *AppError {
    return &AppError{
        Code:    "NOT_FOUND",
        Message: message,
    }
}

func NewValidationError(message string, details map[string]interface{}) *AppError {
    return &AppError{
        Code:    "VALIDATION_ERROR",
        Message: message,
        Details: details,
    }
}

func NewConflictError(message string) *AppError {
    return &AppError{
        Code:    "CONFLICT",
        Message: message,
    }
}

func NewUnauthorizedError(message string) *AppError {
    return &AppError{
        Code:    "UNAUTHORIZED",
        Message: message,
    }
}

func NewForbiddenError(message string) *AppError {
    return &AppError{
        Code:    "FORBIDDEN",
        Message: message,
    }
}

func NewInternalError(message string, err error) *AppError {
    return &AppError{
        Code:    "INTERNAL_ERROR",
        Message: message,
        Err:     err,
    }
}

func NewBatchNotAvailableError() *AppError {
    return &AppError{
        Code:    "BATCH_NOT_AVAILABLE",
        Message: "Lote não disponível para reserva",
    }
}
