/**
 * Typeahead combobox layered over a <select>. The select stays the source of
 * truth (hidden, still read via .value); picking a suggestion sets its value
 * and fires 'change', so existing listeners keep working.
 */

const MAX_RESULTS = 8;
let comboN = 0;

export interface Typeahead {
  /** Re-read the select (after its options or value change in code). */
  sync(): void;
}

/** Word-prefix matches rank ahead of plain substring matches. */
function rank(name: string, q: string): number {
  const lower = name.toLowerCase();
  if (lower.startsWith(q)) return 0;
  if (lower.split(/[\s\-/]+/).some((w) => w.startsWith(q))) return 1;
  return lower.includes(q) ? 2 : -1;
}

export function attachTypeahead(sel: HTMLSelectElement): Typeahead {
  const listId = `rk-combo-list-${++comboN}`;
  const wrap = document.createElement('div');
  wrap.className = 'rk-combo';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'rk-input rk-combo-input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', listId);
  input.setAttribute('aria-label', sel.getAttribute('aria-label') ?? 'Team');
  const list = document.createElement('ul');
  list.id = listId;
  list.className = 'rk-combo-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  wrap.append(input, list);
  sel.after(wrap);
  sel.hidden = true;

  let matches: HTMLOptionElement[] = [];
  let active = -1;

  const selectedName = () => sel.selectedOptions[0]?.textContent ?? '';

  function close(): void {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function highlight(i: number): void {
    active = i;
    [...list.children].forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    const li = list.children[i] as HTMLElement | undefined;
    if (li) {
      input.setAttribute('aria-activedescendant', li.id);
      li.scrollIntoView?.({ block: 'nearest' });
    }
  }

  function open(query: string): void {
    const q = query.trim().toLowerCase();
    const opts = [...sel.options];
    matches = q
      ? opts
          .map((o) => ({ o, r: rank(o.textContent ?? '', q) }))
          .filter((m) => m.r >= 0)
          .sort((a, b) => a.r - b.r)
          .map((m) => m.o)
      : opts;
    matches = matches.slice(0, q ? MAX_RESULTS : opts.length);
    list.innerHTML = '';
    if (matches.length === 0) {
      const li = document.createElement('li');
      li.className = 'rk-combo-empty';
      li.textContent = 'No matching team';
      list.appendChild(li);
    }
    matches.forEach((o, i) => {
      const li = document.createElement('li');
      li.id = `${listId}-${i}`;
      li.setAttribute('role', 'option');
      li.textContent = o.textContent;
      // mousedown, not click, so the input's blur doesn't close the list first.
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        choose(o);
      });
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    const current = matches.findIndex((o) => o.value === sel.value);
    highlight(q ? 0 : Math.max(current, 0));
  }

  function choose(o: HTMLOptionElement): void {
    close();
    input.value = o.textContent ?? '';
    if (sel.value !== o.value) {
      sel.value = o.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  input.addEventListener('focus', () => {
    input.select();
    open('');
  });
  input.addEventListener('input', () => open(input.value));
  input.addEventListener('blur', () => {
    close();
    input.value = selectedName();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) return open(input.value);
      if (matches.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      highlight((active + step + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      if (list.hidden || !matches[active]) return;
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === 'Escape') {
      close();
      input.value = selectedName();
      input.select();
    }
  });
  sel.addEventListener('change', () => {
    input.value = selectedName();
  });

  input.value = selectedName();
  return { sync: () => (input.value = selectedName()) };
}
