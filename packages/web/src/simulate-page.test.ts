import { beforeAll, describe, expect, it } from 'vitest';

const SKELETON = `
<select id="matchup-a"></select><select id="matchup-b"></select>
<select id="cap-select"><option value="15">15</option></select>
<div id="matchup-result"></div>
<select id="hypo-winner"></select><select id="hypo-loser"></select>
<input id="hypo-w" value="13" /><input id="hypo-l" value="11" />
<button id="hypo-add"></button><span id="scenario-error"></span>
<ul id="hypo-list"></ul><button id="scenario-reset"></button>
<table><tbody id="scenario-results"></tbody></table><p id="scenario-note"></p>
<table><tbody id="pool-a-games"></tbody></table><table><tbody id="pool-b-games"></tbody></table>
<table><tbody id="pool-a-standings"></tbody></table><table><tbody id="pool-b-standings"></tbody></table>
<ol id="cross-pool"></ol>
<div id="ko-sf1"></div><div id="ko-sf2"></div><div id="ko-final"></div>
<div id="champion"></div>`;

function opt(sel: HTMLSelectElement, value: string): void {
  sel.value = value;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeAll(async () => {
  document.body.innerHTML = SKELETON;
  await import('./simulate.js');
});

describe('simulate page wiring', () => {
  it('previews matchups', () => {
    const a = document.getElementById('matchup-a') as HTMLSelectElement;
    const b = document.getElementById('matchup-b') as HTMLSelectElement;
    expect(a.options.length).toBeGreaterThan(2);
    opt(a, 'albany');
    opt(b, 'lynx');
    const preview = document.getElementById('matchup-result')!.textContent ?? '';
    expect(preview).toMatch(/Albany Cougars/);
    expect(preview).toMatch(/%/);
    opt(b, 'albany');
    expect(document.getElementById('matchup-result')!.textContent ?? '').toMatch(/different/i);
  });

  it('runs what-if scenarios', () => {
    const hw = document.getElementById('hypo-winner') as HTMLSelectElement;
    const hl = document.getElementById('hypo-loser') as HTMLSelectElement;
    opt(hw, 'lynx');
    opt(hl, 'albany');
    (document.getElementById('hypo-w') as HTMLInputElement).value = '13';
    (document.getElementById('hypo-l') as HTMLInputElement).value = '10';
    (document.getElementById('hypo-add') as HTMLButtonElement).click();
    const rows = document.querySelectorAll('#scenario-results tr');
    expect(rows.length).toBeGreaterThan(0);
    expect([...rows].some((r) => r.textContent!.includes('Lincoln Lynx'))).toBe(true);
    (document.getElementById('scenario-reset') as HTMLButtonElement).click();
    expect(document.querySelectorAll('#hypo-list li').length).toBe(0);
  });

  it('seeds pools, prefills scores, and recomputes on edit', () => {
    expect(document.querySelectorAll('#pool-a-games tr').length).toBe(3);
    expect(document.querySelectorAll('#pool-b-games tr').length).toBe(3);
    expect(document.querySelectorAll('#cross-pool li').length).toBe(6);
    expect((document.getElementById('champion')!.textContent ?? '').length).toBeGreaterThan(0);

    // Flip a Pool A game to a heavy upset and confirm the standings leader changes
    const before = document.querySelector('#pool-a-standings tr')!.textContent;
    const firstGame = document.querySelector('#pool-a-games tr')!;
    const inputs = firstGame.querySelectorAll('input');
    const aName = (firstGame.querySelector('.tourney-team-a') as HTMLElement).textContent;
    inputs[0].value = '0';
    inputs[1].value = '13';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    const after = document.querySelector('#pool-a-standings tr')!.textContent;
    expect(after).not.toContain(aName);
    void before;
  });
});
