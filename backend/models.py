# models.py — Modelos ORM de SQLAlchemy

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


# ─── Enums ───────────────────────────────────────────────────────────────────

class TipoTrabajoEnum(str, enum.Enum):
    revision_bibliografica = "Revisión Bibliográfica"
    investigacion = "Investigación"


class EstadoEnum(str, enum.Enum):
    pendiente      = "Pendiente"
    en_desarrollo  = "En Desarrollo"
    en_revision    = "En Revisión"
    entregado      = "Entregado"


# ─── Modelo: Cliente ──────────────────────────────────────────────────────────

class Client(Base):
    """
    Clientes registrados. Un cliente puede tener N proyectos.
    El código se genera automáticamente (CLI-001, CLI-002…) si no se provee.
    """
    __tablename__ = "clients"

    id          = Column(Integer, primary_key=True, index=True, autoincrement=True)
    codigo      = Column(String(30),  nullable=False, unique=True)  # CLI-001
    nombre      = Column(String(200), nullable=False)
    contacto    = Column(String(300), nullable=True)   # email / WhatsApp / Telegram
    notas       = Column(Text,        nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    # Un cliente tiene múltiples proyectos
    projects = relationship("Project", back_populates="client", passive_deletes=True)


# ─── Modelo: Proyecto ─────────────────────────────────────────────────────────

class Project(Base):
    """Tabla principal de proyectos académicos/científicos."""
    __tablename__ = "projects"

    id                   = Column(Integer, primary_key=True, index=True, autoincrement=True)
    titulo               = Column(String(255), nullable=False)
    tipo_trabajo         = Column(String(50),  nullable=False)
    etiquetas_tecnicas   = Column(String(500), nullable=True)   # CSV
    fecha_limite         = Column(String(20),  nullable=False)  # YYYY-MM-DD
    indicaciones_extra   = Column(Text,        nullable=True)
    url_archivos_cliente = Column(String(500), nullable=True)
    estado               = Column(String(30),  nullable=False, default="Pendiente")
    precio_total         = Column(Float,       nullable=False, default=0.0)
    adelanto             = Column(Float,       nullable=False, default=0.0)
    created_at           = Column(DateTime(timezone=True), server_default=func.now())

    # ─── FK al cliente (opcional, compatibilidad con proyectos sin cliente) ──
    cliente_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)

    # Campos legacy (se mantienen para compatibilidad; el chip usa cliente_id preferentemente)
    nombre_cliente   = Column(String(200), nullable=True)
    numero_cliente   = Column(String(50),  nullable=True)
    contacto_cliente = Column(String(200), nullable=True)

    # Relaciones
    client       = relationship("Client", back_populates="projects")
    time_entries = relationship("TimeEntry", back_populates="project", cascade="all, delete-orphan")


# ─── Modelo: Tiempo ───────────────────────────────────────────────────────────

class TimeEntry(Base):
    """Registro de tiempo invertido en un proyecto."""
    __tablename__ = "time_entries"

    id                       = Column(Integer, primary_key=True, index=True, autoincrement=True)
    proyecto_id              = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    tiempo_invertido_minutos = Column(Integer, nullable=False, default=0)
    fecha_registro           = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="time_entries")
