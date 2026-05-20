/**
 * theme.js — Light / Dark mode toggle for CodeArena
 * Include this script in every page. It will:
 *   1. Apply the saved theme immediately (no flash)
 *   2. Inject a toggle button into the navbar
 *      Supports: .navbar-nav, .faculty-nav-links, .nav-links, .auth-nav-links
 *      Fallback: floating button in the bottom-right corner
 */

(function () {
    // ── Apply saved theme right away (before paint) ───────────────────────────
    const saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'light') document.documentElement.classList.add('light-mode');

    // ── Build the toggle button element ──────────────────────────────────────
    function makeToggleBtn(id) {
        const btn = document.createElement('button');
        btn.className   = 'theme-toggle';
        btn.id          = id || 'themeToggleBtn';
        btn.title       = 'Toggle light / dark mode';
        btn.innerHTML   = `<span id="themeIcon">${saved === 'light' ? '🌙' : '☀️'}</span>`;
        btn.addEventListener('click', toggleTheme);
        return btn;
    }

    // ── Inject into navbar ────────────────────────────────────────────────────
    function injectToggle() {
        if (document.getElementById('themeToggleBtn')) return;   // already present

        // Priority-ordered navbar selectors
        const nav = document.querySelector(
            '.navbar-nav, .faculty-nav-links, .nav-links, .auth-nav-links, .login-nav-links'
        );

        if (nav) {
            // For <ul>-based navbars wrap in <li>; otherwise append directly
            if (nav.tagName === 'UL') {
                const li = document.createElement('li');
                li.appendChild(makeToggleBtn());
                nav.appendChild(li);
            } else {
                nav.appendChild(makeToggleBtn());
            }
        } else {
            // Fallback: floating button (bottom-right)
            injectFloatingToggle();
        }
    }

    // ── Floating fallback button ──────────────────────────────────────────────
    function injectFloatingToggle() {
        if (document.getElementById('themeToggleBtn')) return;
        const wrapper = document.createElement('div');
        wrapper.style.cssText = [
            'position:fixed',
            'bottom:1.5rem',
            'right:1.5rem',
            'z-index:9999',
        ].join(';');
        wrapper.appendChild(makeToggleBtn());
        document.body.appendChild(wrapper);
    }

    // ── Toggle handler ────────────────────────────────────────────────────────
    function toggleTheme() {
        const isLight = document.documentElement.classList.toggle('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = isLight ? '🌙' : '☀️';
    }

    // ── Wait for DOM ──────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectToggle);
    } else {
        injectToggle();
    }
})();
