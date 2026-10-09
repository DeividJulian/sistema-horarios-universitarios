// Field names mirror the backend JSON contract (Spanish), see backend/README.md.
export interface Teacher {
  id: number;
  nombre: string;
  email: string;
}

export type TeacherInput = Omit<Teacher, 'id'>;
