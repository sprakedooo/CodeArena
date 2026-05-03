/**
 * ============================================================================
 * ASSIGNMENT ROUTES (assignmentRoutes.js)
 * ============================================================================
 * Google-Classroom-style coding assignments with live test-case judging.
 *
 * FACULTY endpoints:
 *   POST   /api/assignments                   - Create assignment + test cases
 *   GET    /api/assignments?classroomId=X     - List assignments for classroom
 *   GET    /api/assignments/:id               - Assignment detail + visible test cases
 *   PUT    /api/assignments/:id               - Edit assignment
 *   DELETE /api/assignments/:id               - Delete assignment
 *   GET    /api/assignments/:id/submissions   - All student submissions (faculty)
 *
 * STUDENT endpoints:
 *   GET    /api/assignments?classroomId=X     - Same list (hides hidden test cases)
 *   POST   /api/assignments/:id/run           - Run code against SAMPLE test cases
 *   POST   /api/assignments/:id/submit        - Submit code (all test cases, records score)
 *   GET    /api/assignments/:id/my-submission - Own latest submission
 * ============================================================================
 */

const express  = require('express');
const router   = express.Router();
const { spawn } = require('child_process');
const { generateCodingAssignment } = require('../services/openaiService');
const fs       = require('fs');
const path     = require('path');
const os       = require('os');
const dbService = require('../services/dbService');
const db        = require('../config/database');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ─── Execution helpers (stdin-aware) ─────────────────────────────────────────

const COMPILERS_DIR = path.join(__dirname, '..', '..', 'compilers');
function bundled(rel) {
    const p = path.join(COMPILERS_DIR, rel);
    return fs.existsSync(p) ? p : null;
}
const BUNDLED = {
    python: bundled('python/python.exe'),
    javac:  bundled('java/bin/javac.exe'),
    java:   bundled('java/bin/java.exe'),
    gpp:    bundled('cpp/bin/g++.exe'),
    node:   process.execPath,
};
const EXEC_TIMEOUT = 8000;
const MAX_OUT = 5000;

function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '\n…(truncated)' : (s || ''); }
function mktemp() {
    const d = path.join(os.tmpdir(), 'codearena_assign_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    fs.mkdirSync(d, { recursive: true });
    return d;
}
function cleanup(d) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }

/**
 * Run a compiled/interpreted file with optional stdin piped in.
 * Returns { output, stderr, exitCode, timeMs }
 */
function runProcess(cmd, args, cwd, stdinData) {
    return new Promise(resolve => {
        const start = Date.now();
        const proc  = spawn(cmd, args, { cwd, windowsHide: true });
        let out = '', err = '';

        proc.stdout.on('data', d => out += d);
        proc.stderr.on('data', d => err += d);

        if (stdinData != null) {
            try { proc.stdin.write(String(stdinData)); } catch {}
        }
        try { proc.stdin.end(); } catch {}

        const timer = setTimeout(() => {
            try { proc.kill(); } catch {}
            resolve({ output: '', stderr: 'Time Limit Exceeded (8s)', exitCode: 124, timeMs: EXEC_TIMEOUT });
        }, EXEC_TIMEOUT);

        proc.on('close', code => {
            clearTimeout(timer);
            resolve({
                output:  truncate(out, MAX_OUT),
                stderr:  truncate(err, MAX_OUT),
                exitCode: code ?? 0,
                timeMs:   Date.now() - start,
            });
        });
        proc.on('error', e => {
            clearTimeout(timer);
            resolve({ output: '', stderr: e.message, exitCode: 1, timeMs: 0 });
        });
    });
}

