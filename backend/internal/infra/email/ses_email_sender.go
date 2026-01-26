package email

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
	appConfig "github.com/thiagomes07/CAVA/backend/internal/config"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	domainService "github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"go.uber.org/zap"
)

// SESEmailError representa erros específicos do SES categorizados
type SESEmailError struct {
	Type    SESErrorType
	Message string
	Err     error
}

func (e *SESEmailError) Error() string {
	return fmt.Sprintf("[%s] %s: %v", e.Type, e.Message, e.Err)
}

func (e *SESEmailError) Unwrap() error {
	return e.Err
}

// SESErrorType categoriza os tipos de erro do SES
type SESErrorType string

const (
	// CredentialError indica problema com credenciais AWS
	CredentialError SESErrorType = "CREDENTIAL_ERROR"
	// QuotaExceededError indica que o limite de envio foi excedido
	QuotaExceededError SESErrorType = "QUOTA_EXCEEDED"
	// InvalidEmailError indica email de destinatário/remetente inválido
	InvalidEmailError SESErrorType = "INVALID_EMAIL"
	// EmailNotVerifiedError indica que o email não está verificado no SES
	EmailNotVerifiedError SESErrorType = "EMAIL_NOT_VERIFIED"
	// SandboxError indica restrição de modo sandbox
	SandboxError SESErrorType = "SANDBOX_RESTRICTION"
	// ConfigurationError indica erro de configuração
	ConfigurationError SESErrorType = "CONFIGURATION_ERROR"
	// NetworkError indica problema de rede/conectividade
	NetworkError SESErrorType = "NETWORK_ERROR"
	// UnknownError indica erro desconhecido
	UnknownError SESErrorType = "UNKNOWN_ERROR"
)

// SESEmailSender implementa EmailSender usando Amazon SES
type SESEmailSender struct {
	client      *ses.Client
	senderEmail string
	senderName  string
	logger      *zap.Logger
}

// SESEmailSenderConfig contém as configurações para o SESEmailSender
type SESEmailSenderConfig struct {
	// Region é a região AWS onde o SES está configurado (ex: us-east-1, sa-east-1)
	Region string
	// SenderEmail é o email verificado no SES que será usado como remetente
	SenderEmail string
	// SenderName é o nome que aparecerá como remetente (opcional)
	SenderName string
}

// NewSESEmailSender cria uma nova instância do SESEmailSender
// Utiliza config.LoadDefaultConfig para carregar credenciais de forma agnóstica ao ambiente:
// - Local: ~/.aws/credentials ou variáveis de ambiente (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
// - Produção (Fargate/EC2): IAM Role automaticamente
func NewSESEmailSender(ctx context.Context, sesConfig SESEmailSenderConfig, logger *zap.Logger) (*SESEmailSender, error) {
	if sesConfig.SenderEmail == "" {
		return nil, &SESEmailError{
			Type:    ConfigurationError,
			Message: "SenderEmail é obrigatório",
		}
	}

	if sesConfig.Region == "" {
		return nil, &SESEmailError{
			Type:    ConfigurationError,
			Message: "Region é obrigatória",
		}
	}

	// LoadDefaultConfig automaticamente detecta credenciais:
	// 1. Variáveis de ambiente (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)
	// 2. Arquivo de credenciais (~/.aws/credentials)
	// 3. IAM Role (quando executando em EC2, ECS, Lambda, etc)
	// 4. Outros providers na cadeia padrão
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(sesConfig.Region),
	)
	if err != nil {
		return nil, &SESEmailError{
			Type:    CredentialError,
			Message: "Falha ao carregar configuração AWS",
			Err:     err,
		}
	}

	client := ses.NewFromConfig(cfg)

	return &SESEmailSender{
		client:      client,
		senderEmail: sesConfig.SenderEmail,
		senderName:  sesConfig.SenderName,
		logger:      logger,
	}, nil
}

