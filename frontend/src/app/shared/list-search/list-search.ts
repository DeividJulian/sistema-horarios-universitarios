import { Component, input, model } from '@angular/core';

/** "Cálculo" and "calculo" match: case and accents do not matter. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/** Whether any of the fields contains every word of the query. An empty query matches everything. */
export function matchesQuery(query: string, ...fields: (string | number | null | undefined)[]): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(fields.filter((f) => f !== null && f !== undefined).join(' '));
  return words.every((word) => haystack.includes(word));
}

/**
 * Toolbar above a management list: a search box, the filters projected inside and how many rows are shown.
 * The page keeps the query in a signal and filters its own rows with matchesQuery.
 */
@Component({
  selector: 'app-list-search',
  template: `
    <div class="list-toolbar" role="search" [attr.aria-label]="label()">
      <label class="search">
        <span class="sr-only">{{ label() }}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          class="search-input"
          type="search"
          [placeholder]="placeholder()"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
          (keydown.escape)="query.set('')"
        />
      </label>
      <ng-content />
      <span class="list-count" aria-live="polite">
        {{ shown() === total() ? total() + ' en total' : shown() + ' de ' + total() }}
      </span>
    </div>
  `,
})
export class ListSearch {
  readonly query = model('');
  readonly label = input('Buscar');
  readonly placeholder = input('Buscar…');
  readonly total = input(0);
  readonly shown = input(0);
}
