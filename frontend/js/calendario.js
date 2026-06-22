document.addEventListener('DOMContentLoaded', async () => {
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let projects = [];

  try {
    projects = await api.getProjects();
  } catch(e) {
    console.error('Error fetching projects', e);
  }

  const renderCalendar = () => {
    const grid = document.getElementById('calendar-grid');
    const display = document.getElementById('month-year-display');
    
    // Clear
    grid.innerHTML = '';
    
    // Config
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    display.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

    // Empty spaces for start
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day';
      emptyDay.style.opacity = '0.3';
      grid.appendChild(emptyDay);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';
      
      if (isCurrentMonth && day === today.getDate()) {
        dayCell.classList.add('today');
      }

      const numStr = document.createElement('div');
      numStr.className = 'calendar-day-number';
      numStr.textContent = day;
      dayCell.appendChild(numStr);

      // Find projects for this day
      const dayProjects = projects.filter(p => {
        if (!p.fecha_limite) return false;
        const pd = new Date(p.fecha_limite + 'T00:00:00');
        return pd.getDate() === day && pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
      });

      dayProjects.forEach(p => {
        const ev = document.createElement('div');
        ev.className = 'calendar-event';
        
        // Colores según estado
        if (p.estado === 'Pendiente') ev.classList.add('event-pendiente');
        else if (p.estado === 'En Desarrollo') ev.classList.add('event-desarrollo');
        else if (p.estado === 'En Revisión') ev.classList.add('event-revision');
        else if (p.estado === 'Entregado') ev.classList.add('event-entregado');

        ev.textContent = p.titulo;
        ev.title = p.titulo;
        
        // Link al dashboard buscando este proyecto (opcional)
        ev.onclick = () => {
          window.location.href = `/dashboard`;
        };
        
        dayCell.appendChild(ev);
      });

      grid.appendChild(dayCell);
    }
  };

  document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  });

  renderCalendar();
});