async function executeCode(language, code, stdinData) {
    const tempDir = mktemp();
    try {
        if (language === 'python') {
            const fp = path.join(tempDir, 'main.py');
            fs.writeFileSync(fp, code);
            const cmds = BUNDLED.python ? [BUNDLED.python] : ['py', 'python3', 'python'];
            for (const cmd of cmds) {
                const r = await runProcess(cmd, [fp], tempDir, stdinData);
                if (r.stderr !== 'ENOENT') return r;
            }
            return { output: '', stderr: 'Python not found', exitCode: 1, timeMs: 0 };
        }
        if (language === 'javascript') {
            const fp = path.join(tempDir, 'main.js');
            fs.writeFileSync(fp, code);
            return runProcess(BUNDLED.node, [fp], tempDir, stdinData);
        }
        if (language === 'java') {
            const cls = (code.match(/public\s+class\s+(\w+)/) || [])[1] || 'Main';
            const fp  = path.join(tempDir, cls + '.java');
            fs.writeFileSync(fp, code);
            const javac = BUNDLED.javac || 'javac';
            const java  = BUNDLED.java  || 'java';
            const comp  = await runProcess(javac, [fp], tempDir, null);
            if (comp.exitCode !== 0) return { output: '', stderr: comp.stderr, exitCode: comp.exitCode, timeMs: comp.timeMs };
            return runProcess(java, ['-cp', tempDir, cls], tempDir, stdinData);
        }
        if (language === 'cpp') {
            const src = path.join(tempDir, 'main.cpp');
            const exe = path.join(tempDir, 'main.exe');
            fs.writeFileSync(src, code);
            const gpp  = BUNDLED.gpp || 'g++';
            const comp = await runProcess(gpp, ['-static', src, '-o', exe], tempDir, null);
            if (comp.exitCode !== 0) return { output: '', stderr: comp.stderr, exitCode: comp.exitCode, timeMs: comp.timeMs };
            return runProcess(exe, [], tempDir, stdinData);
        }
        return { output: '', stderr: 'Unsupported language', exitCode: 1, timeMs: 0 };
    } finally {
        cleanup(tempDir);
    }
}

/**
 * Judge code against an array of test cases.
 * Returns { results, passed, total, totalMs }
 */
async function judgeCode(language, code, testCases) {
    const results = [];
    let passed = 0;
    let totalMs = 0;

    for (const tc of testCases) {
        const res = await executeCode(language, code, tc.input);
        const actual   = (res.output || '').trim();
        const expected = (String(tc.expected_output || tc.expectedOutput || '')).trim();
        const ok = actual === expected;
        if (ok) passed++;
        totalMs += res.timeMs || 0;

        results.push({
            test_case_id:    tc.test_case_id || tc.id,
            label:           tc.label || `Test ${results.length + 1}`,
            passed:          ok,
            input:           tc.is_hidden ? '(hidden)' : tc.input,
            expected_output: tc.is_hidden ? '(hidden)' : expected,
            actual_output:   ok ? actual : (tc.is_hidden ? '(hidden)' : actual),
            stderr:          res.stderr || '',
            timeMs:          res.timeMs,
        });
    }

    return { results, passed, total: testCases.length, totalMs };
}

// ─── In-memory fallback stores ────────────────────────────────────────────────
let _mockAssign = [];
let _mockTc     = [];
let _mockSub    = [];
let _nextAId = 1, _nextTId = 1, _nextSId = 1;

async function ensureUserInDb(user) {
    if (!dbService.isDbAvailable() || !user?.id || user.id === 0) return;
    try {
        const rows = await db.query('SELECT user_id FROM users WHERE user_id = ?', [user.id]);
        if (rows?.length) return;
        await db.query(
            'INSERT INTO users (user_id, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
            [user.id, `_placeholder_${user.id}@codearena.internal`, '!LOCKED', user.fullName || 'User', user.role || 'student']
        );
    } catch {}
}

// ═════════════════════════════════════════════════════════════════════════════
// AI GENERATE ASSIGNMENT  POST /api/assignments/generate
// ═════════════════════════════════════════════════════════════════════════════
router.post('/generate', async (req, res) => {
    if (req.user.role !== 'faculty') return res.status(403).json({ success: false, message: 'Faculty only' });
    const { topic, language, difficulty } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'topic is required' });
    try {
        const assignment = await generateCodingAssignment({ topic, language: language || 'python', difficulty: difficulty || 'beginner' });
        res.json({ success: true, assignment });
    } catch (err) {
        console.error('AI assignment generation error:', err.message);
        res.status(500).json({ success: false, message: 'AI generation failed: ' + err.message });
    }
});

