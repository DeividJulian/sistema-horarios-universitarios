import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/*
 * Same rules as backend/schemas.py, so the user sees the problem before sending the form.
 * The backend still validates everything; these checks only improve the experience.
 */
export const NAME_RULES = [Validators.required, trimmedLength(2, 100)];
export const CAPACITY_RULES = [Validators.required, Validators.min(1), Validators.max(500)];
export const WEEKLY_HOURS_RULES = [Validators.required, Validators.min(1), Validators.max(5)];

export const MIN_HOUR = 6;
export const MAX_HOUR = 22;

/** Length check that ignores leading/trailing spaces, like StringConstraints(strip_whitespace=True). */
export function trimmedLength(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null; // "required" reports empty values
    if (value.length < min) return { tooShort: { min } };
    if (value.length > max) return { tooLong: { max } };
    return null;
  };
}

/** Availability ranges: end after start and inside the calendar (6:00 to 22:00). */
export function hourRange(startKey: string, endKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = Number(group.get(startKey)?.value);
    const end = Number(group.get(endKey)?.value);
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    if (end <= start) return { invertedRange: true };
    if (start < MIN_HOUR || end > MAX_HOUR) return { outOfCalendar: true };
    return null;
  };
}
