import { RequiredRoomType } from './room-type';

export interface Subject {
  id: number;
  nombre: string;
  intensidad_horaria: number;
  grupo_id: number;
  profesor_id: number;
  tipo_aula?: RequiredRoomType;
}

export type SubjectInput = Omit<Subject, 'id'>;
