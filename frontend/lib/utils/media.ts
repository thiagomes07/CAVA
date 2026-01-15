export const isPlaceholderUrl = (url?: string | null) => {
  if (!url) return false;
  return url.includes('via.placeholder.com');
};
