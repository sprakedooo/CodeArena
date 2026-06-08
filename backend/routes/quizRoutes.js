/**
 * quizRoutes.js  — Classroom quiz instances
 *
 * Each classroom can have many quiz instances (Week 1 Quiz, Midterm, etc.).
 * Creating a new quiz never erases old ones — each is stored independently.
 * Data is in-memory (no DB required).
 *
 * Endpoints  (all at /api/quiz/…):
 *   GET    /my-results-all/list                     — student: all results ever
 *   GET    /:cid/instances                           — list instances for classroom
 *   POST   /:cid/instances                           — faculty: create instance
 *   GET    /:cid/instances/:iid                      — get instance (q's + schedule)
 *   PUT    /:cid/instances/:iid                      — faculty: rename instance
 *   DELETE /:cid/instances/:iid                      — faculty: delete instance
 *   POST   /:cid/instances/:iid/questions            — add question
 *   PUT    /:cid/instances/:iid/questions/:qid       — edit question
 *   DELETE /:cid/instances/:iid/questions/:qid       — delete question
 *   PATCH  /:cid/instances/:iid/schedule             — set start/deadline
 *   POST   /:cid/instances/:iid/submit               — student: submit result
 *   GET    /:cid/instances/:iid/results              — faculty: all student results
 *   GET    /:cid/instances/:iid/my-result            — student: own best result
 */

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { authMiddleware, requireFaculty } = require('../middleware/authMiddleware');

// ── Persistent JSON store ─────────────────────────────────────────────────────
const DATA_DIR  = path.join(__dirname, '../../data');
const INST_FILE = path.join(DATA_DIR, 'quiz_instances.json');
const RES_FILE  = path.join(DATA_DIR, 'quiz_results.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadFile(file, defaultVal) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return defaultVal; }
}
function saveFile(file, data) {
    try { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); } catch {}
}

// ── In-memory stores (loaded from disk on startup) ────────────────────────────
// Map<instanceId, QuizInstance>
const instances = new Map(Object.entries(loadFile(INST_FILE, {})));
// Map<`${instanceId}_${userId}`, QuizResult>
const results   = new Map(Object.entries(loadFile(RES_FILE, {})));

function persistInstances() { saveFile(INST_FILE, Object.fromEntries(instances)); }
function persistResults()   { saveFile(RES_FILE,  Object.fromEntries(results));   }

// Determine highest used IDs so we don't collide after reload
let nextInstId = 1000;
let nextQId    = 10000;
for (const inst of instances.values()) {
    const n = parseInt(inst.id); if (!isNaN(n) && n >= nextInstId) nextInstId = n + 1;
    for (const q of (inst.questions || [])) {
        const m = parseInt(q.id || q.question_id); if (!isNaN(m) && m >= nextQId) nextQId = m + 1;
    }
}

function makeInstance(cid, title, facultyId) {
    const iid = String(nextInstId++);
    const inst = {
        id:          iid,
        classroomId: String(cid),
        title:       title || `Quiz ${new Date().toLocaleDateString()}`,
        questions:   [],
        schedule:    { startAt: null, deadline: null },
        createdAt:   new Date().toISOString(),
        createdBy:   facultyId,
    };
    instances.set(iid, inst);
    persistInstances();
    return inst;
}

