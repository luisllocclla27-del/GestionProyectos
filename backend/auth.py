# auth.py — Sistema de autenticación JWT para un solo administrador
# Usa bcrypt directamente (compatible con bcrypt 4.x y 5.x)

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ─── Configuración ────────────────────────────────────────────────────────────
SECRET_KEY = "super-secreto-cambia-esto-en-produccion-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas de sesión

# Credenciales del administrador único
# CAMBIA AQUÍ tu usuario y contraseña
ADMIN_USERNAME = "admin"
ADMIN_PLAIN_PASSWORD = "admin123"  # ← CAMBIA ESTO

security = HTTPBearer()

# Hash generado al arrancar (bcrypt directo, sin passlib)
_ADMIN_HASH: bytes = bcrypt.hashpw(
    ADMIN_PLAIN_PASSWORD.encode("utf-8"),
    bcrypt.gensalt()
)


def verify_password(plain_password: str) -> bool:
    """Verifica la contraseña usando bcrypt."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), _ADMIN_HASH)


def authenticate_admin(username: str, password: str) -> bool:
    """Retorna True si username y password coinciden con el admin configurado."""
    if username != ADMIN_USERNAME:
        return False
    return verify_password(password)


# ─── JWT ──────────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un token JWT con expiración."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Dependencia de FastAPI que valida el JWT en el header Authorization: Bearer <token>.
    Inyectar esta dependencia en cualquier ruta protegida.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None or username != ADMIN_USERNAME:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception

