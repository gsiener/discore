/**
 * Site-wide HTTP Basic Auth for the Discore web app.
 *
 * Runs on every request to score.kcuda.org. Exempts /rankings/* so HS
 * rankings stay publicly linkable. Reads the shared password from the
 * SITE_PASSWORD environment variable; configure it via the CF Pages
 * dashboard (Settings → Environment variables) or:
 *
 *   wrangler pages secret put SITE_PASSWORD --project-name=scorebot
 *
 * The username is fixed ("tech") so all you need to share is the
 * password. Anyone who can see the URL plus knows the password gets in.
 */

interface Env {
  SITE_PASSWORD: string;
}

const USERNAME = 'tech';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { pathname } = new URL(context.request.url);

  if (pathname === '/rankings' || pathname.startsWith('/rankings/')) {
    return context.next();
  }

  const expected = context.env.SITE_PASSWORD;
  if (!expected) {
    // Misconfiguration: fail closed rather than serve unprotected
    return new Response('SITE_PASSWORD not configured', { status: 500 });
  }

  const header = context.request.headers.get('Authorization');
  const supplied = header ? decodeBasic(header) : null;
  if (supplied && supplied.user === USERNAME && timingSafeEqual(supplied.pass, expected)) {
    return context.next();
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Discore", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
};

function decodeBasic(header: string): { user: string; pass: string } | null {
  if (!header.startsWith('Basic ')) return null;
  try {
    const decoded = atob(header.slice(6));
    const sep = decoded.indexOf(':');
    if (sep < 0) return null;
    return { user: decoded.slice(0, sep), pass: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
