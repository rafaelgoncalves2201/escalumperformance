const BACKEND_URL = import.meta.env.VITE_API_URL as string;

export function resolveImageUrl(url?: string | null | undefined) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}
