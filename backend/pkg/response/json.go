package response

import (
	"encoding/json"
	"net/http"
	"strconv"

	appErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

// SuccessResponse representa uma resposta de sucesso
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
}

// ErrorResponse representa uma resposta de erro
type ErrorResponse struct {
	Success bool        `json:"success"`
	Error   ErrorDetail `json:"error"`
}

// ErrorDetail contém os detalhes do erro
type ErrorDetail struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// JSON envia uma resposta JSON genérica
func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		// Se falhar ao encodar, logar erro mas não fazer nada
		// (já foi escrito o status code)
		return
	}
}

// Success envia uma resposta de sucesso
func Success(w http.ResponseWriter, statusCode int, data interface{}) {
	response := SuccessResponse{
		Success: true,
		Data:    data,
	}
	JSON(w, statusCode, response)
}

// Created envia uma resposta de criação (201)
func Created(w http.ResponseWriter, data interface{}) {
	Success(w, http.StatusCreated, data)
}

// OK envia uma resposta de sucesso (200)
func OK(w http.ResponseWriter, data interface{}) {
	Success(w, http.StatusOK, data)
}

// NoContent envia uma resposta sem conteúdo (204)
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// Error envia uma resposta de erro
func Error(w http.ResponseWriter, statusCode int, code, message string, details map[string]interface{}) {
	response := ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    code,
			Message: message,
			Details: details,
		},
	}
	JSON(w, statusCode, response)
}

// ErrorFromAppError envia uma resposta de erro a partir de um AppError
func ErrorFromAppError(w http.ResponseWriter, err *appErrors.AppError) {
	Error(w, err.StatusCode, err.Code, err.Message, err.Details)
}

// HandleError trata um erro e envia a resposta apropriada
func HandleError(w http.ResponseWriter, err error) {
	// Verificar se é um AppError
	if appErr, ok := err.(*appErrors.AppError); ok {
		ErrorFromAppError(w, appErr)
		return
	}

	// Erro genérico
	InternalServerError(w, err)
}

// BadRequest envia uma resposta de bad request (400)
func BadRequest(w http.ResponseWriter, message string, details map[string]interface{}) {
	Error(w, http.StatusBadRequest, "BAD_REQUEST", message, details)
}

// ValidationError envia uma resposta de erro de validação (400)
func ValidationError(w http.ResponseWriter, details map[string]interface{}) {
	Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "Dados inválidos", details)
}

// Unauthorized envia uma resposta de não autorizado (401)
func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, "UNAUTHORIZED", message, nil)
}

// Forbidden envia uma resposta de proibido (403)
func Forbidden(w http.ResponseWriter, message string) {
	Error(w, http.StatusForbidden, "FORBIDDEN", message, nil)
}

// NotFound envia uma resposta de não encontrado (404)
func NotFound(w http.ResponseWriter, message string) {
	Error(w, http.StatusNotFound, "NOT_FOUND", message, nil)
}

// Conflict envia uma resposta de conflito (409)
func Conflict(w http.ResponseWriter, message string, details map[string]interface{}) {
	Error(w, http.StatusConflict, "CONFLICT", message, details)
}

// TooManyRequests envia uma resposta de rate limit excedido (429)
func TooManyRequests(w http.ResponseWriter) {
	Error(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED",
		"Limite de requisições excedido. Tente novamente mais tarde", nil)
}

// InternalServerError envia uma resposta de erro interno (500)
func InternalServerError(w http.ResponseWriter, err error) {
	// Em produção, não expor detalhes do erro interno
	message := "Erro interno do servidor"

	// Em desenvolvimento, pode incluir o erro (opcional)
	// if isDevelopment {
	// 	message = err.Error()
	// }

	Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", message, nil)
}

// ServiceUnavailable envia uma resposta de serviço indisponível (503)
func ServiceUnavailable(w http.ResponseWriter, message string) {
	Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", message, nil)
}

// ParseJSON faz parse do body JSON da requisição com limite de tamanho
func ParseJSON(r *http.Request, v interface{}) error {
	if r.Body == nil {
		return appErrors.ValidationError("corpo da requisição vazio")
	}

	// Limitar tamanho do body a 1MB para prevenir ataques de payload grande
	const maxBodySize = 1 << 20 // 1 MB
	limitedReader := http.MaxBytesReader(nil, r.Body, maxBodySize)

	decoder := json.NewDecoder(limitedReader)
	decoder.DisallowUnknownFields() // Não permitir campos desconhecidos

	if err := decoder.Decode(v); err != nil {
		if err.Error() == "http: request body too large" {
			return appErrors.ValidationError("corpo da requisição excede o tamanho máximo permitido")
		}
		return appErrors.ValidationError("JSON inválido")
	}

	return nil
}

// SetJSONContentType define o Content-Type como application/json
func SetJSONContentType(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
}

// SetCacheControl define headers de cache
func SetCacheControl(w http.ResponseWriter, maxAge int) {
	w.Header().Set("Cache-Control", "public, max-age="+strconv.Itoa(maxAge))
}

// SetNoCacheControl define headers para não fazer cache
func SetNoCacheControl(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
}
