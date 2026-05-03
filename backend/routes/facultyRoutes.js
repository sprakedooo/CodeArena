/**
 * FACULTY ROUTES (facultyRoutes.js)
 * GET /api/faculty/students        - All students with stats
 * GET /api/faculty/students/:id    - Single student detailed progress
 * GET /api/faculty/analytics       - Aggregate analytics
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireFaculty } = require('../middleware/authMiddleware');
const dbService = require('../services/dbService');
const db = require('../config/database');
const authRoutes = require('./authRoutes');

// All faculty routes require auth + faculty role
router.use(authMiddleware, requireFaculty);

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — live reference to authRoutes mockUsers (students only)
// ─────────────────────────────────────────────────────────────────────────────
function getMockStudents() {
    return (authRoutes.mockUsers || [])
        .filter(u => u.role === 'student')
        .map(u => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            selectedLanguage: u.selectedLanguage || null,
            currentLevel: u.currentLevel || 'beginner',
            totalPoints: u.totalPoints || 0,
            accuracy: u.accuracy || 0,
            questionsAnswered: u.questionsAnswered || 0,
            streak: u.streak || 0,
            badges: u.badges || [],
            lastActive: u.lastActive || new Date().toISOString()
        }));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculty/students — All students with stats
// ─────────────────────────────────────────────────────────────────────────────

router.get('/students', async (req, res) => {
    try {
        if (!dbService.isDbAvailable()) {
            return res.json({ success: true, students: getMockStudents(), source: 'mock' });
        }

        const students = await db.query(`
            SELECT
                u.user_id                                       AS id,
                u.full_name                                     AS fullName,
                u.email,
                u.selected_language                             AS selectedLanguage,
                u.total_points                                  AS totalPoints,
                COALESCE(p.current_level, 'beginner')           AS currentLevel,
                COALESCE(p.consecutive_correct, 0)              AS streak,
                COALESCE(p.last_activity, u.created_at)         AS lastActive,
                COALESCE(p.questions_answered, 0)               AS questionsAnswered,
                COALESCE(p.accuracy_percent, 0)                 AS accuracy
            FROM users u
            LEFT JOIN progress p ON p.user_id = u.user_id
            WHERE u.role = 'student'
            GROUP BY u.user_id, u.full_name, u.email, u.selected_language,
                     u.total_points, p.current_level, p.consecutive_correct,
                     p.last_activity, p.questions_answered, p.accuracy_percent, u.created_at
            ORDER BY u.total_points DESC
        `);

        // Attach badges
        for (const s of students) {
            try {
                const badges = await db.query(
                    'SELECT badge_id FROM rewards WHERE user_id = ? AND reward_type = "badge"',
                    [s.id]
                );
                s.badges = badges.map(b => b.badge_id);
            } catch (_) {
                s.badges = [];
            }
        }

        res.json({ success: true, students, source: 'database' });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.json({ success: true, students: getMockStudents(), source: 'mock' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculty/students/:id — Single student detailed progress
// ─────────────────────────────────────────────────────────────────────────────

router.get('/students/:id', async (req, res) => {
    const studentId = parseInt(req.params.id);

    try {
        if (!dbService.isDbAvailable()) {
            const student = getMockStudents().find(s => s.id === studentId);
            if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
            return res.json({ success: true, student, source: 'mock' });
        }

        const rows = await db.query(`
            SELECT
                u.user_id                                   AS id,
                u.full_name                                 AS fullName,
                u.email,
                u.selected_language                         AS selectedLanguage,
                u.total_points                              AS totalPoints,
                COALESCE(p.current_level, 'beginner')       AS currentLevel,
                COALESCE(p.consecutive_correct, 0)          AS streak,
                COALESCE(p.last_activity, u.created_at)     AS lastActive,
                COALESCE(p.questions_answered, 0)           AS questionsAnswered,
                COALESCE(p.accuracy_percent, 0)             AS accuracy
            FROM users u
            LEFT JOIN progress p ON p.user_id = u.user_id
            WHERE u.user_id = ? AND u.role = 'student'
            GROUP BY u.user_id, u.full_name, u.email, u.selected_language,
                     u.total_points, p.current_level, p.consecutive_correct,
                     p.last_activity, p.questions_answered, p.accuracy_percent, u.created_at
        `, [studentId]);

        if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found' });

        const student = rows[0];

        // Badges
        const badges = await db.query(
            'SELECT badge_id FROM rewards WHERE user_id = ? AND reward_type = "badge"',
            [studentId]
        );
        student.badges = badges.map(b => b.badge_id);

        // Recent answers (last 10)
        const recentAnswers = await db.query(`
            SELECT ua.question_id, ua.is_correct, ua.answered_at AS created_at
            FROM user_answers ua
            WHERE ua.user_id = ?
            ORDER BY ua.answered_at DESC
            LIMIT 10
        `, [studentId]);
        student.recentAnswers = recentAnswers;

        res.json({ success: true, student, source: 'database' });
    } catch (error) {
        console.error('Error fetching student detail:', error);
        const student = getMockStudents().find(s => s.id === studentId);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
        res.json({ success: true, student, source: 'mock' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/faculty/analytics — Aggregate stats
// ─────────────────────────────────────────────────────────────────────────────

router.get('/analytics', async (req, res) => {
    try {
        if (!dbService.isDbAvailable()) {
            // Compute from live mock data
            const students = getMockStudents();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const totalStudents = students.length;
            const activeToday = students.filter(s => new Date(s.lastActive) >= today).length;
            const avgAccuracy = totalStudents
                ? Math.round(students.reduce((sum, s) => sum + (s.accuracy || 0), 0) / totalStudents)
                : 0;
            const totalQuestionsAnswered = students.reduce((sum, s) => sum + (s.questionsAnswered || 0), 0);

            const languageBreakdown = {};
            const levelBreakdown = {};
            for (const s of students) {
                if (s.selectedLanguage) languageBreakdown[s.selectedLanguage] = (languageBreakdown[s.selectedLanguage] || 0) + 1;
                if (s.currentLevel) levelBreakdown[s.currentLevel] = (levelBreakdown[s.currentLevel] || 0) + 1;
            }

            return res.json({
                success: true,
                analytics: { totalStudents, activeToday, avgAccuracy, totalQuestionsAnswered, languageBreakdown, levelBreakdown },
                source: 'mock'
            });
        }

        // DB queries
        const todayStr = new Date().toISOString().slice(0, 10);

        const totalRows = await db.query('SELECT COUNT(*) AS totalStudents FROM users WHERE role = "student"');
        const totalStudents = totalRows[0].totalStudents;

        const activeRows = await db.query(
            'SELECT COUNT(*) AS activeToday FROM progress WHERE DATE(last_activity) = ?',
            [todayStr]
        );
        const activeToday = activeRows[0].activeToday;

        const accRows = await db.query(
            'SELECT ROUND(AVG(accuracy_percent), 1) AS avgAccuracy FROM progress'
        );
        const avgAccuracy = accRows[0].avgAccuracy || 0;

        const qaRows = await db.query(
            'SELECT SUM(questions_answered) AS totalQuestionsAnswered FROM progress'
        );
        const totalQuestionsAnswered = qaRows[0].totalQuestionsAnswered || 0;

        const langRows = await db.query(
            'SELECT selected_language AS lang, COUNT(*) AS cnt FROM users WHERE role = "student" GROUP BY selected_language'
        );
        const languageBreakdown = {};
        for (const r of langRows) if (r.lang) languageBreakdown[r.lang] = r.cnt;

        const levelRows = await db.query(
            'SELECT current_level AS lvl, COUNT(*) AS cnt FROM progress GROUP BY current_level'
        );
        const levelBreakdown = {};
        for (const r of levelRows) if (r.lvl) levelBreakdown[r.lvl] = r.cnt;

        res.json({
            success: true,
            analytics: {
                totalStudents,
                activeToday,
                avgAccuracy: avgAccuracy || 0,
                totalQuestionsAnswered,
                languageBreakdown,
                levelBreakdown
            },
            source: 'database'
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        const students = getMockStudents();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const totalStudents = students.length;
        const activeToday = students.filter(s => new Date(s.lastActive) >= today).length;
        const avgAccuracy = totalStudents
            ? Math.round(students.reduce((s, x) => s + (x.accuracy || 0), 0) / totalStudents)
            : 0;
        const totalQuestionsAnswered = students.reduce((s, x) => s + (x.questionsAnswered || 0), 0);
        const languageBreakdown = {};
        const levelBreakdown = {};
        for (const s of students) {
            if (s.selectedLanguage) languageBreakdown[s.selectedLanguage] = (languageBreakdown[s.selectedLanguage] || 0) + 1;
            if (s.currentLevel) levelBreakdown[s.currentLevel] = (levelBreakdown[s.currentLevel] || 0) + 1;
        }
        res.json({
            success: true,
            analytics: { totalStudents, activeToday, avgAccuracy, totalQuestionsAnswered, languageBreakdown, levelBreakdown },
            source: 'mock'
        });
    }
});

module.exports = router;
