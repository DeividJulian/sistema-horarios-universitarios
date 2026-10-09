import { Availability } from '../../../core/models';
import { cellKey, cellsToRanges, diffRanges, rangesToCells } from './availability-grid';

const slot = (id: number, dia_semana: Availability['dia_semana'], start: number, end: number): Availability => ({
  id,
  profesor_id: 1,
  dia_semana,
  hora_inicio: `${String(start).padStart(2, '0')}:00:00`,
  hora_fin: `${String(end).padStart(2, '0')}:00:00`,
});

describe('availability grid helpers', () => {
  it('turns ranges into 1-hour cells', () => {
    const cells = rangesToCells([slot(1, 'Martes', 18, 21)]);
    expect([...cells]).toEqual(['Martes|18', 'Martes|19', 'Martes|20']);
  });

  it('joins consecutive cells into ranges and keeps gaps apart', () => {
    const cells = new Set([cellKey('Lunes', 8), cellKey('Lunes', 9), cellKey('Lunes', 11), cellKey('Martes', 7)]);
    expect(cellsToRanges(cells)).toEqual([
      { day: 'Lunes', start: 8, end: 10 },
      { day: 'Lunes', start: 11, end: 12 },
      { day: 'Martes', start: 7, end: 8 },
    ]);
  });

  it('merges ranges that were saved separately (17-18 and 18-19 become 17-19)', () => {
    const existing = [slot(1, 'Jueves', 17, 18), slot(2, 'Jueves', 18, 19)];
    const wanted = cellsToRanges(rangesToCells(existing));
    expect(wanted).toEqual([{ day: 'Jueves', start: 17, end: 19 }]);
    const { toDelete, toCreate } = diffRanges(existing, wanted);
    expect(toDelete.map((a) => a.id)).toEqual([1, 2]);
    expect(toCreate).toEqual([{ day: 'Jueves', start: 17, end: 19 }]);
  });

  it('does not touch ranges that did not change', () => {
    const existing = [slot(1, 'Lunes', 8, 10), slot(2, 'Martes', 8, 10)];
    const { toDelete, toCreate } = diffRanges(existing, [{ day: 'Lunes', start: 8, end: 10 }]);
    expect(toDelete.map((a) => a.id)).toEqual([2]);
    expect(toCreate).toEqual([]);
  });
});
