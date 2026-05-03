/**
 * languages.js — Frontend helper that fetches the language list from the
 * backend ONCE per page load and exposes utilities for rendering UI dynamically.
 *
 * Usage:
 *   <script src="../js/languages.js"></script>
 *
 *   // Anywhere on the page:
 *   const langs = await Languages.load();          // Promise<Language[]>
 *   const py    = Languages.get('python');         // single language or null
 *   Languages.fillSelect(document.getElementById('langSelect'));
 *   Languages.renderTabs(document.getElementById('langTabs'), {
 *       includeAll: true,
 *       onChange:   (code) => console.log('selected', code),
 *   });
 *   Languages.renderCards(document.getElementById('grid'), {
 *       onSelect: (code) => location.href = '/dashboard?lang=' + code,
 *   });
 *
 * Each Language object has:
 *   { code, name, description, icon, devicon, color, aceMode, extension,
 *     difficulty, topics, template, enabled, featured, runnable }
 */
(function () {
    const API = (typeof window.API_BASE === 'string' && window.API_BASE)
        ? window.API_BASE
        : 'http://localhost:3000/api';

    const CACHE_KEY = 'codearena_languages_v1';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    let cache = null;
    let inflight = null;

    function readSessionCache() {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const { ts, data } = JSON.parse(raw);
            if (Date.now() - ts > CACHE_TTL) return null;
            return Array.isArray(data) ? data : null;
        } catch { return null; }
    }
    function writeSessionCache(data) {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
    }

    /**
     * Hardcoded fallback list — used only when the API is unreachable.
     * Keep this minimal; real metadata always comes from the backend.
     */
    const FALLBACK = [
        { code: 'python',     name: 'Python',     icon: '🐍', color: '#3776AB', difficulty: 'Recommended',       featured: true,  aceMode: 'python',     extension: 'py',   topics: [], template: '# Hello\nprint("Hello")', description: 'Beginner-friendly language', devicon: '', enabled: true, runnable: true },
        { code: 'javascript', name: 'JavaScript', icon: '🌐', color: '#F7DF1E', difficulty: 'Beginner Friendly', featured: false, aceMode: 'javascript', extension: 'js',   topics: [], template: 'console.log("Hello");', description: 'Language of the web',       devicon: '', enabled: true, runnable: true },
        { code: 'java',       name: 'Java',       icon: '☕', color: '#E76F00', difficulty: 'Intermediate',      featured: false, aceMode: 'java',       extension: 'java', topics: [], template: 'public class Main { public static void main(String[] a){ System.out.println("Hello"); } }', description: 'Industry-standard OOP', devicon: '', enabled: true, runnable: true },
        { code: 'cpp',        name: 'C++',        icon: '⚡', color: '#659AD2', difficulty: 'Advanced',          featured: false, aceMode: 'c_cpp',      extension: 'cpp',  topics: [], template: '#include <iostream>\nint main(){ std::cout << "Hello"; }', description: 'Systems programming', devicon: '', enabled: true, runnable: true },
    ];

    async function load(opts = {}) {
        if (cache && !opts.forceRefresh) return cache;
        if (inflight) return inflight;

        if (!opts.forceRefresh) {
            const cached = readSessionCache();
            if (cached) { cache = cached; return cache; }
        }

        inflight = (async () => {
            try {
                const res = await fetch(`${API}/languages`);
                const data = await res.json();
                const list = data.languages || data || [];
                if (!Array.isArray(list) || list.length === 0) throw new Error('Empty list');
                cache = list.filter(l => l.enabled !== false);
                writeSessionCache(cache);
                return cache;
            } catch (err) {
                console.warn('[Languages] API fetch failed, using fallback:', err.message);
                cache = FALLBACK;
                return cache;
            } finally {
                inflight = null;
            }
        })();
        return inflight;
    }

    function get(code) {
        if (!cache) return null;
        return cache.find(l => l.code === code) || null;
    }

    function getColor(code, fallback = '#7c3aed') { return get(code)?.color || fallback; }
    function getName(code)  { return get(code)?.name  || code; }
    function getIcon(code)  { return get(code)?.icon  || '💻'; }
    function getAceMode(code) { return get(code)?.aceMode || 'text'; }

    function escapeHtml(s) {
        return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /**
     * Populate a <select> element with <option> tags for each language.
     * @param {HTMLSelectElement} selectEl
     * @param {Object} opts - { selected, includeEmpty, runnableOnly }
     */
    async function fillSelect(selectEl, opts = {}) {
        if (!selectEl) return;
        const list = (await load()).filter(l => !opts.runnableOnly || l.runnable);
        const selected = opts.selected || selectEl.value;
        selectEl.innerHTML = (opts.includeEmpty ? '<option value="">— select —</option>' : '')
            + list.map(l =>
                `<option value="${escapeHtml(l.code)}"${selected === l.code ? ' selected' : ''}>${escapeHtml(l.name)}</option>`
            ).join('');
    }

    /**
     * Render filter tabs (pill buttons).
     * @param {HTMLElement} container
     * @param {Object} opts - { includeAll, active, onChange, runnableOnly }
     */
    async function renderTabs(container, opts = {}) {
        if (!container) return;
        const list = (await load()).filter(l => !opts.runnableOnly || l.runnable);
        const active = opts.active || (opts.includeAll ? 'all' : list[0]?.code);

        const html = [];
        if (opts.includeAll) {
            html.push(`<span class="lang-tab${active === 'all' ? ' active' : ''}" data-lang="all">All</span>`);
        }
        list.forEach(l => {
            html.push(`<span class="lang-tab${active === l.code ? ' active' : ''}" data-lang="${escapeHtml(l.code)}">${escapeHtml(l.name)}</span>`);
        });
        container.innerHTML = html.join('');

        container.addEventListener('click', (e) => {
            const tab = e.target.closest('.lang-tab');
            if (!tab) return;
            container.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const code = tab.dataset.lang;
            if (typeof opts.onChange === 'function') opts.onChange(code);
        });
    }

    /**
     * Render a grid of selectable language cards (used by select_language.html).
     * @param {HTMLElement} container
     * @param {Object} opts - { onSelect(code), cardClassPrefix }
     */
    async function renderCards(container, opts = {}) {
        if (!container) return;
        const list = await load();
        const cls  = opts.cardClassPrefix || 'lang-card';

        container.innerHTML = list.map(l => {
            const fallbackEmoji = `<span style='font-size:3rem'>${escapeHtml(l.icon)}</span>`;
            const img = l.devicon
                ? `<img src="${escapeHtml(l.devicon)}" alt="${escapeHtml(l.name)}" onerror="this.outerHTML=&quot;${fallbackEmoji.replace(/"/g, '&quot;')}&quot;">`
                : fallbackEmoji;
            const badge = l.featured
                ? `<span class="${cls}-badge ${cls}-badge-recommended">Recommended</span>`
                : (l.difficulty
                    ? `<span class="${cls}-badge ${cls}-badge-${(l.difficulty || '').toLowerCase().replace(/[^a-z]/g,'')}">${escapeHtml(l.difficulty)}</span>`
                    : '');
            const topicsHtml = (l.topics || []).slice(0, 3).map(t =>
                `<span class="${cls}-tag">${escapeHtml(t)}</span>`
            ).join('');

            return `
            <div class="${cls} ${cls}-${escapeHtml(l.code)}" data-code="${escapeHtml(l.code)}" style="--lang-color:${escapeHtml(l.color || '#7c3aed')};">
                ${badge}
                <div class="${cls}-icon">${img}</div>
                <div class="${cls}-name">${escapeHtml(l.name)}</div>
                <div class="${cls}-desc">${escapeHtml(l.description || '')}</div>
                ${topicsHtml ? `<div class="${cls}-tags">${topicsHtml}</div>` : ''}
                <button class="${cls}-btn" style="background:${escapeHtml(l.color || '#7c3aed')};">Start ${escapeHtml(l.name)} ›</button>
            </div>`;
        }).join('');

        container.addEventListener('click', (e) => {
            const card = e.target.closest(`.${cls}`);
            if (!card) return;
            const code = card.dataset.code;
            if (typeof opts.onSelect === 'function') opts.onSelect(code);
        });
    }

    // Public API
    window.Languages = {
        load,
        get,
        getColor,
        getName,
        getIcon,
        getAceMode,
        fillSelect,
        renderTabs,
        renderCards,
        // Force a refresh (e.g. after admin edits)
        refresh: () => load({ forceRefresh: true }),
        // Clear in-memory cache only (useful after admin edits in the same page)
        clearCache: () => { cache = null; try { sessionStorage.removeItem(CACHE_KEY); } catch {} },
    };
})();
