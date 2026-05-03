/**
 * learningPathRoutes.js — Phase 1 Learning Path Endpoints
 *
 * Endpoints:
 *   GET  /api/paths                          — List all published learning paths
 *   GET  /api/paths/:pathId                  — Get a single path + its lessons
 *   GET  /api/paths/:pathId/lessons          — Get lessons for a path
 *   GET  /api/paths/lesson/:lessonId         — Get a single lesson by ID
 *   POST /api/paths/lesson/:lessonId/start   — Mark lesson as in_progress
 *   POST /api/paths/lesson/:lessonId/complete — Mark lesson as completed + award XP
 *   GET  /api/paths/progress/me              — Student's full progress summary
 *   GET  /api/paths/progress/:userId         — Progress for any user (faculty only)
 */

const express = require('express');
const router  = express.Router();
const { authMiddleware, requireFaculty } = require('../middleware/authMiddleware');
const { pool } = require('../config/database');

// ── GET /api/paths ─────────────────────────────────────────────────────────────
// All published learning paths, with lesson counts.
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { language } = req.query;

        let sql = `
            SELECT lp.*,
                   COUNT(pl.lesson_id) AS lesson_count,
                   SUM(pl.xp_reward)   AS total_xp
            FROM learning_paths lp
            LEFT JOIN path_lessons pl ON pl.path_id = lp.path_id AND pl.is_published = 1
            WHERE lp.is_published = 1`;
        const params = [];

        if (language) {
            sql += ' AND lp.language = ?';
            params.push(language);
        }

        sql += ' GROUP BY lp.path_id ORDER BY lp.order_index ASC';

        const [paths] = await pool.query(sql, params);

        // Attach student progress counts
        const userId = req.user.id;
        const pathIds = paths.map(p => p.path_id);

        let progressMap = {};
        if (pathIds.length) {
            const [progressRows] = await pool.query(
                `SELECT pl.path_id, COUNT(*) AS completed_count
                 FROM lesson_progress lp
                 JOIN path_lessons pl ON lp.lesson_id = pl.lesson_id
                 WHERE lp.user_id = ? AND lp.status = 'completed' AND pl.path_id IN (?)
                 GROUP BY pl.path_id`,
                [userId, pathIds]
            );
            progressRows.forEach(r => { progressMap[r.path_id] = r.completed_count; });
        }

        const result = paths.map(p => ({
            ...p,
            completed_count: progressMap[p.path_id] || 0,
            progress_pct: p.lesson_count
                ? Math.round(((progressMap[p.path_id] || 0) / p.lesson_count) * 100)
                : 0,
        }));

        res.json({ success: true, paths: result });
    } catch (err) {
        console.error('[Paths] GET / error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/paths/progress/me ────────────────────────────────────────────────
// Must come BEFORE /:pathId to avoid "me" being treated as an ID
router.get('/progress/me', authMiddleware, async (req, res) => {
    try {
        await sendProgressSummary(req.user.id, res);
    } catch (err) {
        console.error('[Paths] progress/me error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/paths/progress/:userId ──────────────────────────────────────────
router.get('/progress/:userId', authMiddleware, requireFaculty, async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid userId.' });
    try {
        await sendProgressSummary(userId, res);
    } catch (err) {
        console.error('[Paths] progress/:userId error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

async function sendProgressSummary(userId, res) {
    // All paths
    const [paths] = await pool.query(
        'SELECT * FROM learning_paths WHERE is_published = 1 ORDER BY order_index'
    );

    // All lesson progress for user
    const [progressRows] = await pool.query(
        `SELECT lp.*, pl.title, pl.xp_reward, pl.order_index AS lesson_order,
                pl.path_id, pl.estimated_minutes
         FROM lesson_progress lp
         JOIN path_lessons pl ON lp.lesson_id = pl.lesson_id
         WHERE lp.user_id = ?`,
        [userId]
    );

    // User info
    const [userRows] = await pool.query(
        'SELECT user_id, full_name, total_xp, streak, selected_language FROM users WHERE user_id = ?',
        [userId]
    );
    const user = userRows[0] || {};

    // Weaknesses
    const [weakRows] = await pool.query(
        'SELECT topic, language, error_rate FROM weaknesses WHERE user_id = ? AND resolved = 0 ORDER BY error_rate DESC LIMIT 10',
        [userId]
    );

    const progressByLesson = {};
    progressRows.forEach(r => { progressByLesson[r.lesson_id] = r; });

    // Lesson counts per path
    const [lessonCounts] = await pool.query(
        'SELECT path_id, COUNT(*) AS cnt FROM path_lessons WHERE is_published = 1 GROUP BY path_id'
    );
    const lessonCountMap = {};
    lessonCounts.forEach(r => { lessonCountMap[r.path_id] = r.cnt; });

    const pathSummaries = paths.map(path => {
        const lessons  = progressRows.filter(r => r.path_id === path.path_id);
        const completed = lessons.filter(r => r.status === 'completed').length;
        const total    = lessonCountMap[path.path_id] || 0;
        return {
            ...path,
            lesson_count:    total,
            completed_count: completed,
            progress_pct:    total ? Math.round((completed / total) * 100) : 0,
            xp_earned:       lessons.filter(r => r.status === 'completed').reduce((s, r) => s + (r.xp_reward || 0), 0),
        };
    });

    res.json({
        success: true,
        user: {
            user_id:    user.user_id,
            full_name:  user.full_name,
            total_xp:   user.total_xp || 0,
            streak:     user.streak   || 0,
            language:   user.selected_language,
        },
        paths: pathSummaries,
        completedLessons: progressRows.filter(r => r.status === 'completed').length,
        totalXpEarned: progressRows.filter(r => r.status === 'completed').reduce((s, r) => s + (r.xp_reward || 0), 0),
        weaknesses: weakRows,
    });
}

// ── GET /api/paths/:pathId ─────────────────────────────────────────────────────
router.get('/:pathId', authMiddleware, async (req, res) => {
    const pathId = parseInt(req.params.pathId);
    if (isNaN(pathId)) return res.status(400).json({ error: 'Invalid pathId.' });

    try {
        const [pathRows] = await pool.query(
            'SELECT * FROM learning_paths WHERE path_id = ? AND is_published = 1',
            [pathId]
        );
        if (!pathRows.length) return res.status(404).json({ error: 'Path not found.' });

        const path = pathRows[0];

        const [lessons] = await pool.query(
            `SELECT pl.*,
                    COALESCE(lp.status, 'not_started') AS progress_status,
                    lp.completed_at
             FROM path_lessons pl
             LEFT JOIN lesson_progress lp
                   ON lp.lesson_id = pl.lesson_id AND lp.user_id = ?
             WHERE pl.path_id = ? AND pl.is_published = 1
             ORDER BY pl.order_index ASC`,
            [req.user.id, pathId]
        );

        res.json({ success: true, path, lessons });
    } catch (err) {
        console.error('[Paths] GET /:pathId error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/paths/:pathId/lessons ────────────────────────────────────────────
router.get('/:pathId/lessons', authMiddleware, async (req, res) => {
    const pathId = parseInt(req.params.pathId);
    if (isNaN(pathId)) return res.status(400).json({ error: 'Invalid pathId.' });

    try {
        const [lessons] = await pool.query(
            `SELECT pl.*,
                    COALESCE(lp.status, 'not_started') AS progress_status,
                    lp.completed_at
             FROM path_lessons pl
             LEFT JOIN lesson_progress lp
                   ON lp.lesson_id = pl.lesson_id AND lp.user_id = ?
             WHERE pl.path_id = ? AND pl.is_published = 1
             ORDER BY pl.order_index ASC`,
            [req.user.id, pathId]
        );

        res.json({ success: true, lessons });
    } catch (err) {
        console.error('[Paths] GET /:pathId/lessons error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/paths/lesson/:lessonId ───────────────────────────────────────────
router.get('/lesson/:lessonId', authMiddleware, async (req, res) => {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId)) return res.status(400).json({ error: 'Invalid lessonId.' });

    try {
        const [rows] = await pool.query(
            `SELECT pl.*, lp_path.title AS path_title, lp_path.language,
                    COALESCE(lp.status, 'not_started') AS progress_status,
                    lp.completed_at
             FROM path_lessons pl
             JOIN learning_paths lp_path ON pl.path_id = lp_path.path_id
             LEFT JOIN lesson_progress lp
                   ON lp.lesson_id = pl.lesson_id AND lp.user_id = ?
             WHERE pl.lesson_id = ? AND pl.is_published = 1`,
            [req.user.id, lessonId]
        );

        if (!rows.length) return res.status(404).json({ error: 'Lesson not found.' });

        // Prev / next lessons in path
        const lesson = rows[0];
        const [siblings] = await pool.query(
            'SELECT lesson_id, title, order_index FROM path_lessons WHERE path_id = ? AND is_published = 1 ORDER BY order_index',
            [lesson.path_id]
        );
        const idx  = siblings.findIndex(s => s.lesson_id === lessonId);
        const prev = idx > 0                    ? siblings[idx - 1] : null;
        const next = idx < siblings.length - 1  ? siblings[idx + 1] : null;

        res.json({ success: true, lesson, prev, next });
    } catch (err) {
        console.error('[Paths] GET /lesson/:lessonId error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/paths/lesson/:lessonId/start ────────────────────────────────────
router.post('/lesson/:lessonId/start', authMiddleware, async (req, res) => {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId)) return res.status(400).json({ error: 'Invalid lessonId.' });

    try {
        // Check lesson exists
        const [rows] = await pool.query(
            'SELECT lesson_id FROM path_lessons WHERE lesson_id = ? AND is_published = 1',
            [lessonId]
        );
        if (!rows.length) return res.status(404).json({ error: 'Lesson not found.' });

        // Upsert progress — only move to in_progress if not already completed
        await pool.query(
            `INSERT INTO lesson_progress (user_id, lesson_id, status)
             VALUES (?, ?, 'in_progress')
             ON DUPLICATE KEY UPDATE
               status = IF(status = 'completed', 'completed', 'in_progress')`,
            [req.user.id, lessonId]
        );

        res.json({ success: true, message: 'Lesson started.' });
    } catch (err) {
        console.error('[Paths] start lesson error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/paths/lesson/:lessonId/complete ─────────────────────────────────
router.post('/lesson/:lessonId/complete', authMiddleware, async (req, res) => {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId)) return res.status(400).json({ error: 'Invalid lessonId.' });

    try {
        // Fetch lesson for XP
        const [lessonRows] = await pool.query(
            'SELECT * FROM path_lessons WHERE lesson_id = ? AND is_published = 1',
            [lessonId]
        );
        if (!lessonRows.length) return res.status(404).json({ error: 'Lesson not found.' });

        const lesson = lessonRows[0];

        // Check if already completed (don't award XP twice)
        const [existingRows] = await pool.query(
            "SELECT status FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
            [req.user.id, lessonId]
        );
        const alreadyCompleted = existingRows.length && existingRows[0].status === 'completed';

        // Upsert completed
        await pool.query(
            `INSERT INTO lesson_progress (user_id, lesson_id, status, completed_at)
             VALUES (?, ?, 'completed', NOW())
             ON DUPLICATE KEY UPDATE
               status = 'completed',
               completed_at = IF(completed_at IS NULL, NOW(), completed_at)`,
            [req.user.id, lessonId]
        );

        let xpAwarded = 0;
        if (!alreadyCompleted) {
            xpAwarded = lesson.xp_reward || 20;
            // Award XP to user total
            await pool.query(
                'UPDATE users SET total_xp = total_xp + ? WHERE user_id = ?',
                [xpAwarded, req.user.id]
            );
            // Log reward
            await pool.query(
                `INSERT INTO rewards (user_id, reward_type, xp_amount, description, earned_at)
                 VALUES (?, 'xp', ?, ?, NOW())`,
                [req.user.id, xpAwarded, `Completed lesson: ${lesson.title}`]
            );
        }

        // Fetch updated total XP
        const [userRows] = await pool.query(
            'SELECT total_xp, streak FROM users WHERE user_id = ?',
            [req.user.id]
        );

        res.json({
            success:     true,
            message:     'Lesson completed!',
            xpAwarded,
            alreadyCompleted,
            totalXp:     userRows[0]?.total_xp || 0,
            streak:      userRows[0]?.streak    || 0,
        });
    } catch (err) {
        console.error('[Paths] complete lesson error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
