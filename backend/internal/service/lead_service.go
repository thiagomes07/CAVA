package service

import (
	"context"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	domainService "github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"go.uber.org/zap"
)

type clienteService struct {
	clienteRepo     repository.ClienteRepository
	interactionRepo repository.ClienteInteractionRepository
	linkRepo        repository.SalesLinkRepository
	db              DatabaseExecutor
	emailSender     domainService.EmailSender
	frontendURL     string
	logger          *zap.Logger
}

// DatabaseExecutor define interface para execução de transações
type DatabaseExecutor interface {
	ExecuteInTx(ctx context.Context, fn func(tx interface{}) error) error
}

func NewClienteService(
	clienteRepo repository.ClienteRepository,
	interactionRepo repository.ClienteInteractionRepository,
	linkRepo repository.SalesLinkRepository,
	db DatabaseExecutor,
	emailSender domainService.EmailSender,
	frontendURL string,
	logger *zap.Logger,
) *clienteService {
	return &clienteService{
		clienteRepo:     clienteRepo,
		interactionRepo: interactionRepo,
		linkRepo:        linkRepo,
		db:              db,
		emailSender:     emailSender,
		frontendURL:     frontendURL,
		logger:          logger,
	}
}

func (s *clienteService) CaptureInterest(ctx context.Context, input entity.CreateClienteInput) error {
	// Validar que link de venda existe
	link, err := s.linkRepo.FindBySlug(ctx, input.SalesLinkID)
	if err != nil {
		// Se não encontrou por slug, tentar por ID
		link, err = s.linkRepo.FindByID(ctx, input.SalesLinkID)
		if err != nil {
			return domainErrors.NewNotFoundError("Link de venda")
		}
	}

	// Verificar se link está ativo e não expirado
	if !link.IsActive || link.IsExpired() {
		return domainErrors.NewNotFoundError("Link de venda")
	}

	// Verificar se cliente já existe por contato
	existingCliente, err := s.clienteRepo.FindByContact(ctx, input.Contact)
	if err != nil && !isNotFoundError(err) {
		s.logger.Error("erro ao buscar cliente por contato", zap.Error(err))
		return domainErrors.InternalError(err)
	}

	// Executar em transação
	return s.db.ExecuteInTx(ctx, func(tx interface{}) error {
		var clienteID string

		if existingCliente != nil {
			// Cliente já existe, apenas atualizar última interação
			clienteID = existingCliente.ID
			if err := s.clienteRepo.UpdateLastInteraction(ctx, nil, clienteID); err != nil {
				return err
			}
			s.logger.Info("cliente existente atualizado", zap.String("clienteId", clienteID))
		} else {
			// Criar novo cliente
			cliente := &entity.Cliente{
				ID:             uuid.New().String(),
				SalesLinkID:    link.ID,
				Name:           input.Name,
				Contact:        input.Contact,
				Message:        input.Message,
				MarketingOptIn: input.MarketingOptIn,
				Status:         entity.ClienteStatusNovo,
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}

			if err := s.clienteRepo.Create(ctx, nil, cliente); err != nil {
				s.logger.Error("erro ao criar cliente", zap.Error(err))
				return err
			}

			clienteID = cliente.ID
			s.logger.Info("novo cliente criado", zap.String("clienteId", clienteID))
		}

		// Criar interação
		interaction := &entity.ClienteInteraction{
			ID:              uuid.New().String(),
			ClienteID:       clienteID,
			SalesLinkID:     link.ID,
			Message:         input.Message,
			InteractionType: s.determineInteractionType(link.LinkType),
			CreatedAt:       time.Now(),
		}

		// Adicionar referências de batch/product baseado no tipo de link
		if link.BatchID != nil {
			interaction.TargetBatchID = link.BatchID
		}
		if link.ProductID != nil {
			interaction.TargetProductID = link.ProductID
		}

		if err := s.interactionRepo.Create(ctx, nil, interaction); err != nil {
			s.logger.Error("erro ao criar interação", zap.Error(err))
			return err
		}

		s.logger.Info("interação criada com sucesso",
			zap.String("clienteId", clienteID),
			zap.String("linkId", link.ID),
		)

		return nil
	})
}

