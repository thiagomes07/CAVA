package email

import (
	"context"
	"fmt"

	"github.com/thiagomes07/CAVA/backend/internal/config"
	domainService "github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"go.uber.org/zap"
)

// EmailSenderType define os tipos de sender disponíveis
type EmailSenderType string

const (
	// SenderTypeSES usa Amazon SES para envio de emails
	SenderTypeSES EmailSenderType = "ses"
	// SenderTypeMock usa mock para testes (armazena em memória)
	SenderTypeMock EmailSenderType = "mock"
	// SenderTypeConsole imprime emails no console
	SenderTypeConsole EmailSenderType = "console"
)

// NewEmailSender cria um EmailSender apropriado baseado na configuração
// Esta é a função factory recomendada para criar o sender
//
// Comportamento:
//   - Se USE_SES=true: Cria SESEmailSender (produção)
//   - Se USE_SES=false e APP_ENV=development: Cria ConsoleEmailSender
//   - Caso contrário: Retorna erro (não há SMTP implementado)
func NewEmailSender(ctx context.Context, cfg *config.Config, logger *zap.Logger) (domainService.EmailSender, error) {
	if cfg.Email.UseSES {
		logger.Info("Inicializando email sender com Amazon SES",
			zap.String("region", cfg.Email.SESRegion),
			zap.String("sender_email", cfg.Email.SenderEmail),
		)

		sender, err := NewSESEmailSenderFromAppConfig(ctx, cfg, logger)
		if err != nil {
			return nil, fmt.Errorf("falha ao criar SES email sender: %w", err)
		}
		return sender, nil
	}

	// Em desenvolvimento, usar console sender se SES não estiver habilitado
	if cfg.IsDevelopment() {
		logger.Warn("SES não habilitado em desenvolvimento - usando Console Email Sender",
			zap.String("tip", "Defina USE_SES=true para usar o SES real"),
		)
		return NewConsoleEmailSender(logger), nil
	}

	// Em produção, SES deve estar habilitado
	return nil, fmt.Errorf(
		"USE_SES deve ser true em ambiente de produção. " +
			"Configure as variáveis SES_REGION, SES_SENDER_EMAIL e USE_SES=true",
	)
}

// NewEmailSenderWithType cria um EmailSender do tipo específico
// Útil para testes ou quando você precisa forçar um tipo específico
func NewEmailSenderWithType(
	ctx context.Context,
	senderType EmailSenderType,
	cfg *config.Config,
	logger *zap.Logger,
) (domainService.EmailSender, error) {
	switch senderType {
	case SenderTypeSES:
		return NewSESEmailSenderFromAppConfig(ctx, cfg, logger)

	case SenderTypeMock:
		return NewMockEmailSender(logger), nil

	case SenderTypeConsole:
		return NewConsoleEmailSender(logger), nil

	default:
		return nil, fmt.Errorf("tipo de email sender desconhecido: %s", senderType)
	}
}

// MustNewEmailSender cria um EmailSender ou faz panic se falhar
// Útil para inicialização na main() onde erros são fatais
func MustNewEmailSender(ctx context.Context, cfg *config.Config, logger *zap.Logger) domainService.EmailSender {
	sender, err := NewEmailSender(ctx, cfg, logger)
	if err != nil {
		logger.Fatal("Falha ao criar email sender", zap.Error(err))
	}
	return sender
}
