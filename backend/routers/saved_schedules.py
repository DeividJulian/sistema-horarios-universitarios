from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from schemas import (
    MessageOut,
    SavedScheduleActivated,
    SavedScheduleCreate,
    SavedScheduleCreated,
    SavedScheduleOut,
    SavedScheduleRename,
)
from services import saved_schedules as service
from services.generation import GenerationFailed

# Reading is open to every signed-in user; creating, activating, renaming and deleting is for
# administrators (the authorize dependency in main.py)
router = APIRouter(prefix="/saved-schedules", tags=["Horarios guardados"])


def _fail(error: service.SavedScheduleError):
    raise HTTPException(status_code=error.status, detail=str(error))


@router.get("", response_model=List[SavedScheduleOut], summary="Listar los horarios")
def list_saved_schedules(db: Session = Depends(get_db)):
    return [service.to_out(db, s) for s in service.list_schedules(db)]


@router.post("", response_model=SavedScheduleCreated, status_code=201, summary="Crear un horario nuevo")
def create_saved_schedule(data: SavedScheduleCreate, db: Session = Depends(get_db)):
    """Guarda el horario actual tal como está y genera uno nuevo, que queda activo."""
    try:
        schedule, optimization = service.create_schedule(db, data.nombre)
    except service.SavedScheduleError as e:
        _fail(e)
    except GenerationFailed as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {
        "mensaje": f"Horario «{schedule.nombre}» creado y activo",
        "horario": service.to_out(db, schedule),
        "optimizacion": optimization or None,
    }


@router.post("/{schedule_id}/activate", response_model=SavedScheduleActivated, summary="Activar un horario")
def activate_saved_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """El horario elegido pasa a ser el que ven todos; el que estaba activo queda guardado."""
    try:
        schedule, skipped = service.activate_schedule(db, schedule_id)
    except service.SavedScheduleError as e:
        _fail(e)
    message = f"Ahora el horario activo es «{schedule.nombre}»"
    if skipped:
        message += f". Se omitieron {skipped} bloques cuya materia o aula ya no existe"
    return {"mensaje": message, "horario": service.to_out(db, schedule), "bloques_omitidos": skipped}


@router.patch("/{schedule_id}", response_model=SavedScheduleOut, summary="Renombrar un horario")
def rename_saved_schedule(schedule_id: int, data: SavedScheduleRename, db: Session = Depends(get_db)):
    try:
        return service.to_out(db, service.rename_schedule(db, schedule_id, data.nombre))
    except service.SavedScheduleError as e:
        _fail(e)


@router.delete("/{schedule_id}", response_model=MessageOut, summary="Eliminar un horario guardado")
def delete_saved_schedule(schedule_id: int, db: Session = Depends(get_db)):
    try:
        name = service.delete_schedule(db, schedule_id)
    except service.SavedScheduleError as e:
        _fail(e)
    return {"mensaje": f"Horario «{name}» eliminado"}
