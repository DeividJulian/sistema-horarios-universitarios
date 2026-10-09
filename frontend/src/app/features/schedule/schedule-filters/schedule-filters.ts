import { Component, input, model } from '@angular/core';

import { Classroom, StudentGroup, Teacher, shiftInfo } from '../../../core/models';
import { EMPTY_FILTER, ScheduleFilter } from '../schedule-filter';

@Component({
  selector: 'app-schedule-filters',
  templateUrl: './schedule-filters.html',
  styleUrl: './schedule-filters.css',
})
export class ScheduleFilters {
  readonly teachers = input.required<Teacher[]>();
  readonly groups = input.required<StudentGroup[]>();
  readonly classrooms = input.required<Classroom[]>();
  readonly filter = model<ScheduleFilter>(EMPTY_FILTER);

  protected update(key: keyof ScheduleFilter, value: string): void {
    this.filter.update((f) => ({ ...f, [key]: value === '' ? null : Number(value) }));
  }

  protected groupLabel(group: StudentGroup): string {
    const shift = shiftInfo(group.jornada);
    return shift.value === 'todo' ? group.nombre : `${group.nombre} · ${shift.label}`;
  }

  protected clear(): void {
    this.filter.set(EMPTY_FILTER);
  }
}
