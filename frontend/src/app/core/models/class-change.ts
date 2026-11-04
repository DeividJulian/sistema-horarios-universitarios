import type { CancellationOut, NotificationOut } from '../api/generated';

/** A class that will not take place on one date (the weekly block stays in the schedule). fecha: "YYYY-MM-DD". */
export type Cancellation = CancellationOut;

export type NotificationKind = NotificationOut['tipo'];

/** Notice for the students of a group. */
export type ScheduleNotice = NotificationOut;
