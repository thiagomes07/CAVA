'use client';

import { truncateText, truncateTextByWord } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS, type TruncationLimitKey } from '@/lib/config/truncationLimits';

interface TruncatedTextProps {
  /**
   * The text to display and potentially truncate
   */
  text: string | null | undefined;
  
  /**
   * Maximum character length. Can be a number or a key from TRUNCATION_LIMITS
   */
  maxLength: number | TruncationLimitKey;
  
  /**
   * HTML element to render as (default: 'span')
   */
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  
  /**
   * Whether to truncate at word boundaries (default: false)
   */
  byWord?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether to show native tooltip with full text on hover (default: true)
   */
  showTooltip?: boolean;
}

/**
 * TruncatedText component
 * 
 * A reusable component for displaying truncated text with automatic tooltip.
 * Uses JavaScript-based truncation for consistent behavior across browsers.
 * 
 * @example
 * <TruncatedText 
 *   text={user.name} 
 *   maxLength="USER_NAME" 
 *   className="font-medium" 
 * />
 * 
 * @example
 * <TruncatedText 
 *   text={product.description} 
 *   maxLength={50} 
 *   byWord 
 *   as="p" 
 * />
 */
export function TruncatedText({
  text,
  maxLength,
  as: Component = 'span',
  byWord = false,
  className,
  showTooltip = true,
}: TruncatedTextProps) {
  // Handle null/undefined text
  if (!text) {
    return <Component className={className}>-</Component>;
  }
  
  // Resolve maxLength if it's a key from TRUNCATION_LIMITS
  const limit = typeof maxLength === 'number' 
    ? maxLength 
    : TRUNCATION_LIMITS[maxLength];
  
  // Truncate the text
  const truncatedText = byWord 
    ? truncateTextByWord(text, limit)
    : truncateText(text, limit);
  
  // Check if text was actually truncated
  const wasTruncated = truncatedText !== text;
  
  return (
    <Component 
      className={className}
      title={showTooltip && wasTruncated ? text : undefined}
    >
      {truncatedText}
    </Component>
  );
}

/**
 * Hook for truncating text with memoization
 * Useful when you need the truncated value in multiple places
 */
export function useTruncatedText(
  text: string | null | undefined,
  maxLength: number | TruncationLimitKey,
  byWord = false
): { truncated: string; original: string; wasTruncated: boolean } {
  const original = text || '';
  
  const limit = typeof maxLength === 'number' 
    ? maxLength 
    : TRUNCATION_LIMITS[maxLength];
  
  const truncated = byWord 
    ? truncateTextByWord(original, limit)
    : truncateText(original, limit);
  
  return {
    truncated,
    original,
    wasTruncated: truncated !== original,
  };
}
