import { Shift } from './shift';

export interface StudentGroup {
  id: number;
  nombre: string;
  num_estudiantes: number;
  jornada: Shift;
}

export type StudentGroupInput = Omit<StudentGroup, 'id'>;
