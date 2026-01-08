/**
 * Text truncation utilities for handling long backend text consistently
 * 
 * These utilities provide programmatic text truncation with precise character
 * control, avoiding CSS-based solutions that can behave inconsistently.
 */

/**
 * Truncates text to a specified character limit with ellipsis suffix
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum number of characters before truncation
 * @param suffix - The suffix to append when truncated (default: '...')
 * @returns Truncated text with suffix, or original text if shorter than maxLength
 * 
 * @example
 * truncateText('Hello World', 5) // Returns 'Hello...'
 * truncateText('Hi', 10) // Returns 'Hi'
 * truncateText(null, 10) // Returns ''
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number,
  suffix: string = '...'
): string {
  // Handle null/undefined
  if (!text) return '';
  
  // No truncation needed
  if (text.length <= maxLength) return text;
  
  // Truncate and append suffix
  return text.slice(0, maxLength).trimEnd() + suffix;
}

/**
 * Truncates text at word boundaries to avoid cutting words in half
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum number of characters before truncation
 * @param suffix - The suffix to append when truncated (default: '...')
 * @returns Truncated text ending at a complete word with suffix
 * 
 * @example
 * truncateTextByWord('Hello World Example', 12) // Returns 'Hello World...'
 */
export function truncateTextByWord(
  text: string | null | undefined,
  maxLength: number,
  suffix: string = '...'
): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  // Find the last space within the limit
  const truncated = text.slice(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  // If no space found, fall back to character truncation
  if (lastSpaceIndex === -1) {
    return truncated.trimEnd() + suffix;
  }
  
  return truncated.slice(0, lastSpaceIndex).trimEnd() + suffix;
}

/**
 * Truncates text for display in a single line context (titles, names, etc.)
 * Removes line breaks and extra whitespace before truncating
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum number of characters
 * @returns Single-line truncated text
 */
export function truncateSingleLine(
  text: string | null | undefined,
  maxLength: number
): string {
  if (!text) return '';
  
  // Normalize whitespace and remove line breaks
  const normalized = text.replace(/\s+/g, ' ').trim();
  
  return truncateText(normalized, maxLength);
}

/**
 * Safely truncates text that may contain special characters
 * Useful for user-generated content that might have unusual formatting
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum number of characters
 * @returns Safely truncated text
 */
export function truncateSafe(
  text: string | null | undefined,
  maxLength: number
): string {
  if (!text) return '';
  
  // Remove any zero-width characters and normalize
  const cleaned = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width chars
    .replace(/\s+/g, ' ')
    .trim();
  
  return truncateText(cleaned, maxLength);
}

/**
 * Type-safe wrapper that ensures the result is always a string
 * Useful when you need guaranteed string output for React rendering
 */
export function truncateOrEmpty(
  text: unknown,
  maxLength: number
): string {
  if (typeof text !== 'string') return '';
  return truncateText(text, maxLength);
}