// CreateManual cria um cliente manualmente (usuário autenticado)
func (s *clienteService) CreateManual(ctx context.Context, input entity.CreateClienteManualInput) (*entity.Cliente, error) {
	// Verificar se cliente já existe por contato
	existingCliente, err := s.clienteRepo.FindByContact(ctx, input.Contact)
	if err != nil && !isNotFoundError(err) {
		s.logger.Error("erro ao buscar cliente por contato", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	if existingCliente != nil {
		return nil, domainErrors.NewConflictError("Cliente com este contato já existe")
	}

	// Criar novo cliente (sem SalesLinkID, criado manualmente)
	cliente := &entity.Cliente{
		ID:             uuid.New().String(),
		SalesLinkID:    "", // Sem link associado
		Name:           input.Name,
		Contact:        input.Contact,
		Message:        input.Message,
		MarketingOptIn: input.MarketingOptIn,
		Status:         entity.ClienteStatusNovo,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.clienteRepo.Create(ctx, nil, cliente); err != nil {
		s.logger.Error("erro ao criar cliente manual", zap.Error(err))
		return nil, err
	}

	s.logger.Info("cliente manual criado com sucesso",
		zap.String("clienteId", cliente.ID),
		zap.String("name", cliente.Name),
	)

	return cliente, nil
}

func (s *clienteService) GetByID(ctx context.Context, id string) (*entity.Cliente, error) {
	cliente, err := s.clienteRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Buscar link de venda relacionado
	if cliente.SalesLinkID != "" {
		link, err := s.linkRepo.FindByID(ctx, cliente.SalesLinkID)
		if err != nil {
			s.logger.Warn("erro ao buscar link do cliente",
				zap.String("clienteId", id),
				zap.String("linkId", cliente.SalesLinkID),
				zap.Error(err),
			)
		} else {
			cliente.SalesLink = link
		}
	}

	return cliente, nil
}

func (s *clienteService) List(ctx context.Context, filters entity.ClienteFilters) (*entity.ClienteListResponse, error) {
	clientes, total, err := s.clienteRepo.List(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao listar clientes", zap.Error(err))
		return nil, err
	}

	// Buscar dados relacionados para cada cliente
	for i := range clientes {
		if clientes[i].SalesLinkID != "" {
			link, err := s.linkRepo.FindByID(ctx, clientes[i].SalesLinkID)
			if err != nil {
				s.logger.Warn("erro ao buscar link do cliente",
					zap.String("clienteId", clientes[i].ID),
					zap.Error(err),
				)
			} else {
				clientes[i].SalesLink = link
			}
		}
	}

	return &entity.ClienteListResponse{
		Clientes: clientes,
		Total:    total,
		Page:     filters.Page,
	}, nil
}

func (s *clienteService) UpdateStatus(ctx context.Context, id string, status entity.ClienteStatus) (*entity.Cliente, error) {
	// Validar status
	if !status.IsValid() {
		return nil, domainErrors.ValidationError("Status inválido")
	}

	// Atualizar status
	if err := s.clienteRepo.UpdateStatus(ctx, id, status); err != nil {
		s.logger.Error("erro ao atualizar status do cliente",
			zap.String("clienteId", id),
			zap.String("status", string(status)),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("status do cliente atualizado",
		zap.String("clienteId", id),
		zap.String("status", string(status)),
	)

	// Retornar cliente atualizado
	return s.GetByID(ctx, id)
}

func (s *clienteService) GetInteractions(ctx context.Context, clienteID string) ([]entity.ClienteInteraction, error) {
	// Verificar se cliente existe
	_, err := s.clienteRepo.FindByID(ctx, clienteID)
	if err != nil {
		return nil, err
	}

	// Buscar interações
	interactions, err := s.interactionRepo.FindByClienteID(ctx, clienteID)
	if err != nil {
		s.logger.Error("erro ao buscar interações do cliente",
			zap.String("clienteId", clienteID),
			zap.Error(err),
		)
		return nil, err
	}

	return interactions, nil
}

// determineInteractionType determina o tipo de interação baseado no tipo de link
func (s *clienteService) determineInteractionType(linkType entity.LinkType) entity.InteractionType {
	switch linkType {
	case entity.LinkTypeLoteUnico:
		return entity.InteractionInteresseLote
	case entity.LinkTypeProdutoGeral:
		return entity.InteractionInteresseLote
	case entity.LinkTypeCatalogoCompleto:
		return entity.InteractionInteresseCatalogo
	default:
		return entity.InteractionDuvidaGeral
	}
}

// isNotFoundError verifica se é erro de not found
func isNotFoundError(err error) bool {
	if appErr, ok := err.(*domainErrors.AppError); ok {
		return appErr.Code == "NOT_FOUND"
	}
	return false
}

// SendLinksToClientes envia links de lotes para clientes selecionados via email
func (s *clienteService) SendLinksToClientes(ctx context.Context, input entity.SendLinksToClientesInput) (*entity.SendLinksResponse, error) {
	// Validar que temos email sender configurado
	if s.emailSender == nil {
		return nil, domainErrors.NewInternalError("Serviço de email não configurado", nil)
	}

	// Buscar todos os clientes
	var clientes []*entity.Cliente
	for _, clienteID := range input.ClienteIDs {
		cliente, err := s.clienteRepo.FindByID(ctx, clienteID)
		if err != nil {
			s.logger.Warn("cliente não encontrado para envio",
				zap.String("clienteId", clienteID),
				zap.Error(err),
			)
			continue
		}
		clientes = append(clientes, cliente)
	}

	if len(clientes) == 0 {
		return nil, domainErrors.NewValidationError("Nenhum cliente válido encontrado", nil)
	}

	// Buscar todos os links
	var links []*entity.SalesLink
	for _, linkID := range input.SalesLinkIDs {
		link, err := s.linkRepo.FindByID(ctx, linkID)
		if err != nil {
			s.logger.Warn("link não encontrado para envio",
				zap.String("linkId", linkID),
				zap.Error(err),
			)
			continue
		}
		// Só incluir links ativos e não expirados
		if link.IsActive && !link.IsExpired() {
			links = append(links, link)
		}
	}

	if len(links) == 0 {
		return nil, domainErrors.NewValidationError("Nenhum link válido encontrado (verifique se estão ativos e não expirados)", nil)
	}

	// Preparar resposta
	response := &entity.SendLinksResponse{
		TotalClientes: len(clientes),
		LinksIncluded: len(links),
		Results:       make([]entity.SendLinkResult, 0, len(clientes)),
	}

	// Enviar para cada cliente
	for _, cliente := range clientes {
		result := entity.SendLinkResult{
			ClienteID:   cliente.ID,
			ClienteName: cliente.Name,
			Email:       cliente.Contact,
		}

		// Validar se o contato é um email válido
		if !isValidEmail(cliente.Contact) {
			result.Success = false
			result.Error = "Contato não é um email válido"
			response.TotalSkipped++
			response.Results = append(response.Results, result)
			continue
		}

		// Montar e enviar email
		err := s.sendLinksEmail(ctx, cliente, links, input.CustomMessage)
		if err != nil {
			result.Success = false
			result.Error = err.Error()
			response.TotalFailed++
			s.logger.Error("erro ao enviar email para cliente",
				zap.String("clienteId", cliente.ID),
				zap.String("email", cliente.Contact),
				zap.Error(err),
			)
		} else {
			result.Success = true
			response.TotalSent++
			s.logger.Info("email enviado para cliente com sucesso",
				zap.String("clienteId", cliente.ID),
				zap.String("email", cliente.Contact),
				zap.Int("linksCount", len(links)),
			)
		}

		response.Results = append(response.Results, result)
	}

	return response, nil
}

// isValidEmail verifica se uma string é um email válido
func isValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

// sendLinksEmail envia email com os links para um cliente
func (s *clienteService) sendLinksEmail(ctx context.Context, cliente *entity.Cliente, links []*entity.SalesLink, customMessage *string) error {
	// Construir cards HTML para cada link
	var linksHTML strings.Builder
	var linksText strings.Builder

	for i, link := range links {
		// URL completa do link
		linkURL := fmt.Sprintf("%s/l/%s", s.frontendURL, link.SlugToken)

		// Título do link
		title := "Lote disponível"
		if link.Title != nil && *link.Title != "" {
			title = *link.Title
		}

		// Preço (se mostrar)
		priceHTML := ""
		priceText := ""
		if link.ShowPrice && link.DisplayPrice != nil {
			priceHTML = fmt.Sprintf(`<p style="font-size: 20px; color: #059669; font-weight: bold; margin: 10px 0;">R$ %.2f</p>`, *link.DisplayPrice)
			priceText = fmt.Sprintf("Preço: R$ %.2f\n", *link.DisplayPrice)
		}

		// Mensagem customizada do link
		descHTML := ""
		descText := ""
		if link.CustomMessage != nil && *link.CustomMessage != "" {
			descHTML = fmt.Sprintf(`<p style="color: #6b7280; margin: 10px 0;">%s</p>`, *link.CustomMessage)
			descText = *link.CustomMessage + "\n"
		}

		// Card HTML
		linksHTML.WriteString(fmt.Sprintf(`
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 15px 0; border: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">%s</h3>
            %s
            %s
            <a href="%s" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">Ver Detalhes</a>
        </div>
        `, title, descHTML, priceHTML, linkURL))

		// Versão texto
		linksText.WriteString(fmt.Sprintf("\n%d. %s\n%s%sLink: %s\n", i+1, title, descText, priceText, linkURL))
	}

	// Mensagem personalizada do vendedor
	customMsgHTML := ""
	customMsgText := ""
	if customMessage != nil && *customMessage != "" {
		customMsgHTML = fmt.Sprintf(`
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;">💬 %s</p>
        </div>
        `, *customMessage)
		customMsgText = fmt.Sprintf("\nMensagem do vendedor: %s\n", *customMessage)
	}

	// HTML completo
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        .container { background-color: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
        .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">CAVA</div>
        </div>
        <h1 style="color: #1f2937;">Olá, %s! 👋</h1>
        <p>Temos algumas ofertas especiais que podem te interessar:</p>
        %s
        %s
        <div class="footer">
            <p>Este email foi enviado pela plataforma CAVA.</p>
            <p>Se você não deseja mais receber estas mensagens, por favor entre em contato.</p>
        </div>
    </div>
</body>
</html>
`, cliente.Name, customMsgHTML, linksHTML.String())

	// Texto plano
	textBody := fmt.Sprintf(`Olá, %s!

Temos algumas ofertas especiais que podem te interessar:
%s%s
---
Este email foi enviado pela plataforma CAVA.
`, cliente.Name, customMsgText, linksText.String())

	// Enviar email
	msg := domainService.EmailMessage{
		To:       cliente.Contact,
		Subject:  "Ofertas especiais para você - CAVA",
		HTMLBody: htmlBody,
		TextBody: textBody,
	}

	return s.emailSender.Send(ctx, msg)
}
