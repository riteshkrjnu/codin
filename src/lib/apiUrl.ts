/** Public configuration only. Database credentials never belong in a VITE_ variable. */
export function resolveApiUrl(path: string, base = import.meta.env?.VITE_API_BASE_URL || '') {
  return base ? `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}` : path;
}
export const apiUrl = resolveApiUrl;
