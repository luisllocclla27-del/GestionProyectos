/**
 * api.js — Wrapper centralizado para todas las llamadas a la API REST.
 * Agrega automáticamente el token JWT en los headers de cada request.
 * Importar ANTES de cualquier otro script que use `api.*`
 */

const API_BASE = '';  // Mismo origen que el frontend (servido por FastAPI)

const api = {
  /** Header con Bearer token */
  _headers(extra = {}) {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...extra
    };
  },

  /** Manejo centralizado de respuestas */
  async _handle(response) {
    if (response.status === 401) {
      // Token expirado o inválido → logout
      localStorage.removeItem('token');
      window.location.href = '/';
      throw new Error('No autorizado');
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || `Error ${response.status}`);
    }
    if (response.status === 204) return null;
    return response.json();
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return this._handle(res);
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  async getProjects(clientId = null) {
    const url = clientId ? `${API_BASE}/projects/?cliente_id=${clientId}` : `${API_BASE}/projects/`;
    const res = await fetch(url, { headers: this._headers() });
    return this._handle(res);
  },

  async getProject(id) {
    const res = await fetch(`${API_BASE}/projects/${id}`, { headers: this._headers() });
    return this._handle(res);
  },

  async createProject(data) {
    const res = await fetch(`${API_BASE}/projects/`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(data)
    });
    return this._handle(res);
  },

  async updateProject(id, data) {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(data)
    });
    return this._handle(res);
  },

  async deleteProject(id) {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: this._headers()
    });
    return this._handle(res);
  },

  // ── Clients ───────────────────────────────────────────────────────────────
  async getClients() {
    const res = await fetch(`${API_BASE}/clients/`, { headers: this._headers() });
    return this._handle(res);
  },

  async getClientsSummary() {
    const res = await fetch(`${API_BASE}/clients/summary`, { headers: this._headers() });
    return this._handle(res);
  },

  async createClient(data) {
    const res = await fetch(`${API_BASE}/clients/`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(data)
    });
    return this._handle(res);
  },

  async updateClient(id, data) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(data)
    });
    return this._handle(res);
  },

  async deleteClient(id) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'DELETE',
      headers: this._headers()
    });
    return this._handle(res);
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async getDashboardMetrics() {
    const res = await fetch(`${API_BASE}/dashboard/metrics`, { headers: this._headers() });
    return this._handle(res);
  },

  // ── Time Tracking ─────────────────────────────────────────────────────────
  async addTimeEntry(projectId, minutos) {
    const res = await fetch(`${API_BASE}/time/${projectId}`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ tiempo_invertido_minutos: minutos })
    });
    return this._handle(res);
  },

  async getTimeTotal(projectId) {
    const res = await fetch(`${API_BASE}/time/${projectId}/total`, { headers: this._headers() });
    return this._handle(res);
  }
};

// Función global para mostrar toasts (usada en todos los scripts)
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fadeout');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
