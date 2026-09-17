import { describe, expect, it } from 'vitest';
import { isPublicPath } from './publicPaths.js';

describe('isPublicPath', () => {
  it('keeps legacy rankings paths public', () => {
    expect(isPublicPath('/rankings')).toBe(true);
    expect(isPublicPath('/rankings/')).toBe(true);
    expect(isPublicPath('/rankings/boys.html')).toBe(true);
  });

  it('exposes the new app rankings pages', () => {
    expect(isPublicPath('/rankings.html')).toBe(true);
    expect(isPublicPath('/simulate.html')).toBe(true);
    expect(isPublicPath('/lab.html')).toBe(true);
  });

  it('exposes the static assets those pages need', () => {
    expect(isPublicPath('/assets/rankings-abc123.js')).toBe(true);
    expect(isPublicPath('/assets/style-def456.css')).toBe(true);
    expect(isPublicPath('/style.css')).toBe(true);
    expect(isPublicPath('/rankings-style.css')).toBe(true);
    expect(isPublicPath('/simulate-style.css')).toBe(true);
    expect(isPublicPath('/favicon.svg')).toBe(true);
  });

  it('keeps everything else behind auth', () => {
    for (const p of ['/', '/index.html', '/games.html', '/stats.html', '/api/games', '/assets', '/rankings-evil']) {
      expect(isPublicPath(p)).toBe(false);
    }
  });
});
