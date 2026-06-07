/**
 * sessionRoutes.js
 * Live Classroom Quiz Sessions — faculty-led, real-time (polling-based)
 *
 * Sessions are in-memory (no DB required) and expire after 4 hours.
 *
 * Endpoints:
 *   POST   /api/sessions/create                     — faculty creates session
 *   GET    /api/sessions/classroom/:cid             — get active session for classroom
 *   GET    /api/sessions/:sid                       — get session state (faculty + student polling)
 *   POST   /api/sessions/:sid/join                  — student joins session
 *   POST   /api/sessions/:sid/answer                — student submits answer
 *   POST   /api/sessions/:sid/next                  — faculty advances to next question
 *   POST   /api/sessions/:sid/end                   — faculty ends session
 *   GET    /api/sessions/:sid/leaderboard           — live leaderboard
 */

const express  = require('express');
const router   = express.Router();
const { authMiddleware, requireFaculty } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = (() => { try { return require('uuid'); } catch { return { v4: () => Math.random().toString(36).slice(2) }; } })();

// ── In-memory session store ───────────────────────────────────────────────────
// Map<sessionId, SessionData>
const sessions = new Map();

// Expire sessions older than 4 hours
setInterval(() => {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    for (const [id, s] of sessions) {
        if (s.createdAt < cutoff || s.status === 'ended') {
            // Keep ended sessions for 30 min for results viewing
            if (s.status === 'ended' && s.endedAt && s.endedAt > Date.now() - 30 * 60 * 1000) continue;
            sessions.delete(id);
        }
    }
}, 5 * 60 * 1000);

// Simple ID generator fallback
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── POST /api/sessions/create ─────────────────────────────────────────────────
router.post('/create', authMiddleware, requireFaculty, (req, res) => {
    const { classroomId, classroomName, questions, timePerQuestion = 30 } = req.body;
    if (!classroomId || !Array.isArray(questions) || !questions.length) {
        return res.status(400).json({ success: false, message: 'classroomId and questions[] are required.' });
    }

    // Cancel any existing active session for this classroom
    for (const [id, s] of sessions) {
        if (s.classroomId == classroomId && s.status !== 'ended') {
            s.status = 'ended';
            s.endedAt = Date.now();
        }
    }

    const sessionId = genId();
    const session = {
        id: sessionId,
        classroomId: String(classroomId),
        classroomName: classroomName || 'Live Quiz',
        facultyId: req.user.id,
        facultyName: req.user.fullName || 'Instructor',
        questions,                    // array of question objects
        timePerQuestion: Number(timePerQuestion),
        currentIndex: -1,             // -1 = waiting lobby
        status: 'waiting',            // waiting | active | reviewing | ended
        questionStartTime: null,
        participants: {},             // userId → { name, score, answers: [], answered: false }
        createdAt: Date.now(),
        endedAt: null,
    };
    sessions.set(sessionId, session);

    return res.json({ success: true, sessionId, session: safeSession(session, 'faculty') });
});

// ── GET /api/sessions/classroom/:cid ─────────────────────────────────────────
router.get('/classroom/:cid', authMiddleware, (req, res) => {
    const cid = String(req.params.cid);
    let active = null;
    for (const s of sessions.values()) {
        if (s.classroomId === cid && s.status !== 'ended') { active = s; break; }
    }
    if (!active) return res.json({ success: true, session: null });
    return res.json({ success: true, session: safeSession(active, req.user.role) });
});

// ── GET /api/sessions/:sid ────────────────────────────────────────────────────
router.get('/:sid', authMiddleware, (req, res) => {
    const s = sessions.get(req.params.sid);
    if (!s) return res.status(404).json({ success: false, message: 'Session not found.' });
    return res.json({ success: true, session: safeSession(s, req.user.role) });
});

// ── POST /api/sessions/:sid/join ──────────────────────────────────────────────
router.post('/:sid/join', authMiddleware, (req, res) => {
    const s = sessions.get(req.params.sid);
    if (!s) return res.status(404).json({ success: false, message: 'Session not found.' });
    if (s.status === 'ended') return res.status(400).json({ success: false, message: 'Session has ended.' });

    const uid = String(req.user.id);
    if (!s.participants[uid]) {
        s.participants[uid] = {
            name: req.user.fullName || 'Student',
            score: 0,
            answers: [],   // [{ qIndex, selectedAnswer, correct, timeTaken }]
            answered: false,
            joinedAt: Date.now(),
        };
    }
    return res.json({ success: true, session: safeSession(s, req.user.role) });
});

