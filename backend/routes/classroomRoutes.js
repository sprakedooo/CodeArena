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
 *   POST   /api/classrooms/:id/sessions            - Create game session
 *   PATCH  /api/classrooms/:id/sessions/:sid       - Start / close session
 *   GET    /api/classrooms/:id/analytics           - Classroom analytics
 *
 * STUDENT endpoints:
 *   POST   /api/classrooms/join                    - Enroll with key
 *   GET    /api/classrooms/enrolled                - My enrolled classrooms
 *   GET    /api/classrooms/:id/lessons             - View lessons (enrolled only)
 *   GET    /api/classrooms/:id/sessions/active     - Active session
 *   POST   /api/classrooms/:id/sessions/:sid/answer - Submit answer
 *
 * SHARED:
 *   GET    /api/classrooms/:id/leaderboard         - Session leaderboard
 */

const express = require('express');
const router  = express.Router();
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
let mockClSessions   = [];
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

function classroomBelongsTo(classroomId, facultyId) {
    return mockClassrooms.some(c => c.id === classroomId && c.facultyId === facultyId);
}

// ═════════════════════════════════════════════════════════════════════════════
// FACULTY — CLASSROOM CRUD
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/classrooms — Create classroom
router.post('/', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const { name, description, subject } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Classroom name is required' });

    const facultyId = req.user.id;
    const key = generateKey();

    if (dbService.isDbAvailable()) {
        try {
            const result = await db.query(
                'INSERT INTO classrooms (faculty_id, name, description, subject, enrollment_key) VALUES (?, ?, ?, ?, ?)',
                [facultyId, name, description || null, subject || null, key]
            );
            return res.status(201).json({
                success: true,
                classroom: { id: result.insertId, name, description, subject, enrollmentKey: key, isActive: true },
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
                        u.full_name AS facultyName, e.enrolled_at
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
                    COUNT(DISTINCT e.student_id) AS studentCount
                 FROM classrooms c
                 JOIN users u ON u.user_id = c.faculty_id
                 LEFT JOIN classroom_enrollments e ON e.classroom_id = c.classroom_id AND e.status = 'active'
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
    const studentCount = mockEnrollments.filter(e => e.classroomId === classroomId && e.status === 'active').length;
    res.json({ success: true, classroom: { ...classroom, studentCount }, source: 'mock' });
});

// DELETE /api/classrooms/:id — Delete classroom (faculty only)
router.delete('/:id', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const facultyId = req.user.id;

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
    const { enrollmentKey } = req.body;
    const studentId = req.user.id;
    if (!enrollmentKey) return res.status(400).json({ success: false, message: 'Enrollment key is required' });

    if (dbService.isDbAvailable()) {
        try {
            const classrooms = await db.query(
                'SELECT * FROM classrooms WHERE enrollment_key = ? AND is_active = TRUE',
                [enrollmentKey.toUpperCase()]
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
                await db.query('INSERT INTO classroom_enrollments (classroom_id, student_id) VALUES (?, ?)', [classroom.classroom_id, studentId]);
            }

            return res.json({ success: true, message: `Successfully joined "${classroom.name}"`, classroom: { id: classroom.classroom_id, name: classroom.name }, source: 'database' });
        } catch (err) {
            console.error('DB join error:', err);
        }
    }

    const classroom = mockClassrooms.find(c => c.enrollmentKey === enrollmentKey.toUpperCase() && c.isActive);
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
                        u.total_points AS totalPoints, u.selected_language AS selectedLanguage,
                        e.enrolled_at AS enrolledAt,
                        COALESCE(p.current_level, 'beginner') AS currentLevel,
                        COALESCE(p.accuracy_percent, 0) AS accuracy,
                        COALESCE(p.questions_answered, 0) AS questionsAnswered
                 FROM classroom_enrollments e
                 JOIN users u ON u.user_id = e.student_id
                 LEFT JOIN progress p ON p.user_id = u.user_id
                 WHERE e.classroom_id = ? AND e.status = 'active'
                 ORDER BY u.total_points DESC`,
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
    const userId = req.user.id;
    const isFaculty = req.user.role === 'faculty';

    // Students must be enrolled
    if (!isFaculty && !isEnrolled(classroomId, userId)) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this classroom' });
    }

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                'SELECT * FROM classroom_lessons WHERE classroom_id = ? ORDER BY order_index ASC, created_at ASC',
                [classroomId]
            );
            return res.json({ success: true, lessons: rows, source: 'database' });
        } catch (err) { console.error(err); }
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
    if (!isFaculty && !isEnrolled(classroomId, req.user.id)) return res.status(403).json({ success: false, message: 'Not enrolled' });

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
// GAME SESSIONS
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/classrooms/:id/sessions — Create session
router.post('/:id/sessions', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const { title, gameMode, questionIds } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Session title is required' });

    if (dbService.isDbAvailable()) {
        try {
            const result = await db.query(
                'INSERT INTO classroom_sessions (classroom_id, faculty_id, title, game_mode, question_ids) VALUES (?, ?, ?, ?, ?)',
                [classroomId, req.user.id, title, gameMode || 'mcq', JSON.stringify(questionIds || [])]
            );
            return res.status(201).json({ success: true, sessionId: result.insertId, source: 'database' });
        } catch (err) { console.error(err); }
    }

    const session = { id: _nextId.se++, classroomId, facultyId: req.user.id, title, gameMode: gameMode || 'mcq', questionIds: questionIds || [], status: 'pending', createdAt: new Date().toISOString() };
    mockClSessions.push(session);
    res.status(201).json({ success: true, session, source: 'mock' });
});

// GET /api/classrooms/:id/sessions — List sessions
router.get('/:id/sessions', async (req, res) => {
    const classroomId = parseInt(req.params.id);

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query('SELECT * FROM classroom_sessions WHERE classroom_id = ? ORDER BY created_at DESC', [classroomId]);
            return res.json({ success: true, sessions: rows, source: 'database' });
        } catch (err) { console.error(err); }
    }

    const sessions = mockClSessions.filter(s => s.classroomId === classroomId);
    res.json({ success: true, sessions, source: 'mock' });
});

// GET /api/classrooms/:id/sessions/active — Active session for students
router.get('/:id/sessions/active', async (req, res) => {
    const classroomId = parseInt(req.params.id);

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                'SELECT * FROM classroom_sessions WHERE classroom_id = ? AND status = "active" LIMIT 1',
                [classroomId]
            );
            return res.json({ success: true, session: rows[0] || null, source: 'database' });
        } catch (err) { console.error(err); }
    }

    const session = mockClSessions.find(s => s.classroomId === classroomId && s.status === 'active') || null;
    res.json({ success: true, session, source: 'mock' });
});

// PATCH /api/classrooms/:id/sessions/:sid — Start or close session
router.patch('/:id/sessions/:sid', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const sessionId   = parseInt(req.params.sid);
    const { status } = req.body; // 'active' or 'closed'

    if (!['active', 'closed', 'pending'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be active, closed, or pending' });
    }

    if (dbService.isDbAvailable()) {
        try {
            await db.query(
                'UPDATE classroom_sessions SET status = ? WHERE session_id = ? AND classroom_id = ?',
                [status, sessionId, classroomId]
            );
            return res.json({ success: true, message: `Session ${status}`, source: 'database' });
        } catch (err) { console.error(err); }
    }

    const session = mockClSessions.find(s => s.id === sessionId && s.classroomId === classroomId);
    if (session) session.status = status;
    res.json({ success: true, message: `Session ${status}`, source: 'mock' });
});

// POST /api/classrooms/:id/sessions/:sid/answer — Student submits answer
router.post('/:id/sessions/:sid/answer', async (req, res) => {
    cacheUser(req); // keep identity fresh for monitor/leaderboard
    const classroomId = parseInt(req.params.id);
    const sessionId   = parseInt(req.params.sid);
    const studentId   = req.user.id;
    const { questionId, answer } = req.body;

    // Find the question to check correctness
    const question = mockClQuestions.find(q => q.id === questionId);
    const isCorrect = question ? String(question.correctAnswer).toLowerCase() === String(answer).toLowerCase() : false;
    const pointsEarned = isCorrect ? (question?.points || 10) : 0;

    if (dbService.isDbAvailable()) {
        try {
            await db.query(
                'INSERT INTO classroom_answers (session_id, student_id, question_id, answer, is_correct, points_earned) VALUES (?, ?, ?, ?, ?, ?)',
                [sessionId, studentId, questionId, answer, isCorrect, pointsEarned]
            );
            return res.json({ success: true, isCorrect, pointsEarned, source: 'database' });
        } catch (err) { console.error(err); }
    }

    mockClAnswers.push({ id: _nextId.an++, sessionId, studentId, questionId, answer, isCorrect, pointsEarned, answeredAt: new Date().toISOString() });
    res.json({ success: true, isCorrect, pointsEarned, source: 'mock' });
});

// ═════════════════════════════════════════════════════════════════════════════
// LEADERBOARD & ANALYTICS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/classrooms/:id/leaderboard
router.get('/:id/leaderboard', async (req, res) => {
    const classroomId = parseInt(req.params.id);
    const { sessionId } = req.query;

    if (dbService.isDbAvailable()) {
        try {
            const params = sessionId ? [sessionId] : [];
            const whereSession = sessionId ? 'WHERE ca.session_id = ?' : '';
            const rows = await db.query(
                `SELECT u.user_id AS id, u.full_name AS fullName,
                        SUM(ca.points_earned) AS totalPoints,
                        COUNT(ca.answer_id) AS answered,
                        SUM(ca.is_correct) AS correct
                 FROM classroom_answers ca
                 JOIN classroom_sessions cs ON cs.session_id = ca.session_id
                 JOIN users u ON u.user_id = ca.student_id
                 ${whereSession}
                 AND cs.classroom_id = ?
                 GROUP BY ca.student_id
                 ORDER BY totalPoints DESC`,
                [...params, classroomId]
            );
            return res.json({ success: true, leaderboard: rows, source: 'database' });
        } catch (err) { console.error(err); }
    }

    // Mock leaderboard from in-memory answers
    const sessionIds = sessionId
        ? [parseInt(sessionId)]
        : mockClSessions.filter(s => s.classroomId === classroomId).map(s => s.id);

    const grouped = {};
    mockClAnswers
        .filter(a => sessionIds.includes(a.sessionId))
        .forEach(a => {
            if (!grouped[a.studentId]) {
                const enr    = mockEnrollments.find(e => e.studentId === a.studentId) || {};
                const cached = mockUserCache[a.studentId] || {};
                grouped[a.studentId] = {
                    student_id:  a.studentId,
                    fullName:    enr.fullName || cached.fullName || `Student #${a.studentId}`,
                    totalPoints: 0, answered: 0, correct: 0
                };
            }
            grouped[a.studentId].totalPoints += a.pointsEarned;
            grouped[a.studentId].answered++;
            if (a.isCorrect) grouped[a.studentId].correct++;
        });

    const leaderboard = Object.values(grouped).sort((a, b) => b.totalPoints - a.totalPoints);
    res.json({ success: true, leaderboard, source: 'mock' });
});

