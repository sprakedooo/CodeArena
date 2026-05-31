/**
 * CLASSROOM ROUTES (classroomRoutes.js)
 * Moodle-inspired virtual classroom system — Classroom Mode
 *
 * FACULTY endpoints:
 *   POST   /api/classrooms                         - Create classroom (generates key)
 *   GET    /api/classrooms/mine                    - Faculty's classrooms
 *   GET    /api/classrooms/:id                     - Classroom details
 *   DELETE /api/classrooms/:id                     - Delete classroom
 *   GET    /api/classrooms/:id/students            - Enrolled students
 *   DELETE /api/classrooms/:id/students/:sid       - Remove student
 *   POST   /api/classrooms/:id/lessons             - Create lesson
 *   PUT    /api/classrooms/:id/lessons/:lid        - Edit lesson
 *   DELETE /api/classrooms/:id/lessons/:lid        - Delete lesson
 *   POST   /api/classrooms/:id/questions           - Create challenge
 *   PUT    /api/classrooms/:id/questions/:qid      - Edit challenge
 *   DELETE /api/classrooms/:id/questions/:qid      - Delete challenge
 *   GET    /api/classrooms/:id/analytics           - Classroom analytics
 *
 * STUDENT endpoints:
 *   POST   /api/classrooms/join                    - Enroll with key
 *   GET    /api/classrooms/enrolled                - My enrolled classrooms
 *   GET    /api/classrooms/:id/lessons             - View lessons (enrolled only)
 *
 * SHARED:
 *   GET    /api/classrooms/:id/leaderboard         - Classroom leaderboard
 */

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const { authMiddleware } = require('../middleware/authMiddleware');
const dbService = require('../services/dbService');
const db = require('../config/database');
const openaiService = require('../services/openaiService');

// All classroom routes require auth
router.use(authMiddleware);

// ─── In-memory fallback store ─────────────────────────────────────────────────
let mockClassrooms   = [];
let mockEnrollments  = [];
let mockClLessons    = [];
let mockClQuestions  = [];
let mockClAnswers    = [];
let _nextId = { cl: 1, en: 1, le: 1, qu: 1, se: 1, an: 1 };

// ─── User identity cache (mock mode — keyed by user id) ──────────────────────
// Populated whenever any authenticated request arrives, so we can resolve names
// even when the DB is offline.
const mockUserCache = {};
function cacheUser(req) {
    if (req.user && req.user.id) {
        mockUserCache[req.user.id] = {
            id:       req.user.id,
            fullName: req.user.fullName || req.user.name || 'Student',
            email:    req.user.email    || ''
        };
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(4)}-${seg(4)}`;
}

function requireFacultyRole(req, res) {
    if (req.user.role !== 'faculty') {
        res.status(403).json({ success: false, message: 'Faculty access required' });
        return false;
    }
    return true;
}

function isEnrolled(classroomId, studentId) {
    return mockEnrollments.some(e => e.classroomId === classroomId && e.studentId === studentId && e.status === 'active');
}

// DB-aware enrollment check — returns true if enrolled (checks DB first, falls back to mock)
async function checkEnrolled(classroomId, studentId) {
    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT 1 FROM classroom_enrollments WHERE classroom_id = ? AND student_id = ? AND status = 'active'`,
                [classroomId, studentId]
            );
            return rows.length > 0;
        } catch { /* fall through to mock */ }
    }
    return isEnrolled(classroomId, studentId);
}

function classroomBelongsTo(classroomId, facultyId) {
    return mockClassrooms.some(c => c.id === classroomId && c.facultyId === facultyId);
}

/**
 * Ensure the requesting user exists as a row in the `users` table.
 * If not (e.g. registered before role-column migration, Google OAuth mock user),
 * insert a minimal placeholder so FK constraints don't fail.
 *
 * Uses a guaranteed-unique internal email (_placeholder_<id>@codearena.internal)
 * so the users.email UNIQUE index can never silently swallow the INSERT.
 */
