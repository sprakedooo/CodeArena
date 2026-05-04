/**
 * sidebar.js — Shared sidebar layout for CodeArena
 * Uses Google Material Symbols Outlined for all icons.
 *
 * Usage: <script src="../js/sidebar.js"></script>
 * Config: window.SIDEBAR_PAGE = 'learn' | window.SIDEBAR_ROLE = 'faculty'
 */

(function () {
    // ── 1. Apply saved theme immediately (no flash) ───────────────────────────
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') document.documentElement.classList.add('light-mode');
    document.documentElement.style.visibility = 'hidden';

    // ── 2. Inject Material Symbols font if not already loaded ─────────────────
    if (!document.getElementById('material-symbols-font')) {
        const link = document.createElement('link');
        link.id   = 'material-symbols-font';
        link.rel  = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block';
        document.head.appendChild(link);
    }

    // Helper: render a Material Symbol
    function icon(name, extra = '') {
        return `<span class="material-symbols-outlined ms-icon${extra ? ' ' + extra : ''}">${name}</span>`;
    }

    // ── 3. Nav definitions (using Material Symbol names) ──────────────────────
    const studentNav = [
        { icon: 'home',           label: 'Home',             href: 'dashboard.html',   key: 'dashboard'  },
        { icon: 'menu_book',      label: 'Learn Programming', href: 'learn.html',       key: 'learn'      },
        { icon: 'school',         label: 'My Classrooms',     href: 'classrooms.html',  key: 'classrooms' },
        { icon: 'sports_esports', label: 'Play',              href: 'lesson_game.html', key: 'play'       },
        { icon: 'terminal',       label: 'Practice',          href: 'playground.html',  key: 'practice'   },
        { icon: 'bar_chart',      label: 'Analytics',         href: 'analytics.html',   key: 'analytics'  },
        { icon: 'person',         label: 'Profile',           href: 'profile.html',     key: 'profile'    },
    ];

    const facultyNav = [
        { icon: 'grid_view',    label: 'Dashboard',       href: 'faculty_dashboard.html',  key: 'dashboard'  },
        { icon: 'school',       label: 'My Classrooms',   href: 'classrooms_faculty.html', key: 'classrooms' },
        { icon: 'add_circle',   label: 'Contribute',      href: 'contribute.html',         key: 'contribute' },
        { icon: 'person',       label: 'Profile',         href: 'profile.html',            key: 'profile'    },
    ];

    // ── 4. Active page detection ──────────────────────────────────────────────
    function detectActivePage() {
        if (window.SIDEBAR_PAGE) return window.SIDEBAR_PAGE;
        const file = location.pathname.split('/').pop() || 'dashboard.html';
        const map = {
            'dashboard.html':        'dashboard',
            'learn.html':            'learn',
            'lessons.html':          'learn',
            'lesson_view.html':      'learn',
            'classrooms.html':       'classrooms',
            'classroom_room.html':   'classrooms',
            'lesson_game.html':      'play',
            'playground.html':       'practice',
            'leaderboard.html':      'leaderboard',
            'analytics.html':        'analytics',
            'profile.html':          'profile',
            'faculty_dashboard.html':'dashboard',
            'classrooms_faculty.html':'classrooms',
            'classroom_manage.html': 'classrooms',
            'contribute.html':        'contribute',
            'contribution_view.html':'learn',
            'daily_challenge.html':  'dashboard',
        };
        return map[file] || 'dashboard';
    }

    // ── 5. Avatar HTML ────────────────────────────────────────────────────────
    function buildAvatar(user, size = 34) {
        if (user.avatar) {
            return `<img src="${esc(user.avatar)}" class="user-avatar" style="width:${size}px;height:${size}px;" alt="Avatar">`;
        }
        const name     = user.fullName || user.name || 'U';
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return `<div class="user-avatar-placeholder" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.35)}px;">${initials}</div>`;
    }

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── 6. Build & inject layout ──────────────────────────────────────────────
    function buildSidebar() {
        const user      = JSON.parse(localStorage.getItem('user') || '{}');
        const role      = window.SIDEBAR_ROLE || user.role || 'student';
        const active    = detectActivePage();
        const navItems  = role === 'faculty' ? facultyNav : studentNav;
        const isLight   = savedTheme === 'light';
        const themeIconName = isLight ? 'dark_mode' : 'light_mode';
        const themeLbl      = isLight ? 'Dark Mode' : 'Light Mode';

        // Nav HTML
        const navHtml = navItems.map(item => {
            const isActive = active === item.key;
            if (item.expandable) {
                return `
                <div class="sidebar-item-group${isActive ? ' open' : ''}" data-group="${item.key}">
                    <div class="sidebar-item${isActive ? ' active' : ''}" data-key="${item.key}" data-label="${item.label}" data-toggle="${item.key}" role="button" tabindex="0" title="${item.label}">
                        ${icon(item.icon, 'sidebar-icon')}
                        <span class="sidebar-label">${item.label}</span>
                        <span class="sidebar-nav-badge" id="badge-${item.key}"></span>
                        <span class="material-symbols-outlined ms-icon sidebar-expand-chevron">expand_more</span>
                    </div>
                    <div class="sidebar-subnav" id="subnav-${item.key}">
                        <span class="sidebar-subitem-empty">Loading…</span>
                    </div>
                </div>`;
            }
            return `
            <a href="${item.href}" class="sidebar-item${isActive ? ' active' : ''}" data-key="${item.key}" data-label="${item.label}">
                ${icon(item.icon, 'sidebar-icon')}
                <span class="sidebar-label">${item.label}</span>
            </a>`;
        }).join('');

        // Sidebar
        const sidebar = document.createElement('aside');
        sidebar.className = 'sidebar';
        sidebar.id        = 'appSidebar';
        sidebar.innerHTML = `
            <div class="sidebar-logo">
                <a href="${role === 'faculty' ? 'faculty_dashboard.html' : 'dashboard.html'}" style="display:block;text-decoration:none;">
                    <img src="../assets/codearena-logo.png" alt="CodeArena" class="sidebar-logo-img">
                </a>
            </div>
            <nav class="sidebar-nav">${navHtml}</nav>

            <div class="sidebar-footer"></div>`;

        // Topbar
        const name      = user.fullName || user.name || 'User';
        const firstName = name.split(' ')[0];
        const roleLabel = role === 'faculty' ? 'Faculty' : 'Student';

        const topbar = document.createElement('header');
        topbar.className = 'topbar';
        topbar.id        = 'appTopbar';
        topbar.innerHTML = `
            <button class="sidebar-toggle-btn" id="sidebarToggleBtn" title="Toggle sidebar">
                <span class="material-symbols-outlined ms-icon sidebar-toggle-icon">left_panel_close</span>
            </button>
            <div class="topbar-search">
                ${icon('search', 'search-icon')}
                <input type="text" placeholder="Search resources…" id="globalSearch" autocomplete="off">
            </div>
            <div class="topbar-actions">
                <button class="topbar-icon-btn" id="notifBtn" title="Notifications">
                    ${icon('notifications')}
                    <span class="notification-dot"></span>
                </button>
                <button class="topbar-icon-btn" id="sidebarThemeBtn" title="${themeLbl}">
                    ${icon(themeIconName, 'sidebar-icon')}
                </button>
                <div class="topbar-divider"></div>
                <div class="topbar-user-wrap" id="topbarUserWrap">
                    <div class="topbar-user" id="topbarUser" title="Account">
                        ${buildAvatar(user, 34)}
                        <div class="topbar-user-info">
                            <span class="topbar-user-name">${esc(firstName)}</span>
                            <span class="topbar-user-role">${roleLabel}</span>
                        </div>
                        ${icon('expand_more', 'topbar-chevron')}
                    </div>
                    <div class="topbar-dropdown" id="topbarDropdown">
                        <a class="topbar-dropdown-item" href="profile.html">
                            ${icon('person')}
                            <span>Profile</span>
                        </a>
                        <div class="topbar-dropdown-divider"></div>
                        <button class="topbar-dropdown-item topbar-dropdown-logout" id="topbarLogoutBtn">
                            ${icon('logout')}
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>`;

        // Wrap existing body content
        const pageContent = document.createElement('div');
        pageContent.className = 'page-content';
        while (document.body.firstChild) {
            pageContent.appendChild(document.body.firstChild);
        }

        const mainWrapper = document.createElement('div');
        mainWrapper.className = 'main-wrapper';
        mainWrapper.id        = 'mainWrapper';
        mainWrapper.appendChild(topbar);
        mainWrapper.appendChild(pageContent);

        const appLayout = document.createElement('div');
        appLayout.className = 'app-layout';
        appLayout.appendChild(sidebar);
        appLayout.appendChild(mainWrapper);

        document.body.appendChild(appLayout);

        // Events
        document.getElementById('sidebarThemeBtn').addEventListener('click', toggleTheme);

        // User dropdown
        const userWrap    = document.getElementById('topbarUserWrap');
        const userBtn     = document.getElementById('topbarUser');
        const dropdown    = document.getElementById('topbarDropdown');
        const chevron     = userBtn.querySelector('.topbar-chevron');

        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = dropdown.classList.toggle('open');
            if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
            if (chevron) chevron.style.transform = '';
        });

        document.getElementById('topbarLogoutBtn').addEventListener('click', () => {
            if (!confirm('Are you sure you want to log out?')) return;
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('isLoggedIn');
            location.href = 'login.html';
        });

        // Sidebar collapse toggle
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (sidebarCollapsed) applyCollapsed(true, sidebar, mainWrapper);
        else updateToggleIcon(false); // initialise icon for expanded state

        document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
            const isCollapsed = sidebar.classList.contains('collapsed');
            applyCollapsed(!isCollapsed, sidebar, mainWrapper);
            localStorage.setItem('sidebarCollapsed', !isCollapsed);
        });

        // On resize: switch between arrow (desktop) and hamburger (mobile)
        window.addEventListener('resize', () => {
            const isCollapsed = sidebar.classList.contains('collapsed');
            updateToggleIcon(isCollapsed);
        });

        // Expandable group toggle — clicking the parent item toggles open/closed
        sidebar.querySelectorAll('[data-toggle]').forEach(trigger => {
            const toggleGroup = (e) => {
                e.preventDefault();
                const group = sidebar.querySelector(`.sidebar-item-group[data-group="${trigger.dataset.toggle}"]`);
                if (group) group.classList.toggle('open');
            };
            trigger.addEventListener('click', toggleGroup);
            trigger.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') toggleGroup(e); });
        });

        // Faculty: fetch courses for My Courses dropdown
        if (role === 'faculty') {
            const token = localStorage.getItem('token');
            (async () => {
                try {
                    const res  = await fetch(`http://${window.location.hostname}:3000/api/classrooms/mine`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    const courses = data.classrooms || [];
                    const sub   = document.getElementById('subnav-classrooms');
                    const badge = document.getElementById('badge-classrooms');
                    if (!sub) return;

                    // Update count badge
                    if (badge) badge.textContent = courses.length || '';

                    const currentId = new URLSearchParams(location.search).get('id');
                    if (!courses.length) {
                        sub.innerHTML = `<span class="sidebar-subitem-empty">No courses yet</span>`;
                    } else {
                        const items = courses.map(c => {
                            const id = c.classroom_id || c.id;
                            const isSubActive = String(currentId) === String(id) ? ' active' : '';
                            return `<a href="classroom_manage.html?id=${id}" class="sidebar-subitem${isSubActive}" title="${esc(c.name)}">${esc(c.name)}</a>`;
                        }).join('');
                        sub.innerHTML = items + `<a href="classrooms_faculty.html" class="sidebar-subitem sidebar-subitem-viewall">View all courses →</a>`;
                    }
                } catch {
                    const sub = document.getElementById('subnav-classrooms');
                    if (sub) sub.innerHTML = `<span class="sidebar-subitem-empty">Could not load</span>`;
                }
            })();
        }

        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    const q = searchInput.value.trim();
                    if (q) location.href = `learn.html?q=${encodeURIComponent(q)}`;
                }
            });
        }

        // Reveal
        document.documentElement.style.visibility = '';
    }

    // ── 7. Sidebar collapse ───────────────────────────────────────────────────
    function updateToggleIcon(isCollapsed) {
        const iconEl = document.querySelector('.sidebar-toggle-icon');
        if (!iconEl) return;
        // On mobile keep the hamburger; on desktop show directional arrow
        if (window.innerWidth <= 768) {
            iconEl.textContent = 'menu';
        } else {
            iconEl.textContent = isCollapsed ? 'left_panel_open' : 'left_panel_close';
        }
    }

    function applyCollapsed(collapse, sidebar, mainWrapper) {
        if (collapse) {
            sidebar.classList.add('collapsed');
            mainWrapper.classList.add('sidebar-collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            mainWrapper.classList.remove('sidebar-collapsed');
        }
        updateToggleIcon(collapse);
    }

    // ── 8. Theme toggle ───────────────────────────────────────────────────────
    function toggleTheme() {
        const isLight = document.documentElement.classList.toggle('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');

        const btn    = document.getElementById('sidebarThemeBtn');
        const iconEl = btn && btn.querySelector('.ms-icon');
        if (iconEl) iconEl.textContent = isLight ? 'dark_mode' : 'light_mode';
        if (btn)    btn.title          = isLight ? 'Dark Mode' : 'Light Mode';
    }

    // ── 9. Global AI Assistant Widget ────────────────────────────────────────
    function buildAIAssistant() {
        const API       = `http://${window.location.hostname}:3000/api`;
        const _user     = JSON.parse(localStorage.getItem('user') || '{}');
        const _role     = window.SIDEBAR_ROLE || _user.role || 'student';
        const isFaculty = _role === 'faculty';
        let conversationHistory = [];
        let isOpen = false;

        // ── Inject widget styles ───────────────────────────────────────────
        const style = document.createElement('style');
        style.textContent = `
            .ai-fab {
                position: fixed;
                bottom: 1.75rem;
                right: 1.75rem;
                z-index: 9999;
            }
            /* ── FAB: circle by default, expands on hover ── */
            .ai-fab-btn {
                position: relative;
                width: 56px; height: 56px;
                padding: 0;
                border-radius: 50%;
                background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #06b6d4 100%);
                background-size: 200% 200%;
                animation: ai-fab-shimmer 6s ease-in-out infinite;
                border: none; cursor: grab;
                display: flex; align-items: center; justify-content: center;
                gap: 0;
                box-shadow: 0 6px 24px rgba(124,58,237,0.5),
                            0 0 0 1px rgba(255,255,255,0.08) inset;
                transition: width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                            border-radius 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                            padding 0.3s ease,
                            gap 0.3s ease,
                            box-shadow 0.25s ease,
                            transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                color: #fff;
                font-family: inherit;
                overflow: hidden;
                white-space: nowrap;
                user-select: none;
            }
            /* Expand pill on hover (when panel is NOT open) */
            .ai-fab-btn:not(.is-open):not(.is-dragging):hover {
                width: 210px;
                border-radius: 999px;
                padding: 0 1.1rem 0 0.55rem;
                gap: 0.55rem;
                box-shadow: 0 10px 32px rgba(124,58,237,0.65),
                            0 0 0 1px rgba(255,255,255,0.15) inset;
                cursor: pointer;
            }
            .ai-fab-btn:not(.is-open):not(.is-dragging):hover .ai-fab-text {
                opacity: 1;
                width: auto;
                pointer-events: auto;
            }
            .ai-fab-btn:active:not(.is-dragging) { transform: scale(0.95); }
            .ai-fab-btn.is-dragging { cursor: grabbing !important; transform: scale(1.08); }
            @keyframes ai-fab-shimmer {
                0%,100% { background-position: 0% 50%; }
                50%     { background-position: 100% 50%; }
            }

            /* Bot face avatar inside the FAB */
            .ai-fab-avatar {
                width: 40px; height: 40px;
                border-radius: 50%;
                background: transparent;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
                position: relative;
                overflow: visible;
            }
            .ai-fab-avatar img {
                width: 48px; height: 48px;
                object-fit: contain;
                animation: ai-bot-tilt 4s ease-in-out infinite;
                filter: drop-shadow(0 2px 8px rgba(124,58,237,0.5));
            }
            @keyframes ai-bot-tilt {
                0%,100% { transform: rotate(-4deg); }
                50%     { transform: rotate(4deg); }
            }

            /* Text label — hidden (width:0) until hover expands pill */
            .ai-fab-text {
                display: flex; flex-direction: column; align-items: flex-start;
                line-height: 1.05;
                white-space: nowrap;
                overflow: hidden;
                width: 0;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease 0.05s, width 0.3s ease;
            }
            .ai-fab-text .ai-fab-title {
                font-size: 0.82rem;
                font-weight: 700;
                letter-spacing: 0.2px;
            }
            .ai-fab-text .ai-fab-sub {
                font-size: 0.6rem;
                font-weight: 500;
                opacity: 0.88;
                margin-top: 2px;
                display: flex; align-items: center; gap: 4px;
            }
            .ai-fab-text .ai-fab-sub::before {
                content: '';
                width: 6px; height: 6px; border-radius: 50%;
                background: #34d399;
                box-shadow: 0 0 8px #34d399;
                animation: ai-pulse 2s infinite;
                flex-shrink: 0;
            }

            /* Online pulse dot */
            @keyframes ai-pulse {
                0%,100%{ opacity: 1; transform: scale(1); }
                50%    { opacity: 0.5; transform: scale(1.4); }
            }

            /* When panel is open — red circle close button */
            .ai-fab-btn.is-open {
                width: 52px; height: 52px;
                padding: 0;
                justify-content: center;
                background: linear-gradient(135deg, #ef4444, #b91c1c);
                animation: none;
                cursor: pointer;
            }
            .ai-fab-btn.is-open .ai-fab-avatar { display: none; }
            .ai-fab-btn.is-open .ai-fab-text   { display: none; }
            .ai-fab-btn.is-open::after {
                content: 'close';
                font-family: 'Material Symbols Outlined';
                font-size: 1.5rem;
                color: #fff;
            }

            .ai-panel {
                position: fixed;
                bottom: 5rem; right: 1.75rem;
                width: 390px; max-width: calc(100vw - 2rem);
                height: 480px; max-height: calc(100vh - 7rem);
                background: var(--bg-card, #161b22);
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                display: flex; flex-direction: column;
                z-index: 9998;
                overflow: hidden;
                transform: translateY(12px) scale(0.97);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.22s ease, transform 0.22s ease;
            }
            .ai-panel.open {
                transform: translateY(0) scale(1);
                opacity: 1;
                pointer-events: all;
            }

            .ai-panel-header {
                background: linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.15));
                border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
                padding: 0.75rem 1rem;
                display: flex; align-items: center; gap: 0.75rem;
            }
            .ai-panel-header-icon {
                width: 32px; height: 32px; border-radius: 50%;
                background: linear-gradient(135deg, #7c3aed, #06b6d4);
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
            }
            .ai-panel-header-icon .ms-icon { font-size: 1rem; color: #fff; }
            .ai-panel-header-text { flex: 1; min-width: 0; }
            .ai-panel-header-text strong {
                display: block;
                font-size: 0.9rem; font-weight: 700;
                color: var(--text, #e6edf3);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .ai-panel-header-text span {
                font-size: 0.68rem;
                color: var(--text-muted, rgba(255,255,255,0.45));
                display: block;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .ai-panel-close {
                flex-shrink: 0;
            }
            .ai-panel-close {
                background: none; border: none; cursor: pointer;
                color: var(--text-muted, rgba(255,255,255,0.45));
                display: flex; align-items: center;
                border-radius: 6px; padding: 0.2rem;
                transition: color 0.15s;
            }
            .ai-panel-close:hover { color: var(--text, #e6edf3); }
            .ai-panel-close .ms-icon { font-size: 1.15rem; }

            .ai-messages {
                flex: 1; overflow-y: auto; padding: 0.9rem;
                display: flex; flex-direction: column; gap: 0.65rem;
                scrollbar-width: thin;
                scrollbar-color: var(--border, rgba(255,255,255,0.08)) transparent;
            }

            .ai-msg {
                max-width: 88%; font-size: 0.83rem; line-height: 1.55;
                padding: 0.6rem 0.85rem; border-radius: 12px;
                animation: ai-msg-in 0.18s ease;
            }
            @keyframes ai-msg-in {
                from { opacity:0; transform:translateY(6px); }
                to   { opacity:1; transform:translateY(0); }
            }
            .ai-msg-user {
                align-self: flex-end;
                background: linear-gradient(135deg, #7c3aed, #5b21b6);
                color: #fff;
                border-bottom-right-radius: 4px;
            }
            .ai-msg-bot {
                align-self: flex-start;
                background: var(--bg-surface, #21262d);
                color: var(--text, #e6edf3);
                border-bottom-left-radius: 4px;
                border: 1px solid var(--border, rgba(255,255,255,0.08));
            }
            .ai-msg-bot code {
                background: rgba(124,58,237,0.15);
                padding: 0.1em 0.35em; border-radius: 4px;
                font-family: monospace; font-size: 0.88em;
                color: #a78bfa;
            }

            .ai-typing {
                align-self: flex-start;
                background: var(--bg-surface, #21262d);
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                border-radius: 12px; border-bottom-left-radius: 4px;
                padding: 0.65rem 0.9rem;
                display: flex; align-items: center; gap: 4px;
            }
            .ai-typing span {
                width: 7px; height: 7px; border-radius: 50%;
                background: var(--text-muted, rgba(255,255,255,0.45));
                animation: ai-bounce 1.2s infinite;
            }
            .ai-typing span:nth-child(2) { animation-delay: 0.2s; }
            .ai-typing span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes ai-bounce {
                0%,80%,100%{ transform: translateY(0); opacity:0.5; }
                40%{ transform: translateY(-5px); opacity:1; }
            }

            .ai-suggestions {
                display: flex; flex-wrap: wrap; gap: 0.4rem;
                padding: 0 0.9rem 0.6rem;
            }
            .ai-suggestion-chip {
                font-size: 0.72rem; padding: 0.28rem 0.65rem;
                border-radius: 20px; cursor: pointer;
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                color: var(--text-secondary, rgba(255,255,255,0.65));
                background: var(--bg-surface, #21262d);
                transition: border-color 0.15s, color 0.15s;
                white-space: nowrap;
            }
            .ai-suggestion-chip:hover {
                border-color: #7c3aed; color: #a78bfa;
            }

            .ai-input-row {
                border-top: 1px solid var(--border, rgba(255,255,255,0.08));
                padding: 0.7rem 0.85rem;
                display: flex; gap: 0.5rem; align-items: flex-end;
            }
            .ai-input-row textarea {
                flex: 1; background: var(--bg-surface, #21262d);
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                border-radius: 10px;
                color: var(--text, #e6edf3);
                font-size: 0.82rem; padding: 0.55rem 0.75rem;
                resize: none; outline: none;
                min-height: 38px; max-height: 100px;
                font-family: inherit; line-height: 1.5;
                transition: border-color 0.15s;
            }
            .ai-input-row textarea:focus {
                border-color: rgba(124,58,237,0.5);
            }
            .ai-input-row textarea::placeholder {
                color: var(--text-muted, rgba(255,255,255,0.35));
            }
            .ai-send-btn {
                width: 36px; height: 36px; border-radius: 10px;
                background: linear-gradient(135deg, #7c3aed, #06b6d4);
                border: none; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                color: #fff; flex-shrink: 0;
                transition: opacity 0.15s, transform 0.15s;
            }
            .ai-send-btn:hover { opacity: 0.9; transform: scale(1.05); }
            .ai-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
            .ai-send-btn .ms-icon { font-size: 1rem; }

            /* Light mode overrides */
            .light-mode .ai-panel {
                background: #fff;
                border-color: rgba(0,0,0,0.1);
                box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            }
            .light-mode .ai-msg-bot {
                background: #f3f4f6;
                color: #111827;
                border-color: rgba(0,0,0,0.08);
            }
            .light-mode .ai-input-row textarea {
                background: #f9fafb; color: #111827;
                border-color: rgba(0,0,0,0.12);
            }
            .light-mode .ai-suggestion-chip {
                background: #f3f4f6; color: #374151;
                border-color: rgba(0,0,0,0.1);
            }
            .light-mode .ai-typing {
                background: #f3f4f6;
                border-color: rgba(0,0,0,0.08);
            }
        `;
        document.head.appendChild(style);

        // ── Suggestions (role-aware)
        const SUGGESTIONS = isFaculty ? [
            'Strategies for teaching loops',
            'How to design better quiz questions?',
            'Tips for engaging beginners',
            'How to spot struggling students?',
            'Suggest a project-based activity',
        ] : [
            'Help me understand loops',
            'What is a function?',
            'Explain variables',
            'How do I fix this error?',
            'Give me a quiz question',
        ];

        // ── Build HTML ─────────────────────────────────────────────────────
        const fab = document.createElement('div');
        fab.className = 'ai-fab';
        fab.innerHTML = `
            <div class="ai-panel" id="aiPanel">
                <div class="ai-panel-header">
                    <div class="ai-panel-header-icon" style="background:none;overflow:visible;width:52px;height:52px;flex-shrink:0;">
                        <img src="../assets/ai-avatar.png" alt="AI" style="width:52px;height:52px;object-fit:contain;">
                    </div>
                    <div class="ai-panel-header-text">
                        <strong>${isFaculty ? 'AI Teaching Advisor' : 'AI Tutor'}</strong>
                        <span>${isFaculty ? 'Teaching strategies & course recommendations' : 'Ask me anything about programming'}</span>
                    </div>
                    <button class="ai-panel-close" id="aiPanelClose" title="Close">
                        <span class="material-symbols-outlined ms-icon">close</span>
                    </button>
                </div>
                <div class="ai-messages" id="aiMessages">
                    <div class="ai-msg ai-msg-bot">
                        ${isFaculty
                            ? "Hi! I'm your AI Teaching Advisor. Ask me about teaching strategies, course design, how to engage your students, or recommendations for your courses. 🎓"
                            : "Hi! I'm your AI Tutor. Ask me anything about programming — concepts, debugging, exercises, or your current lesson. 🚀"}
                    </div>
                </div>
                <div class="ai-suggestions" id="aiSuggestions">
                    ${SUGGESTIONS.map(s => `<span class="ai-suggestion-chip">${esc(s)}</span>`).join('')}
                </div>
                <div class="ai-input-row">
                    <textarea id="aiInput" rows="1" placeholder="Ask a question…"></textarea>
                    <button class="ai-send-btn" id="aiSendBtn" title="Send">
                        <span class="material-symbols-outlined ms-icon">send</span>
                    </button>
                </div>
            </div>
            <button class="ai-fab-btn" id="aiFabBtn" title="${isFaculty ? 'AI Teaching Advisor' : 'Chat with your AI Tutor'}" aria-label="${isFaculty ? 'Open AI Teaching Advisor' : 'Open AI Tutor'}">
                <span class="ai-fab-avatar">
                    <img src="../assets/ai-avatar.png" alt="AI Assistant">
                </span>
                <span class="ai-fab-text">
                    <span class="ai-fab-title">${isFaculty ? 'Teaching Advisor' : 'Ask AI Tutor'}</span>
                    <span class="ai-fab-sub">Online · Ready to help</span>
                </span>
            </button>`;

        document.body.appendChild(fab);

        // ── Wire events ────────────────────────────────────────────────────
        const panel    = document.getElementById('aiPanel');
        const fabBtn   = document.getElementById('aiFabBtn');
        const closeBtn = document.getElementById('aiPanelClose');
        const messages = document.getElementById('aiMessages');
        const input    = document.getElementById('aiInput');
        const sendBtn  = document.getElementById('aiSendBtn');
        const suggBox  = document.getElementById('aiSuggestions');

        function openPanel() {
            isOpen = true;
            panel.classList.add('open');
            fabBtn.classList.add('is-open');
            fabBtn.setAttribute('aria-label', 'Close AI Tutor');
            input.focus();
        }
        function closePanel() {
            isOpen = false;
            panel.classList.remove('open');
            fabBtn.classList.remove('is-open');
            fabBtn.setAttribute('aria-label', 'Open AI Tutor');
        }

        // ── Drag-to-reposition ─────────────────────────────────────────────
        let dragging = false, dragOffX = 0, dragOffY = 0, dragMoved = false;

        fabBtn.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            dragging = true; dragMoved = false;
            const rect = fab.getBoundingClientRect();
            dragOffX = e.clientX - rect.right;   // offset from right edge
            dragOffY = e.clientY - rect.bottom;  // offset from bottom edge
            fabBtn.classList.add('is-dragging');
            fabBtn.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        fabBtn.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            dragMoved = true;
            const vw = window.innerWidth, vh = window.innerHeight;
            const size = 60; // approx fab size
            let right  = vw - e.clientX - dragOffX;
            let bottom = vh - e.clientY - dragOffY;
            right  = Math.max(8, Math.min(vw - size, right));
            bottom = Math.max(8, Math.min(vh - size, bottom));
            fab.style.right  = right  + 'px';
            fab.style.bottom = bottom + 'px';
            // Move panel with FAB
            panel.style.right  = right  + 'px';
            panel.style.bottom = (bottom + 64) + 'px';
        });

        fabBtn.addEventListener('pointerup', (e) => {
            if (!dragging) return;
            dragging = false;
            fabBtn.classList.remove('is-dragging');
            if (!dragMoved) {
                // Treat as click
                isOpen ? closePanel() : openPanel();
            }
        });

        fabBtn.addEventListener('click', (e) => {
            // Handled by pointerup when not dragging
            if (dragMoved) { dragMoved = false; return; }
        });
        closeBtn.addEventListener('click', closePanel);

        // Suggestion chips
        suggBox.querySelectorAll('.ai-suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                input.value = chip.textContent;
                suggBox.style.display = 'none';
                sendMessage();
            });
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });

        // Send on Enter (Shift+Enter = newline)
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        sendBtn.addEventListener('click', sendMessage);

        // ── Send message ───────────────────────────────────────────────────
        async function sendMessage() {
            const text = input.value.trim();
            if (!text) return;

            const token = localStorage.getItem('token');
            if (!token) {
                appendMessage('Please log in to use the AI Tutor.', 'bot');
                return;
            }

            // Add user message
            appendMessage(text, 'user');
            conversationHistory.push({ role: 'user', content: text });
            input.value = '';
            input.style.height = 'auto';
            sendBtn.disabled = true;
            suggBox.style.display = 'none';

            // Typing indicator
            const typing = document.createElement('div');
            typing.className = 'ai-typing';
            typing.innerHTML = '<span></span><span></span><span></span>';
            messages.appendChild(typing);
            messages.scrollTop = messages.scrollHeight;

            try {
                const res = await fetch(`http://${window.location.hostname}:3000/api/ai/ask`, {
                    method:  'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        message: text,
                        conversationHistory: conversationHistory.slice(-8), // last 4 turns
                    }),
                });

                typing.remove();

                if (!res.ok) throw new Error('API error');
                const data = await res.json();
                const reply = data.reply || 'Sorry, I could not generate a response.';

                appendMessage(reply, 'bot');
                conversationHistory.push({ role: 'assistant', content: reply });

            } catch (err) {
                typing.remove();
                appendMessage('I encountered an error. Please check your connection and try again.', 'bot');
            } finally {
                sendBtn.disabled = false;
                input.focus();
            }
        }

        function appendMessage(text, type) {
            const el = document.createElement('div');
            el.className = `ai-msg ai-msg-${type}`;
            // Simple markdown: wrap `code` in <code>
            el.innerHTML = esc(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
            messages.appendChild(el);
            messages.scrollTop = messages.scrollHeight;
        }
    }

    // ── 10. Notification Panel ────────────────────────────────────────────────
    function buildNotifications() {
        const API    = `http://${window.location.hostname}:3000/api`;
        let panelOpen = false;
        let loaded    = false;

        // ── Styles ─────────────────────────────────────────────────────────
        const nStyle = document.createElement('style');
        nStyle.textContent = `
            .notif-panel {
                position: fixed;
                top: 60px; right: 1rem;
                width: 320px; max-width: calc(100vw - 2rem);
                max-height: 420px;
                background: var(--bg-card, #161b22);
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                border-radius: 14px;
                box-shadow: 0 16px 48px rgba(0,0,0,0.5);
                display: flex; flex-direction: column;
                z-index: 9990;
                overflow: hidden;
                transform: translateY(-8px) scale(0.97);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            .notif-panel.open {
                transform: translateY(0) scale(1);
                opacity: 1;
                pointer-events: all;
            }
            .notif-panel-header {
                padding: 0.85rem 1rem 0.65rem;
                border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
                display: flex; align-items: center; justify-content: space-between;
            }
            .notif-panel-title {
                font-size: 0.82rem; font-weight: 700;
                color: var(--text, #e6edf3);
            }
            .notif-mark-read {
                font-size: 0.68rem; color: var(--primary, #7c3aed);
                background: none; border: none; cursor: pointer;
                padding: 0;
            }
            .notif-list {
                flex: 1; overflow-y: auto; padding: 0.4rem 0;
                scrollbar-width: thin;
                scrollbar-color: var(--border, rgba(255,255,255,0.08)) transparent;
            }
            .notif-item {
                display: flex; align-items: flex-start; gap: 0.75rem;
                padding: 0.7rem 1rem;
                border-bottom: 1px solid var(--border, rgba(255,255,255,0.05));
                cursor: default;
                transition: background 0.15s;
            }
            .notif-item:hover { background: var(--bg-surface, #21262d); }
            .notif-item:last-child { border-bottom: none; }
            .notif-item-icon {
                width: 34px; height: 34px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
                font-size: 1rem;
            }
            .notif-item-icon.xp     { background: rgba(251,191,36,0.15); color: #fbbf24; }
            .notif-item-icon.badge  { background: rgba(124,58,237,0.15); color: #7c3aed; }
            .notif-item-icon.streak { background: rgba(239,68,68,0.15);  color: #ef4444; }
            .notif-item-icon.lesson { background: rgba(16,185,129,0.15); color: #10b981; }
            .notif-item-body { flex: 1; min-width: 0; }
            .notif-item-text {
                font-size: 0.78rem; color: var(--text, #e6edf3);
                line-height: 1.4; margin-bottom: 0.2rem;
            }
            .notif-item-time {
                font-size: 0.65rem; color: var(--text-muted, rgba(255,255,255,0.35));
            }
            .notif-empty {
                text-align: center; padding: 2rem 1rem;
                color: var(--text-muted, rgba(255,255,255,0.35));
                font-size: 0.78rem;
            }
            .notif-empty .ms-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; opacity: 0.4; }
        `;
        document.head.appendChild(nStyle);

        // ── Build panel DOM ────────────────────────────────────────────────
        const panel = document.createElement('div');
        panel.className = 'notif-panel';
        panel.id        = 'notifPanel';
        panel.innerHTML = `
            <div class="notif-panel-header">
                <span class="notif-panel-title">Notifications</span>
                <button class="notif-mark-read" id="notifMarkRead">Mark all read</button>
            </div>
            <div class="notif-list" id="notifList">
                <div class="notif-empty">
                    <span class="material-symbols-outlined ms-icon">notifications_none</span>
                    Loading…
                </div>
            </div>`;
        document.body.appendChild(panel);

        // ── Wire bell button ───────────────────────────────────────────────
        const notifBtn = document.getElementById('notifBtn');
        if (!notifBtn) return;

        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            panelOpen = !panelOpen;
            panel.classList.toggle('open', panelOpen);
            if (panelOpen && !loaded) { loaded = true; fetchNotifications(); }
            // hide dot once opened
            const dot = notifBtn.querySelector('.notification-dot');
            if (dot && panelOpen) dot.style.opacity = '0';
        });

        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target !== notifBtn) {
                panelOpen = false;
                panel.classList.remove('open');
            }
        });

        document.getElementById('notifMarkRead')?.addEventListener('click', () => {
            const dot = notifBtn.querySelector('.notification-dot');
            if (dot) dot.style.opacity = '0';
            localStorage.setItem('notifReadAt', Date.now());
        });

        // ── Fetch & render ─────────────────────────────────────────────────
        async function fetchNotifications() {
            const token = localStorage.getItem('token');
            const list  = document.getElementById('notifList');
            try {
                const res = await fetch(`${API}/notifications`, {
                    headers: { 'Authorization': 'Bearer ' + (token || '') }
                });
                const data = res.ok ? await res.json() : null;
                const items = data?.notifications || [];
                if (items.length === 0) {
                    list.innerHTML = `<div class="notif-empty">
                        <span class="material-symbols-outlined ms-icon">notifications_none</span>
                        No notifications yet
                    </div>`;
                    return;
                }
                list.innerHTML = items.map(n => {
                    const iconClass = n.type === 'xp' ? 'xp' : n.type === 'badge' ? 'badge' : n.type === 'streak' ? 'streak' : 'lesson';
                    const iconName  = n.type === 'xp' ? 'bolt' : n.type === 'badge' ? 'military_tech' : n.type === 'streak' ? 'local_fire_department' : 'check_circle';
                    const timeAgo   = formatTimeAgo(n.created_at || n.earned_at);
                    return `<div class="notif-item">
                        <div class="notif-item-icon ${iconClass}">
                            <span class="material-symbols-outlined" style="font-size:1rem">${iconName}</span>
                        </div>
                        <div class="notif-item-body">
                            <div class="notif-item-text">${esc(n.message || n.reward_name || 'New achievement!')}</div>
                            <div class="notif-item-time">${timeAgo}</div>
                        </div>
                    </div>`;
                }).join('');

                // Show dot if any notifications newer than last read
                const lastRead = Number(localStorage.getItem('notifReadAt') || 0);
                const hasNew   = items.some(n => new Date(n.created_at || n.earned_at || 0).getTime() > lastRead);
                const dot      = notifBtn.querySelector('.notification-dot');
                if (dot) dot.style.opacity = hasNew ? '' : '0';
            } catch (_) {
                const list2 = document.getElementById('notifList');
                if (list2) list2.innerHTML = `<div class="notif-empty">
                    <span class="material-symbols-outlined ms-icon">wifi_off</span>
                    Could not load notifications
                </div>`;
            }
        }

        // ── Check for new notifications on load (show dot) ─────────────────
        async function checkDot() {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res  = await fetch(`${API}/notifications`, { headers: { 'Authorization': 'Bearer ' + token } });
                const data = res.ok ? await res.json() : null;
                const items = data?.notifications || [];
                const lastRead = Number(localStorage.getItem('notifReadAt') || 0);
                const hasNew   = items.some(n => new Date(n.created_at || n.earned_at || 0).getTime() > lastRead);
                const dot      = document.querySelector('#notifBtn .notification-dot');
                if (dot) dot.style.opacity = hasNew ? '' : '0';
            } catch (_) {}
        }

        setTimeout(checkDot, 800);

        function formatTimeAgo(dateStr) {
            if (!dateStr) return '';
            const diff = Date.now() - new Date(dateStr).getTime();
            const mins  = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days  = Math.floor(diff / 86400000);
            if (mins < 1)   return 'Just now';
            if (mins < 60)  return `${mins}m ago`;
            if (hours < 24) return `${hours}h ago`;
            return `${days}d ago`;
        }
    }

    // ── 11. Init ──────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { buildSidebar(); buildAIAssistant(); buildNotifications(); });
    } else {
        buildSidebar();
        buildAIAssistant();
        buildNotifications();
    }

    window.toggleSidebarTheme = toggleTheme;
})();
