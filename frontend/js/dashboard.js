/**
 * dashboard.js — Lógica del panel de control mejorada.
 * - Drag & drop reescrito con event delegation (fix definitivo)
 * - Moneda en Soles (S/)
 * - Búsqueda y filtro de proyectos
 * - Modal mejorado con edición rápida de estado
 * - Indicador de progreso de flujo en tarjetas
 */

// ── Estado global ─────────────────────────────────────────────────────────────
let allProjects   = [];
let draggedProjectId = null;
let searchQuery   = '';

const ESTADOS     = ['Pendiente', 'En Desarrollo', 'En Revisión', 'Entregado'];
const COL_IDS     = { 'Pendiente':'pendiente', 'En Desarrollo':'desarrollo', 'En Revisión':'revision', 'Entregado':'entregado' };
const ESTADO_IDX  = { 'Pendiente':0, 'En Desarrollo':1, 'En Revisión':2, 'Entregado':3 };

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Fecha de hoy
  const fechaEl = document.getElementById('fecha-hoy');
  if (fechaEl) {
    const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
    fechaEl.textContent = new Date().toLocaleDateString('es-PE', opts);
  }

  // Registro del Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Cargar datos iniciales
  await Promise.all([loadMetrics(), loadProjects()]);

  // Botón actualizar
  document.getElementById('refresh-btn')?.addEventListener('click', async () => {
    await Promise.all([loadMetrics(), loadProjects()]);
    showToast('Tablero actualizado', 'success', 2000);
  });

  // Búsqueda
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderKanban(allProjects);
  });

  // Modal close
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // ── Drag & Drop: Event Delegation en columnas ────────────────────────────
  // Usamos event delegation para que funcione aunque se re-rendericen los cards
  document.getElementById('kanban-board').addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Resaltar columna más cercana
    const col = e.target.closest('.kanban-col');
    document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
    if (col) col.classList.add('drag-over');
  });

  document.getElementById('kanban-board').addEventListener('dragleave', (e) => {
    // Solo limpiar si salimos del board completo
    if (!e.currentTarget.contains(e.relatedTarget)) {
      document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
    }
  });

  document.getElementById('kanban-board').addEventListener('drop', async (e) => {
    e.preventDefault();
    document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));

    const col = e.target.closest('.kanban-col');
    if (!col || !draggedProjectId) return;

    const newStatus = col.dataset.status;
    const project   = allProjects.find(p => p.id === draggedProjectId);
    if (!project || project.estado === newStatus) { draggedProjectId = null; return; }

    try {
      await api.updateProject(draggedProjectId, { estado: newStatus });
      showToast(`↪ Movido a "${newStatus}"`, 'success', 2000);
      await Promise.all([loadProjects(), loadMetrics()]);
    } catch (err) {
      showToast('Error al mover el proyecto', 'error');
    }
    draggedProjectId = null;
  });
});

// ── Métricas ──────────────────────────────────────────────────────────────────
async function loadMetrics() {
  try {
    const m = await api.getDashboardMetrics();

    animateNumber('metric-activos',  m.trabajos_activos);
    animateNumber('metric-proximas', m.entregas_proximas);

    const horas = (m.tiempo_total_semana / 60).toFixed(1);
    animateNumber('metric-tiempo', parseFloat(horas), true);

    document.getElementById('metric-ingresos').textContent = `S/ ${m.ingresos_mes.toFixed(0)}`;

    // Barra de progreso global
    if (m.total_proyectos > 0) {
      const pct = Math.round((m.total_proyectos - m.trabajos_activos) / m.total_proyectos * 100);
      const bar = document.getElementById('global-progress');
      if (bar) { bar.style.width = pct + '%'; }
      const barLabel = document.getElementById('global-progress-label');
      if (barLabel) barLabel.textContent = `${pct}% completado (${m.total_proyectos} proyectos)`;
    }
  } catch (err) {
    console.error('Error cargando métricas:', err);
  }
}

