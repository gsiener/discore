/**
 * Paths served without HTTP Basic Auth. Covers the public rankings
 * experience: legacy Drive-generated pages, the app rankings/simulate/lab
 * pages, and the static assets those pages need (hashed /assets bundles,
 * shared stylesheets, favicon). Everything else stays behind auth.
 */

// Note: Cloudflare Pages strips .html (rankings.html -> 308 -> /rankings),
// so extensionless forms must be exempt too. /rankings itself is the legacy
// Drive-generated index, which is why the app page lives at /standings.
const EXACT_PUBLIC = new Set([
  '/rankings',
  '/standings',
  '/standings.html',
  '/simulate',
  '/simulate.html',
  '/lab',
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
