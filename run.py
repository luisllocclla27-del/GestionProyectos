# run.py — Script de arranque del servidor
# Ejecutar desde la raíz del proyecto con: python run.py

import uvicorn
import sys
import os

# Ruta absoluta al directorio backend
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

# Insertar backend al path de Python para que uvicorn encuentre main.py
sys.path.insert(0, BACKEND_DIR)

# Cambiar el CWD al directorio raíz del proyecto
os.chdir(BASE_DIR)

if __name__ == "__main__":
    print("=" * 55)
    print("  GestionProyectos PWA — Iniciando servidor...")
    print("  URL: http://localhost:8000")
    print("  API Docs: http://localhost:8000/docs")
    print("  Usuario: admin | Contraseña: admin123")
    print("=" * 55)

    port = int(os.environ.get("PORT", 8000))
    is_prod = os.environ.get("RENDER") is not None

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=not is_prod,
        app_dir=BACKEND_DIR,
    )
