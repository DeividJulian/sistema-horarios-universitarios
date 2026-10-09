import { Pipe, PipeTransform } from '@angular/core';

import { formatHour } from '../../core/models';

/** {{ 18 | hour }} -> "6:00 p. m." */
@Pipe({ name: 'hour' })
export class HourPipe implements PipeTransform {
  transform(hour: number): string {
    return formatHour(hour);
  }
}
