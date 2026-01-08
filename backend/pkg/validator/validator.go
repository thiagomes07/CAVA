package validator

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	appErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

// Validator encapsula o validador do go-playground
type Validator struct {
	validate *validator.Validate
}

// New cria uma nova instância do Validator com validações customizadas
func New() *Validator {
	v := validator.New()
	
	// Registrar validações customizadas
	v.RegisterValidation("batchcode", validateBatchCode)
	v.RegisterValidation("cnpj", validateCNPJ)
	v.RegisterValidation("slug", validateSlug)
	
	return &Validator{
		validate: v,
	}
}

// Validate valida uma struct e retorna AppError se inválido
func (v *Validator) Validate(data interface{}) error {
	err := v.validate.Struct(data)
	if err == nil {
		return nil
	}

	// Converter erros de validação para AppError
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		return appErrors.ValidationError("erro de validação desconhecido")
	}

	// Mapear erros por campo
	details := make(map[string]interface{})
	for _, fieldError := range validationErrors {
		fieldName := toSnakeCase(fieldError.Field())
		details[fieldName] = getErrorMessage(fieldError)
	}

	return appErrors.NewValidationError("Dados inválidos", details)
}

// ValidateVar valida uma variável individual
func (v *Validator) ValidateVar(field interface{}, tag string) error {
	err := v.validate.Var(field, tag)
	if err == nil {
		return nil
	}

	return appErrors.ValidationError(fmt.Sprintf("validação falhou: %s", tag))
}

// getErrorMessage retorna a mensagem de erro apropriada para cada tipo de validação
func getErrorMessage(fe validator.FieldError) string {
	field := fe.Field()
	
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s é obrigatório", field)
	case "email":
		return fmt.Sprintf("%s deve ser um email válido", field)
	case "min":
		return fmt.Sprintf("%s deve ter no mínimo %s caracteres", field, fe.Param())
	case "max":
		return fmt.Sprintf("%s deve ter no máximo %s caracteres", field, fe.Param())
	case "len":
		return fmt.Sprintf("%s deve ter exatamente %s caracteres", field, fe.Param())
	case "gt":
		return fmt.Sprintf("%s deve ser maior que %s", field, fe.Param())
	case "gte":
		return fmt.Sprintf("%s deve ser maior ou igual a %s", field, fe.Param())
	case "lt":
		return fmt.Sprintf("%s deve ser menor que %s", field, fe.Param())
	case "lte":
		return fmt.Sprintf("%s deve ser menor ou igual a %s", field, fe.Param())
	case "oneof":
		return fmt.Sprintf("%s deve ser um dos valores: %s", field, fe.Param())
	case "uuid":
		return fmt.Sprintf("%s deve ser um UUID válido", field)
	case "url":
		return fmt.Sprintf("%s deve ser uma URL válida", field)
	case "batchcode":
		return fmt.Sprintf("%s deve estar no formato AAA-999999", field)
	case "cnpj":
		return fmt.Sprintf("%s deve ser um CNPJ válido", field)
	case "slug":
		return fmt.Sprintf("%s deve conter apenas letras minúsculas, números e hífens", field)
	default:
		return fmt.Sprintf("%s é inválido", field)
	}
}

// toSnakeCase converte CamelCase para snake_case
func toSnakeCase(s string) string {
	var result strings.Builder
	for i, r := range s {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteRune('_')
		}
		result.WriteRune(r)
	}
	return strings.ToLower(result.String())
}

// =============================================
// VALIDAÇÕES CUSTOMIZADAS
// =============================================

// validateBatchCode valida o formato do código de lote (AAA-999999)
func validateBatchCode(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	
	// Regex: 3 letras maiúsculas, hífen, 6 dígitos
	matched, _ := regexp.MatchString(`^[A-Z]{3}-\d{6}$`, value)
	return matched
}

// validateCNPJ valida o formato do CNPJ (apenas dígitos)
func validateCNPJ(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	
	// Validar se tem 14 dígitos
	if len(value) != 14 {
		return false
	}
	
	// Validar se contém apenas números
	matched, _ := regexp.MatchString(`^\d{14}$`, value)
	if !matched {
		return false
	}
	
	// Validação do algoritmo do CNPJ
	return validateCNPJAlgorithm(value)
}

// validateCNPJAlgorithm valida o dígito verificador do CNPJ
func validateCNPJAlgorithm(cnpj string) bool {
	// Verificar CNPJs inválidos conhecidos
	invalidCNPJs := []string{
		"00000000000000",
		"11111111111111",
		"22222222222222",
		"33333333333333",
		"44444444444444",
		"55555555555555",
		"66666666666666",
		"77777777777777",
		"88888888888888",
		"99999999999999",
	}
	
	for _, invalid := range invalidCNPJs {
		if cnpj == invalid {
			return false
		}
	}
	
	// Calcular primeiro dígito verificador
	sum := 0
	weights := []int{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
	for i := 0; i < 12; i++ {
		digit := int(cnpj[i] - '0')
		sum += digit * weights[i]
	}
	remainder := sum % 11
	digit1 := 0
	if remainder >= 2 {
		digit1 = 11 - remainder
	}
	
	// Verificar primeiro dígito
	if int(cnpj[12]-'0') != digit1 {
		return false
	}
	
	// Calcular segundo dígito verificador
	sum = 0
	weights = []int{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
	for i := 0; i < 13; i++ {
		digit := int(cnpj[i] - '0')
		sum += digit * weights[i]
	}
	remainder = sum % 11
	digit2 := 0
	if remainder >= 2 {
		digit2 = 11 - remainder
	}
	
	// Verificar segundo dígito
	return int(cnpj[13]-'0') == digit2
}

// validateSlug valida o formato do slug (lowercase, números, hífens)
func validateSlug(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	
	// Regex: lowercase, números, hífens (não pode começar/terminar com hífen)
	matched, _ := regexp.MatchString(`^[a-z0-9]+(-[a-z0-9]+)*$`, value)
	return matched
}