async function ensureUserInDb(user) {
    if (!dbService.isDbAvailable() || !user || !user.id || user.id === 0) return;
    try {
        const rows = await db.query('SELECT user_id FROM users WHERE user_id = ?', [user.id]);
        if (rows && rows.length > 0) return; // already in DB — nothing to do

        // Use a placeholder email that is guaranteed unique per user_id.
        // Never use the real email here: if it already belongs to a different
        // user_id row, ON DUPLICATE KEY fires on the UNIQUE email index and
        // the INSERT is silently converted to an UPDATE — user_id never lands.
        const placeholderEmail = `_placeholder_${user.id}@codearena.internal`;

        // Include a locked placeholder password so NOT NULL constraint is satisfied
        // even before the nullable-password migration is applied.
        // This account can never be logged into (no valid bcrypt prefix).
        const lockedPassword = '!LOCKED_PLACEHOLDER';
        await db.query(
            `INSERT INTO users (user_id, email, password, full_name, role)
             VALUES (?, ?, ?, ?, ?)`,
            [user.id, placeholderEmail, lockedPassword, user.fullName || 'User', user.role || 'student']
        );
        console.log(`Auto-inserted placeholder for user ${user.id} (${user.email}) to satisfy FK`);
    } catch (err) {
        console.warn('ensureUserInDb failed (non-fatal):', err.message);
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// FACULTY — CLASSROOM CRUD
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/classrooms — Create classroom
router.post('/', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const { name, description, subject, language } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Classroom name is required' });

    const facultyId = req.user.id;
    const lang = (language || 'python').toLowerCase();
    const key = generateKey();

    if (dbService.isDbAvailable()) {
        try {
            await ensureUserInDb(req.user);   // ← guarantee FK row exists
            const result = await db.query(
                'INSERT INTO classrooms (faculty_id, name, description, subject, language, enrollment_key) VALUES (?, ?, ?, ?, ?, ?)',
                [facultyId, name, description || null, subject || null, lang, key]
            );
            return res.status(201).json({
                success: true,
                classroom: { id: result.insertId, name, description, subject, language: lang, enrollmentKey: key, isActive: true },
                source: 'database'
            });
        } catch (err) {
            console.error('DB create classroom error:', err);
        }
    }

    // Mock fallback
    const classroom = {
        id: _nextId.cl++,
        facultyId,
        name,
        description: description || null,
        subject: subject || null,
        language: lang,
        enrollmentKey: key,
        isActive: true,
        createdAt: new Date().toISOString()
    };
    mockClassrooms.push(classroom);
    res.status(201).json({ success: true, classroom: { ...classroom, enrollmentKey: key }, source: 'mock' });
});

// GET /api/classrooms/mine — Faculty's own classrooms
router.get('/mine', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const facultyId = req.user.id;

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT c.*,
                    COUNT(DISTINCT e.student_id)   AS studentCount,
                    COUNT(DISTINCT l.lesson_id)    AS lessonCount,
                    COUNT(DISTINCT q.question_id)  AS questionCount
                 FROM classrooms c
                 LEFT JOIN classroom_enrollments e  ON e.classroom_id = c.classroom_id AND e.status = 'active'
                 LEFT JOIN classroom_lessons l      ON l.classroom_id = c.classroom_id
                 LEFT JOIN classroom_questions q    ON q.classroom_id = c.classroom_id
                 WHERE c.faculty_id = ?
                 GROUP BY c.classroom_id
                 ORDER BY c.created_at DESC`,
                [facultyId]
            );
            return res.json({ success: true, classrooms: rows, source: 'database' });
        } catch (err) {
            console.error('DB get classrooms error:', err);
        }
    }

    const classrooms = mockClassrooms
        .filter(c => c.facultyId === facultyId)
        .map(c => ({
            ...c,
            studentCount:  mockEnrollments.filter(e => e.classroomId === c.id && e.status === 'active').length,
            lessonCount:   mockClLessons.filter(l => l.classroomId === c.id).length,
            questionCount: mockClQuestions.filter(q => q.classroomId === c.id).length
        }));
    res.json({ success: true, classrooms, source: 'mock' });
});

// GET /api/classrooms/enrolled — Student's enrolled classrooms
router.get('/enrolled', async (req, res) => {
    cacheUser(req); // keep identity fresh
    const studentId = req.user.id;

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT c.classroom_id AS id, c.name, c.description, c.subject,
                        c.language, c.banner_image, c.is_active,
                        u.full_name AS facultyName, e.enrolled_at,
                        (SELECT COUNT(*) FROM classroom_enrollments ce WHERE ce.classroom_id = c.classroom_id AND ce.status='active') AS student_count,
                        (SELECT COUNT(*) FROM classroom_lessons cl WHERE cl.classroom_id = c.classroom_id) AS lesson_count
                 FROM classroom_enrollments e
                 JOIN classrooms c ON c.classroom_id = e.classroom_id
                 JOIN users u ON u.user_id = c.faculty_id
                 WHERE e.student_id = ? AND e.status = 'active' AND c.is_active = TRUE
                 ORDER BY e.enrolled_at DESC`,
                [studentId]
            );
            return res.json({ success: true, classrooms: rows, source: 'database' });
        } catch (err) {
            console.error('DB enrolled error:', err);
        }
    }

    const enrolled = mockEnrollments
        .filter(e => e.studentId === studentId && e.status === 'active')
        .map(e => {
            const c = mockClassrooms.find(c => c.id === e.classroomId);
            return c ? { id: c.id, name: c.name, description: c.description, subject: c.subject, enrolledAt: e.enrolledAt } : null;
        })
        .filter(Boolean);
    res.json({ success: true, classrooms: enrolled, source: 'mock' });
});

