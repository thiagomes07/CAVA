'use client';

import { useState, useEffect, useCallback } from 'react';
import { PriceUnit } from '@/lib/types';

const STORAGE_KEY = 'cava_preferred_price_unit';
const M2_TO_FT2_FACTOR = 10.76391042;

interface UsePriceUnitReturn {
  priceUnit: PriceUnit;
  setPriceUnit: (unit: PriceUnit) => void;
  togglePriceUnit: () => void;
  convertPrice: (price: number, fromUnit: PriceUnit) => number;
  formatPrice: (price: number, fromUnit: PriceUnit) => string;
  unitLabel: string;
  unitSymbol: string;
}

/**
 * Hook para gerenciar preferência de unidade de preço (M² ou FT²)
 * Persiste a preferência no localStorage
 */
export function usePriceUnit(): UsePriceUnitReturn {
  const [priceUnit, setPriceUnitState] = useState<PriceUnit>('M2');
  const [isHydrated, setIsHydrated] = useState(false);

  // Carregar preferência do localStorage após hidratação
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'M2' || stored === 'FT2') {
      setPriceUnitState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Salvar preferência quando mudar
  const setPriceUnit = useCallback((unit: PriceUnit) => {
    setPriceUnitState(unit);
    localStorage.setItem(STORAGE_KEY, unit);
  }, []);

  // Alternar entre unidades
  const togglePriceUnit = useCallback(() => {
    setPriceUnit(priceUnit === 'M2' ? 'FT2' : 'M2');
  }, [priceUnit, setPriceUnit]);

  /**
   * Converte preço da unidade original para a unidade preferida
   * Se fromUnit === priceUnit, retorna o valor sem conversão
   * 
   * Fórmulas:
   * - M² → FT²: preço / 10.76391042 (dividir pois é preço por área menor)
   * - FT² → M²: preço * 10.76391042 (multiplicar pois é preço por área maior)
   */
  const convertPrice = useCallback(
    (price: number, fromUnit: PriceUnit): number => {
      if (fromUnit === priceUnit) {
        return price;
      }

      if (fromUnit === 'M2' && priceUnit === 'FT2') {
        // Preço/m² para Preço/ft² (1 m² = 10.76 ft², então preço/ft² = preço/m² ÷ 10.76)
        return price / M2_TO_FT2_FACTOR;
      }

      // FT2 → M2
      // Preço/ft² para Preço/m² (preço/m² = preço/ft² × 10.76)
      return price * M2_TO_FT2_FACTOR;
    },
    [priceUnit]
  );

  /**
   * Formata o preço convertido com símbolo da moeda e unidade
   */
  const formatPrice = useCallback(
    (price: number, fromUnit: PriceUnit): string => {
      const convertedPrice = convertPrice(price, fromUnit);
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(convertedPrice);

      return `${formatted}/${priceUnit === 'M2' ? 'm²' : 'ft²'}`;
    },
    [convertPrice, priceUnit]
  );

  // Labels amigáveis
  const unitLabel = priceUnit === 'M2' ? 'Metro quadrado' : 'Pé quadrado';
  const unitSymbol = priceUnit === 'M2' ? 'm²' : 'ft²';

  return {
    priceUnit: isHydrated ? priceUnit : 'M2',
    setPriceUnit,
    togglePriceUnit,
    convertPrice,
    formatPrice,
    unitLabel,
    unitSymbol,
  };
}

/**
 * Constantes exportadas para uso direto
 */
export const PRICE_UNIT_OPTIONS: { value: PriceUnit; label: string; symbol: string }[] = [
  { value: 'M2', label: 'Metro quadrado', symbol: 'm²' },
  { value: 'FT2', label: 'Pé quadrado', symbol: 'ft²' },
];

export const CONVERSION_FACTOR = M2_TO_FT2_FACTOR;
