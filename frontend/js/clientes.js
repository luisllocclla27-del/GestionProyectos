/**
 * clientes.js — Gestión de clientes: lista, crear, editar, eliminar,
 * y ver proyectos asociados por cliente.
 */

let allClients = [];
let editingId  = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadClients();

  // Botón nuevo cliente
  document.getElementById('btn-nuevo-cliente').addEventListener('click', () => openModal());

  // Cerrar modales
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.getElementById('projects-modal-close').addEventListener('click', closeProjectsModal);
  document.getElementById('projects-overlay').addEventListener('click', e => {
    if (e.target.id === 'projects-overlay') closeProjectsModal();
  });

  // Submit formulario
  document.getElementById('client-form').addEventListener('submit', handleSubmit);
});

// ── Cargar Clientes ───────────────────────────────────────────────────────────
async function loadClients() {
  try {
    allClients = await api.getClients();
    renderStats();
    renderGrid();
  } catch (err) {
    showToast('Error al cargar clientes', 'error');
  }
}

function renderStats() {
  const total      = allClients.length;
  const activos    = allClients.filter(c => c.total_proyectos > 0).length;
  const proyectos  = allClients.reduce((s, c) => s + c.total_proyectos, 0);
  const ingresos   = allClients.reduce((s, c) => s + c.ingresos_total, 0);

  document.getElementById('client-stats').innerHTML = `
    <div class="glass-card" style="padding:18px 20px;">
      <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Total Clientes</div>
      <div style="font-size:2rem;font-weight:800;">${total}</div>
    </div>
    <div class="glass-card" style="padding:18px 20px;">
      <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Con Proyectos</div>
      <div style="font-size:2rem;font-weight:800;color:var(--brand-primary);">${activos}</div>
    </div>
    <div class="glass-card" style="padding:18px 20px;">
      <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Total Proyectos</div>
      <div style="font-size:2rem;font-weight:800;color:var(--brand-accent);">${proyectos}</div>
    </div>
    <div class="glass-card" style="padding:18px 20px;">
      <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Ingresos Totales</div>
      <div style="font-size:2rem;font-weight:800;color:var(--brand-success);">S/ ${ingresos.toFixed(0)}</div>
    </div>`;
}

