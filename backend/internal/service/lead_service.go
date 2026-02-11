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
	infraEmail "github.com/thiagomes07/CAVA/backend/internal/infra/email"
	"go.uber.org/zap"
)

type clienteService struct {
	clienteRepo     repository.ClienteRepository
	interactionRepo repository.ClienteInteractionRepository
	linkRepo        repository.SalesLinkRepository
	batchRepo       repository.BatchRepository
	productRepo     repository.ProductRepository
	mediaRepo       repository.MediaRepository
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
	batchRepo repository.BatchRepository,
	productRepo repository.ProductRepository,
	mediaRepo repository.MediaRepository,
	db DatabaseExecutor,
	emailSender domainService.EmailSender,
	frontendURL string,
	logger *zap.Logger,
) *clienteService {
	return &clienteService{
		clienteRepo:     clienteRepo,
		interactionRepo: interactionRepo,
		linkRepo:        linkRepo,
		batchRepo:       batchRepo,
		productRepo:     productRepo,
		mediaRepo:       mediaRepo,
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

	// Determinar contato para busca de cliente existente (prioriza email)
	var searchContact string
	if input.Email != nil && *input.Email != "" {
		searchContact = *input.Email
	} else if input.Phone != nil && *input.Phone != "" {
		searchContact = *input.Phone
	}

	// Verificar se cliente já existe por contato
	var existingCliente *entity.Cliente
	if searchContact != "" {
		existingCliente, err = s.clienteRepo.FindByContact(ctx, searchContact)
		if err != nil && !isNotFoundError(err) {
			s.logger.Error("erro ao buscar cliente por contato", zap.Error(err))
			return domainErrors.InternalError(err)
		}
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
				Email:          input.Email,
				Phone:          input.Phone,
				Whatsapp:       input.Whatsapp,
				Message:        input.Message,
				MarketingOptIn: input.MarketingOptIn,
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

// CreateFromPortfolio cria cliente capturado via portfolio público
func (s *clienteService) CreateFromPortfolio(ctx context.Context, cliente *entity.Cliente, productID *string) error {
	// Determinar contato para busca de cliente existente (prioriza email)
	var searchContact string
	if cliente.Email != nil && *cliente.Email != "" {
		searchContact = *cliente.Email
	} else if cliente.Phone != nil && *cliente.Phone != "" {
		searchContact = *cliente.Phone
	}

	// Verificar se cliente já existe por contato
	var existingCliente *entity.Cliente
	var err error
	if searchContact != "" {
		existingCliente, err = s.clienteRepo.FindByContact(ctx, searchContact)
		if err != nil && !isNotFoundError(err) {
			s.logger.Error("erro ao buscar cliente por contato", zap.Error(err))
			return domainErrors.InternalError(err)
		}
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
			s.logger.Info("cliente existente atualizado via portfolio", zap.String("clienteId", clienteID))
		} else {
			// Criar novo cliente
			cliente.ID = uuid.New().String()
			cliente.Source = "PORTFOLIO"
			cliente.CreatedAt = time.Now()
			cliente.UpdatedAt = time.Now()

			if err := s.clienteRepo.CreateFromPortfolio(ctx, nil, cliente); err != nil {
				s.logger.Error("erro ao criar cliente do portfolio", zap.Error(err))
				return err
			}

			clienteID = cliente.ID
			s.logger.Info("novo cliente criado via portfolio", zap.String("clienteId", clienteID))
		}

		// Criar interação do tipo PORTFOLIO_LEAD
		interaction := &entity.ClienteInteraction{
			ID:              uuid.New().String(),
			ClienteID:       clienteID,
			SalesLinkID:     "", // Sem link - veio do portfolio
			Message:         cliente.Message,
			InteractionType: entity.InteractionPortfolioLead,
			CreatedAt:       time.Now(),
		}

		// Adicionar referência de produto se especificado
		if productID != nil {
			interaction.TargetProductID = productID
		}

		if err := s.interactionRepo.Create(ctx, nil, interaction); err != nil {
			s.logger.Error("erro ao criar interação do portfolio", zap.Error(err))
			return err
		}

		s.logger.Info("lead capturado via portfolio",
			zap.String("clienteId", clienteID),
			zap.String("industryId", stringValue(cliente.IndustryID)),
		)

		return nil
	})
}

func stringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// CreateManual cria um cliente manualmente (usuário autenticado)
func (s *clienteService) CreateManual(ctx context.Context, input entity.CreateClienteManualInput, createdByUserID string) (*entity.Cliente, error) {
	// Determinar contato para busca de cliente existente (prioriza email)
	var searchContact string
	if input.Email != nil && *input.Email != "" {
		searchContact = *input.Email
	} else if input.Phone != nil && *input.Phone != "" {
		searchContact = *input.Phone
	}

	// Verificar se cliente já existe por contato/email/phone
	if searchContact != "" {
		existingCliente, err := s.clienteRepo.FindByContact(ctx, searchContact)
		if err != nil && !isNotFoundError(err) {
			s.logger.Error("erro ao buscar cliente por contato", zap.Error(err))
			return nil, domainErrors.InternalError(err)
		}

		if existingCliente != nil {
			return nil, domainErrors.NewConflictError("Cliente com este contato já existe")
		}
	}

	// Criar novo cliente (sem SalesLinkID, criado manualmente)
	cliente := &entity.Cliente{
		ID:              uuid.New().String(),
		SalesLinkID:     "", // Sem link associado
		CreatedByUserID: &createdByUserID,
		Name:            input.Name,
		Email:           input.Email,
		Phone:           input.Phone,
		Whatsapp:        input.Whatsapp,
		Message:         input.Message,
		MarketingOptIn:  input.MarketingOptIn,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
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

	// Calcular campo Contact (email ou phone)
	if cliente.Email != nil && *cliente.Email != "" {
		cliente.Contact = *cliente.Email
	} else if cliente.Phone != nil && *cliente.Phone != "" {
		cliente.Contact = *cliente.Phone
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
		// Calcular campo Contact (email ou phone)
		if clientes[i].Email != nil && *clientes[i].Email != "" {
			clientes[i].Contact = *clientes[i].Email
		} else if clientes[i].Phone != nil && *clientes[i].Phone != "" {
			clientes[i].Contact = *clientes[i].Phone
		}

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
			Email:       getClienteEmail(cliente),
		}

		// Validar se o cliente tem um email válido
		email := getClienteEmail(cliente)
		if email == "" || !isValidEmail(email) {
			result.Success = false
			result.Error = "Cliente não tem email válido"
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
				zap.String("email", email),
				zap.Error(err),
			)
		} else {
			result.Success = true
			response.TotalSent++
			s.logger.Info("email enviado para cliente com sucesso",
				zap.String("clienteId", cliente.ID),
				zap.String("email", email),
				zap.Int("linksCount", len(links)),
			)
		}

		response.Results = append(response.Results, result)
	}

	return response, nil
}

