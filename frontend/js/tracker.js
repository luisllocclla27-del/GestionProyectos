/**
 * tracker.js — Cronómetro por proyecto (Time Tracker)
 * Gestiona timers independientes para cada tarjeta Kanban.
 * Guarda automáticamente en la API cada vez que se pausa.
 */

window.trackerManager = (function () {
  // Estado de cada timer: { projectId: { interval, seconds, running, totalMinutos } }
  const timers = {};
  let activeProjectId = null;
  let floatingWidget = null;

  /**
   * Inyecta el widget flotante en el DOM
   */
  function initFloatingWidget() {
    if (document.getElementById('global-floating-timer')) return;
    
    floatingWidget = document.createElement('div');
    floatingWidget.id = 'global-floating-timer';
    floatingWidget.className = 'floating-timer';
    floatingWidget.innerHTML = `
      <div class="floating-timer-info">
        <span class="floating-timer-title">Trabajando en</span>
        <span class="floating-timer-project" id="floating-timer-project-name">---</span>
      </div>
      <div class="floating-timer-clock" id="floating-timer-clock">00:00</div>
      <div class="floating-timer-btn" id="floating-timer-stop" title="Detener">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"/></svg>
      </div>
    `;
    document.body.appendChild(floatingWidget);

    document.getElementById('floating-timer-stop').addEventListener('click', () => {
      if (activeProjectId) trackerManager.toggle(activeProjectId);
    });
  }

  /**
   * Formatea segundos a HH:MM:SS
   */
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  /**
   * Actualiza el display del cronómetro en la tarjeta y en el widget flotante
   */
  function updateDisplay(projectId) {
    const display = document.getElementById(`timer-display-${projectId}`);
    const timer = timers[projectId];
    
    if (display && timer) {
      display.textContent = formatTime(timer.seconds);
      if (timer.running) display.classList.add('running');
      else display.classList.remove('running');
    }

    // Actualizar widget global si es el activo
    if (projectId === activeProjectId && floatingWidget) {
      document.getElementById('floating-timer-clock').textContent = formatTime(timer.seconds);
    }
  }

  /**
   * Guarda el tiempo transcurrido en la API y resetea el contador de la sesión
   */
  async function saveTime(projectId) {
    const timer = timers[projectId];
    if (!timer || timer.seconds === 0) return;

    const minutesToSave = Math.floor(timer.seconds / 60);
    if (minutesToSave < 1) return; // No guardar menos de 1 minuto

    try {
      await api.addTimeEntry(projectId, minutesToSave);
      timer.seconds = timer.seconds % 60; // conservar segundos sobrantes
      showToast(`⏱ ${minutesToSave} min registrados`, 'success', 2500);
      
      // Intentar actualizar UI de la tarjeta si existe (por ejemplo, recargando metricas)
      if (typeof loadProjects === 'function') loadProjects();
    } catch (err) {
      showToast('Error al guardar el tiempo', 'error');
    }
  }

  // Inicializar widget global en cuanto cargue el DOM
  document.addEventListener('DOMContentLoaded', initFloatingWidget);

  return {
    init(projectId, totalMinutos = 0) {
      if (!timers[projectId]) {
        timers[projectId] = { interval: null, seconds: 0, running: false, totalMinutos };
      }
    },

    toggle(projectId) {
      if (!timers[projectId]) this.init(projectId);
      const timer = timers[projectId];
      const btn = document.getElementById(`btn-tracker-${projectId}`);

      if (timer.running) {
        // PAUSAR
        clearInterval(timer.interval);
        timer.interval = null;
        timer.running = false;
        activeProjectId = null;
        
        if (btn) {
          btn.innerHTML = `▶ Iniciar`;
          btn.classList.remove('running');
        }
        
        // Ocultar widget global
        if (floatingWidget) floatingWidget.classList.remove('active');
        
        saveTime(projectId);
      } else {
        // INICIAR: Si hay otro activo, pausarlo primero
        if (activeProjectId && activeProjectId !== projectId) {
          this.toggle(activeProjectId); 
        }

        activeProjectId = projectId;
        timer.running = true;
        
        if (btn) {
          btn.innerHTML = `⏸ Pausar`;
          btn.classList.add('running');
        }

        // Mostrar widget global
        if (floatingWidget) {
          // Intentar buscar el título del proyecto en allProjects
          let pTitle = `Proyecto #${projectId}`;
          if (typeof allProjects !== 'undefined') {
            const p = allProjects.find(x => x.id === projectId);
            if (p) pTitle = p.titulo;
          }
          document.getElementById('floating-timer-project-name').textContent = pTitle;
          floatingWidget.classList.add('active');
        }

        timer.interval = setInterval(() => {
          timer.seconds++;
          updateDisplay(projectId);
          if (timer.seconds % 1800 === 0) saveTime(projectId); // Auto-guardar cada 30min
        }, 1000);
      }
      updateDisplay(projectId);
    },

    stopAll() {
      for (const [id, timer] of Object.entries(timers)) {
        if (timer.running) {
          clearInterval(timer.interval);
          timer.running = false;
          saveTime(parseInt(id));
        }
      }
      activeProjectId = null;
      if (floatingWidget) floatingWidget.classList.remove('active');
    },

    formatTime
  };
})();
