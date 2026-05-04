/**
 * contributionRoutes.js
 * Faculty-created content: Blog Posts and Courses (no enrollment key).
 * These populate the student "Learn Programming" page.
 *
 * Endpoints:
 *   GET    /api/contributions          – list published (students + faculty)
 *   GET    /api/contributions/mine     – faculty's own (all statuses)
 *   GET    /api/contributions/:id      – single contribution
 *   POST   /api/contributions          – create (faculty only)
 *   PUT    /api/contributions/:id      – update (faculty, own only)
 *   DELETE /api/contributions/:id      – delete (faculty, own only)
 */

const express = require('express');
const router  = express.Router();
const { authMiddleware, requireFaculty } = require('../middleware/authMiddleware');
const { pool } = require('../config/database');

// ── In-memory mock (used when DB is unavailable) ──────────────────────────────
let mockContributions = [];
let mockNextId = 1;

// Auto-create the contributions table if it doesn't exist, and remove any FK constraint
async function ensureTable() {
    try {
        // Create table without FK so any faculty_id works (including mock users)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contributions (
                contribution_id   INT AUTO_INCREMENT PRIMARY KEY,
                faculty_id        INT NOT NULL,
                type              ENUM('blog','course') NOT NULL DEFAULT 'blog',
                title             VARCHAR(255) NOT NULL,
                description       TEXT,
                content           LONGTEXT,
                language          VARCHAR(30) DEFAULT 'general',
                tags              VARCHAR(500) DEFAULT '',
                cover_image       TEXT,
                status            ENUM('published','draft') DEFAULT 'published',
                view_count        INT DEFAULT 0,
                created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        // Drop FK constraint if it exists (left over from an earlier schema run)
        try {
            await pool.query('ALTER TABLE contributions DROP FOREIGN KEY contributions_ibfk_1');
        } catch { /* FK didn't exist — fine */ }
        // Widen cover_image to MEDIUMTEXT so base64 images (up to 16MB) fit
        try {
            await pool.query('ALTER TABLE contributions MODIFY cover_image MEDIUMTEXT');
        } catch { /* column already wide enough or table missing — fine */ }
    } catch { /* DB unavailable — mock fallback will handle it */ }
}
ensureTable();

// ── GET /api/contributions ─────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    const { type, language, search } = req.query;
    try {
        let q = `
            SELECT c.contribution_id, c.type, c.title, c.description,
                   c.language, c.tags, c.cover_image, c.status,
                   c.view_count, c.created_at, c.updated_at,
                   COALESCE(u.full_name, 'Faculty') AS author_name,
                   u.avatar AS author_avatar
            FROM contributions c
            LEFT JOIN users u ON u.user_id = c.faculty_id
            WHERE c.status = 'published'`;
        const params = [];
        if (type && type !== 'all') { q += ' AND c.type = ?'; params.push(type); }
        if (language && language !== 'all') { q += ' AND c.language = ?'; params.push(language); }
        if (search) {
            q += ' AND (c.title LIKE ? OR c.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        q += ' ORDER BY c.created_at DESC';
        const [rows] = await pool.query(q, params);
        return res.json({ success: true, contributions: rows });
    } catch {
        let list = mockContributions.filter(c => c.status === 'published');
        if (type && type !== 'all') list = list.filter(c => c.type === type);
        return res.json({ success: true, contributions: list, source: 'mock' });
    }
});

