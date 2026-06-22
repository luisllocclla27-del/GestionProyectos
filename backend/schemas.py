# schemas.py — Pydantic schemas para validación de la API

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Client ───────────────────────────────────────────────────────────────────

class ClientBase(BaseModel):
    nombre:   str = Field(..., min_length=1, max_length=200)
    codigo:   Optional[str] = None       # Auto-generado si se omite
    contacto: Optional[str] = None
    notas:    Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    nombre:   Optional[str] = None
    codigo:   Optional[str] = None
    contacto: Optional[str] = None
    notas:    Optional[str] = None

class ClientOut(ClientBase):
    id:           int
    codigo:       str
    created_at:   Optional[datetime] = None
    total_proyectos: int = 0       # Campo calculado
    ingresos_total:  float = 0.0   # Suma precio_total de sus proyectos

    class Config:
        from_attributes = True

class ClientSummary(BaseModel):
    """Versión ligera para el selector del formulario y el chip del Kanban."""
    id:      int
    codigo:  str
    nombre:  str
    contacto: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Project ──────────────────────────────────────────────────────────────────

class ProjectBase(BaseModel):
    titulo:               str = Field(..., min_length=1, max_length=255)
    tipo_trabajo:         str
    etiquetas_tecnicas:   Optional[str] = None
    fecha_limite:         str   # YYYY-MM-DD
    indicaciones_extra:   Optional[str] = None
    url_archivos_cliente: Optional[str] = None
    estado:               str = "Pendiente"
    precio_total:         float = Field(default=0.0, ge=0)
    adelanto:             float = Field(default=0.0, ge=0)
    cliente_id:           Optional[int] = None   # FK al cliente registrado
    # Campos legacy (por si se ingresa sin cliente registrado)
    nombre_cliente:   Optional[str] = None
    numero_cliente:   Optional[str] = None
    contacto_cliente: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    titulo:               Optional[str]   = None
    tipo_trabajo:         Optional[str]   = None
    etiquetas_tecnicas:   Optional[str]   = None
    fecha_limite:         Optional[str]   = None
    indicaciones_extra:   Optional[str]   = None
    url_archivos_cliente: Optional[str]   = None
    estado:               Optional[str]   = None
    precio_total:         Optional[float] = None
    adelanto:             Optional[float] = None
    cliente_id:           Optional[int]   = None
    nombre_cliente:       Optional[str]   = None
    numero_cliente:       Optional[str]   = None
    contacto_cliente:     Optional[str]   = None

class ProjectOut(ProjectBase):
    id:           int
    created_at:   Optional[datetime] = None
    total_minutos: int = 0
    saldo_pendiente: float = 0.0
    client:       Optional[ClientSummary] = None   # Datos del cliente vinculado

    class Config:
        from_attributes = True


# ─── Time Entry ───────────────────────────────────────────────────────────────

class TimeEntryCreate(BaseModel):
    tiempo_invertido_minutos: int = Field(..., gt=0)

class TimeEntryOut(BaseModel):
    id:                       int
    proyecto_id:              int
    tiempo_invertido_minutos: int
    fecha_registro:           Optional[datetime] = None

    class Config:
        from_attributes = True

class TimeTotalOut(BaseModel):
    proyecto_id:  int
    total_minutos: int
    total_horas:  float


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardMetrics(BaseModel):
    trabajos_activos:     int
    entregas_proximas:    int
    tiempo_total_semana:  int
    ingresos_mes:         float
    total_proyectos:      int