// GET /api/classrooms/:id — Single classroom details
router.get('/:id', async (req, res) => {
    const classroomId = parseInt(req.params.id);

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT c.*, u.full_name AS facultyName,
                    COUNT(DISTINCT e.student_id)  AS studentCount,
                    COUNT(DISTINCT l.lesson_id)   AS lesson_count,
                    COUNT(DISTINCT q.question_id) AS challenge_count
                 FROM classrooms c
                 JOIN users u ON u.user_id = c.faculty_id
                 LEFT JOIN classroom_enrollments e ON e.classroom_id = c.classroom_id AND e.status = 'active'
                 LEFT JOIN classroom_lessons l      ON l.classroom_id = c.classroom_id
                 LEFT JOIN classroom_questions q    ON q.classroom_id = c.classroom_id
                 WHERE c.classroom_id = ?
                 GROUP BY c.classroom_id`,
                [classroomId]
            );
            if (!rows.length) return res.status(404).json({ success: false, message: 'Classroom not found' });
            return res.json({ success: true, classroom: rows[0], source: 'database' });
        } catch (err) {
            console.error('DB get classroom error:', err);
        }
    }

    const classroom = mockClassrooms.find(c => c.id === classroomId);
    if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found' });
    const studentCount    = mockEnrollments.filter(e => e.classroomId === classroomId && e.status === 'active').length;
    const lesson_count    = mockClLessons.filter(l => l.classroomId === classroomId).length;
    const challenge_count = mockClQuestions.filter(q => q.classroomId === classroomId).length;
    res.json({ success: true, classroom: { ...classroom, studentCount, lesson_count, challenge_count }, source: 'mock' });
});

// DELETE /api/classrooms/:id — Delete classroom (faculty only, password required)
router.delete('/:id', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const facultyId   = req.user.id;
    const { password } = req.body;

    if (!password) return res.status(400).json({ success: false, message: 'Password is required to delete a classroom.' });

    // Verify password against stored hash
    try {
        const [rows] = await db.query('SELECT password FROM users WHERE user_id = ?', [facultyId]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
        const match = await bcrypt.compare(password, rows[0].password);
        if (!match) return res.status(403).json({ success: false, message: 'Incorrect password.' });
    } catch {
        // DB unavailable — skip password check for mock users (dev only)
    }

    if (dbService.isDbAvailable()) {
        try {
            await db.query('DELETE FROM classrooms WHERE classroom_id = ? AND faculty_id = ?', [classroomId, facultyId]);
            return res.json({ success: true, message: 'Classroom deleted' });
        } catch (err) {
            console.error('DB delete classroom error:', err);
        }
    }

    mockClassrooms = mockClassrooms.filter(c => !(c.id === classroomId && c.facultyId === facultyId));
    res.json({ success: true, message: 'Classroom deleted', source: 'mock' });
});

// ═════════════════════════════════════════════════════════════════════════════
// STUDENT — ENROLLMENT
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/classrooms/join — Enroll with key
router.post('/join', async (req, res) => {
    cacheUser(req); // always cache the student's identity
    console.log('[JOIN] body:', req.body, '| user:', req.user?.id);
    const enrollmentKey = (req.body.enrollmentKey || req.body.enrollment_key || '').toString().trim().toUpperCase();
    const studentId = req.user.id;
    if (!enrollmentKey) return res.status(400).json({ success: false, message: 'Enrollment key is required' });

    if (dbService.isDbAvailable()) {
        try {
            const classrooms = await db.query(
                'SELECT * FROM classrooms WHERE enrollment_key = ? AND is_active = TRUE',
                [enrollmentKey]
            );
            if (!classrooms.length) return res.status(404).json({ success: false, message: 'Invalid or expired enrollment key' });
            const classroom = classrooms[0];

            const existing = await db.query(
                'SELECT * FROM classroom_enrollments WHERE classroom_id = ? AND student_id = ?',
                [classroom.classroom_id, studentId]
            );
            if (existing.length) {
                if (existing[0].status === 'active') return res.status(400).json({ success: false, message: 'Already enrolled in this classroom' });
                await db.query('UPDATE classroom_enrollments SET status = "active" WHERE classroom_id = ? AND student_id = ?', [classroom.classroom_id, studentId]);
            } else {
                await ensureUserInDb(req.user);   // ← guarantee student FK row exists
                await db.query('INSERT INTO classroom_enrollments (classroom_id, student_id) VALUES (?, ?)', [classroom.classroom_id, studentId]);
            }

            return res.json({ success: true, message: `Successfully joined "${classroom.name}"`, classroom: { id: classroom.classroom_id, name: classroom.name }, source: 'database' });
        } catch (err) {
            console.error('DB join error:', err);
        }
    }

    const classroom = mockClassrooms.find(c => c.enrollmentKey === enrollmentKey && c.isActive);
    if (!classroom) return res.status(404).json({ success: false, message: 'Invalid or expired enrollment key' });

    const existing = mockEnrollments.find(e => e.classroomId === classroom.id && e.studentId === studentId);
    if (existing) {
        if (existing.status === 'active') return res.status(400).json({ success: false, message: 'Already enrolled in this classroom' });
        existing.status = 'active';
        existing.fullName = req.user.fullName || existing.fullName;
        existing.email    = req.user.email    || existing.email;
    } else {
        mockEnrollments.push({
            id: _nextId.en++,
            classroomId: classroom.id,
            studentId,
            fullName: req.user.fullName || 'Student',
            email:    req.user.email    || '',
            status: 'active',
            enrolledAt: new Date().toISOString()
        });
    }
    res.json({ success: true, message: `Successfully joined "${classroom.name}"`, classroom: { id: classroom.id, name: classroom.name }, source: 'mock' });
});

// ═════════════════════════════════════════════════════════════════════════════
// FACULTY — STUDENT MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/classrooms/:id/students
router.get('/:id/students', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT u.user_id AS id, u.full_name AS fullName, u.email,
                        u.total_xp AS totalXp, u.selected_language AS selectedLanguage,
                        e.enrolled_at AS enrolledAt,
                        COALESCE(p.current_level, 'beginner') AS currentLevel,
                        COALESCE(p.accuracy_percent, 0) AS accuracy,
                        COALESCE(p.questions_answered, 0) AS questionsAnswered
                 FROM classroom_enrollments e
                 JOIN users u ON u.user_id = e.student_id
                 LEFT JOIN progress p ON p.user_id = u.user_id
                 WHERE e.classroom_id = ? AND e.status = 'active'
                 ORDER BY u.total_xp DESC`,
                [classroomId]
            );
            return res.json({ success: true, students: rows, source: 'database' });
        } catch (err) {
            console.error('DB get students error:', err);
        }
    }

    const students = mockEnrollments
        .filter(e => e.classroomId === classroomId && e.status === 'active')
        .map(e => {
            const cached = mockUserCache[e.studentId] || {};
            return {
                id:        e.studentId,
                fullName:  e.fullName  || cached.fullName || 'Student',
                email:     e.email     || cached.email    || '—',
                status:    e.status,
                enrolledAt: e.enrolledAt
            };
        });
    res.json({ success: true, students, source: 'mock' });
});

