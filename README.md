# GestionProyectos PWA

Panel de gestión interna para proyectos de redacción académica e investigación científica.

## Stack

- **Backend**: FastAPI + SQLite (SQLAlchemy)
- **Auth**: JWT (python-jose + passlib/bcrypt)
- **Frontend**: HTML5 + Vanilla JS + CSS custom
- **PWA**: manifest.json + Service Worker

## Arranque rápido

### 1. Instalar dependencias

```powershell
cd backend
pip install -r requirements.txt
```

### 2. Iniciar el servidor

Desde la raíz del proyecto:

```powershell
python run.py
```

### 3. Acceder

| URL | Descripción |
|-----|-------------|
| http://localhost:8000 | Login |
| http://localhost:8000/dashboard | Panel de control |
| http://localhost:8000/nuevo | Nuevo proyecto |
| http://localhost:8000/docs | Swagger API (docs interactivos) |

## Credenciales

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `admin123` |

> ⚠️ **Cambia la contraseña** en `backend/auth.py` → variable `ADMIN_PLAIN_PASSWORD`

## Estructura del Proyecto

```
GestionProyectos/
├── backend/
│   ├── main.py              # App FastAPI principal
│   ├── database.py          # Conexión SQLite
│   ├── models.py            # ORM models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # JWT + bcrypt
│   └── routers/
│       ├── auth_router.py
│       ├── projects_router.py
│       ├── time_router.py
│       └── dashboard_router.py
├── frontend/
│   ├── index.html           # Login
│   ├── dashboard.html       # Kanban + Métricas
│   ├── nuevo_proyecto.html  # Formulario
│   ├── manifest.json        # PWA
│   ├── sw.js                # Service Worker
│   ├── css/styles.css
│   ├── js/
│   │   ├── api.js           # Fetch wrapper con JWT
│   │   ├── auth.js          # Guard de sesión
│   │   ├── dashboard.js     # Kanban + drag&drop
│   │   ├── tracker.js       # Cronómetro por proyecto
│   │   └── proyecto_form.js # Formulario + tags
│   └── icons/
├── run.py                   # Script de arranque
└── README.md
```

## Funcionalidades

- ✅ Login seguro con JWT (8h de sesión)
- ✅ Dashboard con 4 métricas en tiempo real
- ✅ Tablero Kanban con drag & drop entre 4 estados
- ✅ Cronómetro por proyecto (Start/Pause, auto-guarda cada 30 min)
- ✅ Formulario de nuevo proyecto con tags input
- ✅ Modal de detalle con rentabilidad ($/hora)
- ✅ Eliminación de proyectos
- ✅ PWA instalable (manifest + Service Worker)
- ✅ Diseño dark mode premium con glassmorphism