// GET /api/classrooms/:id/analytics — Faculty analytics
router.get('/:id/analytics', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);

    if (dbService.isDbAvailable()) {
        try {
            const [enrollCount]  = await db.query('SELECT COUNT(*) AS total FROM classroom_enrollments WHERE classroom_id = ? AND status = "active"', [classroomId]);
            const [sessionCount] = await db.query('SELECT COUNT(*) AS total FROM classroom_sessions WHERE classroom_id = ?', [classroomId]);
            const [answerStats]  = await db.query('SELECT COUNT(*) AS total, SUM(is_correct) AS correct FROM classroom_answers ca JOIN classroom_sessions cs ON cs.session_id = ca.session_id WHERE cs.classroom_id = ?', [classroomId]);

            const accuracy = answerStats.total > 0 ? Math.round((answerStats.correct / answerStats.total) * 100) : 0;
            return res.json({ success: true, analytics: { enrolledStudents: enrollCount.total, totalSessions: sessionCount.total, totalAnswers: answerStats.total, avgAccuracy: accuracy }, source: 'database' });
        } catch (err) { console.error(err); }
    }

    const enrolled = mockEnrollments.filter(e => e.classroomId === classroomId && e.status === 'active').length;
    const sessions = mockClSessions.filter(s => s.classroomId === classroomId).length;
    const sessionIds = mockClSessions.filter(s => s.classroomId === classroomId).map(s => s.id);
    const answers = mockClAnswers.filter(a => sessionIds.includes(a.sessionId));
    const correct = answers.filter(a => a.isCorrect).length;
    const accuracy = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;

    res.json({ success: true, analytics: { enrolledStudents: enrolled, totalSessions: sessions, totalAnswers: answers.length, avgAccuracy: accuracy }, source: 'mock' });
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
                 JOIN classroom_sessions cs ON cs.session_id = ca.session_id
                 LEFT JOIN classroom_questions cq ON cq.question_id = ca.question_id
                 WHERE cs.classroom_id = ? AND ca.student_id = ?`,
                [classroomId, studentId]
            );
            questions = await db.query('SELECT * FROM classroom_questions WHERE classroom_id = ?', [classroomId]);
        } catch (err) { console.error(err); }
    } else {
        const sessionIds = mockClSessions.filter(s => s.classroomId === classroomId).map(s => s.id);
        answers = mockClAnswers.filter(a => sessionIds.includes(a.sessionId) && a.studentId === studentId);
        questions = mockClQuestions.filter(q => q.classroomId === classroomId);
    }

    if (!answers.length) {
        return res.json({
            success: true,
            feedback: {
                overallAssessment: "You haven't played any sessions in this classroom yet. Join an active session to get personalized feedback!",
                weakAreas: [],
                strongAreas: [],
                recommendations: ['Participate in classroom sessions to unlock AI feedback.'],
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
    if (accuracy < 70)     recommendations.push('Re-read the classroom lessons before your next session.');
    if (accuracy >= 80)    recommendations.push('Try the advanced challenges to push yourself further!');
    if (total < 5)         recommendations.push('Participate in more sessions for a more accurate assessment.');
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

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 7 — LIVE MONITORING (faculty: per-student progress in a session)
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/classrooms/:id/sessions/:sid/monitor
router.get('/:id/sessions/:sid/monitor', async (req, res) => {
    if (!requireFacultyRole(req, res)) return;
    const classroomId = parseInt(req.params.id);
    const sessionId   = parseInt(req.params.sid);

    if (dbService.isDbAvailable()) {
        try {
            // Per-student stats for this session
            const rows = await db.query(
                `SELECT u.user_id AS studentId, u.full_name AS fullName,
                        COUNT(ca.answer_id) AS answered,
                        SUM(ca.is_correct)  AS correct,
                        SUM(ca.points_earned) AS points
                 FROM classroom_enrollments ce
                 JOIN users u ON u.user_id = ce.student_id
                 LEFT JOIN classroom_answers ca ON ca.student_id = ce.student_id AND ca.session_id = ?
                 WHERE ce.classroom_id = ? AND ce.status = 'active'
                 GROUP BY ce.student_id
                 ORDER BY points DESC`,
                [sessionId, classroomId]
            );

            // Get total questions in this session
            const [sessionRow] = await db.query('SELECT question_ids FROM classroom_sessions WHERE session_id = ?', [sessionId]);
            let totalQ = 0;
            if (sessionRow) {
                try { totalQ = JSON.parse(sessionRow.question_ids || '[]').length; } catch (_) {}
            }

            return res.json({ success: true, monitor: rows, totalQuestions: totalQ, source: 'database' });
        } catch (err) { console.error(err); }
    }

    // Mock fallback
    const session = mockClSessions.find(s => s.id === sessionId && s.classroomId === classroomId);
    const totalQ  = session ? (session.questionIds || []).length : 0;
    const enrolled = mockEnrollments.filter(e => e.classroomId === classroomId && e.status === 'active');

    const monitor = enrolled.map(e => {
        const studentAnswers = mockClAnswers.filter(a => a.sessionId === sessionId && a.studentId === e.studentId);
        const cached = mockUserCache[e.studentId] || {};
        return {
            studentId: e.studentId,
            fullName: e.fullName || cached.fullName || `Student #${e.studentId}`,
            answered: studentAnswers.length,
            correct: studentAnswers.filter(a => a.isCorrect).length,
            points: studentAnswers.reduce((s, a) => s + a.pointsEarned, 0)
        };
    }).sort((a, b) => b.points - a.points);

    res.json({ success: true, monitor, totalQuestions: totalQ, source: 'mock' });
});

module.exports = router;