function animateNumber(id, target, isFloat = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const start    = parseFloat(el.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();
  function step(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val  = start + (target - start) * ease;
    el.textContent = isFloat ? val.toFixed(1) : Math.round(val);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Proyectos & Kanban ────────────────────────────────────────────────────────
async function loadProjects() {
  try {
    allProjects = await api.getProjects();
    renderKanban(allProjects);
  } catch (err) {
    console.error('Error cargando proyectos:', err);
    showToast('Error al cargar los proyectos', 'error');
  }
}

function renderKanban(projects) {
  // Filtrar por búsqueda — incluye cliente
  const filtered = searchQuery
    ? projects.filter(p =>
        p.titulo.toLowerCase().includes(searchQuery) ||
        (p.etiquetas_tecnicas  || '').toLowerCase().includes(searchQuery) ||
        p.tipo_trabajo.toLowerCase().includes(searchQuery) ||
        (p.client?.nombre      || p.nombre_cliente || '').toLowerCase().includes(searchQuery) ||
        (p.client?.codigo      || p.numero_cliente || '').toLowerCase().includes(searchQuery)
      )
    : projects;

  ESTADOS.forEach(status => {
    const colProjects = filtered.filter(p => p.estado === status);
    const colId       = COL_IDS[status];
    const container   = document.getElementById(`cards-${colId}`);
    const countEl     = document.getElementById(`count-${colId}`);
    if (!container) return;

    countEl.textContent = colProjects.length;

    if (colProjects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          ${searchQuery ? 'Sin resultados' : 'Sin proyectos'}
        </div>`;
      return;
    }

    container.innerHTML = colProjects.map(p => renderCard(p)).join('');
    colProjects.forEach(p => trackerManager.init(p.id, p.total_minutos || 0));
  });
}

function renderCard(project) {
  const deadline  = formatDeadline(project.fecha_limite);
  const badge     = getBadge(project.estado);
  const tipoIcon  = project.tipo_trabajo === 'Investigación' ? '🔬' : '📚';
  const totalH    = ((project.total_minutos || 0) / 60).toFixed(1);
  const idx       = ESTADO_IDX[project.estado] ?? 0;
  const progress  = Math.round((idx / (ESTADOS.length - 1)) * 100);
  const progColor = ['#fbbf24','#818cf8','#22d3ee','#34d399'][idx];

  const tags = project.etiquetas_tecnicas
    ? project.etiquetas_tecnicas.split(',').slice(0, 3).map(t =>
        `<span class="card-tag">${escHtml(t.trim())}</span>`
      ).join('')
    : '';

  // Chip de cliente (número + nombre)
  const cliNombre = project.client?.nombre || project.nombre_cliente;
  const cliCodigo = project.client?.codigo || project.numero_cliente;
  const clienteChip = (cliNombre || cliCodigo)
    ? `<div class="card-cliente-chip" title="${escHtml(cliNombre || '')}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ${cliCodigo ? `<span class="chip-num">${escHtml(cliCodigo)}</span>` : ''}
        ${cliNombre ? escHtml(cliNombre) : ''}
      </div>`
    : '';

  // Barra de urgencia visual en la parte superior del card
  const urgencyBar = deadline.cls === 'deadline-overdue'
    ? `<div style="position:absolute;top:0;left:0;right:0;height:3px;background:var(--brand-danger);border-radius:var(--radius-md) var(--radius-md) 0 0;"></div>`
    : deadline.cls === 'deadline-urgent'
    ? `<div style="position:absolute;top:0;left:0;right:0;height:3px;background:#fb923c;border-radius:var(--radius-md) var(--radius-md) 0 0;"></div>`
    : '';

  return `
  <div class="project-card fade-in"
       id="card-${project.id}"
       draggable="true"
       ondragstart="handleDragStart(event, ${project.id})"
       ondragend="handleDragEnd(event)">
    ${urgencyBar}

    <!-- Header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">
      <span style="font-size:1.25rem;line-height:1;">${tipoIcon}</span>
      ${badge}
    </div>

    <div class="project-card-title">${escHtml(project.titulo)}</div>

    ${clienteChip}
    ${tags ? `<div style="margin:4px 0 8px;display:flex;flex-wrap:wrap;gap:4px;">${tags}</div>` : ''}

    <!-- Meta -->
    <div class="project-card-meta">
      <div style="display:flex;align-items:center;gap:4px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${deadline.text}
      </div>
      <div style="font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
        ${(project.estado === 'Entregado' && project.saldo_pendiente > 0) ? `<span style="font-size:0.65rem;background:var(--brand-danger);color:white;padding:2px 4px;border-radius:4px;">Por cobrar</span>` : ''}
        S/ ${project.precio_total.toFixed(0)}
      </div>
      <div class="project-card-meta-row">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        ${totalH}h invertidas
      </div>
    </div>

    <!-- Barra de progreso del flujo -->
    <div style="margin:10px 0 8px;">
      <div style="height:3px;background:var(--border-subtle);border-radius:2px;overflow:hidden;">
        <div style="height:100%;width:${progress}%;background:${progColor};border-radius:2px;transition:width 0.4s ease;"></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="project-card-footer">
      <div style="display:flex;align-items:center;gap:7px;">
        <button class="btn-tracker" id="btn-tracker-${project.id}"
          onclick="trackerManager.toggle(${project.id})" title="Cronómetro">
          ▶ Iniciar
        </button>
        <span class="tracker-display" id="timer-display-${project.id}">00:00</span>
      </div>
      <div style="display:flex;gap:4px;align-items:center;">
        <button class="btn-icon card-action-btn" onclick="openModal(${project.id})" title="Ver detalles">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="btn-icon card-action-btn" onclick="quickAdvance(${project.id})" title="Avanzar estado"
          style="${project.estado === 'Entregado' ? 'opacity:0.3;cursor:default;' : ''}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="btn-icon card-action-btn" onclick="archiveProject(${project.id})" title="Archivar / Marcar como Terminado">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
        </button>
      </div>
    </div>
  </div>`;
}

// ── Avance rápido de estado (botón ›) ─────────────────────────────────────────
async function quickAdvance(projectId) {
  const project = allProjects.find(p => p.id === projectId);
  if (!project || project.estado === 'Entregado') return;

  const currentIdx = ESTADO_IDX[project.estado];
  const nextStatus = ESTADOS[currentIdx + 1];

  try {
    await api.updateProject(projectId, { estado: nextStatus });
    showToast(`↪ Avanzado a "${nextStatus}"`, 'success', 2000);
    await Promise.all([loadProjects(), loadMetrics()]);
  } catch (err) {
    showToast('Error al actualizar el estado', 'error');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function getBadge(estado) {
  const map = {
    'Pendiente':    'badge-pendiente',
    'En Desarrollo':'badge-desarrollo',
    'En Revisión':  'badge-revision',
    'Entregado':    'badge-entregado'
  };
  return `<span class="badge ${map[estado] || ''}">${estado}</span>`;
}

function formatDeadline(dateStr) {
  if (!dateStr) return { text: 'Sin fecha', cls: '' };
  const deadline = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadline - today) / 86400000);

  const opts = { day: '2-digit', month: 'short' };
  const formatted = deadline.toLocaleDateString('es-PE', opts);

  if (diffDays < 0)   return { text: `⚠ Vencido (${formatted})`, cls: 'deadline-overdue' };
  if (diffDays === 0) return { text: `🔥 Hoy`,                   cls: 'deadline-urgent' };
  if (diffDays === 1) return { text: `⚡ Mañana`,                cls: 'deadline-urgent' };
  if (diffDays <= 3)  return { text: `${diffDays}d · ${formatted}`, cls: 'deadline-urgent' };
  if (diffDays <= 7)  return { text: `${diffDays}d · ${formatted}`, cls: '' };
  return { text: formatted, cls: '' };
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
function handleDragStart(event, projectId) {
  draggedProjectId = projectId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', String(projectId));
  setTimeout(() => {
    const card = document.getElementById(`card-${projectId}`);
    if (card) card.classList.add('dragging');
  }, 0);
}

function handleDragEnd(event) {
  const card = document.getElementById(`card-${draggedProjectId}`);
  if (card) card.classList.remove('dragging');
  document.querySelectorAll('.kanban-col').forEach(col => col.classList.remove('drag-over'));
}

// ── Modal Detalle mejorado ────────────────────────────────────────────────────
async function openModal(projectId) {
  const project = allProjects.find(p => p.id === projectId);
  if (!project) return;

  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  document.getElementById('modal-title').textContent = project.titulo;

  const totalH = ((project.total_minutos || 0) / 60).toFixed(2);
  const rentH  = project.total_minutos > 0 && project.precio_total > 0
    ? (project.precio_total / (project.total_minutos / 60)).toFixed(2)
    : null;

  const idx      = ESTADO_IDX[project.estado] ?? 0;
  const progress = Math.round((idx / (ESTADOS.length - 1)) * 100);
  const progColor= ['#fbbf24','#818cf8','#22d3ee','#34d399'][idx];

  body.innerHTML = `
    <!-- Progreso de flujo -->
    <div style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        ${ESTADOS.map((s, i) => `
          <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;">
            <div style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;
              background:${i <= idx ? progColor : 'var(--bg-elevated)'};
              border:2px solid ${i <= idx ? progColor : 'var(--border-subtle)'};
              color:${i <= idx ? '#0a0b0f' : 'var(--text-muted)'};
              font-weight:700;">
              ${i < idx ? '✓' : i === idx ? '●' : ''}
            </div>
            <span style="font-size:0.6rem;color:${i <= idx ? 'var(--text-secondary)' : 'var(--text-muted)'};text-align:center;line-height:1.2;">${s.replace(' ','\n')}</span>
          </div>
          ${i < ESTADOS.length - 1 ? `<div style="flex:1;height:2px;margin-top:9px;background:${i < idx ? progColor : 'var(--border-subtle)'};border-radius:1px;"></div>` : ''}
        `).join('')}
      </div>
    </div>

    <!-- Cliente -->
    ${(project.client || project.nombre_cliente || project.numero_cliente) ? `
    <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;">
      <div style="display:flex;align-items:center;gap:7px;">
        <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--brand-primary),var(--brand-secondary));display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">👤</div>
        <div>
          <div style="font-weight:700;font-size:0.9375rem;color:var(--text-primary);">${escHtml(project.client?.nombre || project.nombre_cliente || 'Sin nombre')}</div>
          ${(project.client?.codigo || project.numero_cliente) ? `<div style="font-size:0.75rem;color:var(--brand-primary);font-weight:600;">${escHtml(project.client?.codigo || project.numero_cliente)}</div>` : ''}
        </div>
      </div>
      ${(project.client?.contacto || project.contacto_cliente) ? `<div style="font-size:0.8125rem;color:var(--text-secondary);padding-left:8px;border-left:1px solid var(--border-subtle);">${escHtml(project.client?.contacto || project.contacto_cliente)}</div>` : ''}
    </div>` : ''}

    <!-- Grid de datos -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:0.875rem;margin-bottom:16px;">
      <div class="modal-data-cell">
        <span class="modal-data-label">Tipo</span>
        <strong>${project.tipo_trabajo}</strong>
      </div>
      <div class="modal-data-cell">
        <span class="modal-data-label">Fecha límite</span>
        <strong>${new Date(project.fecha_limite + 'T00:00:00').toLocaleDateString('es-PE', {day:'2-digit',month:'long',year:'numeric'})}</strong>
      </div>
    </div>

    <!-- Finanzas -->
    <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:14px;border:1px solid var(--border-subtle);margin-bottom:16px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
        <div>
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Precio Total</div>
          <div style="font-size:1rem;font-weight:700;">S/ ${project.precio_total.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Adelanto / Pagos</div>
          <div style="font-size:1rem;font-weight:700;color:var(--brand-success);">S/ ${(project.adelanto || 0).toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Saldo Pendiente</div>
          <div style="font-size:1rem;font-weight:700;color:${project.saldo_pendiente > 0 ? 'var(--brand-danger)' : 'var(--text-primary)'};">S/ ${project.saldo_pendiente.toFixed(2)}</div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:4px;" onclick="registerPayment(${project.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Registrar Nuevo Pago
      </button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:0.875rem;margin-bottom:16px;">
      <div class="modal-data-cell">
        <span class="modal-data-label">Tiempo invertido</span>
        <strong>${totalH} horas</strong>
      </div>
      ${rentH ? `
      <div class="modal-data-cell" style="grid-column:1/-1;background:rgba(16,185,129,0.06);border-color:rgba(16,185,129,0.2);">
        <span class="modal-data-label">💰 Rentabilidad</span>
        <strong style="color:var(--brand-success);font-size:1.1rem;">S/ ${rentH} / hora</strong>
      </div>` : ''}
    </div>

    <!-- Etiquetas -->
    ${project.etiquetas_tecnicas ? `
    <div style="margin-bottom:14px;">
      <span class="modal-data-label" style="display:block;margin-bottom:6px;">Etiquetas técnicas</span>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${project.etiquetas_tecnicas.split(',').map(t =>
          `<span class="card-tag" style="font-size:0.8125rem;padding:4px 12px;">${escHtml(t.trim())}</span>`
        ).join('')}
      </div>
    </div>` : ''}

    <!-- URL archivos -->
    ${project.url_archivos_cliente ? `
    <div style="margin-bottom:14px;">
      <span class="modal-data-label" style="display:block;margin-bottom:4px;">Archivos del cliente</span>
      <a href="${escHtml(project.url_archivos_cliente)}" target="_blank"
        style="display:inline-flex;align-items:center;gap:6px;color:var(--brand-primary);font-size:0.8125rem;word-break:break-all;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Abrir enlace
      </a>
    </div>` : ''}

    <!-- Notas -->
    ${project.indicaciones_extra ? `
    <div>
      <span class="modal-data-label" style="display:block;margin-bottom:6px;">Notas / Indicaciones</span>
      <div style="background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:12px 14px;font-size:0.8125rem;line-height:1.7;color:var(--text-secondary);white-space:pre-wrap;">${escHtml(project.indicaciones_extra)}</div>
    </div>` : ''}

    <!-- Acciones rápidas en modal -->
    <div style="display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-subtle);">
      ${project.estado !== 'Entregado' ? `
      <button class="btn btn-primary btn-sm" onclick="quickAdvance(${project.id});closeModal();">
        ↪ Avanzar estado
      </button>` : ''}
      <button class="btn btn-secondary btn-sm" onclick="closeModal();setTimeout(()=>trackerManager.toggle(${project.id}),300)">
        ⏱ Cronómetro
      </button>
      <button class="btn btn-secondary btn-sm" style="margin-left:auto;color:var(--text-secondary);" onclick="closeModal();setTimeout(()=>archiveProject(${project.id}),300)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
        Archivar Proyecto
      </button>
    </div>
  `;

  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('open');
}

// ── Archivar proyecto ─────────────────────────────────────────────────────────
async function archiveProject(projectId) {
  const project = allProjects.find(p => p.id === projectId);
  if (!project) return;
  if (!confirm(`¿Mover "${project.titulo}" a Archivo?\nDesaparecerá de este tablero Kanban pero no se eliminará de la base de datos.`)) return;

  try {
    await api.updateProject(projectId, { estado: 'Archivado' });
    showToast('Proyecto archivado', 'info', 2500);
    await Promise.all([loadProjects(), loadMetrics()]);
  } catch (err) {
    showToast('Error al archivar el proyecto', 'error');
  }
}

// ── Registrar Pago ────────────────────────────────────────────────────────────
async function registerPayment(projectId) {
  const project = allProjects.find(p => p.id === projectId);
  if (!project) return;
  
  if (project.saldo_pendiente <= 0) {
    alert("Este proyecto ya está totalmente pagado.");
    return;
  }

  const rawAmount = prompt(`Saldo pendiente: S/ ${project.saldo_pendiente.toFixed(2)}\n\nIngresa el monto del nuevo pago recibido (en Soles):`);
  if (!rawAmount) return;

  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    alert("Monto inválido.");
    return;
  }

  try {
    const nuevoAdelanto = (project.adelanto || 0) + amount;
    await api.updateProject(projectId, { adelanto: nuevoAdelanto });
    showToast(`Pago de S/ ${amount.toFixed(2)} registrado`, 'success', 3000);
    closeModal();
    await Promise.all([loadProjects(), loadMetrics()]);
  } catch (err) {
    showToast('Error al registrar pago', 'error');
  }
}
