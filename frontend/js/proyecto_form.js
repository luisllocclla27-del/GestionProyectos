/**
 * proyecto_form.js — Lógica del formulario de nuevo proyecto.
 * Gestiona el Tags Input y el envío al API.
 */

// ── Tags Input ────────────────────────────────────────────────────────────────
const tags = [];

function renderTags() {
  const container = document.getElementById('tags-container');
  const input     = document.getElementById('tags-input');
  const hidden    = document.getElementById('etiquetas_tecnicas');

  // Limpiar tags anteriores (excepto el input)
  container.querySelectorAll('.tag-item').forEach(t => t.remove());

  tags.forEach((tag, idx) => {
    const el = document.createElement('span');
    el.className = 'tag-item';
    el.innerHTML = `${escHtml(tag)}<button class="tag-remove" onclick="removeTag(${idx})" title="Eliminar">×</button>`;
    container.insertBefore(el, input);
  });

  hidden.value = tags.join(',');
}

function addTag(value) {
  const tag = value.trim();
  if (tag && !tags.includes(tag) && tags.length < 10) {
    tags.push(tag);
    renderTags();
  }
}

function removeTag(idx) {
  tags.splice(idx, 1);
  renderTags();
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Inicialización del Tags Input ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Cargar clientes en el select
  try {
    const clients = await api.getClientsSummary();
    const select = document.getElementById('cliente_id');
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.codigo} — ${c.nombre}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.warn("No se pudieron cargar los clientes", err);
  }

  const input = document.getElementById('tags-input');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input.value);
      input.value = '';
    } else if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  });

  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      addTag(input.value);
      input.value = '';
    }
  });

  // Sugerencias de etiquetas comunes
  const suggestions = ['Fisicoquímica','Biología','Química','Física','Matemáticas',
    'Bioquímica','Medicina','Farmacología','Ecología','Genética',
    'Microbiología','Neurociencia','Biotecnología','Estadística'];

  const suggContainer = document.createElement('div');
  suggContainer.style.cssText = 'margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;';
  suggestions.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = s;
    btn.style.cssText = `
      padding:3px 10px;border-radius:100px;
      background:rgba(255,255,255,0.04);border:1px solid var(--border-subtle);
      color:var(--text-muted);font-size:0.75rem;cursor:pointer;
      transition:all 0.15s;font-family:inherit;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = 'var(--brand-primary)';
      btn.style.color = 'var(--brand-primary)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = 'var(--border-subtle)';
      btn.style.color = 'var(--text-muted)';
    });
    btn.addEventListener('click', () => addTag(s));
    suggContainer.appendChild(btn);
  });

  const tagsContainer = document.getElementById('tags-container').parentElement;
  tagsContainer.insertAdjacentElement('afterend', suggContainer);

  // Fecha mínima = hoy
  const dateInput = document.getElementById('fecha_limite');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
  }

  // ── Form Submit ────────────────────────────────────────────────────────────
  document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validación
    let valid = true;
    const requiredFields = ['titulo', 'tipo_trabajo', 'fecha_limite'];
    requiredFields.forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (!el || !el.value.trim()) {
        el?.classList.add('is-error');
        valid = false;
      } else {
        el.classList.remove('is-error');
      }
    });

    if (!valid) {
      showToast('Por favor completa los campos requeridos', 'error');
      // Scroll al primer error
      document.querySelector('.is-error')?.scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }

    // Armar payload
    const precio = parseFloat(document.getElementById('precio_total').value) || 0;
    const adelantoVal = parseFloat(document.getElementById('adelanto').value) || 0;
    const payload = {
      titulo:               document.getElementById('titulo').value.trim(),
      tipo_trabajo:         document.getElementById('tipo_trabajo').value,
      etiquetas_tecnicas:   document.getElementById('etiquetas_tecnicas').value || null,
      fecha_limite:         document.getElementById('fecha_limite').value,
      indicaciones_extra:   document.getElementById('indicaciones_extra').value.trim() || null,
      url_archivos_cliente: document.getElementById('url_archivos_cliente').value.trim() || null,
      estado:               document.getElementById('estado').value,
      precio_total:         precio,
      adelanto:             adelantoVal,
      cliente_id:           document.getElementById('cliente_id').value ? parseInt(document.getElementById('cliente_id').value) : null
    };

    // Loading state
    const btnText    = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const submitBtn  = document.getElementById('submit-btn');
    btnText.textContent = 'Guardando...';
    btnSpinner.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
      await api.createProject(payload);
      showToast('✅ Proyecto creado exitosamente', 'success');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1000);
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
      btnText.textContent = 'Guardar Proyecto';
      btnSpinner.classList.add('hidden');
      submitBtn.disabled = false;
    }
  });
});