// DELETE /api/classrooms/:id/students/:sid — Remove student
router.delete('/:id/students/:sid', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const studentId   = parseInt(req.params.sid);

    if (dbService.isDbAvailable()) {
        try {
            await db.query(
                'UPDATE classroom_enrollments SET status = "removed" WHERE classroom_id = ? AND student_id = ?',
                [classroomId, studentId]
            );
            return res.json({ success: true, message: 'Student removed from classroom' });
        } catch (err) {
            console.error('DB remove student error:', err);
        }
    }

    const e = mockEnrollments.find(e => e.classroomId === classroomId && e.studentId === studentId);
    if (e) e.status = 'removed';
    res.json({ success: true, message: 'Student removed from classroom', source: 'mock' });
});

// ═════════════════════════════════════════════════════════════════════════════
// LESSONS
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/classrooms/:id/lessons
router.post('/:id/lessons', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const { title, content, language, orderIndex } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content are required' });

    if (dbService.isDbAvailable()) {
        try {
            await ensureUserInDb(req.user);
            const result = await db.query(
                'INSERT INTO classroom_lessons (classroom_id, faculty_id, title, content, language, order_index) VALUES (?, ?, ?, ?, ?, ?)',
                [classroomId, req.user.id, title, content, language || null, orderIndex || 0]
            );
            return res.status(201).json({ success: true, lessonId: result.insertId, source: 'database' });
        } catch (err) { console.error(err); }
    }

    const lesson = { id: _nextId.le++, classroomId, facultyId: req.user.id, title, content, language: language || null, orderIndex: orderIndex || 0, createdAt: new Date().toISOString() };
    mockClLessons.push(lesson);
    res.status(201).json({ success: true, lesson, source: 'mock' });
});

