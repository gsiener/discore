import { describe, expect, it, vi } from 'vitest';

const SKELETON = `
<input id="header-search" />
<button id="theme-toggle"></button>
<p id="rk-meta"></p>
<select id="season-select"></select>
<button id="hide-provisional"></button>
<button id="sort-rank"><span id="sort-arrow"></span></button>
<button id="tab-standings"></button><button id="tab-connectivity"></button>
<div class="rk-tabs"><button id="tb-rankings"></button><button id="tb-teams"></button><button id="tb-tournaments"></button></div>
<div id="standings-viewtabs"></div>
<div id="standings-view"><table><tbody id="rankings-body"></tbody></table></div>
<div id="connectivity-view">
  <div id="connectivity-summary"></div>
  <div class="rk-network-shell">
    <svg id="connectivity-graph"><title></title><desc></desc></svg>
    <div id="connectivity-tooltip" class="hidden"></div>
  </div>
  <section id="connectivity-islands"></section>
</div>
<div id="teams-view"><table><tbody id="teams-body"></tbody></table></div>
<div id="tournaments-view"><table><tbody id="tournaments-body"></tbody></table></div>
<div id="team-view"><a id="back-link" class="rk-back-link"></a><h2 id="team-name"></h2><div id="team-summary"></div>
<div id="team-games-body" class="rk-team-events"></div></div>`;

function rowCount(): number {
  return document.querySelectorAll('#rankings-body tr').length;
}