// ── POST /api/sessions/:sid/answer ────────────────────────────────────────────
router.post('/:sid/answer', authMiddleware, (req, res) => {
    const s = sessions.get(req.params.sid);
    if (!s) return res.status(404).json({ success: false, message: 'Session not found.' });
    if (s.status !== 'active') return res.status(400).json({ success: false, message: 'No active question.' });

    const uid = String(req.user.id);
    if (!s.participants[uid]) return res.status(403).json({ success: false, message: 'Not joined.' });

    const p = s.participants[uid];
    if (p.answered) return res.json({ success: true, message: 'Already answered.', score: p.score });

    const { selectedAnswer } = req.body;
    const q = s.questions[s.currentIndex];
    if (!q) return res.status(400).json({ success: false, message: 'No current question.' });

    // Evaluate correctness — robust matching so the student can send the
    // letter ("B"), the full option ("B) age = 25"), or the stripped text
    // ("age = 25"), regardless of how correctAnswer is stored.
    const norm = v => String(v == null ? '' : v).trim().toLowerCase();
    const strip = v => norm(v).replace(/^[a-d][).]\s*/, '');
    const correctRaw = String(q.correctAnswer || q.correct_answer || q.answer || '').trim();
    const sel = norm(selectedAnswer);

    // Build the set of all answer forms that count as correct
    const acceptable = new Set([norm(correctRaw), strip(correctRaw)]);
    const opts = Array.isArray(q.options) ? q.options : [];

    // Resolve the correct option index (correctAnswer is a letter, or matches an option's text)
    let correctIdx = -1;
    if (/^[A-D]$/i.test(correctRaw)) {
        correctIdx = correctRaw.toUpperCase().charCodeAt(0) - 65;
    } else {
        correctIdx = opts.findIndex(o => norm(o) === norm(correctRaw) || strip(o) === norm(correctRaw));
    }
    if (correctIdx >= 0 && opts[correctIdx] != null) {
        acceptable.add(String.fromCharCode(97 + correctIdx));   // letter, e.g. "b"
        acceptable.add(norm(opts[correctIdx]));                 // "b) age = 25"
        acceptable.add(strip(opts[correctIdx]));                // "age = 25"
    }

    const correct = acceptable.has(sel);

    // Time-based scoring: 10 pts base, up to +10 bonus for speed
    const elapsed = (Date.now() - s.questionStartTime) / 1000;
    const timeBonus = Math.max(0, Math.round((s.timePerQuestion - elapsed) / s.timePerQuestion * 10));
    const points = correct ? 10 + timeBonus : 0;

    p.answered = true;
    p.score += points;
    p.answers.push({
        qIndex: s.currentIndex,
        selectedAnswer,
        correct,
        timeTaken: Math.round(elapsed),
        pointsEarned: points,
    });

    return res.json({ success: true, correct, points, totalScore: p.score });
});

// ── POST /api/sessions/:sid/next ──────────────────────────────────────────────
router.post('/:sid/next', authMiddleware, requireFaculty, (req, res) => {
    const s = sessions.get(req.params.sid);
    if (!s) return res.status(404).json({ success: false, message: 'Session not found.' });
    if (s.facultyId !== req.user.id && req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Only the session owner can advance.' });
    }
    if (s.status === 'ended') return res.status(400).json({ success: false, message: 'Session ended.' });

    s.currentIndex++;

    if (s.currentIndex >= s.questions.length) {
        s.status = 'ended';
        s.endedAt = Date.now();
        return res.json({ success: true, status: 'ended', session: safeSession(s, 'faculty') });
    }

    // Reset answered flag for all participants
    for (const p of Object.values(s.participants)) p.answered = false;

    s.status = 'active';
    s.questionStartTime = Date.now();

    return res.json({ success: true, status: 'active', currentIndex: s.currentIndex, session: safeSession(s, 'faculty') });
});

// ── POST /api/sessions/:sid/end ───────────────────────────────────────────────
router.post('/:sid/end', authMiddleware, requireFaculty, (req, res) => {
    const s = sessions.get(req.params.sid);
    if (!s) return res.status(404).json({ success: false, message: 'Session not found.' });
    if (s.facultyId !== req.user.id && req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Only the session owner can end it.' });
    }
    s.status = 'ended';
    s.endedAt = Date.now();
    return res.json({ success: true, session: safeSession(s, 'faculty') });
});

// ── GET /api/sessions/:sid/leaderboard ───────────────────────────────────────
router.get('/:sid/leaderboard', authMiddleware, (req, res) => {
    const s = sessions.get(req.params.sid);
    if (!s) return res.status(404).json({ success: false, message: 'Session not found.' });

    const lb = Object.entries(s.participants)
        .map(([uid, p]) => ({ userId: uid, name: p.name, score: p.score, answered: p.answered, totalAnswers: p.answers.length }))
        .sort((a, b) => b.score - a.score)
        .map((entry, i) => ({ ...entry, rank: i + 1 }));

    return res.json({ success: true, leaderboard: lb, total: s.questions.length, currentIndex: s.currentIndex });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeSession(s, viewerRole) {
    const base = {
        id: s.id,
        classroomId: s.classroomId,
        classroomName: s.classroomName,
        facultyId: s.facultyId,
        facultyName: s.facultyName,
        status: s.status,
        currentIndex: s.currentIndex,
        totalQuestions: s.questions.length,
        timePerQuestion: s.timePerQuestion,
        questionStartTime: s.questionStartTime,
        participantCount: Object.keys(s.participants).length,
        createdAt: s.createdAt,
        endedAt: s.endedAt,
    };

    // Faculty/superadmin see current question + all participant answers
    if (viewerRole === 'faculty' || viewerRole === 'superadmin') {
        base.currentQuestion = s.currentIndex >= 0 ? s.questions[s.currentIndex] : null;
        base.participants = s.participants;
    } else {
        // Student sees current question (no answer field revealed)
        const q = s.currentIndex >= 0 ? s.questions[s.currentIndex] : null;
        if (q) {
            const { correctAnswer, correct_answer, answer, explanation, ...safeQ } = q;
            base.currentQuestion = safeQ;
        } else {
            base.currentQuestion = null;
        }
    }

    return base;
}

module.exports = router;
