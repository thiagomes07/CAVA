import type { PriceUnit } from '@/lib/types';

/**
 * Fator de conversão entre metros quadrados e pés quadrados
 * 1 m² = 10.76391042 ft²
 */
export const M2_TO_FT2_FACTOR = 10.76391042;
export const FT2_TO_M2_FACTOR = 1 / M2_TO_FT2_FACTOR;

/**
 * Converte preço de uma unidade para outra
 * @param price - Preço a ser convertido
 * @param from - Unidade de origem
 * @param to - Unidade de destino
 * @returns Preço convertido
 */
export function convertPriceUnit(price: number, from: PriceUnit, to: PriceUnit): number {
  if (from === to) return price;
  
  // Preço por M2 é maior que preço por FT2 (área maior = preço menor por unidade)
  // Para converter: preço/m² → preço/ft²: dividir pelo fator
  // Para converter: preço/ft² → preço/m²: multiplicar pelo fator
  if (from === 'M2' && to === 'FT2') {
    return price / M2_TO_FT2_FACTOR;
  }
  
  if (from === 'FT2' && to === 'M2') {
    return price * M2_TO_FT2_FACTOR;
  }
  
  return price;
}

/**
 * Converte área de uma unidade para outra
 * @param area - Área a ser convertida
 * @param from - Unidade de origem
 * @param to - Unidade de destino
 * @returns Área convertida
 */
export function convertAreaUnit(area: number, from: PriceUnit, to: PriceUnit): number {
  if (from === to) return area;
  
  if (from === 'M2' && to === 'FT2') {
    return area * M2_TO_FT2_FACTOR;
  }
  
  if (from === 'FT2' && to === 'M2') {
    return area * FT2_TO_M2_FACTOR;
  }
  
  return area;
}

/**
 * Formata preço com unidade de área
 * @param price - Preço por unidade de área
 * @param unit - Unidade de área (M2 ou FT2)
 * @param locale - Locale para formatação (padrão: pt-BR)
 * @param currency - Moeda para formatação (padrão: BRL)
 * @returns String formatada como "R$ 100,00/m²"
 */
export function formatPricePerUnit(
  price: number,
  unit: PriceUnit,
  locale: string = 'pt-BR',
  currency: string = 'BRL'
): string {
  const formattedPrice = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
  
  const unitLabel = unit === 'M2' ? 'm²' : 'ft²';
  return `${formattedPrice}/${unitLabel}`;
}

/**
 * Retorna o label da unidade de área
 * @param unit - Unidade de área
 * @returns Label legível (m² ou ft²)
 */
export function getPriceUnitLabel(unit: PriceUnit): string {
  return unit === 'M2' ? 'm²' : 'ft²';
}

/**
 * Calcula o preço total do lote baseado na área total e preço por unidade
 * @param totalArea - Área total em m² (sempre armazenada em m²)
 * @param pricePerUnit - Preço por unidade de área
 * @param priceUnit - Unidade do preço
 * @returns Preço total do lote
 */
export function calculateTotalBatchPrice(
  totalArea: number,
  pricePerUnit: number,
  priceUnit: PriceUnit
): number {
  // A área é sempre armazenada em m²
  // Se o preço está em ft², convertemos a área para ft² antes de multiplicar
  if (priceUnit === 'FT2') {
    const areaInFt2 = totalArea * M2_TO_FT2_FACTOR;
    return areaInFt2 * pricePerUnit;
  }
  
  // Se o preço está em m², multiplicamos diretamente
  return totalArea * pricePerUnit;
}

/**
 * Calcula o preço para uma quantidade específica de chapas
 * @param slabArea - Área de uma chapa em m²
 * @param quantitySlabs - Quantidade de chapas
 * @param pricePerUnit - Preço por unidade de área
 * @param priceUnit - Unidade do preço
 * @returns Preço total para as chapas especificadas
 */
export function calculatePriceForSlabs(
  slabArea: number,
  quantitySlabs: number,
  pricePerUnit: number,
  priceUnit: PriceUnit
): number {
  const totalArea = slabArea * quantitySlabs;
  return calculateTotalBatchPrice(totalArea, pricePerUnit, priceUnit);
}

/**
 * Calcula a área de uma chapa individual
 * @param height - Altura em metros
 * @param width - Largura em metros
 * @returns Área em m²
 */
export function calculateSlabArea(height: number, width: number): number {
  return height * width;
}

/**
 * Formata área com unidade
 * @param area - Área a ser formatada
 * @param unit - Unidade de área (padrão: M2)
 * @param locale - Locale para formatação
 * @returns String formatada como "10,50 m²"
 */
export function formatArea(
  area: number,
  unit: PriceUnit = 'M2',
  locale: string = 'pt-BR'
): string {
  // Converter se necessário
  const displayArea = unit === 'FT2' ? area * M2_TO_FT2_FACTOR : area;
  
  const formattedArea = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(displayArea);
  
  const unitLabel = unit === 'M2' ? 'm²' : 'ft²';
  return `${formattedArea} ${unitLabel}`;
}

/**
 * Verifica se há chapas disponíveis em um lote
 * @param availableSlabs - Número de chapas disponíveis
 * @returns true se houver chapas disponíveis
 */
export function hasAvailableSlabs(availableSlabs: number): boolean {
  return availableSlabs > 0;
}

/**
 * Calcula a porcentagem de chapas disponíveis
 * @param availableSlabs - Número de chapas disponíveis
 * @param totalSlabs - Número total de chapas
 * @returns Porcentagem de disponibilidade (0-100)
 */
export function calculateAvailabilityPercentage(
  availableSlabs: number,
  totalSlabs: number
): number {
  if (totalSlabs === 0) return 0;
  return (availableSlabs / totalSlabs) * 100;
}