describe('rankings page wiring', () => {
  it('renders, filters, toggles provisional, and opens team detail', async () => {
    document.body.innerHTML = SKELETON;
    await import('./rankings.js');
    // Page boots asynchronously (runtime snapshot load with fixture fallback).
    // Provisional teams are hidden by default, so only ranked teams render.
    await vi.waitFor(() => expect(rowCount()).toBe(2));

    expect(rowCount()).toBe(2);
    // No regions in HS data: no region filter, no Region column.
    expect(document.getElementById('region-filter')).toBeNull();
    // 10 columns: #, Team, Status, Rating, Δ, Trend, Record, SoS, GP, Conf.
    expect(document.querySelector('#rankings-body tr')!.childElementCount).toBe(10);
    expect(
      [...document.querySelectorAll('#rankings-body tr')].map((row) => Number(row.children[7].textContent)),
    ).toEqual([33, 50]);

    // A single search input filters the list; no duplicate find box.
    expect(document.getElementById('find-team')).toBeNull();
    const find = document.getElementById('header-search') as HTMLInputElement;
    find.value = 'albany';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    expect(rowCount()).toBe(1);

    find.value = '';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    expect(rowCount()).toBe(2);

    // Provisional teams are hidden by default; the toggle offers to show them.
    const provisionalToggle = document.getElementById('hide-provisional') as HTMLButtonElement;
    expect(provisionalToggle.getAttribute('aria-pressed')).toBe('true');
    expect(provisionalToggle.textContent).toBe('Show provisional');

    provisionalToggle.click();
    expect(rowCount()).toBe(7);
    expect(provisionalToggle.textContent).toBe('Hide provisional');

    provisionalToggle.click();
    expect(rowCount()).toBeLessThan(7);
    const first = document.querySelector('#rankings-body tr') as HTMLElement;
    first.click();
    expect(document.getElementById('team-view')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('tb-teams')!.classList.contains('rk-tab-active')).toBe(true);
    expect(document.getElementById('back-link')!.classList.contains('rk-back-link')).toBe(true);
    expect(document.getElementById('hide-provisional')!.classList.contains('hidden')).toBe(true);
    expect((document.getElementById('team-name') as HTMLElement).textContent).not.toBe('');
    // Permalink reflects the open team.
    expect(window.location.search).toContain('team=albany');
    // Albany's games group into one Seattle Invite card, newest first.
    const cards = [...document.querySelectorAll('#team-games-body .rk-team-event')];
    expect(cards.length).toBeGreaterThan(0);
    const head = cards[0].querySelector('.rk-team-event-head') as HTMLElement;
    expect(head.textContent).toMatch(/Seattle Invite/);
    expect(head.querySelector('.rk-team-event-record')?.textContent).toMatch(/7–0/);
    expect(head.querySelector('.rk-team-event-dates')?.textContent).toMatch(/Oct/);
    // Titles link to the event source when we have its URL.
    expect(head.querySelector('.rk-team-event-link')?.getAttribute('href')).toBe(
      'https://example.com/seattle',
    );
    const unleashed = cards.find((c) =>
      c.querySelector('.rk-team-event-head')?.textContent?.match(/Fall League/),
    );
    if (unleashed) expect(unleashed.querySelector('.rk-team-event-link')).toBeNull();
    const gameRows = [...cards[0].querySelectorAll('.rk-team-game')];
    expect(gameRows).toHaveLength(7);
    // Game rows carry outcome classes and status-colored details.
    const firstGame = gameRows[0];
    expect(firstGame.className).toMatch(/rk-team-game-(win|loss|tie|ignored)/);
    expect(firstGame.querySelector('.rk-team-game-dot')).not.toBeNull();
    expect(firstGame.querySelector('.rk-team-game-opp')).not.toBeNull();
    expect(firstGame.querySelector('.rk-team-game-score')).not.toBeNull();
    expect(firstGame.querySelector('.rk-team-game-meta')).not.toBeNull();
    const dates = gameRows.map((r) => r.querySelector('.rk-team-game-meta')?.textContent ?? '');
    expect(dates[0]).toContain('Oct 5');
    expect(dates[dates.length - 1]).toContain('Oct 4');
    // Back to the list clears the team slug.
    (document.getElementById('back-link') as HTMLElement).click();
    expect(window.location.search).not.toContain('team=');
    expect(document.getElementById('hide-provisional')!.classList.contains('hidden')).toBe(false);
  });

  it('deep-links to a team from the URL', async () => {
    vi.resetModules();
    document.body.innerHTML = SKELETON;
    window.history.replaceState({}, '', '/standings.html?division=boys&team=lynx');
    await import('./rankings.js');
    await vi.waitFor(() =>
      expect(document.getElementById('team-view')!.classList.contains('hidden')).toBe(false),
    );
    expect(document.getElementById('hide-provisional')!.classList.contains('hidden')).toBe(true);
    expect((document.getElementById('team-name') as HTMLElement).textContent).toBe('Lincoln Lynx');
  });

  it('switches to Teams and Tournaments tabs', async () => {
    await vi.waitFor(() => expect(rowCount()).toBe(2));

    (document.getElementById('tb-teams') as HTMLButtonElement).click();
    expect(document.getElementById('teams-view')!.classList.contains('hidden')).toBe(false);
    const teamRows = document.querySelectorAll('#teams-body tr');
    expect(teamRows.length).toBe(2);
    expect(teamRows[0].textContent).toMatch(/Albany Cougars/);
    expect([...teamRows].map((row) => Number(row.children[4].textContent))).toEqual([33, 50]);

    (teamRows[1] as HTMLElement).click();
    expect(document.getElementById('team-view')!.classList.contains('hidden')).toBe(false);
    (document.getElementById('back-link') as HTMLElement).click();
    expect(document.getElementById('teams-view')!.classList.contains('hidden')).toBe(false);

    (document.getElementById('tb-tournaments') as HTMLButtonElement).click();
    expect(document.getElementById('tournaments-view')!.classList.contains('hidden')).toBe(false);
    expect(window.location.search).toContain('view=tournaments');
    const eventSections = document.querySelectorAll('#tournaments-body .rk-tournament-section');
    expect(eventSections.length).toBe(2);
    expect(eventSections[0].textContent).toMatch(/Seattle Invite/);
    expect(eventSections[0].querySelector('.rk-tournament-header')).not.toBeNull();
    expect(eventSections[0].querySelector('.rk-tournament-counts')?.textContent).toMatch(/12 games/);
    expect(eventSections[0].querySelector('.rk-tournament-date')).not.toBeNull();
    expect(eventSections[0].querySelector('.rk-tournament-header h3 a')?.getAttribute('href')).toBe(
      'https://example.com/seattle',
    );

    (document.getElementById('tb-teams') as HTMLButtonElement).click();
    expect(window.location.search).toContain('view=teams');
    (document.getElementById('tb-rankings') as HTMLButtonElement).click();
    expect(window.location.search).not.toContain('view=');
  });

  it('labels the fixture fallback with the requested season', async () => {
    await vi.waitFor(() => expect(rowCount()).toBe(2));
    // No published 2026-27 snapshot in the test env: honest fallback label.
    expect(document.getElementById('rk-meta')!.textContent).toMatch(/2026-27.*no published data yet/);
  });

  it('lists both seasons and switches season via the selector', async () => {
    await vi.waitFor(() => expect(rowCount()).toBe(2));

    const select = document.getElementById('season-select') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['2025-26', '2026-27']);
    expect(select.value).toBe('2026-27');

    select.value = '2025-26';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(window.location.search).toContain('season=2025-26'));
  });

  it('deep-links to list views from the URL', async () => {
    vi.resetModules();
    document.body.innerHTML = SKELETON;
    window.history.replaceState({}, '', '/standings.html?division=boys&view=tournaments');
    await import('./rankings.js');
    await vi.waitFor(() =>
      expect(document.getElementById('tournaments-view')!.classList.contains('hidden')).toBe(false),
    );
    expect(document.querySelectorAll('#tournaments-body .rk-tournament-section').length).toBe(2);
  });

  it('renders connectivity metrics, graph nodes, and disconnected islands', async () => {
    vi.resetModules();
    document.body.innerHTML = SKELETON;
    window.history.replaceState({}, '', '/standings.html?division=boys&view=connectivity');
    await import('./rankings.js');
    await vi.waitFor(() =>
      expect(document.querySelectorAll('#connectivity-graph .rk-network-node').length).toBeGreaterThan(0),
    );

    expect(document.querySelectorAll('.rk-connectivity-metric')).toHaveLength(5);
    expect(document.getElementById('connectivity-summary')!.textContent).toMatch(/Connected groups/);
    expect(document.getElementById('connectivity-summary')!.textContent).toMatch(/Counted matchups/);
    expect(document.querySelectorAll('#connectivity-graph .rk-network-edges line').length).toBeGreaterThan(0);
    expect(document.getElementById('connectivity-islands')!.textContent).toMatch(/One connected network/);

    const node = document.querySelector('#connectivity-graph .rk-network-node') as SVGCircleElement;
    node.dispatchEvent(new Event('mouseenter'));
    expect(document.getElementById('connectivity-tooltip')!.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('connectivity-tooltip')!.textContent).toMatch(/rating/);

    const hiddenNodeCount = document.querySelectorAll('#connectivity-graph .rk-network-node').length;
    (document.getElementById('hide-provisional') as HTMLButtonElement).click();
    expect(document.querySelectorAll('#connectivity-graph .rk-network-node').length).toBeGreaterThan(hiddenNodeCount);
  });
});
