/**
 * theme.js — Light / Dark mode toggle for CodeArena
 * Include this script in every page. It will:
 *   1. Apply the saved theme immediately (no flash)
 *   2. Inject a toggle button into the navbar
 */

(function () {
    // ── Apply saved theme right away ──────────────────────────────────────────
    const saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'light') document.documentElement.classList.add('light-mode');

    // ── Inject toggle button once the DOM is ready ────────────────────────────
    function injectToggle() {
        // Already injected?
        if (document.getElementById('themeToggleBtn')) return;

        // Find the navbar (student or faculty variant)
        const nav = document.querySelector('.navbar-nav, .faculty-nav-links, .nav-links');
        if (!nav) return;

        const btn = document.createElement('li');
        btn.innerHTML = `
            <button class="theme-toggle" id="themeToggleBtn" title="Toggle light/dark mode">
                <span id="themeIcon">${saved === 'light' ? '🌙' : '☀️'}</span>
            </button>`;
        nav.appendChild(btn);

        document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    }

    function toggleTheme() {
        const isLight = document.documentElement.classList.toggle('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = isLight ? '🌙' : '☀️';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectToggle);
    } else {
        injectToggle();
    }
})();