function renderGrid() {
  const grid = document.getElementById('clients-grid');
  if (allClients.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);">
        <div style="font-size:3rem;margin-bottom:12px;">👤</div>
        <div style="font-size:1rem;font-weight:600;margin-bottom:6px;">Sin clientes registrados</div>
        <div style="font-size:0.875rem;">Crea tu primer cliente con el botón de arriba</div>
      </div>`;
    return;
  }

  grid.innerHTML = allClients.map(c => {
    const initials = c.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors   = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
    const color    = colors[c.id % colors.length];

    return `
    <div class="glass-card fade-in" style="padding:20px;display:flex;flex-direction:column;gap:0;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
        <div style="width:46px;height:46px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:white;flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:1rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(c.nombre)}</div>
          <div style="font-size:0.75rem;color:${color};font-weight:700;">${c.codigo}</div>
        </div>
        <div style="display:flex;gap:5px;">
          <button class="btn-icon card-action-btn" onclick="openModal(${c.id})" title="Editar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon card-action-btn" onclick="confirmDeleteClient(${c.id})" title="Eliminar" style="color:var(--brand-danger);">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>

      <!-- Contacto -->
      ${c.contacto ? `
      <div style="display:flex;align-items:center;gap:7px;font-size:0.8125rem;color:var(--text-secondary);margin-bottom:12px;padding:8px 10px;background:var(--bg-elevated);border-radius:var(--radius-sm);">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(c.contacto)}</span>
      </div>` : ''}

      <!-- Notas -->
      ${c.notas ? `
      <div style="font-size:0.8rem;color:var(--text-muted);line-height:1.5;margin-bottom:12px;padding:8px 10px;border-left:2px solid var(--border-medium);">${escHtml(c.notas.slice(0,120))}${c.notas.length>120?'…':''}</div>
      ` : ''}

      <!-- Proyectos -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border-subtle);margin-top:auto;">
        <div style="display:flex;gap:16px;">
          <div style="text-align:center;">
            <div style="font-size:1.25rem;font-weight:800;color:var(--brand-primary);">${c.total_proyectos}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">proyectos</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:1.25rem;font-weight:800;color:var(--brand-success);">S/${c.ingresos_total.toFixed(0)}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">ingresos</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="viewClientProjects(${c.id}, '${escHtml(c.nombre)}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Ver proyectos
        </button>
      </div>
    </div>`;
  }).join('');
}

// ── Modal Crear/Editar ────────────────────────────────────────────────────────
function openModal(clientId = null) {
  editingId = clientId;
  const modal = document.getElementById('modal-title');
  document.getElementById('client-form').reset();
  document.getElementById('client-id').value = '';

  if (clientId) {
    const c = allClients.find(x => x.id === clientId);
    if (!c) return;
    modal.textContent = 'Editar Cliente';
    document.getElementById('client-id').value   = c.id;
    document.getElementById('f-nombre').value    = c.nombre;
    document.getElementById('f-codigo').value    = c.codigo.replace('CLI-', '');
    document.getElementById('f-contacto').value  = c.contacto || '';
    document.getElementById('f-notas').value     = c.notas    || '';
    document.getElementById('modal-btn-text').textContent = 'Guardar Cambios';
  } else {
    modal.textContent = 'Nuevo Cliente';
    document.getElementById('modal-btn-text').textContent = 'Crear Cliente';
  }
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('f-nombre').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingId = null;
}

async function handleSubmit(e) {
  e.preventDefault();
  const nombre = document.getElementById('f-nombre').value.trim();
  if (!nombre) {
    document.getElementById('f-nombre').classList.add('is-error');
    return;
  }
  document.getElementById('f-nombre').classList.remove('is-error');

  const codigoRaw = document.getElementById('f-codigo').value.trim();
  const codigo    = codigoRaw ? `CLI-${codigoRaw}` : null;

  const payload = {
    nombre,
    codigo,
    contacto: document.getElementById('f-contacto').value.trim() || null,
    notas:    document.getElementById('f-notas').value.trim()    || null,
  };

  const btnText    = document.getElementById('modal-btn-text');
  const spinner    = document.getElementById('modal-spinner');
  const submitBtn  = document.getElementById('modal-submit');
  btnText.style.display = 'none';
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    if (editingId) {
      await api.updateClient(editingId, payload);
      showToast('Cliente actualizado', 'success');
    } else {
      await api.createClient(payload);
      showToast('Cliente creado ✅', 'success');
    }
    closeModal();
    await loadClients();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    btnText.style.display = '';
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
}

// ── Eliminar ──────────────────────────────────────────────────────────────────
async function confirmDeleteClient(id) {
  const c = allClients.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`¿Eliminar al cliente "${c.nombre}" (${c.codigo})?\nSus proyectos quedarán sin cliente asignado.`)) return;
  try {
    await api.deleteClient(id);
    showToast('Cliente eliminado', 'info');
    await loadClients();
  } catch (err) {
    showToast('Error al eliminar', 'error');
  }
}

// ── Ver Proyectos del Cliente ─────────────────────────────────────────────────
async function viewClientProjects(clientId, nombre) {
  document.getElementById('projects-modal-title').textContent = `Proyectos · ${nombre}`;
  const body = document.getElementById('projects-modal-body');
  body.innerHTML = `<div style="text-align:center;padding:24px;"><div class="spinner"></div></div>`;
  document.getElementById('projects-overlay').classList.add('open');

  try {
    const projects = await api.getProjects(clientId);
    if (projects.length === 0) {
      body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div>Sin proyectos aún</div>`;
      return;
    }

    const ESTADO_COLOR = { 'Pendiente':'#fbbf24','En Desarrollo':'#818cf8','En Revisión':'#22d3ee','Entregado':'#34d399' };
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow-y:auto;padding-right:4px;">
        ${projects.map(p => `
        <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);">
          <div style="width:8px;height:8px;border-radius:50%;background:${ESTADO_COLOR[p.estado]||'#94a3b8'};flex-shrink:0;box-shadow:0 0 6px ${ESTADO_COLOR[p.estado]||'#94a3b8'};"></div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.875rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(p.titulo)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${p.tipo_trabajo} · Entrega: ${p.fecha_limite}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-weight:700;color:var(--brand-success);font-size:0.875rem;">S/ ${p.precio_total.toFixed(0)}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);">${((p.total_minutos||0)/60).toFixed(1)}h</div>
          </div>
        </div>`).join('')}
      </div>
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:0.875rem;color:var(--text-muted);">${projects.length} proyecto(s)</span>
        <a href="/nuevo" class="btn btn-primary btn-sm">+ Nuevo Proyecto</a>
      </div>`;
  } catch (err) {
    body.innerHTML = `<div class="empty-state">Error al cargar proyectos</div>`;
  }
}

function closeProjectsModal() {
  document.getElementById('projects-overlay').classList.remove('open');
}

// ── Helper ────────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
