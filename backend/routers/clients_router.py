# routers/clients_router.py — CRUD de clientes

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Client, Project
from schemas import ClientCreate, ClientUpdate, ClientOut, ClientSummary
from auth import get_current_user
from typing import List

router = APIRouter(prefix="/clients", tags=["Clientes"])


def _next_codigo(db: Session) -> str:
    """Genera el siguiente código autoincremental CLI-XXX."""
    last = db.query(Client).order_by(Client.id.desc()).first()
    if not last:
        return "CLI-001"
    # Extraer número del último código
    try:
        num = int(last.codigo.split("-")[-1]) + 1
    except Exception:
        num = db.query(func.count(Client.id)).scalar() + 1
    return f"CLI-{num:03d}"


def _enrich(client: Client, db: Session) -> dict:
    data = {c.name: getattr(client, c.name) for c in client.__table__.columns}
    data["total_proyectos"] = db.query(func.count(Project.id))\
        .filter(Project.cliente_id == client.id).scalar() or 0
    data["ingresos_total"] = db.query(func.sum(Project.precio_total))\
        .filter(Project.cliente_id == client.id).scalar() or 0.0
    return data


# ─── GET todos ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ClientOut])
def get_clients(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    clients = db.query(Client).order_by(Client.nombre).all()
    return [_enrich(c, db) for c in clients]


@router.get("/summary", response_model=List[ClientSummary])
def get_clients_summary(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """Lista ligera para el selector del formulario."""
    return db.query(Client).order_by(Client.nombre).all()


# ─── GET por ID ───────────────────────────────────────────────────────────────

@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return _enrich(client, db)


# ─── POST crear ───────────────────────────────────────────────────────────────

@router.post("/", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(data: ClientCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    # Generar código si no se provee
    codigo = (data.codigo or "").strip() or _next_codigo(db)
    # Verificar unicidad
    if db.query(Client).filter(Client.codigo == codigo).first():
        raise HTTPException(status_code=400, detail=f"El código '{codigo}' ya está en uso")
    client = Client(nombre=data.nombre, codigo=codigo, contacto=data.contacto, notas=data.notas)
    db.add(client)
    db.commit()
    db.refresh(client)
    return _enrich(client, db)


# ─── PUT actualizar ───────────────────────────────────────────────────────────

@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: int, data: ClientUpdate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(client, key, val)
    db.commit()
    db.refresh(client)
    return _enrich(client, db)


# ─── DELETE ───────────────────────────────────────────────────────────────────

@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: int, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    # Los proyectos quedan con cliente_id = NULL (SET NULL)
    db.delete(client)
    db.commit()
