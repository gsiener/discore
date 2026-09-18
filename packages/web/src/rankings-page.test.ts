import { describe, expect, it, vi } from 'vitest';

const SKELETON = `
<input id="header-search" /><button id="theme-toggle"></button>
<span id="rk-division"></span><p id="rk-meta"></p>
<input id="find-team" />
<button id="hide-provisional"></button>
<button id="sort-rank"><span id="sort-arrow"></span></button>
<button id="tab-standings"></button><button id="tab-connectivity"></button>
<div class="rk-tabs"><button id="tb-rankings"></button><button id="tb-teams"></button><button id="tb-tournaments"></button></div>
<div id="standings-viewtabs"></div>
<div id="standings-view"><table><tbody id="rankings-body"></tbody></table></div>
<div id="connectivity-view"><div id="components-list"></div></div>
<div id="teams-view"><table><tbody id="teams-body"></tbody></table></div>
<div id="tournaments-view"><table><tbody id="tournaments-body"></tbody></table></div>
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
    // No regions in HS data: no region filter, no Region column.
    expect(document.getElementById('region-filter')).toBeNull();
    // 10 columns: #, Team, Status, Rating, Δ, Trend, Record, SoS, GP, Conf.
    expect(document.querySelector('#rankings-body tr')!.childElementCount).toBe(10);

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
    // Albany's games span Oct 4–5: newest first, with dates visible.
    const gameRows = [...document.querySelectorAll('#team-games-body tr')];
    const dates = gameRows.map((r) => (r.children[1] as HTMLElement).textContent);
    expect(dates[0]).toContain('Oct 5');
    expect(dates[dates.length - 1]).toContain('Oct 4');
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('switches to Teams and Tournaments tabs', async () => {
    await vi.waitFor(() => expect(rowCount()).toBe(7));

    (document.getElementById('tb-teams') as HTMLButtonElement).click();
    expect(document.getElementById('teams-view')!.classList.contains('hidden')).toBe(false);
    const teamRows = document.querySelectorAll('#teams-body tr');
    expect(teamRows.length).toBe(7);
    expect(teamRows[0].textContent).toMatch(/Albany Cougars/);

    (teamRows[1] as HTMLElement).click();
    expect(document.getElementById('team-view')!.classList.contains('hidden')).toBe(false);
    (document.getElementById('back-link') as HTMLElement).click();
    expect(document.getElementById('teams-view')!.classList.contains('hidden')).toBe(false);

    (document.getElementById('tb-tournaments') as HTMLButtonElement).click();
    expect(document.getElementById('tournaments-view')!.classList.contains('hidden')).toBe(false);
    const eventRows = document.querySelectorAll('#tournaments-body tr');
    expect(eventRows.length).toBe(2);
    expect(eventRows[0].textContent).toMatch(/Seattle Invite/);
  });
});
