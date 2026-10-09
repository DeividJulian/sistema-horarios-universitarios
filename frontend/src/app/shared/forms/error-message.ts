import { AbstractControl } from '@angular/forms';

/** Spanish message for the first validation error of a control, or null if it is valid or untouched. */
export function errorMessage(control: AbstractControl | null, label: string): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) return null;
  const e = control.errors;
  if (e['required']) return `${label} es obligatorio.`;
  if (e['tooShort']) return `${label} debe tener al menos ${e['tooShort'].min} caracteres.`;
  if (e['tooLong']) return `${label} no puede pasar de ${e['tooLong'].max} caracteres.`;
  if (e['email']) return 'Escribe un correo válido, por ejemplo nombre@ucc.edu.co.';
  if (e['min']) return `${label} debe ser al menos ${e['min'].min}.`;
  if (e['max']) return `${label} no puede ser mayor que ${e['max'].max}.`;
  return `${label} no es válido.`;
}

/** Messages for errors that belong to the whole form (cross-field rules). */
export function formErrorMessage(form: AbstractControl): string | null {
  if (!form.errors || !(form.touched || form.dirty)) return null;
  if (form.errors['invertedRange']) return 'La hora de fin debe ser posterior a la de inicio.';
  if (form.errors['outOfCalendar']) return 'La disponibilidad debe estar entre las 6:00 a. m. y las 10:00 p. m.';
  return null;
}
