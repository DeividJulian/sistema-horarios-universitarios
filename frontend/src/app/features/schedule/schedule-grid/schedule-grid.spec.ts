import { TestBed } from '@angular/core/testing';

import { Classroom, ScheduleEntry, StudentGroup, Subject } from '../../../core/models';
import { ScheduleGrid } from './schedule-grid';

const subjects = new Map<number, Subject>([
  [1, { id: 1, nombre: 'Bases de Datos', intensidad_horaria: 2, grupo_id: 10, profesor_id: 100, tipo_aula: 'cualquiera' } as Subject],
  [2, { id: 2, nombre: 'Cálculo', intensidad_horaria: 2, grupo_id: 20, profesor_id: 200, tipo_aula: 'cualquiera' } as Subject],
]);
const classrooms = new Map<number, Classroom>([
  [5, { id: 5, nombre: 'Aula 101', aforo: 40 } as Classroom],
  [6, { id: 6, nombre: 'Aula 102', aforo: 40 } as Classroom],
]);
const groups = new Map<number, StudentGroup>([
  [10, { id: 10, nombre: '7A' } as StudentGroup],
  [20, { id: 20, nombre: '5A' } as StudentGroup],
]);
const entry = (id: number, materia_id: number, aula_id: number, dia_semana: ScheduleEntry['dia_semana']): ScheduleEntry => ({
  id,
  materia_id,
  aula_id,
  dia_semana,
  hora_inicio: '08:00:00',
  hora_fin: '09:00:00',
});

function render(entries: ScheduleEntry[]) {
  const fixture = TestBed.createComponent(ScheduleGrid);
  fixture.componentRef.setInput('entries', entries);
  fixture.componentRef.setInput('subjectsById', subjects);
  fixture.componentRef.setInput('classroomsById', classrooms);
  fixture.componentRef.setInput('groupsById', groups);
  fixture.componentRef.setInput('filter', { teacherId: null, groupId: null, classroomId: null });
  fixture.detectChanges();
  return { fixture, page: fixture.nativeElement as HTMLElement };
}

describe('ScheduleGrid', () => {
  it('shows every class of an hour, even when two groups share it', () => {
    const { page } = render([entry(1, 1, 5, 'Lunes'), entry(2, 2, 6, 'Lunes')]);
    const cell = page.querySelector('.board [id="Lunes-8"]')!;
    const titles = [...cell.querySelectorAll('.ev-title')].map((t) => t.textContent?.trim());
    expect(titles).toEqual(['Bases de Datos', 'Cálculo']);
    expect([...cell.querySelectorAll('.ev-code')].map((c) => c.textContent?.trim())).toEqual(['7A', '5A']);
  });

  it('the phone agenda lists the classes of the chosen day', async () => {
    const { fixture, page } = render([entry(1, 1, 5, 'Lunes'), entry(2, 2, 6, 'Martes')]);
    const tuesday = [...page.querySelectorAll<HTMLButtonElement>('.daypill')].find((p) => p.textContent?.includes('MAR'))!;
    tuesday.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(tuesday.getAttribute('aria-selected')).toBe('true');
    expect([...page.querySelectorAll('.agenda .ev-title')].map((t) => t.textContent?.trim())).toEqual(['Cálculo']);
  });
});
