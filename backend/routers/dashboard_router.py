# routers/dashboard_router.py — Métricas agregadas para el panel de control

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta

from database import get_db
from models import Project, TimeEntry
from schemas import DashboardMetrics
from auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics", response_model=DashboardMetrics)
def get_metrics(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Retorna las métricas agregadas para los cards del dashboard.
    - trabajos_activos: proyectos que no están en estado 'Entregado'
    - entregas_proximas: proyectos con fecha_limite en los próximos 7 días
    - tiempo_total_semana: minutos registrados esta semana (lunes a hoy)
    - ingresos_mes: suma de precio_total de proyectos entregados este mes
    """
    today = date.today()
    seven_days_later = today + timedelta(days=7)

    # Trabajos activos (cualquier estado excepto Entregado y Archivado)
    trabajos_activos = db.query(func.count(Project.id))\
        .filter(Project.estado.notin_(["Entregado", "Archivado"]))\
        .scalar() or 0

    # Total de proyectos
    total_proyectos = db.query(func.count(Project.id)).scalar() or 0

    # Entregas próximas (≤ 7 días, no entregados aún)
    # Comparamos como strings YYYY-MM-DD (funciona correctamente con ISO format)
    today_str = today.isoformat()
    seven_days_str = seven_days_later.isoformat()

    entregas_proximas = db.query(func.count(Project.id))\
        .filter(
            Project.estado.notin_(["Entregado", "Archivado"]),
            Project.fecha_limite >= today_str,
            Project.fecha_limite <= seven_days_str
        ).scalar() or 0

    # Tiempo total esta semana (lunes a hoy)
    monday = today - timedelta(days=today.weekday())
    monday_dt = datetime.combine(monday, datetime.min.time())

    tiempo_semana = db.query(func.sum(TimeEntry.tiempo_invertido_minutos))\
        .filter(TimeEntry.fecha_registro >= monday_dt)\
        .scalar() or 0

    # Ingresos del mes (proyectos entregados en el mes actual)
    first_of_month = datetime(today.year, today.month, 1)

    ingresos_mes = db.query(func.sum(Project.precio_total))\
        .filter(
            Project.estado.in_(["Entregado", "Archivado"]),
            Project.created_at >= first_of_month  # aproximación: creados y entregados este mes
        ).scalar() or 0.0

    return DashboardMetrics(
        trabajos_activos=trabajos_activos,
        entregas_proximas=entregas_proximas,
        tiempo_total_semana=tiempo_semana,
        ingresos_mes=round(float(ingresos_mes), 2),
        total_proyectos=total_proyectos
    )