// GET /api/classrooms/:id/lessons
router.get('/:id/lessons', async (req, res) => {
    const classroomId = parseInt(req.params.id);
    const userId      = req.user.id;
    const isFaculty   = req.user.role === 'faculty';

    if (dbService.isDbAvailable()) {
        try {
            // Check enrollment via DB (not mock cache)
            if (!isFaculty) {
                const enrollment = await db.query(
                    `SELECT 1 FROM classroom_enrollments WHERE classroom_id = ? AND student_id = ? AND status = 'active'`,
                    [classroomId, userId]
                );
                if (!enrollment.length) return res.status(403).json({ success: false, message: 'You are not enrolled in this classroom' });
            }
            const rows = await db.query(
                'SELECT * FROM classroom_lessons WHERE classroom_id = ? ORDER BY order_index ASC, created_at ASC',
                [classroomId]
            );
            return res.json({ success: true, lessons: rows, source: 'database' });
        } catch (err) { console.error(err); }
    }

    // Mock fallback — check in-memory enrollment
    if (!isFaculty && !isEnrolled(classroomId, userId)) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this classroom' });
    }
    const lessons = mockClLessons.filter(l => l.classroomId === classroomId).sort((a, b) => a.orderIndex - b.orderIndex);
    res.json({ success: true, lessons, source: 'mock' });
});

// PUT /api/classrooms/:id/lessons/:lid
router.put('/:id/lessons/:lid', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const lessonId    = parseInt(req.params.lid);
    const { title, content, language, orderIndex } = req.body;

    if (dbService.isDbAvailable()) {
        try {
            await db.query(
                'UPDATE classroom_lessons SET title=?, content=?, language=?, order_index=? WHERE lesson_id=? AND classroom_id=?',
                [title, content, language || null, orderIndex || 0, lessonId, classroomId]
            );
            return res.json({ success: true, message: 'Lesson updated', source: 'database' });
        } catch (err) { console.error(err); }
    }

    const lesson = mockClLessons.find(l => l.id === lessonId && l.classroomId === classroomId);
    if (lesson) { lesson.title = title; lesson.content = content; lesson.language = language || null; lesson.orderIndex = orderIndex || 0; }
    res.json({ success: true, message: 'Lesson updated', source: 'mock' });
});

// DELETE /api/classrooms/:id/lessons/:lid
router.delete('/:id/lessons/:lid', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const lessonId    = parseInt(req.params.lid);

    if (dbService.isDbAvailable()) {
        try {
            await db.query('DELETE FROM classroom_lessons WHERE lesson_id = ? AND classroom_id = ?', [lessonId, classroomId]);
            return res.json({ success: true, message: 'Lesson deleted' });
        } catch (err) { console.error(err); }
    }

    mockClLessons = mockClLessons.filter(l => !(l.id === lessonId && l.classroomId === classroomId));
    res.json({ success: true, message: 'Lesson deleted', source: 'mock' });
});

// ═════════════════════════════════════════════════════════════════════════════
// CHALLENGES / QUESTIONS
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/classrooms/:id/questions
router.post('/:id/questions', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const questionText  = req.body.questionText  || req.body.question_text;
    const correctAnswer = req.body.correctAnswer || req.body.correct_answer;
    const { type, options, hint, difficulty, points, topic } = req.body;
    if (!questionText || !correctAnswer) return res.status(400).json({ success: false, message: 'Question text and correct answer are required' });

    if (dbService.isDbAvailable()) {
        try {
            await ensureUserInDb(req.user);
            const result = await db.query(
                'INSERT INTO classroom_questions (classroom_id, faculty_id, question_text, type, options, correct_answer, hint, difficulty, points, topic) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [classroomId, req.user.id, questionText, type || 'mcq', JSON.stringify(options || []), correctAnswer, hint || null, difficulty || 'beginner', points || 10, topic || null]
            );
            return res.status(201).json({ success: true, questionId: result.insertId, source: 'database' });
        } catch (err) { console.error(err); }
    }

    const q = { id: _nextId.qu++, classroomId, facultyId: req.user.id, questionText, type: type || 'mcq', options: options || [], correctAnswer, hint: hint || null, difficulty: difficulty || 'beginner', points: points || 10, topic: topic || null, createdAt: new Date().toISOString() };
    mockClQuestions.push(q);
    res.status(201).json({ success: true, question: q, source: 'mock' });
});

// GET /api/classrooms/:id/questions
router.get('/:id/questions', async (req, res) => {
    const classroomId = parseInt(req.params.id);
    const isFaculty = req.user.role === 'faculty';
    if (!isFaculty && !(await checkEnrolled(classroomId, req.user.id))) return res.status(403).json({ success: false, message: 'Not enrolled' });

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query('SELECT * FROM classroom_questions WHERE classroom_id = ? ORDER BY created_at DESC', [classroomId]);
            // Hide correct answer for students
            const data = isFaculty ? rows : rows.map(q => ({ ...q, correct_answer: undefined }));
            return res.json({ success: true, questions: data, source: 'database' });
        } catch (err) { console.error(err); }
    }

    const questions = mockClQuestions.filter(q => q.classroomId === classroomId);
    const data = isFaculty ? questions : questions.map(q => { const { correctAnswer, ...rest } = q; return rest; });
    res.json({ success: true, questions: data, source: 'mock' });
});

