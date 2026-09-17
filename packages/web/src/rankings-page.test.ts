import { describe, expect, it, vi } from 'vitest';

const SKELETON = `
<input id="header-search" /><button id="theme-toggle"></button>
<span id="rk-division"></span><p id="rk-meta"></p>
<input id="find-team" /><select id="region-filter"><option value="all">All regions</option></select>
<button id="hide-provisional"></button>
<button id="sort-rank"><span id="sort-arrow"></span></button>
<button id="tab-standings"></button><button id="tab-connectivity"></button>
<div id="standings-view"><table><tbody id="rankings-body"></tbody></table></div>
<div id="connectivity-view"><div id="components-list"></div></div>
<div id="team-view"><a id="back-link"></a><h2 id="team-name"></h2><div id="team-summary"></div>
<table><tbody id="team-games-body"></tbody></table></div>`;

function rowCount(): number {
  return document.querySelectorAll('#rankings-body tr').length;
}

describe('rankings page wiring', () => {
  it('renders, filters, toggles provisional, and opens team detail', async () => {
    document.body.innerHTML = SKELETON;
    await import('./rankings.js');
    // Page boots asynchronously (runtime snapshot load with fixture fallback).
    await vi.waitFor(() => expect(rowCount()).toBe(7));

    expect(rowCount()).toBe(7);

    const find = document.getElementById('find-team') as HTMLInputElement;
    find.value = 'lynx';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    expect(rowCount()).toBe(1);

    find.value = '';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    expect(rowCount()).toBe(7);

    (document.getElementById('hide-provisional') as HTMLButtonElement).click();
    expect(rowCount()).toBeLessThan(7);

    (document.getElementById('hide-provisional') as HTMLButtonElement).click();
    const first = document.querySelector('#rankings-body tr') as HTMLElement;
    first.click();
    expect(document.getElementById('team-view')!.classList.contains('hidden')).toBe(false);
    expect((document.getElementById('team-name') as HTMLElement).textContent).not.toBe('');
  });
});