// getClienteEmail retorna o email do cliente (campo email)
func getClienteEmail(cliente *entity.Cliente) string {
	if cliente.Email != nil && *cliente.Email != "" {
		return *cliente.Email
	}
	return ""
}

// isValidEmail verifica se uma string é um email válido
func isValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

// sendLinksEmail envia email com os links para um cliente
func (s *clienteService) sendLinksEmail(ctx context.Context, cliente *entity.Cliente, links []*entity.SalesLink, customMessage *string) error {
	// Converter links para o formato do template
	offerLinks := make([]infraEmail.OfferLink, 0, len(links))

	for _, link := range links {
		// URL completa do link
		linkURL := fmt.Sprintf("%s/%s", s.frontendURL, link.SlugToken)

		// Título do link
		title := "Lote disponível"
		if link.Title != nil && *link.Title != "" {
			title = *link.Title
		}

		// Preço (se mostrar)
		price := ""
		if link.ShowPrice && link.DisplayPriceAmount > 0 {
			symbol := "R$"
			if link.DisplayCurrency == entity.CurrencyUSD {
				symbol = "US$"
			}
			price = fmt.Sprintf("%s %.2f", symbol, entity.AmountToFloat(link.DisplayPriceAmount))
		}

		// Descrição do link
		description := ""
		if link.CustomMessage != nil && *link.CustomMessage != "" {
			description = *link.CustomMessage
		}

		// Buscar imagem de preview do lote/produto
		imageURL := s.getPreviewImageURL(ctx, link)

		offerLinks = append(offerLinks, infraEmail.OfferLink{
			Title:       title,
			Description: description,
			Price:       price,
			URL:         linkURL,
			ImageURL:    imageURL,
		})
	}

	// Mensagem personalizada do vendedor
	customMsg := ""
	if customMessage != nil && *customMessage != "" {
		customMsg = *customMessage
	}

	// Usar template padronizado
	htmlBody, textBody, err := infraEmail.RenderOffersEmail(infraEmail.OffersEmailData{
		ClienteName:   cliente.Name,
		CustomMessage: customMsg,
		Links:         offerLinks,
	})
	if err != nil {
		return fmt.Errorf("falha ao renderizar email de ofertas: %w", err)
	}

	// Enviar email
	email := getClienteEmail(cliente)
	msg := domainService.EmailMessage{
		To:       email,
		Subject:  "Ofertas Especiais para você - CAVA Stone Platform",
		HTMLBody: htmlBody,
		TextBody: textBody,
	}

	return s.emailSender.Send(ctx, msg)
}

