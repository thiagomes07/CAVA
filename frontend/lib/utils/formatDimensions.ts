export function formatDimensions(
  height: number,
  width: number,
  thickness: number
): string {
  return `${height} × ${width} × ${thickness} cm`;
}

export function formatArea(area: number): string {
  return `${area.toFixed(2)} m²`;
}

export function calculateTotalArea(
  height: number,
  width: number,
  quantitySlabs: number = 1
): number {
  const heightInMeters = height / 100;
  const widthInMeters = width / 100;
  const areaPerSlab = heightInMeters * widthInMeters;
  return areaPerSlab * quantitySlabs;
}