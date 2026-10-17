import { Component, input, model } from '@angular/core';

import { SchoolDay, Weekday, formatShortDate, toIsoDate } from '../../../core/models';

/** How the schedule is shown. */
export type ScheduleView = 'semana' | 'dia' | 'aulas' | 'docentes';

export const VIEW_LABELS: Record<ScheduleView, string> = {
  semana: 'Semana',
  dia: 'Día',
  aulas: 'Aulas',
  docentes: 'Docentes',
};

/** Segmented control for the view and, for the one-day views, the day to show. */
@Component({
  selector: 'app-view-switcher',
  templateUrl: './view-switcher.html',
  styleUrl: './view-switcher.css',
})
export class ViewSwitcher {
  readonly views = input.required<ScheduleView[]>();
  readonly days = input.required<SchoolDay[]>();
  readonly view = model.required<ScheduleView>();
  readonly day = model.required<Weekday>();

  protected readonly labels = VIEW_LABELS;
  protected readonly shortDate = formatShortDate;
  protected readonly todayIso = toIsoDate(new Date());
}