// PUT /api/classrooms/:id/questions/:qid
router.put('/:id/questions/:qid', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId  = parseInt(req.params.id);
    const questionId   = parseInt(req.params.qid);
    const questionText  = req.body.questionText  || req.body.question_text;
    const correctAnswer = req.body.correctAnswer || req.body.correct_answer;
    const { type, options, hint, difficulty, points, topic } = req.body;

    if (dbService.isDbAvailable()) {
        try {
            await db.query(
                'UPDATE classroom_questions SET question_text=?, type=?, options=?, correct_answer=?, hint=?, difficulty=?, points=?, topic=? WHERE question_id=? AND classroom_id=?',
                [questionText, type, JSON.stringify(options || []), correctAnswer, hint || null, difficulty, points || 10, topic || null, questionId, classroomId]
            );
            return res.json({ success: true, message: 'Question updated', source: 'database' });
        } catch (err) { console.error(err); }
    }

    const q = mockClQuestions.find(q => q.id === questionId && q.classroomId === classroomId);
    if (q) Object.assign(q, { questionText, type, options, correctAnswer, hint, difficulty, points, topic });
    res.json({ success: true, message: 'Question updated', source: 'mock' });
});

// DELETE /api/classrooms/:id/questions/:qid
router.delete('/:id/questions/:qid', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const questionId  = parseInt(req.params.qid);

    if (dbService.isDbAvailable()) {
        try {
            await db.query('DELETE FROM classroom_questions WHERE question_id = ? AND classroom_id = ?', [questionId, classroomId]);
            return res.json({ success: true, message: 'Question deleted' });
        } catch (err) { console.error(err); }
    }

    mockClQuestions = mockClQuestions.filter(q => !(q.id === questionId && q.classroomId === classroomId));
    res.json({ success: true, message: 'Question deleted', source: 'mock' });
});

// ═════════════════════════════════════════════════════════════════════════════
// AI QUESTION GENERATION (faculty only)
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/classrooms/:id/questions/generate
router.post('/:id/questions/generate', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const { topic, difficulty, language, type } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'Topic is required' });

    try {
        const question = await openaiService.generateQuestion({ topic, difficulty, language, type });
        res.json({ success: true, question });
    } catch (err) {
        console.error('OpenAI question generation error:', err.message);
        res.status(500).json({ success: false, message: err.message || 'Failed to generate question' });
    }
});

// ═════════════════════════════════════════════════════════════════════════════
// LEADERBOARD & ANALYTICS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/classrooms/:id/leaderboard
router.get('/:id/leaderboard', async (req, res) => {
    const classroomId = parseInt(req.params.id);

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT u.user_id AS id, u.full_name AS fullName,
                        u.total_xp AS totalPoints,
                        (SELECT COUNT(*) FROM user_answers ua WHERE ua.user_id = u.user_id) AS answered,
                        (SELECT SUM(is_correct) FROM user_answers ua WHERE ua.user_id = u.user_id) AS correct
                 FROM classroom_enrollments ce
                 JOIN users u ON u.user_id = ce.student_id
                 WHERE ce.classroom_id = ? AND ce.status = 'active'
                 ORDER BY totalPoints DESC`,
                [classroomId]
            );
            return res.json({ success: true, leaderboard: rows, source: 'database' });
        } catch (err) { console.error('Leaderboard error:', err); }
    }

    // Mock: rank enrolled students by XP
    const enrolled = mockEnrollments.filter(e => e.classroomId === classroomId && e.status === 'active');
    const leaderboard = enrolled.map(e => {
        const cached = mockUserCache[e.studentId] || {};
        return { id: e.studentId, fullName: e.fullName || cached.fullName || `Student #${e.studentId}`, totalPoints: cached.total_xp || 0, answered: 0, correct: 0 };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
    res.json({ success: true, leaderboard, source: 'mock' });
});

