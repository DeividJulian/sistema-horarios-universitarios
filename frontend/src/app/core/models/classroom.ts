import { RoomType } from './room-type';

export interface Classroom {
  id: number;
  nombre: string;
  aforo: number;
  tipo?: RoomType;
}

export type ClassroomInput = Omit<Classroom, 'id'>;
