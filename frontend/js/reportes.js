document.addEventListener('DOMContentLoaded', async () => {
  try {
    const projects = await api.getProjects();
    
    // Calcular totales
    let totalPendienteCobro = 0;
    let rentabilidades = [];
    
    const countEstado = {
      'Pendiente': 0, 'En Desarrollo': 0, 'En Revisión': 0, 'Entregado': 0
    };
    const countTipo = {};

    projects.forEach(p => {
      // Estado
      if (countEstado[p.estado] !== undefined) countEstado[p.estado]++;
      
      // Tipo
      const t = p.tipo_trabajo || 'Otro';
      countTipo[t] = (countTipo[t] || 0) + 1;
      
      // Finanzas (solo si no está anulado)
      if (p.estado !== 'Anulado') {
        if (p.saldo_pendiente > 0) {
          totalPendienteCobro += p.saldo_pendiente;
        }
        
        // Rentabilidad
        if (p.precio_total > 0 && p.total_minutos > 0) {
          const h = p.total_minutos / 60;
          rentabilidades.push(p.precio_total / h);
        }
      }
    });

    document.getElementById('total-saldos').textContent = `S/ ${totalPendienteCobro.toFixed(2)}`;
    
    if (rentabilidades.length > 0) {
      const avg = rentabilidades.reduce((a,b)=>a+b, 0) / rentabilidades.length;
      document.getElementById('promedio-renta').textContent = `S/ ${avg.toFixed(2)}`;
    }

    // Chart.js - Estado
    const ctxEstado = document.getElementById('chartEstado').getContext('2d');
    new Chart(ctxEstado, {
      type: 'bar',
      data: {
        labels: Object.keys(countEstado),
        datasets: [{
          label: 'Proyectos',
          data: Object.values(countEstado),
          backgroundColor: ['#fbbf24', '#818cf8', '#22d3ee', '#34d399'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });

    // Chart.js - Tipo
    const ctxTipo = document.getElementById('chartTipo').getContext('2d');
    new Chart(ctxTipo, {
      type: 'doughnut',
      data: {
        labels: Object.keys(countTipo),
        datasets: [{
          data: Object.values(countTipo),
          backgroundColor: ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'right' } } }
    });

  } catch (err) {
    console.error('Error cargando reportes', err);
  }
});
