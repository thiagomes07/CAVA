package service

import "context"

// EmailMessage representa uma mensagem de email a ser enviada
type EmailMessage struct {
	// To é o endereço de email do destinatário
	To string
	// Subject é o assunto do email
	Subject string
	// HTMLBody é o corpo do email em HTML (opcional se TextBody for fornecido)
	HTMLBody string
	// TextBody é o corpo do email em texto plano (opcional se HTMLBody for fornecido)
	TextBody string
	// ReplyTo endereço de resposta (opcional)
	ReplyTo string
}

// EmailSender define a interface para envio de emails
// Permite injeção de dependência e troca de implementação (SES, SMTP, Mock, etc)
type EmailSender interface {
	// Send envia um email
	// Retorna error se falhar, nil se bem sucedido
	Send(ctx context.Context, msg EmailMessage) error
}