// getPreviewImageURL busca a URL da imagem de preview para um link de venda
// IMPORTANTE: URLs localhost não funcionam em emails HTML pois o cliente de email
// não tem acesso ao localhost do servidor. Em produção, use URLs públicas (CloudFront, etc)
func (s *clienteService) getPreviewImageURL(ctx context.Context, link *entity.SalesLink) string {
	// Para links de LOTE_UNICO ou MULTIPLOS_LOTES, buscar imagem do batch
	if link.BatchID != nil {
		batch, err := s.batchRepo.FindByID(ctx, *link.BatchID)
		if err == nil && batch != nil {
			// Buscar mídias do batch
			medias, err := s.mediaRepo.FindBatchMedias(ctx, batch.ID)
			if err == nil && len(medias) > 0 {
				// Preferir imagem de capa (cover), senão primeira imagem
				for _, media := range medias {
					if media.IsCover && !isLocalhostURL(media.URL) {
						return media.URL
					}
				}
				// Retornar primeira imagem válida (não localhost)
				if !isLocalhostURL(medias[0].URL) {
					return medias[0].URL
				}
			}

			// Se não tem mídia no batch, tentar do produto
			if batch.ProductID != "" {
				product, err := s.productRepo.FindByID(ctx, batch.ProductID)
				if err == nil && product != nil {
					productMedias, err := s.mediaRepo.FindProductMedias(ctx, product.ID)
					if err == nil && len(productMedias) > 0 {
						for _, media := range productMedias {
							if media.IsCover && !isLocalhostURL(media.URL) {
								return media.URL
							}
						}
						if !isLocalhostURL(productMedias[0].URL) {
							return productMedias[0].URL
						}
					}
				}
			}
		}
	}

	// Para links de PRODUTO_GERAL, buscar imagem do produto
	if link.ProductID != nil {
		product, err := s.productRepo.FindByID(ctx, *link.ProductID)
		if err == nil && product != nil {
			medias, err := s.mediaRepo.FindProductMedias(ctx, product.ID)
			if err == nil && len(medias) > 0 {
				for _, media := range medias {
					if media.IsCover && !isLocalhostURL(media.URL) {
						return media.URL
					}
				}
				if !isLocalhostURL(medias[0].URL) {
					return medias[0].URL
				}
			}
		}
	}

	// Para MULTIPLOS_LOTES, tentar buscar a imagem do primeiro item
	if link.LinkType == entity.LinkTypeMultiplosLotes && len(link.Items) > 0 {
		firstItem := link.Items[0]
		batch, err := s.batchRepo.FindByID(ctx, firstItem.BatchID)
		if err == nil && batch != nil {
			medias, err := s.mediaRepo.FindBatchMedias(ctx, batch.ID)
			if err == nil && len(medias) > 0 {
				for _, media := range medias {
					if media.IsCover && !isLocalhostURL(media.URL) {
						return media.URL
					}
				}
				if !isLocalhostURL(medias[0].URL) {
					return medias[0].URL
				}
			}
		}
	}

	return ""
}

// isLocalhostURL verifica se uma URL é localhost (não funciona em emails)
func isLocalhostURL(url string) bool {
	return url != "" && (
		strings.Contains(url, "localhost") ||
		strings.Contains(url, "127.0.0.1") ||
		strings.Contains(url, "0.0.0.0"))
}

func (s *clienteService) Update(ctx context.Context, id string, input entity.CreateClienteManualInput) (*entity.Cliente, error) {
	// Verificar se cliente existe
	// Verificar se cliente existe
	existing, err := s.clienteRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Verificar conflito de email/telefone com OUTRO cliente
	var searchContact string
	if input.Email != nil && *input.Email != "" {
		searchContact = *input.Email
	} else if input.Phone != nil && *input.Phone != "" {
		searchContact = *input.Phone
	}

	if searchContact != "" {
		conflict, err := s.clienteRepo.FindByContact(ctx, searchContact)
		if err == nil && conflict != nil && conflict.ID != id {
			return nil, domainErrors.NewConflictError("Cliente com este contato já existe")
		}
	}

	// Atualizar campos
	existing.Name = input.Name
	existing.Email = input.Email
	existing.Phone = input.Phone
	existing.Whatsapp = input.Whatsapp
	existing.Message = input.Message
	existing.MarketingOptIn = input.MarketingOptIn
	// Keep existing metadata like SalesLinkID, CreatedByUserID

	if err := s.clienteRepo.Update(ctx, nil, existing); err != nil {
		s.logger.Error("erro ao atualizar cliente", zap.Error(err))
		return nil, err
	}

	return existing, nil
}

func (s *clienteService) Delete(ctx context.Context, id string) error {
	// Verificar se existe
	// Verificar se existe
	_, err := s.clienteRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if err := s.clienteRepo.Delete(ctx, nil, id); err != nil {
		s.logger.Error("erro ao deletar cliente", zap.String("id", id), zap.Error(err))
		return err
	}

	return nil
}
