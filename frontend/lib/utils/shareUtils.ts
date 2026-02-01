import type { SalesLink } from '@/lib/types';

const WHATSAPP_MAX_LENGTH = 4096;
const WHATSAPP_WARNING_LENGTH = 4000;

/**
 * Formata mensagem para WhatsApp com múltiplos links
 */
export function formatWhatsAppMessage(
  links: SalesLink[],
  clienteName: string,
  customMessage?: string,
  locale: string = 'pt'
): string {
  const greeting = `Olá ${clienteName}! 👋\n\n`;
  
  const customPart = customMessage ? `${customMessage}\n\n` : '';
  
  const intro = locale === 'pt' 
    ? 'Confira os produtos disponíveis:\n\n'
    : locale === 'es'
    ? 'Mira los productos disponibles:\n\n'
    : 'Check out the available products:\n\n';
  
  const linksText = links.map((link, index) => {
    const title = link.title || link.batch?.product?.name || link.product?.name || 'Link';
    const linkType = formatLinkType(link.linkType, locale);
    
    let details = `🔹 ${title}\n`;
    details += `📋 ${linkType}`;
    
    // Adicionar informações de preço se disponível
    if (link.showPrice && link.displayPrice) {
      const price = link.displayPrice.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
      details += ` | 💰 ${price}`;
    }
    
    // Adicionar informações do lote se existir
    if (link.batch) {
      const dimensions = `${link.batch.width}x${link.batch.height}x${link.batch.thickness}cm`;
      details += `\n📏 ${dimensions}`;
      if (link.batch.availableSlabs > 0) {
        details += ` | ${link.batch.availableSlabs} chapas`;
      }
    }
    
    // Construir URL do link
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://cava.app'; // fallback
    const linkUrl = `${baseUrl}/${locale}/${link.slugToken}`;
    
    details += `\n🔗 ${linkUrl}\n`;
    
    return details;
  }).join('\n');
  
  const footer = locale === 'pt'
    ? '\nQualquer dúvida, estou à disposição!'
    : locale === 'es'
    ? '\n¡Cualquier duda, estoy a tu disposición!'
    : '\nAny questions, feel free to ask!';
  
  return greeting + customPart + intro + linksText + footer;
}

/**
 * Formata o tipo do link para exibição
 */
function formatLinkType(linkType: string, locale: string): string {
  const types: Record<string, Record<string, string>> = {
    LOTE_UNICO: {
      pt: 'Lote Único',
      es: 'Lote Único',
      en: 'Single Batch'
    },
    PRODUTO_GERAL: {
      pt: 'Produto',
      es: 'Producto',
      en: 'Product'
    },
    CATALOGO_COMPLETO: {
      pt: 'Catálogo Completo',
      es: 'Catálogo Completo',
      en: 'Complete Catalog'
    },
    MULTIPLOS_LOTES: {
      pt: 'Múltiplos Lotes',
      es: 'Múltiples Lotes',
      en: 'Multiple Batches'
    }
  };
  
  return types[linkType]?.[locale] || linkType;
}

/**
 * Valida se a mensagem do WhatsApp está dentro do limite
 */
export function validateWhatsAppMessage(message: string): {
  valid: boolean;
  length: number;
  maxLength: number;
  warning: boolean;
} {
  const length = message.length;
  
  return {
    valid: length <= WHATSAPP_MAX_LENGTH,
    length,
    maxLength: WHATSAPP_MAX_LENGTH,
    warning: length > WHATSAPP_WARNING_LENGTH && length <= WHATSAPP_MAX_LENGTH
  };
}

/**
 * Prepara IDs dos links para envio por email
 * (A API já formata o HTML do email)
 */
export function prepareEmailLinks(salesLinkIds: string[]): string[] {
  return salesLinkIds;
}

/**
 * Gera URL do WhatsApp com mensagem
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  // Remove caracteres não numéricos do telefone
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Adiciona código do país se não tiver (Brasil = 55)
  const phoneWithCountry = cleanPhone.length === 11 || cleanPhone.length === 10
    ? `55${cleanPhone}`
    : cleanPhone;
  
  // Encode da mensagem para URL
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`;
}

/**
 * Filtra links ativos e não expirados
 */
export function filterActiveLinks(links: SalesLink[]): SalesLink[] {
  const now = new Date();
  
  return links.filter(link => {
    // Link deve estar ativo
    if (!link.isActive) return false;
    
    // Se tem data de expiração, verificar se não expirou
    if (link.expiresAt) {
      const expiresAt = new Date(link.expiresAt);
      if (expiresAt < now) return false;
    }
    
    return true;
  });
}

/**
 * Agrupa links por tipo
 */
export function groupLinksByType(links: SalesLink[]): Record<string, SalesLink[]> {
  return links.reduce((acc, link) => {
    const type = link.linkType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(link);
    return acc;
  }, {} as Record<string, SalesLink[]>);
}
