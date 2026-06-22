/**
 * auth.js — Gestión de sesión: redirección si no hay token, logout.
 * Incluir ANTES de api.js en todas las páginas protegidas.
 */

// Proteger páginas: si no hay token, redirigir al login
(function checkAuth() {
  const publicPaths = ['/', '/index.html'];
  const currentPath = window.location.pathname;
  if (!publicPaths.includes(currentPath)) {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
    }
  }
})();

// Logout — bind al botón con id="logout-btn" en cada página
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      // Detener todos los cronómetros activos
      if (window.trackerManager) {
        window.trackerManager.stopAll();
      }
      window.location.href = '/';
    });
  }
});
