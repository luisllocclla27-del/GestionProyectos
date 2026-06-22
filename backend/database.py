# database.py — Configuración de SQLite con SQLAlchemy
# Crea el archivo gestion_proyectos.db en la carpeta backend/

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Ruta de la base de datos SQLite (fallback local)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_URL = f"sqlite:///{os.path.join(BASE_DIR, 'gestion_proyectos.db')}"

# Si existe DATABASE_URL (Render/Supabase), úsalo. Si es postgres:// cámbialo a postgresql:// para SQLAlchemy
DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_URL)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Solo usar check_same_thread si es SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependencia de FastAPI para obtener la sesión de BD en cada request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
