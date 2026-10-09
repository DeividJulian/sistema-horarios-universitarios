import { Injectable, WritableSignal, computed, inject, signal } from '@angular/core';
import { Observable, finalize, forkJoin, map, switchMap, tap } from 'rxjs';

import { ClassroomService } from '../api/classroom.service';
import { ScheduleService } from '../api/schedule.service';
import { StudentGroupService } from '../api/student-group.service';
import { SubjectService } from '../api/subject.service';
import { TeacherService } from '../api/teacher.service';
import { apiErrorMessage } from '../http/api-error';
import {
  Classroom,
  ClassroomInput,
  GenerationResult,
  ScheduleEntry,
  StudentGroup,
  StudentGroupInput,
  Subject,
  SubjectInput,
  Teacher,
  TeacherInput,
  Weekday,
  toApiTime,
} from '../models';

const byId = <T extends { id: number }>(items: T[]) => new Map(items.map((item) => [item.id, item]));

function upsert<T extends { id: number }>(list: WritableSignal<T[]>, item: T): void {
  list.update((items) => (items.some((x) => x.id === item.id) ? items.map((x) => (x.id === item.id ? item : x)) : [...items, item]));
}

function remove<T extends { id: number }>(list: WritableSignal<T[]>, id: number): void {
  list.update((items) => items.filter((x) => x.id !== id));
}

/**
 * Single source of truth for the data every page shares (teachers, classrooms, groups,
 * subjects and schedule blocks). Components read signals; changes go through these methods.
 */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly teacherApi = inject(TeacherService);
  private readonly classroomApi = inject(ClassroomService);
  private readonly groupApi = inject(StudentGroupService);
  private readonly subjectApi = inject(SubjectService);
  private readonly scheduleApi = inject(ScheduleService);

  readonly teachers = signal<Teacher[]>([]);
  readonly classrooms = signal<Classroom[]>([]);
  readonly groups = signal<StudentGroup[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly entries = signal<ScheduleEntry[]>([]);

  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly generating = signal(false);

  readonly teachersById = computed(() => byId(this.teachers()));
  readonly classroomsById = computed(() => byId(this.classrooms()));
  readonly groupsById = computed(() => byId(this.groups()));
  readonly subjectsById = computed(() => byId(this.subjects()));

  load(): Observable<unknown> {
    this.loading.set(true);
    this.loadError.set(null);
    return forkJoin({
      teachers: this.teacherApi.list(),
      classrooms: this.classroomApi.list(),
      groups: this.groupApi.list(),
      subjects: this.subjectApi.list(),
      entries: this.scheduleApi.list(),
    }).pipe(
      tap((data) => {
        this.teachers.set(data.teachers);
        this.classrooms.set(data.classrooms);
        this.groups.set(data.groups);
        this.subjects.set(data.subjects);
        this.entries.set(data.entries);
        this.loaded.set(true);
      }),
      tap({ error: (err) => this.loadError.set(apiErrorMessage(err, 'No se pudieron cargar los datos.')) }),
      finalize(() => this.loading.set(false)),
    );
  }

  /** Forgets everything (used when the session ends). */
  reset(): void {
    for (const list of [this.teachers, this.classrooms, this.groups, this.subjects, this.entries] as WritableSignal<unknown[]>[]) {
      list.set([]);
    }
    this.loaded.set(false);
    this.loadError.set(null);
  }

  generateSchedule(): Observable<GenerationResult> {
    this.generating.set(true);
    return this.scheduleApi.generate().pipe(finalize(() => this.generating.set(false)));
  }

  /** Moves a block right away (optimistic update) and rolls back if the backend rejects it. */
  moveEntry(entry: ScheduleEntry, day: Weekday, hour: number): Observable<ScheduleEntry> {
    const previous = { ...entry };
    const start = toApiTime(hour);
    this.replaceEntry({ ...entry, dia_semana: day, hora_inicio: start, hora_fin: toApiTime(hour + 1) });

    return this.scheduleApi.move(entry.id, { dia_semana: day, hora_inicio: start }).pipe(
      tap({
        next: (saved) => this.replaceEntry(saved),
        error: () => this.replaceEntry(previous),
      }),
    );
  }

  // ---------- Catalog changes: call the API and keep the local state in sync ----------

  saveTeacher(id: number | null, data: TeacherInput): Observable<Teacher> {
    const request = id === null ? this.teacherApi.create(data) : this.teacherApi.update(id, data);
    return request.pipe(tap((saved) => upsert(this.teachers, saved)));
  }

  deleteTeacher(id: number): Observable<void> {
    return this.teacherApi.delete(id).pipe(
      tap(() => remove(this.teachers, id)),
      map(() => undefined),
    );
  }

  saveClassroom(id: number | null, data: ClassroomInput): Observable<Classroom> {
    const request = id === null ? this.classroomApi.create(data) : this.classroomApi.update(id, data);
    return request.pipe(tap((saved) => upsert(this.classrooms, saved)));
  }

  deleteClassroom(id: number): Observable<void> {
    return this.classroomApi.delete(id).pipe(
      tap(() => remove(this.classrooms, id)),
      map(() => undefined),
    );
  }

  saveGroup(id: number | null, data: StudentGroupInput): Observable<StudentGroup> {
    const request = id === null ? this.groupApi.create(data) : this.groupApi.update(id, data);
    return request.pipe(tap((saved) => upsert(this.groups, saved)));
  }

  deleteGroup(id: number): Observable<void> {
    return this.groupApi.delete(id).pipe(
      tap(() => remove(this.groups, id)),
      map(() => undefined),
    );
  }

  saveSubject(id: number | null, data: SubjectInput): Observable<Subject> {
    const request = id === null ? this.subjectApi.create(data) : this.subjectApi.update(id, data);
    return request.pipe(tap((saved) => upsert(this.subjects, saved)));
  }

  /** Deleting a subject also deletes its schedule blocks in the backend, so the blocks are reloaded. */
  deleteSubject(id: number): Observable<void> {
    return this.subjectApi.delete(id).pipe(
      tap(() => remove(this.subjects, id)),
      switchMap(() => this.scheduleApi.list()),
      tap((entries) => this.entries.set(entries)),
      map(() => undefined),
    );
  }

  deleteEntry(id: number): Observable<void> {
    return this.scheduleApi.delete(id).pipe(
      tap(() => remove(this.entries, id)),
      map(() => undefined),
    );
  }

  private replaceEntry(updated: ScheduleEntry): void {
    this.entries.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
  }
}
