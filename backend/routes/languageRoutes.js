/**
 * ============================================================================
 * LANGUAGE ROUTES (languageRoutes.js)
 * ============================================================================
 *
 * Single source of truth for the available programming languages.
 * Defaults come from backend/config/languages.js. Admin CRUD edits go to
 * backend/data/languages.json so they survive restarts.
 *
 * Endpoints:
 *   GET    /api/languages              — list all enabled languages (public)
 *   GET    /api/languages/all          — list ALL (incl. disabled)  [admin]
 *   GET    /api/languages/:code        — single language details
 *   POST   /api/languages/select       — save user's language preference
 *   GET    /api/languages/current/:uid — current user selection
 *   POST   /api/languages              — create  [admin]
 *   PUT    /api/languages/:code        — update  [admin]
 *   DELETE /api/languages/:code        — delete  [admin]
 *
 * To ADD a language permanently → edit backend/config/languages.js.
 * To ADD a language at runtime  → POST /api/languages from the admin CMS.
 * ============================================================================
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const router  = express.Router();

const { DEFAULT_LANGUAGES, toPublic } = require('../config/languages');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'languages.json');

// ─── Load / persist ──────────────────────────────────────────────────────────
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadLanguages() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            const overrides = JSON.parse(raw);
            if (Array.isArray(overrides) && overrides.length) {
                // Merge: defaults provide functions (runConfig), JSON
                // overrides metadata + admin-created entries.
                const byCode = new Map(DEFAULT_LANGUAGES.map(l => [l.code, l]));
                overrides.forEach(o => {
                    const existing = byCode.get(o.code);
                    byCode.set(o.code, existing ? { ...existing, ...o } : o);
                });
                return Array.from(byCode.values());
            }
        }
    } catch (err) {
        console.error('[languages] Failed to load overrides, using defaults:', err.message);
    }
    return [...DEFAULT_LANGUAGES];
}

function persistLanguages(languages) {
    try {
        ensureDataDir();
        // Strip non-serializable bits (functions in runConfig)
        const serializable = languages.map(l => {
            const { runConfig, ...rest } = l;
            return rest;
        });
        fs.writeFileSync(DATA_FILE, JSON.stringify(serializable, null, 2));
    } catch (err) {
        console.error('[languages] Failed to persist overrides:', err.message);
    }
}

let languages = loadLanguages();

// User selections (in-memory; persisted on user record by /select)
const userLanguageSelections = {};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function findLang(code) {
    if (!code) return null;
    return languages.find(l => l.code === code.toLowerCase()) || null;
}

function enabledOnly(list) {
    return list.filter(l => l.enabled !== false);
}

// ─── GET /api/languages — list (public, enabled only) ────────────────────────
router.get('/', (req, res) => {
    res.json({
        success:   true,
        message:   'Select a programming language to begin learning',
        languages: toPublic(enabledOnly(languages)),
    });
});

// ─── GET /api/languages/all — admin: includes disabled ───────────────────────
router.get('/all', (req, res) => {
    res.json({ success: true, languages: toPublic(languages) });
});

// ─── GET /api/languages/:code ────────────────────────────────────────────────
router.get('/:code', (req, res) => {
    const lang = findLang(req.params.code);
    if (!lang) {
        return res.status(404).json({
            success: false,
            message: `Language not found. Available: ${enabledOnly(languages).map(l => l.code).join(', ')}`,
        });
    }
    const [pub] = toPublic([lang]);
    res.json({
        success: true,
        language: {
            ...pub,
            levels: {
                beginner:     { description: 'Basic syntax and concepts' },
                intermediate: { description: 'Control structures and functions' },
                advanced:     { description: 'Complex problem solving' },
            },
        },
    });
});

// ─── POST /api/languages/select — save user choice ───────────────────────────
router.post('/select', (req, res) => {
    const { userId, languageCode } = req.body;
    if (!userId || !languageCode) {
        return res.status(400).json({ success: false, message: 'userId and languageCode are required' });
    }
    const lang = findLang(languageCode);
    if (!lang || lang.enabled === false) {
        return res.status(400).json({
            success: false,
            message: `Invalid language. Choose: ${enabledOnly(languages).map(l => l.code).join(', ')}`,
        });
    }
    userLanguageSelections[userId] = {
        languageCode: lang.code,
        languageName: lang.name,
        selectedAt:   new Date().toISOString(),
    };
    res.json({
        success: true,
        message: `Great choice! You selected ${lang.name}. Let's start learning!`,
        selection: {
            userId,
            language: { code: lang.code, name: lang.name, icon: lang.icon, color: lang.color },
            startingLevel: 'beginner',
            availableTopics: lang.topics || [],
        },
    });
});

// ─── GET /api/languages/current/:userId ──────────────────────────────────────
router.get('/current/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const sel = userLanguageSelections[userId];
    if (!sel) return res.json({ success: true, hasSelection: false, message: 'No language selected yet' });
    const lang = findLang(sel.languageCode);
    res.json({
        success: true,
        hasSelection: true,
        selection: {
            languageCode: sel.languageCode,
            languageName: sel.languageName,
            icon:         lang?.icon  || '💻',
            color:        lang?.color || '#7c3aed',
            selectedAt:   sel.selectedAt,
        },
    });
});

// ─── ADMIN CRUD ──────────────────────────────────────────────────────────────
// POST /api/languages — create
router.post('/', (req, res) => {
    const { name, code, description, icon, devicon, color, aceMode, extension,
            difficulty, topics, template, enabled, featured } = req.body;

    if (!name || !code) {
        return res.status(400).json({ success: false, message: 'name and code are required' });
    }
    if (findLang(code)) {
        return res.status(409).json({ success: false, message: 'Language code already exists' });
    }

    const newLang = {
        code:        code.toLowerCase(),
        name,
        description: description || '',
        icon:        icon        || '💻',
        devicon:     devicon     || '',
        color:       color       || '#7c3aed',
        aceMode:     aceMode     || 'text',
        extension:   extension   || code.toLowerCase(),
        difficulty:  difficulty  || 'Beginner Friendly',
        topics:      Array.isArray(topics) ? topics : [],
        template:    template    || '',
        enabled:     enabled !== false,
        featured:    !!featured,
    };
    languages.push(newLang);
    persistLanguages(languages);
    res.status(201).json({ success: true, language: toPublic([newLang])[0], message: 'Language created' });
});

// PUT /api/languages/:code — update
router.put('/:code', (req, res) => {
    const code = req.params.code.toLowerCase();
    const idx  = languages.findIndex(l => l.code === code);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Language not found' });

    // Don't allow code rename via this endpoint (would orphan data)
    const { code: _ignored, runConfig: _r, ...patch } = req.body;
    languages[idx] = { ...languages[idx], ...patch, code };
    persistLanguages(languages);
    res.json({ success: true, language: toPublic([languages[idx]])[0], message: 'Language updated' });
});

// DELETE /api/languages/:code — delete (or disable for built-ins)
router.delete('/:code', (req, res) => {
    const code = req.params.code.toLowerCase();
    const idx  = languages.findIndex(l => l.code === code);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Language not found' });

    const isBuiltIn = DEFAULT_LANGUAGES.some(l => l.code === code);
    if (isBuiltIn) {
        // Disable instead of remove so DB references remain valid
        languages[idx] = { ...languages[idx], enabled: false };
        persistLanguages(languages);
        return res.json({ success: true, message: `Built-in language '${code}' disabled (not removed)` });
    }

    languages.splice(idx, 1);
    persistLanguages(languages);
    res.json({ success: true, message: `Language '${code}' deleted` });
});

// ─── Internal helper for other modules (executeRoutes, etc.) ─────────────────
function getInternalLanguage(code) {
    return findLang(code);
}
function getAllInternal() {
    return languages;
}

module.exports = router;
module.exports.getInternalLanguage = getInternalLanguage;
module.exports.getAllInternal      = getAllInternal;
module.exports.userLanguageSelections = userLanguageSelections;
