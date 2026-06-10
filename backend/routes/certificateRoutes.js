/**
 * certificateRoutes.js
 * Per-level mastery certificates earned in Arena Mode.
 * One certificate per (user, language, level); re-earning keeps the best result.
 *
 * Endpoints:
 *   GET  /api/certificates/:userId  – list a user's earned certificates
 *   POST /api/certificates          – upsert a certificate for the logged-in user
 *
 * Falls back to an in-memory store when the database is unavailable
 * (mirrors the pattern in contributionRoutes.js).
 */

const express = require('express');
const router  = express.Router();
const { pool } = require('../config/database');
const masteryService = require('../services/masteryService');

// ── In-memory mock (used when DB is unavailable) ──────────────────────────────
let mockCertificates = [];
let mockNextId = 1;

// Auto-create the certificates table if it doesn't exist (so a fresh DB works
// without a manual schema reset).
async function ensureTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS certificates (
                certificate_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id        INT NOT NULL,
                language_code  VARCHAR(20) NOT NULL,
                level          ENUM('beginner','intermediate','advanced') NOT NULL,
                mastery        VARCHAR(20),
                score          INT DEFAULT 0,
                accuracy       INT DEFAULT 0,
                issued_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_cert_user_lang_level (user_id, language_code, level)
            )
        `);
    } catch { /* DB unavailable — mock fallback will handle it */ }
}
ensureTable();

const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];

// ── GET /api/certificates/:userId ─────────────────────────────────────────────
router.get('/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    try {
        const [rows] = await pool.query(
            `SELECT certificate_id, user_id, language_code AS language, level,
                    mastery, score, accuracy, issued_at
             FROM certificates WHERE user_id = ? ORDER BY issued_at DESC`,
            [userId]
        );
        return res.json({ success: true, certificates: rows });
    } catch {
        const list = mockCertificates
            .filter(c => c.user_id === userId)
            .sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));
        return res.json({ success: true, certificates: list, source: 'mock' });
    }
});

// ── POST /api/certificates ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    let { language, level, mastery, score, accuracy } = req.body;
    language = (language || '').toLowerCase();
    level    = (level || '').toLowerCase();
    score    = parseInt(score) || 0;
    accuracy = parseInt(accuracy) || 0;

    if (!language || !VALID_LEVELS.includes(level)) {
        return res.status(400).json({
            success: false,
            message: 'Required: language and a valid level (beginner/intermediate/advanced)'
        });
    }

    // Passing a Technical Assessment level grants cross-system mastery
    // → unlocks the next level in classrooms of the same language.
    masteryService.recordMastery(userId, language, level, 'assessment');

    try {
        // Upsert — keep the best score/accuracy if a certificate already exists.
        await pool.query(
            `INSERT INTO certificates (user_id, language_code, level, mastery, score, accuracy)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                mastery  = IF(VALUES(accuracy) > accuracy, VALUES(mastery),  mastery),
                score    = GREATEST(score, VALUES(score)),
                accuracy = GREATEST(accuracy, VALUES(accuracy))`,
            [userId, language, level, mastery || null, score, accuracy]
        );
        return res.json({ success: true });
    } catch {
        const existing = mockCertificates.find(
            c => c.user_id === userId && c.language === language && c.level === level
        );
        if (existing) {
            if (accuracy > existing.accuracy) existing.mastery = mastery || existing.mastery;
            existing.score    = Math.max(existing.score, score);
            existing.accuracy = Math.max(existing.accuracy, accuracy);
        } else {
            mockCertificates.push({
                certificate_id: mockNextId++, user_id: userId,
                language, level, mastery: mastery || null, score, accuracy,
                issued_at: new Date().toISOString()
            });
        }
        return res.json({ success: true, source: 'mock' });
    }
});

module.exports = router;
