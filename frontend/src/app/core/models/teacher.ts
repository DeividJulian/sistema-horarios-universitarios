// Entities come from the backend contract (core/api/generated, `npm run gen:api`): if the API changes a field,
// the code that uses it stops compiling.
import type { TeacherCreate, TeacherOut } from '../api/generated';

export type Teacher = TeacherOut;
export type TeacherInput = TeacherCreate;
