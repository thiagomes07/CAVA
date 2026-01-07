export function formatCurrency(value: number): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  } catch (error) {
    // Fallback para ambientes que não suportam o locale específico
    const safeValue = Number.isFinite(value) ? value.toFixed(2) : '0.00';
    return `R$ ${safeValue}`;
  }
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function formatCurrencyInput(value: string): string {
  const number = parseCurrency(value);
  return formatCurrency(number);
}