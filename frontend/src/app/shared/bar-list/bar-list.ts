import { Component, computed, input } from '@angular/core';

export interface BarItem {
  label: string;
  value: number;
  /** Text shown next to the bar, e.g. "5 h · 6,7 %". */
  display: string;
}

/**
 * Single-series horizontal bars (magnitude): one hue, thin rounded bars, values in neutral text.
 * Every bar also carries its value as text, so the chart never depends on color alone.
 */
@Component({
  selector: 'app-bar-list',
  templateUrl: './bar-list.html',
  styleUrl: './bar-list.css',
})
export class BarList {
  readonly items = input.required<BarItem[]>();
  /** Upper bound of the scale; defaults to the largest value. */
  readonly max = input<number | null>(null);
  readonly label = input.required<string>();

  protected readonly scaleMax = computed(() => this.max() ?? Math.max(1, ...this.items().map((i) => i.value)));

  protected width(value: number): number {
    return Math.min(100, (value / this.scaleMax()) * 100);
  }
}
