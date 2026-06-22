let archivedProjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadArchived();

  // Buscador
  document.getElementById('search-input').addEventListener('input', (e) => {
    renderGrid(e.target.value.toLowerCase());
  });
});

async function loadArchived() {
  try {
    const all = await api.getProjects();
    // Cargar tanto los Archivados (Terminados) como los Anulados
    archivedProjects = all.filter(p => p.estado === 'Archivado' || p.estado === 'Anulado');
    renderGrid('');
  } catch (err) {
    showToast('Error cargando el archivo', 'error');
  }
}

async function anularProject(projectId) {
  if (!confirm('¿Estás seguro de que deseas ANULAR este proyecto?\n\nEl proyecto quedará como "Anulado", no sumará a tus ganancias ni a tus saldos pendientes por cobrar.')) return;
  
  try {
    await api.updateProject(projectId, { estado: 'Anulado' });
    showToast('Proyecto anulado correctamente', 'info', 2500);
    await loadArchived(); // recargar
  } catch(e) {
    showToast('Error al anular proyecto', 'error');
  }
}

function renderGrid(searchQuery) {
  const grid = document.getElementById('archivo-grid');
  grid.innerHTML = '';

  const filtered = archivedProjects.filter(p => 
    p.titulo.toLowerCase().includes(searchQuery) ||
    (p.client && p.client.nombre.toLowerCase().includes(searchQuery))
  );

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-state-icon">🗄️</div>
        <p>No hay proyectos archivados o anulados que coincidan.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(project => {
    const clientName = project.client ? project.client.nombre : (project.nombre_cliente || 'Sin cliente');
    const isAnulado = project.estado === 'Anulado';
    
    const d = document.createElement('div');
    d.className = 'glass-card';
    d.style.padding = '18px';
    d.style.display = 'flex';
    d.style.flexDirection = 'column';
    d.style.gap = '10px';
    d.style.position = 'relative';
    if (isAnulado) d.style.opacity = '0.6';
    
    // Header
    const head = document.createElement('div');
    head.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);padding-right:30px;">
          ${project.titulo}
        </div>
        ${isAnulado 
          ? `<span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid #ef4444;">ANULADO</span>`
          : `<span class="badge" style="background:rgba(16,185,129,0.15);color:#34d399;border:1px solid #34d399;">TERMINADO</span>`
        }
      </div>
      <div class="card-cliente-chip" style="margin:8px 0 0 0; display:inline-flex;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ${clientName}
      </div>
    `;
    d.appendChild(head);

    // Body
    const body = document.createElement('div');
    body.style.display = 'grid';
    body.style.gridTemplateColumns = '1fr 1fr';
    body.style.gap = '10px';
    body.style.fontSize = '0.85rem';
    body.style.color = 'var(--text-secondary)';
    
    const timeH = (project.total_minutos / 60).toFixed(1);
    const dateLimit = project.fecha_limite ? new Date(project.fecha_limite + 'T00:00:00').toLocaleDateString() : 'N/A';
    
    body.innerHTML = `
      <div>
        <span style="display:block;font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Costo Final</span>
        <span style="${isAnulado ? 'text-decoration:line-through;' : 'color:var(--brand-success);'}font-weight:600;">S/ ${project.precio_total.toFixed(2)}</span>
      </div>
      <div>
        <span style="display:block;font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Tiempo Total</span>
        <span style="font-weight:600;color:var(--brand-accent);">${timeH} h</span>
      </div>
      <div>
        <span style="display:block;font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;">Entrega original</span>
        ${dateLimit}
      </div>
    `;
    d.appendChild(body);

    // Action footer
    if (!isAnulado) {
      const footer = document.createElement('div');
      footer.style.marginTop = '8px';
      footer.style.paddingTop = '12px';
      footer.style.borderTop = '1px solid var(--border-subtle)';
      footer.style.display = 'flex';
      footer.style.justifyContent = 'flex-end';
      
      const btnAnular = document.createElement('button');
      btnAnular.className = 'btn btn-sm btn-danger';
      btnAnular.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Anular`;
      btnAnular.onclick = () => anularProject(project.id);
      
      footer.appendChild(btnAnular);
      d.appendChild(footer);
    }

    grid.appendChild(d);
  });
}
