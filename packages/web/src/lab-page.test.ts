import { beforeAll, describe, expect, it, vi } from 'vitest';

const SKELETON = `
<div class="rk-segmented"><button class="rk-seg" data-division="boys"></button><button class="rk-seg" data-division="girls"></button></div>
<p><span id="lab-division"></span><span id="lab-pill"></span></p>
<input id="topk-k" value="3" /><button id="topk-run"></button>
<table><tbody id="topk-results"></tbody></table>
<input id="bl-gap" value="600" />
<select id="bl-margin"><option value="standard">standard</option><option value="any">any</option></select>
<input id="bl-onesided" type="checkbox" />
<button id="bl-run"></button>
<div id="bl-summary"></div>
<table><tbody id="bl-results"></tbody></table>`;

beforeAll(async () => {
  document.body.innerHTML = SKELETON;
  await import('./lab.js');
  await vi.waitFor(() => {
    expect(document.querySelectorAll('#topk-results tr').length).toBeGreaterThan(0);
  });
});

describe('lab page wiring', () => {
  it('runs Top-K recompute on top of converged ratings', () => {
    (document.getElementById('topk-run') as HTMLButtonElement).click();
    const rows = document.querySelectorAll('#topk-results tr');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].textContent).toMatch(/Albany Cougars/);
  });

  it('runs configurable blowout filter and reports ignored count', () => {
    (document.getElementById('bl-run') as HTMLButtonElement).click();
    const summary = document.getElementById('bl-summary')!.textContent ?? '';
    expect(summary).toMatch(/ignored/i);
    expect(document.querySelectorAll('#bl-results tr').length).toBeGreaterThan(0);

    // "Wins can never hurt you": gap 0, any margin, one-sided
    (document.getElementById('bl-gap') as HTMLInputElement).value = '0';
    (document.getElementById('bl-margin') as HTMLSelectElement).value = 'any';
    (document.getElementById('bl-onesided') as HTMLInputElement).checked = true;
    (document.getElementById('bl-run') as HTMLButtonElement).click();
    const summary2 = document.getElementById('bl-summary')!.textContent ?? '';
    expect(summary2).toMatch(/ignored/i);
  });
});
