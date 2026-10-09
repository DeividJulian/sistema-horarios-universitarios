import { FormControl, FormGroup } from '@angular/forms';

import { errorMessage, formErrorMessage } from './error-message';
import { CAPACITY_RULES, NAME_RULES, WEEKLY_HOURS_RULES, hourRange, trimmedLength } from './validators';

describe('form validators (same rules as backend/schemas.py)', () => {
  it('trimmedLength ignores surrounding spaces', () => {
    const validator = trimmedLength(2, 5);
    expect(validator(new FormControl('  a  '))).toEqual({ tooShort: { min: 2 } });
    expect(validator(new FormControl(' ab '))).toBeNull();
    expect(validator(new FormControl('abcdef'))).toEqual({ tooLong: { max: 5 } });
    expect(validator(new FormControl(''))).toBeNull(); // "required" handles empty values
  });

  it('names need 2 to 100 characters', () => {
    expect(new FormControl('', NAME_RULES).errors).toEqual({ required: true });
    expect(new FormControl('A', NAME_RULES).errors).toEqual({ tooShort: { min: 2 } });
    expect(new FormControl('Aula 101', NAME_RULES).valid).toBe(true);
  });

  it('capacity goes from 1 to 500 and weekly hours from 1 to 5', () => {
    expect(new FormControl(0, CAPACITY_RULES).hasError('min')).toBe(true);
    expect(new FormControl(501, CAPACITY_RULES).hasError('max')).toBe(true);
    expect(new FormControl(40, CAPACITY_RULES).valid).toBe(true);
    expect(new FormControl(6, WEEKLY_HOURS_RULES).hasError('max')).toBe(true);
    expect(new FormControl(5, WEEKLY_HOURS_RULES).valid).toBe(true);
  });

  it('hourRange rejects inverted ranges and hours outside 6:00-22:00', () => {
    const form = (start: number, end: number) =>
      new FormGroup({ start: new FormControl(start), end: new FormControl(end) }, { validators: hourRange('start', 'end') });
    expect(form(10, 8).errors).toEqual({ invertedRange: true });
    expect(form(10, 10).errors).toEqual({ invertedRange: true });
    expect(form(5, 9).errors).toEqual({ outOfCalendar: true });
    expect(form(20, 23).errors).toEqual({ outOfCalendar: true });
    expect(form(18, 22).errors).toBeNull(); // evening classes end at 22:00
    expect(form(8, 11).errors).toBeNull();
  });
});

describe('errorMessage', () => {
  const touched = (control: FormControl) => {
    control.markAsTouched();
    return control;
  };

  it('stays silent until the user touches the field', () => {
    expect(errorMessage(new FormControl('', NAME_RULES), 'El nombre')).toBeNull();
  });

  it('writes the messages in Spanish', () => {
    expect(errorMessage(touched(new FormControl('', NAME_RULES)), 'El nombre')).toBe('El nombre es obligatorio.');
    expect(errorMessage(touched(new FormControl('A', NAME_RULES)), 'El nombre')).toBe('El nombre debe tener al menos 2 caracteres.');
    expect(errorMessage(touched(new FormControl(0, CAPACITY_RULES)), 'El aforo')).toBe('El aforo debe ser al menos 1.');
    expect(errorMessage(touched(new FormControl(9, WEEKLY_HOURS_RULES)), 'La intensidad')).toBe('La intensidad no puede ser mayor que 5.');
  });

  it('explains cross-field errors of the availability form', () => {
    const form = new FormGroup({ start: new FormControl(12), end: new FormControl(10) }, { validators: hourRange('start', 'end') });
    form.markAsTouched();
    expect(formErrorMessage(form)).toBe('La hora de fin debe ser posterior a la de inicio.');
  });
});
