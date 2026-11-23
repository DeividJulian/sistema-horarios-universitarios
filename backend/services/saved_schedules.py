"""Several named schedules. The active one is the "horarios" table, which every other part of the app reads
(conflicts, statistics, class changes, AI, RPC); the inactive ones keep a copy of their blocks as JSON.
Activating one swaps them, so the rest of the code never needs to know there is more than one."""
import json
import logging
from datetime import time

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Classroom, SavedSchedule, ScheduleEntry, Subject
from services.class_changes import delete_cancellations
from services.generation import generate_and_save

logger = logging.getLogger("schedule.saved")

DEFAULT_NAME = "Horario principal"


class SavedScheduleError(Exception):
    """Something the user asked for cannot be done. The message is for the user (Spanish)."""

    def __init__(self, message: str, status: int = 409):
        super().__init__(message)
        self.status = status


def ensure_active(db: Session) -> SavedSchedule:
    """The active schedule. Databases created before this feature get one named "Horario principal"."""
    active = db.query(SavedSchedule).filter(SavedSchedule.activo.is_(True)).first()
    if active is None:
        name, n = DEFAULT_NAME, 2
        while name_in_use(db, name):
            name, n = f"{DEFAULT_NAME} {n}", n + 1
        active = SavedSchedule(nombre=name, activo=True)
        db.add(active)
        db.commit()
        db.refresh(active)
        logger.info("Saved schedule created for the current blocks: %s", name)
    return active


def name_in_use(db: Session, name: str, exclude_id: int | None = None) -> bool:
    query = db.query(SavedSchedule).filter(func.lower(SavedSchedule.nombre) == name.lower())
    if exclude_id is not None:
        query = query.filter(SavedSchedule.id != exclude_id)
    return query.first() is not None


def _snapshot(db: Session) -> str:
    rows = db.query(ScheduleEntry).order_by(ScheduleEntry.id).all()
    return json.dumps(
        [
            {"materia_id": e.materia_id, "aula_id": e.aula_id, "dia_semana": e.dia_semana, "hora_inicio": e.hora_inicio.isoformat()}
            for e in rows
        ],
        ensure_ascii=False,
    )


def _blocks(schedule: SavedSchedule) -> list[dict]:
    return json.loads(schedule.bloques) if schedule.bloques else []


def total_blocks(db: Session, schedule: SavedSchedule) -> int:
    return db.query(ScheduleEntry).count() if schedule.activo else len(_blocks(schedule))


def to_out(db: Session, schedule: SavedSchedule) -> dict:
    return {
        "id": schedule.id,
        "nombre": schedule.nombre,
        "activo": schedule.activo,
        "total_bloques": total_blocks(db, schedule),
        "creado_en": schedule.creado_en,
    }


def list_schedules(db: Session) -> list[SavedSchedule]:
    ensure_active(db)
    return db.query(SavedSchedule).order_by(SavedSchedule.creado_en, SavedSchedule.id).all()


def get_schedule(db: Session, schedule_id: int) -> SavedSchedule:
    schedule = db.get(SavedSchedule, schedule_id)
    if schedule is None:
        raise SavedScheduleError("Horario no encontrado", status=404)
    return schedule


def create_schedule(db: Session, name: str) -> tuple[SavedSchedule, dict]:
    """Keeps the current schedule as it is and generates a new one, which becomes the active one.

    If the generator cannot place every subject, nothing changes (GenerationFailed propagates)."""
    current = ensure_active(db)  # first, so its name counts too
    if name_in_use(db, name):
        raise SavedScheduleError("Ya existe un horario con ese nombre")
    current.bloques = _snapshot(db)
    current.activo = False
    new = SavedSchedule(nombre=name, activo=True)
    db.add(new)
    try:
        _, optimization = generate_and_save(db)  # commits the snapshot, the new row and the new blocks together
    except Exception:
        db.rollback()
        raise
    db.refresh(new)
    logger.info("New schedule %r generated; %r kept", name, current.nombre)
    return new, optimization


def activate_schedule(db: Session, schedule_id: int) -> tuple[SavedSchedule, int]:
    """Makes a saved schedule the active one. Returns it and how many of its blocks were skipped because
    their subject or classroom no longer exists. Cancellations belong to the old blocks, so they go."""
    target = get_schedule(db, schedule_id)
    if target.activo:
        return target, 0
    current = ensure_active(db)
    blocks = _blocks(target)

    current.bloques = _snapshot(db)
    current.activo = False
    delete_cancellations(db)
    db.query(ScheduleEntry).delete()

    subjects = {s for (s,) in db.query(Subject.id)}
    classrooms = {c for (c,) in db.query(Classroom.id)}
    skipped = 0
    for block in blocks:
        if block["materia_id"] not in subjects or block["aula_id"] not in classrooms:
            skipped += 1
            continue
        start = time.fromisoformat(block["hora_inicio"])
        db.add(
            ScheduleEntry(
                materia_id=block["materia_id"],
                aula_id=block["aula_id"],
                dia_semana=block["dia_semana"],
                hora_inicio=start,
                hora_fin=time(hour=start.hour + 1),
            )
        )
    target.bloques = None
    target.activo = True
    db.commit()
    db.refresh(target)
    logger.info("Schedule %r activated (%d blocks skipped)", target.nombre, skipped)
    return target, skipped


def rename_schedule(db: Session, schedule_id: int, name: str) -> SavedSchedule:
    schedule = get_schedule(db, schedule_id)
    if name_in_use(db, name, exclude_id=schedule.id):
        raise SavedScheduleError("Ya existe un horario con ese nombre")
    schedule.nombre = name
    db.commit()
    db.refresh(schedule)
    return schedule


def delete_schedule(db: Session, schedule_id: int) -> str:
    schedule = get_schedule(db, schedule_id)
    if schedule.activo:
        raise SavedScheduleError("No puedes eliminar el horario activo: activa otro primero.")
    name = schedule.nombre
    db.delete(schedule)
    db.commit()
    return name

