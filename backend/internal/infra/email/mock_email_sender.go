package email

import (
	"context"
	"fmt"
	"sync"

	domainService "github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"go.uber.org/zap"
)

// MockEmailSender implementa EmailSender para testes e desenvolvimento
// Armazena os emails enviados em memória para verificação
type MockEmailSender struct {
	sentEmails []domainService.EmailMessage
	mu         sync.Mutex
	logger     *zap.Logger
	// SimulateError se definido, será retornado como erro em Send
	SimulateError error
}

// NewMockEmailSender cria uma nova instância do MockEmailSender
func NewMockEmailSender(logger *zap.Logger) *MockEmailSender {
	return &MockEmailSender{
		sentEmails: make([]domainService.EmailMessage, 0),
		logger:     logger,
	}
}

// Send simula o envio de email, armazenando a mensagem
func (m *MockEmailSender) Send(ctx context.Context, msg domainService.EmailMessage) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Simular erro se configurado
	if m.SimulateError != nil {
		m.logger.Warn("Mock: Simulando erro de envio",
			zap.String("to", msg.To),
			zap.Error(m.SimulateError),
		)
		return m.SimulateError
	}

	// Armazenar email
	m.sentEmails = append(m.sentEmails, msg)

	m.logger.Info("Mock: Email enviado (simulado)",
		zap.String("to", msg.To),
		zap.String("subject", msg.Subject),
		zap.Bool("has_html", msg.HTMLBody != ""),
		zap.Bool("has_text", msg.TextBody != ""),
	)

	// Log do conteúdo para debugging
	if m.logger.Core().Enabled(zap.DebugLevel) {
		if msg.TextBody != "" {
			m.logger.Debug("Mock: Conteúdo do email (texto)",
				zap.String("body", truncateString(msg.TextBody, 200)),
			)
		}
	}

	return nil
}

// GetSentEmails retorna todos os emails enviados
func (m *MockEmailSender) GetSentEmails() []domainService.EmailMessage {
	m.mu.Lock()
	defer m.mu.Unlock()

	result := make([]domainService.EmailMessage, len(m.sentEmails))
	copy(result, m.sentEmails)
	return result
}

// GetLastEmail retorna o último email enviado ou nil
func (m *MockEmailSender) GetLastEmail() *domainService.EmailMessage {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.sentEmails) == 0 {
		return nil
	}
	email := m.sentEmails[len(m.sentEmails)-1]
	return &email
}

// Clear limpa todos os emails armazenados
func (m *MockEmailSender) Clear() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sentEmails = make([]domainService.EmailMessage, 0)
}

// Count retorna o número de emails enviados
func (m *MockEmailSender) Count() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.sentEmails)
}

// FindByRecipient busca emails enviados para um destinatário específico
func (m *MockEmailSender) FindByRecipient(email string) []domainService.EmailMessage {
	m.mu.Lock()
	defer m.mu.Unlock()

	var result []domainService.EmailMessage
	for _, msg := range m.sentEmails {
		if msg.To == email {
			result = append(result, msg)
		}
	}
	return result
}

// SetSimulateError configura um erro a ser retornado nas próximas chamadas Send
func (m *MockEmailSender) SetSimulateError(err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.SimulateError = err
}

// ClearSimulateError remove o erro simulado
func (m *MockEmailSender) ClearSimulateError() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.SimulateError = nil
}

// truncateString trunca uma string para o tamanho máximo especificado
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// Verificar que MockEmailSender implementa a interface
var _ domainService.EmailSender = (*MockEmailSender)(nil)

// ConsoleEmailSender implementa EmailSender imprimindo no console
// Útil para desenvolvimento local sem AWS
type ConsoleEmailSender struct {
	logger *zap.Logger
}

// NewConsoleEmailSender cria um sender que imprime emails no console
func NewConsoleEmailSender(logger *zap.Logger) *ConsoleEmailSender {
	return &ConsoleEmailSender{logger: logger}
}

// Send imprime o email no console
func (c *ConsoleEmailSender) Send(ctx context.Context, msg domainService.EmailMessage) error {
	separator := "============================================"

	fmt.Println(separator)
	fmt.Println("📧 EMAIL SIMULADO (Console)")
	fmt.Println(separator)
	fmt.Printf("Para: %s\n", msg.To)
	fmt.Printf("Assunto: %s\n", msg.Subject)
	if msg.ReplyTo != "" {
		fmt.Printf("Responder para: %s\n", msg.ReplyTo)
	}
	fmt.Println(separator)
	if msg.TextBody != "" {
		fmt.Println("Corpo (Texto):")
		fmt.Println(msg.TextBody)
	}
	if msg.HTMLBody != "" {
		fmt.Println("Corpo (HTML):")
		fmt.Println(msg.HTMLBody)
	}
	fmt.Println(separator)
	fmt.Println()

	c.logger.Info("Console: Email impresso no terminal",
		zap.String("to", msg.To),
		zap.String("subject", msg.Subject),
	)

	return nil
}

// Verificar que ConsoleEmailSender implementa a interface
var _ domainService.EmailSender = (*ConsoleEmailSender)(nil)