// ── GET /api/contributions/mine ───────────────────────────────────────────────
router.get('/mine', authMiddleware, requireFaculty, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT contribution_id, type, title, description, content, language,
                    tags, cover_image, status, view_count, created_at, updated_at
             FROM contributions WHERE faculty_id = ? ORDER BY created_at DESC`,
            [req.user.id]
        );
        return res.json({ success: true, contributions: rows });
    } catch {
        const mine = mockContributions.filter(c => c.faculty_id === req.user.id);
        return res.json({ success: true, contributions: mine, source: 'mock' });
    }
});

// ── GET /api/contributions/:id ────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const [rows] = await pool.query(
            `SELECT c.*,
                    COALESCE(u.full_name, 'Faculty') AS author_name,
                    u.avatar AS author_avatar
             FROM contributions c
             LEFT JOIN users u ON u.user_id = c.faculty_id
             WHERE c.contribution_id = ?`,
            [id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        // Increment view count — non-critical, don't let it break the response
        pool.query(
            'UPDATE contributions SET view_count = view_count + 1 WHERE contribution_id = ?', [id]
        ).catch(() => {});
        return res.json({ success: true, contribution: rows[0] });
    } catch {
        const c = mockContributions.find(c => c.contribution_id === id);
        if (!c) return res.status(404).json({ error: 'Not found' });
        return res.json({ success: true, contribution: c, source: 'mock' });
    }
});

// ── POST /api/contributions ───────────────────────────────────────────────────
router.post('/', authMiddleware, requireFaculty, async (req, res) => {
    const { type, title, description, content, language, tags, cover_image, status } = req.body;
    if (!title || !type) return res.status(400).json({ error: 'title and type are required' });

    try {
        const [result] = await pool.query(
            `INSERT INTO contributions
             (faculty_id, type, title, description, content, language, tags, cover_image, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, type, title, description || '', content || '',
             language || 'general', tags || '', cover_image || '', status || 'published']
        );
        return res.json({ success: true, contribution_id: result.insertId });
    } catch {
        const newC = {
            contribution_id: mockNextId++, faculty_id: req.user.id,
            type, title, description: description || '', content: content || '',
            language: language || 'general', tags: tags || '', cover_image: cover_image || '',
            status: status || 'published', view_count: 0,
            author_name: req.user.fullName || 'Faculty',
            created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        };
        mockContributions.push(newC);
        return res.json({ success: true, contribution_id: newC.contribution_id, source: 'mock' });
    }
});

// ── PUT /api/contributions/:id ────────────────────────────────────────────────
router.put('/:id', authMiddleware, requireFaculty, async (req, res) => {
    const id = parseInt(req.params.id);
    const { title, description, content, language, tags, cover_image, status } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT faculty_id FROM contributions WHERE contribution_id = ?', [id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        if (rows[0].faculty_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        await pool.query(
            `UPDATE contributions
             SET title=?, description=?, content=?, language=?, tags=?,
                 cover_image=?, status=?, updated_at=NOW()
             WHERE contribution_id = ?`,
            [title, description, content, language, tags, cover_image, status, id]
        );
        return res.json({ success: true });
    } catch {
        const idx = mockContributions.findIndex(c => c.contribution_id === id);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });
        mockContributions[idx] = { ...mockContributions[idx], title, description, content, language, tags, status };
        return res.json({ success: true, source: 'mock' });
    }
});

// ── PATCH /api/contributions/:id/cover ───────────────────────────────────────
router.patch('/:id/cover', authMiddleware, requireFaculty, async (req, res) => {
    const id = parseInt(req.params.id);
    const { cover_image } = req.body;
    if (!cover_image) return res.status(400).json({ error: 'cover_image is required' });
    try {
        const [rows] = await pool.query(
            'SELECT faculty_id FROM contributions WHERE contribution_id = ?', [id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        if (rows[0].faculty_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        await pool.query(
            'UPDATE contributions SET cover_image=?, updated_at=NOW() WHERE contribution_id=?',
            [cover_image, id]
        );
        return res.json({ success: true });
    } catch {
        const c = mockContributions.find(c => c.contribution_id === id);
        if (c) c.cover_image = cover_image;
        return res.json({ success: true, source: 'mock' });
    }
});

// ── DELETE /api/contributions/:id ─────────────────────────────────────────────
router.delete('/:id', authMiddleware, requireFaculty, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const [rows] = await pool.query(
            'SELECT faculty_id FROM contributions WHERE contribution_id = ?', [id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        if (rows[0].faculty_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        await pool.query('DELETE FROM contributions WHERE contribution_id = ?', [id]);
        return res.json({ success: true });
    } catch {
        mockContributions = mockContributions.filter(c => c.contribution_id !== id);
        return res.json({ success: true, source: 'mock' });
    }
});

module.exports = router;