// ═════════════════════════════════════════════════════════════════════════════
// LIST ASSIGNMENTS  GET /api/assignments?classroomId=X
// ═════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    const classroomId = parseInt(req.query.classroomId);
    if (!classroomId) return res.status(400).json({ success: false, message: 'classroomId is required' });

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT a.*,
                    (SELECT COUNT(*) FROM assignment_test_cases WHERE assignment_id = a.assignment_id AND is_hidden = FALSE) AS visible_tests,
                    (SELECT COUNT(*) FROM assignment_test_cases WHERE assignment_id = a.assignment_id) AS total_tests,
                    (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.assignment_id) AS submission_count
                 FROM coding_assignments a
                 WHERE a.classroom_id = ?
                 ORDER BY a.created_at DESC`,
                [classroomId]
            );
            // If student, attach their submission status
            const userId = req.user.id;
            const isFaculty = req.user.role === 'faculty';
            let assignments = rows;
            if (!isFaculty && rows.length) {
                const subs = await db.query(
                    `SELECT assignment_id, score, passed_tests, total_tests, submitted_at
                     FROM assignment_submissions WHERE student_id = ? AND assignment_id IN (${rows.map(() => '?').join(',')})`,
                    [userId, ...rows.map(r => r.assignment_id)]
                );
                const subMap = {};
                subs.forEach(s => { subMap[s.assignment_id] = s; });
                assignments = rows.map(r => ({ ...r, mySubmission: subMap[r.assignment_id] || null }));
            }
            return res.json({ success: true, assignments });
        } catch (err) { console.error(err); }
    }

    // Mock fallback
    const assignments = _mockAssign
        .filter(a => a.classroomId === classroomId)
        .map(a => ({
            ...a,
            visible_tests: _mockTc.filter(t => t.assignmentId === a.id && !t.isHidden).length,
            total_tests:   _mockTc.filter(t => t.assignmentId === a.id).length,
            submission_count: _mockSub.filter(s => s.assignmentId === a.id).length,
            mySubmission: _mockSub.find(s => s.assignmentId === a.id && s.studentId === req.user.id) || null,
        }));
    res.json({ success: true, assignments });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET ONE ASSIGNMENT  GET /api/assignments/:id
// ═════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const isFaculty = req.user.role === 'faculty';

    if (dbService.isDbAvailable()) {
        try {
            const [assignment] = await db.query('SELECT * FROM coding_assignments WHERE assignment_id = ?', [id]);
            if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

            const tcWhere = isFaculty ? 'assignment_id = ?' : 'assignment_id = ? AND is_hidden = FALSE';
            const testCases = await db.query(
                `SELECT * FROM assignment_test_cases WHERE ${tcWhere} ORDER BY order_index ASC`, [id]
            );
            return res.json({ success: true, assignment, testCases });
        } catch (err) { console.error(err); }
    }

    const assignment = _mockAssign.find(a => a.id === id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    const testCases = _mockTc
        .filter(t => t.assignmentId === id && (isFaculty || !t.isHidden))
        .sort((a, b) => a.orderIndex - b.orderIndex);
    res.json({ success: true, assignment, testCases });
});

// ═════════════════════════════════════════════════════════════════════════════
// CREATE ASSIGNMENT  POST /api/assignments
// ═════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
    if (req.user.role !== 'faculty') return res.status(403).json({ success: false, message: 'Faculty only' });
    const { classroomId, title, description, language, starterCode, maxPoints, scoringMode, deadline, testCases, status } = req.body;
    if (!classroomId || !title) return res.status(400).json({ success: false, message: 'classroomId and title are required' });
    const tcs = Array.isArray(testCases) ? testCases : [];

    if (dbService.isDbAvailable()) {
        try {
            await ensureUserInDb(req.user);
            const result = await db.query(
                `INSERT INTO coding_assignments
                 (classroom_id, faculty_id, title, description, language, starter_code, max_points, scoring_mode, deadline, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [classroomId, req.user.id, title, description || null, language || 'python',
                 starterCode || null, maxPoints || 100, scoringMode || 'per_test',
                 deadline || null, status || 'published']
            );
            const assignmentId = result.insertId;
            for (let i = 0; i < tcs.length; i++) {
                const tc = tcs[i];
                await db.query(
                    `INSERT INTO assignment_test_cases (assignment_id, label, input, expected_output, is_hidden, order_index)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [assignmentId, tc.label || `Test ${i + 1}`, tc.input || '', tc.expectedOutput || '', tc.isHidden ? 1 : 0, i]
                );
            }
            return res.status(201).json({ success: true, assignmentId, source: 'database' });
        } catch (err) { console.error('Create assignment error:', err); }
    }

    // Mock fallback
    const assignment = {
        id: _nextAId++, classroomId: parseInt(classroomId), facultyId: req.user.id,
        title, description: description || null, language: language || 'python',
        starterCode: starterCode || null, maxPoints: maxPoints || 100,
        scoringMode: scoringMode || 'per_test', deadline: deadline || null,
        status: status || 'published', createdAt: new Date().toISOString()
    };
    _mockAssign.push(assignment);
    tcs.forEach((tc, i) => {
        _mockTc.push({ id: _nextTId++, assignmentId: assignment.id, label: tc.label || `Test ${i + 1}`,
            input: tc.input || '', expectedOutput: tc.expectedOutput || '', isHidden: !!tc.isHidden, orderIndex: i });
    });
    res.status(201).json({ success: true, assignmentId: assignment.id, source: 'mock' });
});

// ═════════════════════════════════════════════════════════════════════════════
// EDIT ASSIGNMENT  PUT /api/assignments/:id
// ═════════════════════════════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
    if (req.user.role !== 'faculty') return res.status(403).json({ success: false, message: 'Faculty only' });
    const id = parseInt(req.params.id);
    const { title, description, language, starterCode, maxPoints, scoringMode, deadline, status, testCases } = req.body;

    if (dbService.isDbAvailable()) {
        try {
            await db.query(
                `UPDATE coding_assignments SET title=?, description=?, language=?, starter_code=?,
                 max_points=?, scoring_mode=?, deadline=?, status=? WHERE assignment_id=?`,
                [title, description || null, language, starterCode || null, maxPoints, scoringMode, deadline || null, status, id]
            );
            if (Array.isArray(testCases)) {
                await db.query('DELETE FROM assignment_test_cases WHERE assignment_id = ?', [id]);
                for (let i = 0; i < testCases.length; i++) {
                    const tc = testCases[i];
                    await db.query(
                        `INSERT INTO assignment_test_cases (assignment_id, label, input, expected_output, is_hidden, order_index)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [id, tc.label || `Test ${i + 1}`, tc.input || '', tc.expectedOutput || '', tc.isHidden ? 1 : 0, i]
                    );
                }
            }
            return res.json({ success: true });
        } catch (err) { console.error(err); }
    }

    const idx = _mockAssign.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
    Object.assign(_mockAssign[idx], { title, description, language, starterCode, maxPoints, scoringMode, deadline, status });
    if (Array.isArray(testCases)) {
        _mockTc = _mockTc.filter(t => t.assignmentId !== id);
        testCases.forEach((tc, i) => _mockTc.push({ id: _nextTId++, assignmentId: id, ...tc, orderIndex: i }));
    }
    res.json({ success: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE ASSIGNMENT  DELETE /api/assignments/:id
// ═════════════════════════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
    if (req.user.role !== 'faculty') return res.status(403).json({ success: false, message: 'Faculty only' });
    const id = parseInt(req.params.id);
    if (dbService.isDbAvailable()) {
        try {
            await db.query('DELETE FROM coding_assignments WHERE assignment_id = ?', [id]);
            return res.json({ success: true });
        } catch (err) { console.error(err); }
    }
    _mockAssign = _mockAssign.filter(a => a.id !== id);
    _mockTc     = _mockTc.filter(t => t.assignmentId !== id);
    _mockSub    = _mockSub.filter(s => s.assignmentId !== id);
    res.json({ success: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// RUN (sample test cases only, no submission recorded)
// POST /api/assignments/:id/run
// ═════════════════════════════════════════════════════════════════════════════
router.post('/:id/run', async (req, res) => {
    const id = parseInt(req.params.id);
    const { code, language } = req.body;
    if (!code || !language) return res.status(400).json({ success: false, message: 'code and language required' });

    let testCases = [];
    if (dbService.isDbAvailable()) {
        try {
            testCases = await db.query(
                'SELECT * FROM assignment_test_cases WHERE assignment_id = ? AND is_hidden = FALSE ORDER BY order_index ASC', [id]
            );
        } catch {}
    }
    if (!testCases.length) {
        testCases = _mockTc.filter(t => t.assignmentId === id && !t.isHidden).sort((a, b) => a.orderIndex - b.orderIndex);
    }

    if (!testCases.length) return res.json({ success: true, results: [], message: 'No sample test cases' });

    try {
        const { results, passed, total } = await judgeCode(language, code, testCases);
        res.json({ success: true, results, passed, total, isSubmission: false });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Execution error: ' + err.message });
    }
});

// ═════════════════════════════════════════════════════════════════════════════
// SUBMIT  POST /api/assignments/:id/submit
// ═════════════════════════════════════════════════════════════════════════════
router.post('/:id/submit', async (req, res) => {
    const assignmentId = parseInt(req.params.id);
    const studentId    = req.user.id;
    const { code, language } = req.body;
    if (!code || !language) return res.status(400).json({ success: false, message: 'code and language required' });

    // Load assignment
    let assignment = null;
    let allTestCases = [];

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query('SELECT * FROM coding_assignments WHERE assignment_id = ?', [assignmentId]);
            assignment = rows[0] || null;
            if (assignment) {
                allTestCases = await db.query(
                    'SELECT * FROM assignment_test_cases WHERE assignment_id = ? ORDER BY order_index ASC', [assignmentId]
                );
            }
        } catch {}
    }
    if (!assignment) {
        assignment = _mockAssign.find(a => a.id === assignmentId);
        allTestCases = _mockTc.filter(t => t.assignmentId === assignmentId).sort((a, b) => a.orderIndex - b.orderIndex);
    }
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // Judge against ALL test cases
    const { results, passed, total, totalMs } = await judgeCode(language, code, allTestCases);

    // Calculate score
    const maxPoints = assignment.max_points || assignment.maxPoints || 100;
    const mode = assignment.scoring_mode || assignment.scoringMode || 'per_test';
    let score = 0;
    if (mode === 'all_or_nothing') {
        score = passed === total ? maxPoints : 0;
    } else {
        score = total > 0 ? Math.round((passed / total) * maxPoints) : 0;
    }

    // Save submission
    if (dbService.isDbAvailable()) {
        try {
            await ensureUserInDb(req.user);
            // Upsert: one submission per student per assignment (keep latest)
            await db.query(
                `INSERT INTO assignment_submissions
                 (assignment_id, student_id, code, language, test_results, passed_tests, total_tests, score, execution_time_ms)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   code=VALUES(code), language=VALUES(language), test_results=VALUES(test_results),
                   passed_tests=VALUES(passed_tests), total_tests=VALUES(total_tests),
                   score=VALUES(score), execution_time_ms=VALUES(execution_time_ms),
                   submitted_at=CURRENT_TIMESTAMP`,
                [assignmentId, studentId, code, language, JSON.stringify(results), passed, total, score, totalMs]
            );
        } catch (err) {
            console.warn('Submission DB error:', err.message);
            // Fall through to mock
        }
    }

    // Mock store (always update so in-memory is consistent)
    const existIdx = _mockSub.findIndex(s => s.assignmentId === assignmentId && s.studentId === studentId);
    const sub = { id: existIdx >= 0 ? _mockSub[existIdx].id : _nextSId++, assignmentId, studentId, code, language, results, passed, total, score, totalMs, submittedAt: new Date().toISOString() };
    if (existIdx >= 0) _mockSub[existIdx] = sub; else _mockSub.push(sub);

    res.json({ success: true, passed, total, score, maxPoints, results, executionTimeMs: totalMs });
});

// ═════════════════════════════════════════════════════════════════════════════
// MY SUBMISSION  GET /api/assignments/:id/my-submission
// ═════════════════════════════════════════════════════════════════════════════
router.get('/:id/my-submission', async (req, res) => {
    const assignmentId = parseInt(req.params.id);
    const studentId = req.user.id;

    if (dbService.isDbAvailable()) {
        try {
            const [sub] = await db.query(
                'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
                [assignmentId, studentId]
            );
            if (sub) {
                if (typeof sub.test_results === 'string') {
                    try { sub.test_results = JSON.parse(sub.test_results); } catch {}
                }
                return res.json({ success: true, submission: sub });
            }
        } catch {}
    }
    const sub = _mockSub.find(s => s.assignmentId === assignmentId && s.studentId === studentId);
    res.json({ success: true, submission: sub || null });
});

// ═════════════════════════════════════════════════════════════════════════════
// ALL SUBMISSIONS (faculty)  GET /api/assignments/:id/submissions
// ═════════════════════════════════════════════════════════════════════════════
router.get('/:id/submissions', async (req, res) => {
    if (req.user.role !== 'faculty') return res.status(403).json({ success: false, message: 'Faculty only' });
    const assignmentId = parseInt(req.params.id);

    if (dbService.isDbAvailable()) {
        try {
            const rows = await db.query(
                `SELECT s.*, u.full_name AS studentName, u.email
                 FROM assignment_submissions s
                 JOIN users u ON u.user_id = s.student_id
                 WHERE s.assignment_id = ?
                 ORDER BY s.score DESC, s.submitted_at ASC`,
                [assignmentId]
            );
            rows.forEach(r => {
                if (typeof r.test_results === 'string') {
                    try { r.test_results = JSON.parse(r.test_results); } catch {}
                }
            });
            return res.json({ success: true, submissions: rows });
        } catch (err) { console.error(err); }
    }

    const subs = _mockSub.filter(s => s.assignmentId === assignmentId);
    res.json({ success: true, submissions: subs });
});

module.exports = router;
