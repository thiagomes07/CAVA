/**
 * Calculate total area in square meters
 * Formula: (height * width * quantity) / 10000
 * 
 * @param height - Height in centimeters
 * @param width - Width in centimeters
 * @param quantity - Number of slabs (default: 1)
 * @returns Area in square meters
 */
export function calculateArea(
  height: number,
  width: number,
  quantity: number = 1
): number {
  const area = (height * width * quantity) / 10000;
  if (!Number.isFinite(area) || area <= 0) {
    return 0;
  }
  return area;
}

/**
 * Calculate area per slab in square meters
 * 
 * @param height - Height in centimeters
 * @param width - Width in centimeters
 * @returns Area per slab in square meters
 */
export function calculateAreaPerSlab(height: number, width: number): number {
  const heightInMeters = height / 100;
  const widthInMeters = width / 100;
  const area = heightInMeters * widthInMeters;
  if (!Number.isFinite(area) || area <= 0) {
    return 0;
  }
  return area;
}