// Send envia um email usando Amazon SES
func (s *SESEmailSender) Send(ctx context.Context, msg domainService.EmailMessage) error {
	// Validações básicas
	if msg.To == "" {
		return domainErrors.NewValidationError("destinatário do email é obrigatório", nil)
	}

	if msg.Subject == "" {
		return domainErrors.NewValidationError("assunto do email é obrigatório", nil)
	}

	if msg.HTMLBody == "" && msg.TextBody == "" {
		return domainErrors.NewValidationError("corpo do email é obrigatório (HTML ou texto)", nil)
	}

	// Monta o endereço do remetente
	var source string
	if s.senderName != "" {
		source = fmt.Sprintf("%s <%s>", s.senderName, s.senderEmail)
	} else {
		source = s.senderEmail
	}

	// Prepara a mensagem
	message := &types.Message{
		Subject: &types.Content{
			Data:    aws.String(msg.Subject),
			Charset: aws.String("UTF-8"),
		},
		Body: &types.Body{},
	}

	// Corpo HTML (preferencial)
	if msg.HTMLBody != "" {
		message.Body.Html = &types.Content{
			Data:    aws.String(msg.HTMLBody),
			Charset: aws.String("UTF-8"),
		}
	}

	// Corpo texto (fallback ou principal se não houver HTML)
	if msg.TextBody != "" {
		message.Body.Text = &types.Content{
			Data:    aws.String(msg.TextBody),
			Charset: aws.String("UTF-8"),
		}
	}

	// Prepara o input da requisição
	input := &ses.SendEmailInput{
		Source:      aws.String(source),
		Destination: &types.Destination{
			ToAddresses: []string{msg.To},
		},
		Message: message,
	}

	// Adiciona ReplyTo se especificado
	if msg.ReplyTo != "" {
		input.ReplyToAddresses = []string{msg.ReplyTo}
	}

	// Envia o email
	result, err := s.client.SendEmail(ctx, input)
	if err != nil {
		return s.handleSESError(err, msg.To)
	}

	s.logger.Info("Email enviado com sucesso",
		zap.String("message_id", *result.MessageId),
		zap.String("to", msg.To),
		zap.String("subject", msg.Subject),
	)

	return nil
}

// handleSESError analisa o erro do SES e retorna um erro categorizado
func (s *SESEmailSender) handleSESError(err error, toEmail string) error {
	errMsg := err.Error()
	errMsgLower := strings.ToLower(errMsg)

	// Análise de erros específicos do SES
	var sesErr *SESEmailError

	switch {
	// Erros de credenciais
	case strings.Contains(errMsgLower, "accessdenied") ||
		strings.Contains(errMsgLower, "security token") ||
		strings.Contains(errMsgLower, "credentials") ||
		strings.Contains(errMsgLower, "authorization"):
		sesErr = &SESEmailError{
			Type:    CredentialError,
			Message: "Credenciais AWS inválidas ou expiradas",
			Err:     err,
		}

	// Limites excedidos
	case strings.Contains(errMsgLower, "throttling") ||
		strings.Contains(errMsgLower, "rate exceeded") ||
		strings.Contains(errMsgLower, "maximum sending rate"):
		sesErr = &SESEmailError{
			Type:    QuotaExceededError,
			Message: "Limite de envio de emails excedido",
			Err:     err,
		}

	// Email não verificado (sandbox mode)
	case strings.Contains(errMsgLower, "email address is not verified") ||
		strings.Contains(errMsgLower, "is not authorized") ||
		strings.Contains(errMsgLower, "not verified"):
		// Verifica se é o remetente ou destinatário
		if strings.Contains(errMsg, s.senderEmail) {
			sesErr = &SESEmailError{
				Type:    EmailNotVerifiedError,
				Message: fmt.Sprintf("Email remetente '%s' não verificado no SES", s.senderEmail),
				Err:     err,
			}
		} else {
			sesErr = &SESEmailError{
				Type:    SandboxError,
				Message: fmt.Sprintf("Email destinatário '%s' não verificado (SES em modo Sandbox)", toEmail),
				Err:     err,
			}
		}

	// Email inválido
	case strings.Contains(errMsgLower, "malformed") ||
		strings.Contains(errMsgLower, "invalid email") ||
		strings.Contains(errMsgLower, "illegal address"):
		sesErr = &SESEmailError{
			Type:    InvalidEmailError,
			Message: "Formato de email inválido",
			Err:     err,
		}

	// Erros de rede
	case strings.Contains(errMsgLower, "timeout") ||
		strings.Contains(errMsgLower, "connection") ||
		strings.Contains(errMsgLower, "network"):
		sesErr = &SESEmailError{
			Type:    NetworkError,
			Message: "Erro de conectividade com AWS SES",
			Err:     err,
		}

	// Erro desconhecido
	default:
		sesErr = &SESEmailError{
			Type:    UnknownError,
			Message: "Erro desconhecido ao enviar email",
			Err:     err,
		}
	}

	s.logger.Error("Erro ao enviar email via SES",
		zap.String("error_type", string(sesErr.Type)),
		zap.String("to", toEmail),
		zap.Error(err),
	)

	return sesErr
}

// IsSESError verifica se um erro é do tipo SESEmailError
func IsSESError(err error) (*SESEmailError, bool) {
	var sesErr *SESEmailError
	if errors.As(err, &sesErr) {
		return sesErr, true
	}
	return nil, false
}

// NewSESEmailSenderFromAppConfig cria um SESEmailSender a partir da configuração da aplicação
func NewSESEmailSenderFromAppConfig(ctx context.Context, cfg *appConfig.Config, logger *zap.Logger) (*SESEmailSender, error) {
	sesConfig := SESEmailSenderConfig{
		Region:      cfg.Email.SESRegion,
		SenderEmail: cfg.Email.SenderEmail,
		SenderName:  cfg.Email.SenderName,
	}

	return NewSESEmailSender(ctx, sesConfig, logger)
}
