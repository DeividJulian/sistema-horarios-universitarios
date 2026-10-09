// Room types (tipo de aula). The values are the API contract; the labels are what the user sees.
export type RoomType = 'general' | 'informatica' | 'laboratorio';
export type RequiredRoomType = 'cualquiera' | 'informatica' | 'laboratorio';

export const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'general', label: 'Aula general' },
  { value: 'informatica', label: 'Sala de informática' },
  { value: 'laboratorio', label: 'Laboratorio' },
];

export const REQUIRED_ROOM_TYPES: { value: RequiredRoomType; label: string }[] = [
  { value: 'cualquiera', label: 'Cualquier aula' },
  { value: 'informatica', label: 'Sala de informática' },
  { value: 'laboratorio', label: 'Laboratorio' },
];

export function roomTypeLabel(type: string | undefined): string {
  return ROOM_TYPES.find((t) => t.value === type)?.label ?? 'Aula general';
}

export function requiredRoomLabel(type: string | undefined): string {
  return REQUIRED_ROOM_TYPES.find((t) => t.value === type)?.label ?? 'Cualquier aula';
}