function getInstancesForClassroom(cid) {
    const out = [];
    for (const inst of instances.values()) {
        if (String(inst.classroomId) === String(cid)) out.push(inst);
    }
    return out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function instanceStatus(inst) {
    const now      = Date.now();
    const startAt  = inst.schedule.startAt  ? new Date(inst.schedule.startAt).getTime()  : null;
    const deadline = inst.schedule.deadline ? new Date(inst.schedule.deadline).getTime() : null;
    if (startAt && now < startAt)  return 'scheduled';
    if (deadline && now > deadline) return 'closed';
    return 'open';
}

function resultsForInstance(iid) {
    const out = [];
    for (const r of results.values()) {
        if (String(r.instanceId) === String(iid)) out.push(r);
    }
    return out.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
}

// ── DEPRECATED mock data (kept to avoid parse errors, replaced below) ─────
let mockQuizzes = [
    {
        id: 1,
        title: 'Quiz: Introduction to Programming',
        lessonId: 1,
        description: 'Test your understanding of basic programming concepts.',
        questions: [
            {
                id: 1,
                question: 'What is programming?',
                options: [
                    'A) A type of computer hardware',
                    'B) The process of creating instructions for computers',
                    'C) A social media platform',
                    'D) A type of video game'
                ],
                correctAnswer: 'B'
            },
            {
                id: 2,
                question: 'Which of the following is a programming language?',
                options: [
                    'A) HTML',
                    'B) Microsoft Word',
                    'C) JavaScript',
                    'D) Photoshop'
                ],
                correctAnswer: 'C'
            },
            {
                id: 3,
                question: 'What does a compiler do?',
                options: [
                    'A) Runs the computer hardware',
                    'B) Translates code into machine-readable format',
                    'C) Connects to the internet',
                    'D) Creates graphics'
                ],
                correctAnswer: 'B'
            }
        ],
        createdBy: 2,
        createdAt: '2024-01-15'
    },
    {
        id: 2,
        title: 'Quiz: Variables and Data Types',
        lessonId: 2,
        description: 'Check your knowledge of variables and data types.',
        questions: [
            {
                id: 1,
                question: 'What is a variable in programming?',
                options: [
                    'A) A constant value that never changes',
                    'B) A container for storing data values',
                    'C) A type of loop',
                    'D) A programming language'
                ],
                correctAnswer: 'B'
            },
            {
                id: 2,
                question: 'Which data type would you use to store "Hello World"?',
                options: [
                    'A) Integer',
                    'B) Boolean',
                    'C) String',
                    'D) Float'
                ],
                correctAnswer: 'C'
            },
            {
                id: 3,
                question: 'What is the value of: let x = 10 + 5;',
                options: [
                    'A) "10 + 5"',
                    'B) 105',
                    'C) 15',
                    'D) Error'
                ],
                correctAnswer: 'C'
            },
            {
                id: 4,
                question: 'Which data type stores true or false values?',
                options: [
                    'A) String',
                    'B) Integer',
                    'C) Float',
                    'D) Boolean'
                ],
                correctAnswer: 'D'
            }
        ],
        createdBy: 2,
        createdAt: '2024-01-16'
    },
    {
        id: 3,
        title: 'Quiz: Control Structures',
        lessonId: 3,
        description: 'Test your understanding of conditionals and decision making.',
        questions: [
            {
                id: 1,
                question: 'What does an if statement do?',
                options: [
                    'A) Repeats code multiple times',
                    'B) Executes code only if a condition is true',
                    'C) Declares a variable',
                    'D) Ends the program'
                ],
                correctAnswer: 'B'
            },
            {
                id: 2,
                question: 'In "if (x > 5)", what does ">" mean?',
                options: [
                    'A) x is assigned 5',
                    'B) x is less than 5',
                    'C) x is greater than 5',
                    'D) x equals 5'
                ],
                correctAnswer: 'C'
            },
            {
                id: 3,
                question: 'When does the "else" block execute?',
                options: [
                    'A) Always',
                    'B) When the if condition is true',
                    'C) When the if condition is false',
                    'D) Never'
                ],
                correctAnswer: 'C'
            }
        ],
        createdBy: 2,
        createdAt: '2024-01-17'
    }
];

// ── GET /my-results-all/list  (MUST be before /:cid routes) ──────────────────
// ── GET /:cid/student-summary — faculty: per-student aggregate across all instances ──
router.get('/:cid/student-summary', authMiddleware, requireFaculty, (req, res) => {
    const cid   = String(req.params.cid);
    const insts = getInstancesForClassroom(cid);
    // Build a map: userId → { quizzesTaken, bestAccuracy, passed }
    const summary = {};
    for (const inst of insts) {
        for (const r of resultsForInstance(inst.id)) {
            if (!summary[r.userId]) {
                summary[r.userId] = { userId: r.userId, userName: r.userName, quizzesTaken: 0, bestAccuracy: 0, passCount: 0 };
            }
            summary[r.userId].quizzesTaken++;
            summary[r.userId].bestAccuracy = Math.max(summary[r.userId].bestAccuracy, r.bestAccuracy || 0);
            if (r.bestPassed) summary[r.userId].passCount++;
        }
    }
    return res.json({ success: true, summary });
});


router.get('/my-results-all/list', authMiddleware, (req, res) => {
    const uid = String(req.user.id);
    const out = [];
    for (const r of results.values()) {
        if (String(r.userId) === uid) out.push(r);
    }
    out.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    return res.json({ success: true, results: out });
});

// ── GET /:cid/instances — list all quiz instances ─────────────────────────────
router.get('/:cid/instances', authMiddleware, (req, res) => {
    const cid  = String(req.params.cid);
    const insts = getInstancesForClassroom(cid).map(inst => ({
        id:          inst.id,
        title:       inst.title,
        questionCount: inst.questions.length,
        schedule:    inst.schedule,
        status:      instanceStatus(inst),
        createdAt:   inst.createdAt,
        resultCount: resultsForInstance(inst.id).length,
    }));
    return res.json({ success: true, instances: insts });
});

// ── POST /:cid/instances — faculty: create new instance ──────────────────────
router.post('/:cid/instances', authMiddleware, requireFaculty, (req, res) => {
    const cid  = String(req.params.cid);
    const inst = makeInstance(cid, req.body.title, req.user.id);
    return res.json({ success: true, instance: { ...inst, status: 'open' } });
});

// ── GET /:cid/instances/:iid — get full instance ──────────────────────────────
router.get('/:cid/instances/:iid', authMiddleware, (req, res) => {
    const inst = instances.get(req.params.iid);
    if (!inst || String(inst.classroomId) !== String(req.params.cid))
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
    // Send full questions including correctAnswer — needed for client-side checking
    return res.json({ success: true, instance: { ...inst, questions: inst.questions, status: instanceStatus(inst) } });
});

// ── PUT /:cid/instances/:iid — faculty: rename instance ──────────────────────
router.put('/:cid/instances/:iid', authMiddleware, requireFaculty, (req, res) => {
    const inst = instances.get(req.params.iid);
    if (!inst || String(inst.classroomId) !== String(req.params.cid))
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
    if (req.body.title) inst.title = req.body.title;
    persistInstances();
    return res.json({ success: true, instance: inst });
});

// ── DELETE /:cid/instances/:iid — faculty: delete instance ───────────────────
router.delete('/:cid/instances/:iid', authMiddleware, requireFaculty, (req, res) => {
    const inst = instances.get(req.params.iid);
    if (!inst || String(inst.classroomId) !== String(req.params.cid))
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
    instances.delete(req.params.iid);
    // Remove associated results
    for (const key of results.keys()) {
        if (key.startsWith(`${req.params.iid}_`)) results.delete(key);
    }
    persistInstances();
    persistResults();
    return res.json({ success: true });
});

// ── POST /:cid/instances/:iid/questions — add question ───────────────────────
router.post('/:cid/instances/:iid/questions', authMiddleware, requireFaculty, (req, res) => {
    const inst = instances.get(req.params.iid);
    if (!inst || String(inst.classroomId) !== String(req.params.cid))
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
    const q = { ...req.body, id: nextQId++, instance_id: req.params.iid };
    inst.questions.push(q);
    persistInstances();
    return res.json({ success: true, question: q });
});

// ── PUT /:cid/instances/:iid/questions/:qid — edit question ──────────────────
router.put('/:cid/instances/:iid/questions/:qid', authMiddleware, requireFaculty, (req, res) => {
    const inst = instances.get(req.params.iid);
    if (!inst || String(inst.classroomId) !== String(req.params.cid))
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
    const qid = parseInt(req.params.qid, 10);
    const i   = inst.questions.findIndex(q => q.id === qid);
    if (i === -1) return res.status(404).json({ success: false, message: 'Question not found.' });
    inst.questions[i] = { ...inst.questions[i], ...req.body, id: qid, instance_id: req.params.iid };
    persistInstances();
    return res.json({ success: true, question: inst.questions[i] });
});

// ── DELETE /:cid/instances/:iid/questions/:qid — delete question ─────────────
router.delete('/:cid/instances/:iid/questions/:qid', authMiddleware, requireFaculty, (req, res) => {
    const inst = instances.get(req.params.iid);
    if (!inst || String(inst.classroomId) !== String(req.params.cid))
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
    const qid    = parseInt(req.params.qid, 10);
    const before = inst.questions.length;
    inst.questions = inst.questions.filter(q => q.id !== qid);
    if (inst.questions.length === before)
        return res.status(404).json({ success: false, message: 'Question not found.' });
    persistInstances();
    return res.json({ success: true });
});

// ── PATCH /:cid/instances/:iid/schedule — set start/deadline ─────────────────
router.patch('/:cid/instances/:iid/schedule', authMiddleware, requireFaculty, (req, res) => {
    const inst = instances.get(req.params.iid);
    if (!inst || String(inst.classroomId) !== String(req.params.cid))
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
    const { startAt, deadline } = req.body;
    inst.schedule.startAt  = startAt  || null;
    inst.schedule.deadline = deadline || null;
    persistInstances();
    return res.json({ success: true, schedule: inst.schedule, status: instanceStatus(inst) });
});

// ── POST /:cid/instances/:iid/submit — student: submit result ────────────────
router.post('/:cid/instances/:iid/submit', authMiddleware, (req, res) => {
    const inst = instances.get(req.params.iid);
    if (!inst || String(inst.classroomId) !== String(req.params.cid))
        return res.status(404).json({ success: false, message: 'Quiz not found.' });

    const uid  = String(req.user.id);
    const { correct, total, accuracy, passed } = req.body;
    const key  = `${req.params.iid}_${uid}`;
    const prev = results.get(key);
    const attempts     = (prev?.attempts || 0) + 1;
    const bestAccuracy = Math.max(Number(accuracy) || 0, prev?.bestAccuracy || 0);

    const result = {
        userId:        uid,
        userName:      req.user.fullName || req.user.name || 'Student',
        instanceId:    req.params.iid,
        instanceTitle: inst.title,
        classroomId:   String(req.params.cid),
        correct:       Number(correct)  || 0,
        total:         Number(total)    || 0,
        accuracy:      Number(accuracy) || 0,
        bestAccuracy,
        passed:        !!passed,
        bestPassed:    bestAccuracy >= 70,
        attempts,
        completedAt:   new Date().toISOString(),
    };
    results.set(key, result);
    persistResults();
    return res.json({ success: true, result });
});

// ── GET /:cid/instances/:iid/results — faculty: all student results ───────────
router.get('/:cid/instances/:iid/results', authMiddleware, requireFaculty, (req, res) => {
    const inst = instances.get(req.params.iid);
    if (!inst || String(inst.classroomId) !== String(req.params.cid))
        return res.status(404).json({ success: false, message: 'Quiz not found.' });
    return res.json({ success: true, results: resultsForInstance(req.params.iid) });
});

// ── GET /:cid/instances/:iid/my-result — student: own best result ─────────────
router.get('/:cid/instances/:iid/my-result', authMiddleware, (req, res) => {
    const uid    = String(req.user.id);
    const result = results.get(`${req.params.iid}_${uid}`) || null;
    return res.json({ success: true, result });
});

module.exports = router;
