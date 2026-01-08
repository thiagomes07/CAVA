/**
 * Centralized truncation limits configuration
 * 
 * These limits are determined by visual analysis of the UI components
 * and their typical content types. Each limit is optimized for the
 * specific context where it will be used.
 */

export const TRUNCATION_LIMITS = {
  // ============================================
  // NAMES & IDENTIFIERS
  // ============================================
  
  /**
   * User names in compact contexts (table cells, cards)
   * Typical: "João da Silva Santos" → "João da Silva..."
   */
  USER_NAME_SHORT: 20,
  
  /**
   * User names in normal contexts (headers, modals)
   * Allows for longer names like "Maria Fernanda dos Santos"
   */
  USER_NAME: 30,
  
  /**
   * Customer names in tables and lists
   */
  CUSTOMER_NAME: 25,
  
  /**
   * Seller/Broker names in table cells
   */
  SELLER_NAME: 22,
  
  // ============================================
  // PRODUCT & BATCH RELATED
  // ============================================
  
  /**
   * Product names in cards and compact views
   * E.g., "Granito Branco Siena Especial" → "Granito Branco Siena..."
   */
  PRODUCT_NAME_SHORT: 25,
  
  /**
   * Product names in table cells and lists
   */
  PRODUCT_NAME: 35,
  
  /**
   * Batch codes - usually short, but set limit for safety
   * E.g., "BCH-2024-001234" → typically fits
   */
  BATCH_CODE: 18,
  
  /**
   * Material type names
   */
  MATERIAL_NAME: 20,
  
  // ============================================
  // TITLES & HEADINGS
  // ============================================
  
  /**
   * Link titles in tables
   */
  LINK_TITLE: 30,
  
  /**
   * Page titles/headings - more space allowed
   */
  PAGE_TITLE: 50,
  
  /**
   * Card titles
   */
  CARD_TITLE: 28,
  
  /**
   * Modal titles
   */
  MODAL_TITLE: 40,
  
  // ============================================
  // DESCRIPTIONS & MESSAGES
  // ============================================
  
  /**
   * Short descriptions in cards
   */
  DESCRIPTION_SHORT: 60,
  
  /**
   * Descriptions in table expanded rows
   */
  DESCRIPTION_TABLE: 80,
  
  /**
   * Notes and observations
   */
  NOTES: 100,
  
  /**
   * Lead messages in table preview
   */
  MESSAGE_PREVIEW: 50,
  
  /**
   * Custom messages on public pages
   */
  CUSTOM_MESSAGE: 200,
  
  // ============================================
  // CONTACT INFORMATION
  // ============================================
  
  /**
   * Email addresses in table cells
   */
  EMAIL: 30,
  
  /**
   * Phone numbers - usually formatted, but set limit
   */
  PHONE: 18,
  
  /**
   * Generic contact info (could be email or phone)
   */
  CONTACT: 30,
  
  // ============================================
  // URLS & SLUGS
  // ============================================
  
  /**
   * URL slugs displayed in UI
   */
  SLUG: 25,
  
  /**
   * Full URLs when displayed
   */
  URL: 50,
  
  // ============================================
  // NAVIGATION & SIDEBAR
  // ============================================
  
  /**
   * Menu item labels in sidebar
   */
  MENU_LABEL: 20,
  
  /**
   * User name in sidebar profile section
   */
  SIDEBAR_USER_NAME: 18,
  
  // ============================================
  // BADGES & LABELS
  // ============================================
  
  /**
   * Status badge text
   */
  BADGE: 15,
  
  /**
   * Category/tag labels
   */
  TAG: 20,
  
  // ============================================
  // LOCATION & ORIGIN
  // ============================================
  
  /**
   * Quarry/origin names
   */
  QUARRY_NAME: 30,
  
  // ============================================
  // SPECIAL CONTEXTS
  // ============================================
  
  /**
   * Select dropdown option text
   */
  SELECT_OPTION: 40,
  
  /**
   * Tooltip/title attribute - can be longer since it's supplementary
   */
  TOOLTIP: 100,
  
  /**
   * SKU codes
   */
  SKU: 15,
} as const;

/**
 * Type for the truncation limit keys
 */
export type TruncationLimitKey = keyof typeof TRUNCATION_LIMITS;

/**
 * Helper to get a truncation limit with fallback
 */
export function getTruncationLimit(
  key: TruncationLimitKey,
  fallback?: number
): number {
  return TRUNCATION_LIMITS[key] ?? fallback ?? 30;
}
