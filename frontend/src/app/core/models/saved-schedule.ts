import type { SavedScheduleActivated, SavedScheduleCreated, SavedScheduleOut } from '../api/generated';

/** A named schedule. Only one is active: the one everybody sees in the calendar. */
export type SavedSchedule = SavedScheduleOut;

export type SavedScheduleCreation = SavedScheduleCreated;

export type SavedScheduleActivation = SavedScheduleActivated;
