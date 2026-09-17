/**
 * Paths served without HTTP Basic Auth. Covers the public rankings
 * experience: legacy Drive-generated pages, the app rankings/simulate/lab
 * pages, and the static assets those pages need (hashed /assets bundles,
 * shared stylesheets, favicon). Everything else stays behind auth.
 */

const EXACT_PUBLIC = new Set([
  '/rankings',
  '/rankings.html',
  '/simulate.html',
  '/lab.html',
  '/style.css',
  '/rankings-style.css',
  '/simulate-style.css',
  '/favicon.svg',
]);

const PUBLIC_PREFIXES = ['/rankings/', '/assets/'];

export function isPublicPath(pathname: string): boolean {
  if (EXACT_PUBLIC.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}
