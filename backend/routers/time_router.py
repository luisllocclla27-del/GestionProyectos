# routers/time_router.py — Registro y consulta de tiempo invertido

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
from models import TimeEntry, Project
from schemas import TimeEntryCreate, TimeEntryOut, TimeTotalOut
from auth import get_current_user

router = APIRouter(prefix="/time", tags=["Control de Tiempo"])


@router.post("/{project_id}", response_model=TimeEntryOut, status_code=201)
def add_time_entry(
    project_id: int,
    entry: TimeEntryCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Agrega una entrada de tiempo al proyecto.
    El cronómetro del frontend llama esto cada vez que se pausa o detiene.
    Body: { "tiempo_invertido_minutos": 25 }
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    new_entry = TimeEntry(
        proyecto_id=project_id,
        tiempo_invertido_minutos=entry.tiempo_invertido_minutos
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


@router.get("/{project_id}/total", response_model=TimeTotalOut)
def get_time_total(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Retorna el total de minutos invertidos en un proyecto."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    total = db.query(func.sum(TimeEntry.tiempo_invertido_minutos))\
               .filter(TimeEntry.proyecto_id == project_id)\
               .scalar() or 0

    return TimeTotalOut(
        proyecto_id=project_id,
        total_minutos=total,
        total_horas=round(total / 60, 2)
    )


@router.get("/{project_id}/entries", response_model=List[TimeEntryOut])
def get_time_entries(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Lista todas las entradas de tiempo de un proyecto."""
    entries = db.query(TimeEntry)\
                .filter(TimeEntry.proyecto_id == project_id)\
                .order_by(TimeEntry.fecha_registro.desc())\
                .all()
    return entries
