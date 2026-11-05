import { matchesQuery } from './list-search';

describe('matchesQuery', () => {
  it('ignores case and accents', () => {
    expect(matchesQuery('calculo', 'Cálculo Diferencial')).toBe(true);
    expect(matchesQuery('LABORATORIO', 'laboratorio de sistemas')).toBe(true);
  });

  it('needs every word, in any field', () => {
    expect(matchesQuery('bases uno', 'Bases de Datos', '7A', 'Docente Uno')).toBe(true);
    expect(matchesQuery('bases dos', 'Bases de Datos', '7A', 'Docente Uno')).toBe(false);
  });

  it('an empty query matches everything and missing fields are skipped', () => {
    expect(matchesQuery('   ', 'Aula 101')).toBe(true);
    expect(matchesQuery('aula', null, undefined, 'Aula 101')).toBe(true);
  });
});