// GET /api/classrooms/:id/analytics — Faculty analytics
router.get('/:id/analytics', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);

    if (dbService.isDbAvailable()) {
        try {
            const [enrollCount] = await db.query('SELECT COUNT(*) AS total FROM classroom_enrollments WHERE classroom_id = ? AND status = "active"', [classroomId]);
            return res.json({ success: true, analytics: { enrolledStudents: enrollCount.total }, source: 'database' });
        } catch (err) { console.error(err); }
    }

    const enrolled = mockEnrollments.filter(e => e.classroomId === classroomId && e.status === 'active').length;
    res.json({ success: true, analytics: { enrolledStudents: enrolled }, source: 'mock' });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 6 — AI FEEDBACK (per student, per classroom)
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/classrooms/:id/feedback — Student's AI feedback for this classroom
router.get('/:id/feedback', async (req, res) => {
    const classroomId = parseInt(req.params.id);
    const studentId   = req.user.id;

    let answers = [];
    let questions = [];

    if (dbService.isDbAvailable()) {
        try {
            // Get all answers by this student in this classroom
            answers = await db.query(
                `SELECT ca.*, cq.topic, cq.difficulty, cq.points
                 FROM classroom_answers ca
                 LEFT JOIN classroom_questions cq ON cq.question_id = ca.question_id
                 WHERE cq.classroom_id = ? AND ca.student_id = ?`,
                [classroomId, studentId]
            );
            questions = await db.query('SELECT * FROM classroom_questions WHERE classroom_id = ?', [classroomId]);
        } catch (err) { console.error(err); }
    } else {
        answers = mockClAnswers.filter(a => a.classroomId === classroomId && a.studentId === studentId);
        questions = mockClQuestions.filter(q => q.classroomId === classroomId);
    }

    if (!answers.length) {
        return res.json({
            success: true,
            feedback: {
                overallAssessment: "You haven't answered any questions in this classroom yet. Complete some challenges to get personalized feedback!",
                weakAreas: [],
                strongAreas: [],
                recommendations: ['Complete classroom challenges to unlock AI feedback.'],
                stats: { total: 0, correct: 0, accuracy: 0 }
            }
        });
    }

    // Compute per-topic stats
    const topicMap = {};
    answers.forEach(a => {
        const topic = a.topic || 'General';
        if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
        topicMap[topic].total++;
        if (a.is_correct || a.isCorrect) topicMap[topic].correct++;
    });

    const total   = answers.length;
    const correct = answers.filter(a => a.is_correct || a.isCorrect).length;
    const accuracy = Math.round((correct / total) * 100);

    const weakAreas   = Object.entries(topicMap).filter(([, s]) => s.total > 0 && (s.correct / s.total) < 0.5).map(([t, s]) => ({ topic: t, accuracy: Math.round((s.correct / s.total) * 100) }));
    const strongAreas = Object.entries(topicMap).filter(([, s]) => s.total > 0 && (s.correct / s.total) >= 0.8).map(([t, s]) => ({ topic: t, accuracy: Math.round((s.correct / s.total) * 100) }));

    // Recommendations (always rule-based — fast, free)
    const recommendations = [];
    if (weakAreas.length)  recommendations.push(`Review these topics: ${weakAreas.map(w => w.topic).join(', ')}.`);
    if (accuracy < 70)     recommendations.push('Re-read the classroom lessons before attempting more challenges.');
    if (accuracy >= 80)    recommendations.push('Try the advanced challenges to push yourself further!');
    if (total < 5)         recommendations.push('Complete more challenges for a more accurate assessment.');
    if (!recommendations.length) recommendations.push('Keep practising consistently to maintain your performance!');

    // AI-generated overall assessment via OpenAI (with rule-based fallback)
    let overallAssessment = '';
    try {
        // Fetch classroom name for context
        let classroomName = 'this classroom';
        try {
            if (dbService.isDbAvailable()) {
                const [cl] = await db.query('SELECT name FROM classrooms WHERE classroom_id = ?', [classroomId]);
                if (cl) classroomName = cl.name;
            } else {
                const cl = mockClassrooms.find(c => c.id === classroomId);
                if (cl) classroomName = cl.name;
            }
        } catch (_) {}

        overallAssessment = await openaiService.generateFeedback({
            studentName:   req.user.fullName || 'Student',
            total, correct, accuracy,
            weakAreas:   weakAreas.map(w => w.topic),
            strongAreas: strongAreas.map(s => s.topic),
            classroomName,
        });
    } catch (err) {
        // Fallback to rule-based if OpenAI fails
        console.warn('OpenAI feedback fallback:', err.message);
        if (accuracy >= 90)      overallAssessment = `Outstanding performance! You've answered ${correct} of ${total} questions correctly (${accuracy}%). You clearly understand the material.`;
        else if (accuracy >= 75) overallAssessment = `Great work! You scored ${accuracy}% accuracy across ${total} questions. Keep it up and target your weak areas to reach mastery.`;
        else if (accuracy >= 50) overallAssessment = `Good effort! You got ${correct}/${total} correct (${accuracy}%). Focus on the topics below to improve your score.`;
        else                     overallAssessment = `You're getting started! Your accuracy is ${accuracy}% (${correct}/${total}). Review the lesson materials and try again — you'll improve!`;
    }

    res.json({
        success: true,
        overallAssessment, weakAreas, strongAreas, recommendations,
        stats: { totalAnswered: total, correctAnswers: correct, accuracy }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════

let mockAnnouncements = [];
let _nextAnnId = 1;
let mockComments = [];
let _nextCommentId = 1;

async function ensureAnnouncementsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS classroom_announcements (
                announcement_id INT AUTO_INCREMENT PRIMARY KEY,
                classroom_id    INT NOT NULL,
                faculty_id      INT NOT NULL,
                body            TEXT NOT NULL,
                link_url        VARCHAR(500) DEFAULT '',
                link_label      VARCHAR(200) DEFAULT '',
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch { /* DB unavailable */ }
}
ensureAnnouncementsTable();

// GET /api/classrooms/:id/announcements
router.get('/:id/announcements', async (req, res) => {
    const classroomId = parseInt(req.params.id);
    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT a.*, u.full_name AS author_name, u.avatar AS author_avatar
                 FROM classroom_announcements a
                 JOIN users u ON u.user_id = a.faculty_id
                 WHERE a.classroom_id = ?
                 ORDER BY a.created_at DESC`,
                [classroomId]
            );
            return res.json({ success: true, announcements: rows });
        } catch (err) { console.error(err); }
    }
    const list = mockAnnouncements.filter(a => a.classroom_id === classroomId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, announcements: list, source: 'mock' });
});

// POST /api/classrooms/:id/announcements
router.post('/:id/announcements', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const { body, link_url, link_label } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });
    if (dbService.isDbAvailable()) {
        try {
            const result = await db.query(
                `INSERT INTO classroom_announcements (classroom_id, faculty_id, body, link_url, link_label)
                 VALUES (?, ?, ?, ?, ?)`,
                [classroomId, req.user.id, body.trim(), link_url || '', link_label || '']
            );
            return res.json({ success: true, announcement_id: result.insertId });
        } catch (err) { console.error(err); }
    }
    const ann = {
        announcement_id: _nextAnnId++,
        classroom_id: classroomId,
        faculty_id: req.user.id,
        author_name: req.user.fullName || 'Faculty',
        body: body.trim(),
        link_url: link_url || '',
        link_label: link_label || '',
        created_at: new Date().toISOString()
    };
    mockAnnouncements.push(ann);
    res.json({ success: true, announcement_id: ann.announcement_id, source: 'mock' });
});

// GET /api/classrooms/:id/announcements/:aid/comments
router.get('/:id/announcements/:aid/comments', async (req, res) => {
    const aid = parseInt(req.params.aid);
    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT c.*, u.full_name AS author_name, u.role AS author_role
                 FROM announcement_comments c
                 JOIN users u ON u.user_id = c.user_id
                 WHERE c.announcement_id = ?
                 ORDER BY c.created_at ASC`,
                [aid]
            );
            return res.json({ success: true, comments: rows });
        } catch (err) { console.error(err); }
    }
    const comments = mockComments.filter(c => c.announcement_id === aid);
    res.json({ success: true, comments, source: 'mock' });
});

// POST /api/classrooms/:id/announcements/:aid/comments
router.post('/:id/announcements/:aid/comments', async (req, res) => {
    const aid = parseInt(req.params.aid);
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'body is required' });
    if (dbService.isDbAvailable()) {
        try {
            const result = await db.query(
                `INSERT INTO announcement_comments (announcement_id, user_id, body) VALUES (?, ?, ?)`,
                [aid, req.user.id, body.trim()]
            );
            return res.json({ success: true, comment_id: result.insertId });
        } catch (err) { console.error(err); }
    }
    const comment = {
        comment_id: _nextCommentId++,
        announcement_id: aid,
        user_id: req.user.id,
        author_name: req.user.fullName || req.user.full_name || 'Student',
        author_role: req.user.role || 'student',
        body: body.trim(),
        created_at: new Date().toISOString()
    };
    mockComments.push(comment);
    res.json({ success: true, comment_id: comment.comment_id, source: 'mock' });
});

// DELETE /api/classrooms/:id/announcements/:aid
router.delete('/:id/announcements/:aid', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const aid = parseInt(req.params.aid);
    if (dbService.isDbAvailable()) {
        try {
            await db.query('DELETE FROM classroom_announcements WHERE announcement_id = ? AND faculty_id = ?', [aid, req.user.id]);
            return res.json({ success: true });
        } catch (err) { console.error(err); }
    }
    mockAnnouncements = mockAnnouncements.filter(a => a.announcement_id !== aid);
    res.json({ success: true, source: 'mock' });
});

module.exports = router;
