/**
 * masteryService.js
 * Cross-system "level mastery" tracking, shared between:
 *   1. Technical Assessment (Arena) — lesson_game.html
 *   2. Classroom Curriculum (SoloLearn-style lessons)
 *
 * A student "masters" a (language, level) by EITHER:
 *   - passing that level's Technical Assessment (≥70%), OR
 *   - completing every unit evaluation of that level inside a classroom
 *
 * Mastering a level unlocks the NEXT level in BOTH systems for that language.
 *
 * Storage: data/level_mastery.json  (MySQL-free, survives restarts)
 *   key   = `${userId}_${language}_${level}`
 *   value = { userId, language, level, sources: [...], achievedAt }
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '../../data');
const FILE      = path.join(DATA_DIR, 'level_mastery.json');
const LEVELS    = ['beginner', 'intermediate', 'advanced'];

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } }
function save(d) { try { fs.writeFileSync(FILE, JSON.stringify(d, null, 2), 'utf8'); } catch (e) { console.error('mastery save', e.message); } }

let store = load();

function norm(s) { return String(s || '').trim().toLowerCase(); }

/** Map a free-form level/name to a standard level, or null if it isn't a standard one. */
function normalizeLevel(name) {
    const n = norm(name);
    if (n.includes('begin'))  return 'beginner';
    if (n.includes('inter'))  return 'intermediate';
    if (n.includes('adv'))    return 'advanced';
    if (LEVELS.includes(n))   return n;
    return null;
}

/** Record that a user mastered (language, level). `source` is 'assessment' | 'classroom'. */
function recordMastery(userId, language, level, source = 'unknown') {
    const lvl = normalizeLevel(level);
    const lang = norm(language);
    if (!userId || !lang || !lvl) return null;

    const key = `${userId}_${lang}_${lvl}`;
    if (!store[key]) {
        store[key] = { userId: String(userId), language: lang, level: lvl, sources: [], achievedAt: new Date().toISOString() };
    }
    if (!store[key].sources.includes(source)) store[key].sources.push(source);
    save(store);
    return store[key];
}

/** Has the user mastered this exact (language, level)? */
function hasMastered(userId, language, level) {
    const lvl = normalizeLevel(level);
    if (!lvl) return false;
    return !!store[`${userId}_${norm(language)}_${lvl}`];
}

/** All mastered levels for a (user, language) → e.g. ['beginner','intermediate']. */
function getMasteredLevels(userId, language) {
    const lang = norm(language);
    return LEVELS.filter(l => !!store[`${userId}_${lang}_${l}`]);
}

/**
 * Is `level` unlocked for this user+language?
 * Beginner is always unlocked; higher levels need the previous level mastered.
 */
function isLevelUnlocked(userId, language, level) {
    const lvl = normalizeLevel(level);
    if (!lvl) return true;                 // non-standard/custom levels aren't gated here
    const idx = LEVELS.indexOf(lvl);
    if (idx <= 0) return true;             // beginner always open
    return hasMastered(userId, language, LEVELS[idx - 1]);
}

module.exports = {
    LEVELS,
    normalizeLevel,
    recordMastery,
    hasMastered,
    getMasteredLevels,
    isLevelUnlocked,
};
