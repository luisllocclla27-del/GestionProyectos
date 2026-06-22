# routers/auth_router.py — Endpoint de login

from fastapi import APIRouter, Depends, HTTPException, status
from schemas import LoginRequest, TokenResponse
from auth import authenticate_admin, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    """
    Autentica al administrador y retorna un token JWT.
    Body: { "username": "admin", "password": "admin123" }
    """
    if not authenticate_admin(request.username, request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
    token = create_access_token(data={"sub": request.username})
    return TokenResponse(access_token=token)


@router.get("/verify")
def verify_token(current_user: str = Depends(get_current_user)):
    """Verifica que el token JWT es válido. Útil para refresh de sesión en el frontend."""
    return {"status": "ok", "user": current_user}
