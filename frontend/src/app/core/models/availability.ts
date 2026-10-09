import { Weekday } from './weekday';

export interface Availability {
  id: number;
  profesor_id: number;
  dia_semana: Weekday;
  hora_inicio: string;
  hora_fin: string;
}

export type AvailabilityInput = Omit<Availability, 'id'>;
