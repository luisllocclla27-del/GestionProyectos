# routers/projects_router.py — CRUD completo de proyectos

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

from database import get_db
from models import Project, TimeEntry, Client
from schemas import ProjectCreate, ProjectUpdate, ProjectOut
from auth import get_current_user

router = APIRouter(prefix="/projects", tags=["Proyectos"])


def _enrich_project(project: Project, db: Session) -> dict:
    """Agrega total_minutos y datos del cliente al proyecto."""
    total = db.query(func.sum(TimeEntry.tiempo_invertido_minutos))\
               .filter(TimeEntry.proyecto_id == project.id)\
               .scalar() or 0
    data = {c.name: getattr(project, c.name) for c in project.__table__.columns}
    data["total_minutos"] = total
    data["saldo_pendiente"] = max(0.0, float(project.precio_total) - float(project.adelanto))
    # Incluir datos del cliente vinculado (si existe)
    if project.client:
        data["client"] = {
            "id":       project.client.id,
            "codigo":   project.client.codigo,
            "nombre":   project.client.nombre,
            "contacto": project.client.contacto,
        }
    else:
        data["client"] = None
    return data


# ─── GET todos (con filtro opcional por cliente) ──────────────────────────────

@router.get("/", response_model=List[ProjectOut])
def get_projects(
    cliente_id: Optional[int] = Query(None, description="Filtrar por ID de cliente"),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Lista proyectos con tiempo acumulado. Acepta ?cliente_id=N para filtrar."""
    q = db.query(Project).options(joinedload(Project.client))\
          .order_by(Project.fecha_limite)
    if cliente_id is not None:
        q = q.filter(Project.cliente_id == cliente_id)
    return [_enrich_project(p, db) for p in q.all()]


# ─── GET por ID ───────────────────────────────────────────────────────────────

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Obtiene un proyecto por ID."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return _enrich_project(project, db)


# ─── POST crear ───────────────────────────────────────────────────────────────

@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Crea un nuevo proyecto."""
    new_project = Project(**project_data.model_dump())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return _enrich_project(new_project, db)


@router.get("/export", summary="Exportar proyectos a CSV")
def export_projects(db: Session = Depends(get_db)):
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse

    projects = db.query(Project).all()
    output = StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "ID", "Titulo", "Estado", "Tipo Trabajo", "Fecha Limite", 
        "Precio Total", "Adelanto", "ID Cliente", "Nombre Cliente", "Etiquetas"
    ])
    
    for p in projects:
        cli_nombre = ""
        if p.client:
            cli_nombre = p.client.nombre
        else:
            cli_nombre = p.nombre_cliente or ""

        writer.writerow([
            p.id, p.titulo, p.estado, p.tipo_trabajo, p.fecha_limite,
            p.precio_total, p.adelanto, p.cliente_id, cli_nombre, p.etiquetas_tecnicas
        ])
    
    output.seek(0)
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=proyectos.csv"
    return response


# ─── PUT actualizar ───────────────────────────────────────────────────────────

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Actualiza un proyecto (parcialmente).
    Usado por el Kanban para cambiar el estado con drag & drop.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    update_data = project_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)
    return _enrich_project(project, db)


# ─── DELETE ───────────────────────────────────────────────────────────────────

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Elimina un proyecto y sus entradas de tiempo (CASCADE)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    db.delete(project)
    db.commit()
    return None
