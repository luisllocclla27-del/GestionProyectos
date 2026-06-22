# main.py — Punto de entrada FastAPI

import os
import sqlalchemy
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import engine, Base
import models  # noqa

from routers.auth_router      import router as auth_router
from routers.projects_router  import router as projects_router
from routers.time_router      import router as time_router
from routers.dashboard_router import router as dashboard_router
from routers.clients_router   import router as clients_router

# ─── Crear tablas nuevas ──────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ─── Migración segura: agrega columnas sin borrar datos ──────────────────────
_MIGRATIONS = [
    # proyectos — campos legacy de cliente (texto libre)
    ("projects", "nombre_cliente",    "VARCHAR(200)"),
    ("projects", "numero_cliente",    "VARCHAR(50)"),
    ("projects", "contacto_cliente",  "VARCHAR(200)"),
    ("projects", "cliente_id",        "INTEGER"),
    ("projects", "adelanto",          "FLOAT DEFAULT 0.0"),
]
with engine.connect() as conn:
    for table, col, col_type in _MIGRATIONS:
        try:
            conn.execute(sqlalchemy.text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
            conn.commit()
        except Exception:
            pass  # columna ya existe

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="GestionProyectos API",
    description="Gestión interna de proyectos académicos y científicos",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(clients_router)   # ← Nuevo
app.include_router(projects_router)
app.include_router(time_router)
app.include_router(dashboard_router)

# ─── Frontend estático ───────────────────────────────────────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/",           include_in_schema=False)
def serve_login():      return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/dashboard",  include_in_schema=False)
def serve_dashboard():  return FileResponse(os.path.join(FRONTEND_DIR, "dashboard.html"))

@app.get("/nuevo",      include_in_schema=False)
def serve_nuevo():      return FileResponse(os.path.join(FRONTEND_DIR, "nuevo_proyecto.html"))

@app.get("/calendario", include_in_schema=False)
def serve_calendario(): return FileResponse(os.path.join(FRONTEND_DIR, "calendario.html"))

@app.get("/reportes", include_in_schema=False)
def serve_reportes(): return FileResponse(os.path.join(FRONTEND_DIR, "reportes.html"))

@app.get("/archivo", include_in_schema=False)
def serve_archivo(): return FileResponse(os.path.join(FRONTEND_DIR, "archivo.html"))

@app.get("/clientes",   include_in_schema=False)
def serve_clientes():   return FileResponse(os.path.join(FRONTEND_DIR, "clientes.html"))

@app.get("/manifest.json", include_in_schema=False)
def serve_manifest():   return FileResponse(os.path.join(FRONTEND_DIR, "manifest.json"))

@app.get("/sw.js",      include_in_schema=False)
def serve_sw():
    return FileResponse(os.path.join(FRONTEND_DIR, "sw.js"), media_type="application/javascript")
