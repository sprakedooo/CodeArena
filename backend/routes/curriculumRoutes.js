/**
 * curriculumRoutes.js — SoloLearn-style classroom curriculum
 *
 * Structure:  Classroom → Levels (Beginner/Intermediate/Advanced)
 *                              → Units  (e.g. "Variables")
 *                                    → Topics  (content sub-sections)
 *                                    → Eval Questions (quiz at end of unit)
 *
 * Student progression:
 *   - All units locked except the first of each level
 *   - After reading all topics + passing evaluation (≥ passScore%), next unit unlocks
 *   - Levels unlock independently (faculty decides when to open a level)
 *
 * Storage: JSON files in /data/ (MySQL-free, survives restarts)
 *
 * Endpoints (all under /api/curriculum):
 *   GET  /:cid                               – full curriculum (faculty)
 *   GET  /:cid/student                       – curriculum + my progress (student)
 *
 *   POST /:cid/levels                        – create level
 *   PUT  /:cid/levels/:lid                   – rename / reorder level
 *   DELETE /:cid/levels/:lid                 – delete level
 *
 *   POST /:cid/levels/:lid/units             – create unit in level
 *   PUT  /:cid/units/:uid                    – update unit
 *   DELETE /:cid/units/:uid                  – delete unit
 *   PATCH /:cid/units/reorder                – reorder units in a level
 *
 *   POST  /:cid/units/:uid/topics            – add topic
 *   PUT   /:cid/units/:uid/topics/:tid       – update topic
 *   DELETE /:cid/units/:uid/topics/:tid      – delete topic
 *
 *   POST  /:cid/units/:uid/questions         – add eval question
 *   PUT   /:cid/units/:uid/questions/:qid    – update eval question
 *   DELETE /:cid/units/:uid/questions/:qid   – delete eval question
 *
 *   POST /:cid/units/:uid/complete-content   – student marks content read
 *   POST /:cid/units/:uid/submit-eval        – student submits evaluation
 *   GET  /:cid/my-progress                   – student: get progress for classroom
 */

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { authMiddleware, requireFaculty } = require('../middleware/authMiddleware');

// ── Persistent JSON store ─────────────────────────────────────────────────────
const DATA_DIR  = path.join(__dirname, '../../data');
const CURR_FILE = path.join(DATA_DIR, 'curriculum.json');
const PROG_FILE = path.join(DATA_DIR, 'curriculum_progress.json');
const CERT_FILE = path.join(DATA_DIR, 'curriculum_certs.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadFile(f, def) {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; }
}
function saveFile(f, data) {
    try { fs.writeFileSync(f, JSON.stringify(data, null, 2), 'utf8'); } catch (e) { console.error('curriculum saveFile', e.message); }
}

// curriculum[cid] = { levels: [ { id, name, order, locked, units: [...] } ] }
let curriculum = loadFile(CURR_FILE, {});
// progress[`${userId}_${unitId}`] = { contentCompleted, evalPassed, evalScore, attempts, completedAt }
let progress   = loadFile(PROG_FILE, {});
// certs: array of { id, userId, classroomId, classroomName, language, levelId, levelName, score, issuedAt }
let certs      = loadFile(CERT_FILE, []);

function persistCurriculum() { saveFile(CURR_FILE, curriculum); }
function persistProgress()   { saveFile(PROG_FILE, progress);   }
function persistCerts()      { saveFile(CERT_FILE, certs);       }

function genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getCurr(cid) {
    if (!curriculum[String(cid)]) curriculum[String(cid)] = { levels: [] };
    return curriculum[String(cid)];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function findUnit(cid, uid) {
    const curr = getCurr(cid);
    for (const lvl of curr.levels) {
        const unit = lvl.units.find(u => u.id === uid);
        if (unit) return { level: lvl, unit };
    }
    return null;
}

/** Returns ordered list of all units across all levels for a classroom */
function allUnits(cid) {
    const curr = getCurr(cid);
    const out = [];
    for (const lvl of [...curr.levels].sort((a,b) => a.order - b.order)) {
        for (const u of [...lvl.units].sort((a,b) => a.order - b.order)) {
            out.push({ ...u, levelId: lvl.id, levelName: lvl.name });
        }
    }
    return out;
}

/** Build per-unit progress for a student in a classroom */
function buildStudentProgress(userId, cid) {
    const uid = String(userId);
    const result = {};
    const units = allUnits(cid);

    for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        const key  = `${uid}_${unit.id}`;
        const p    = progress[key] || {};

        // Unit is unlocked if: it's the first unit of its level, OR the previous unit (same level) passed eval
        const levelUnits = units.filter(u => u.levelId === unit.levelId).sort((a,b) => a.order - b.order);
        const posInLevel = levelUnits.findIndex(u => u.id === unit.id);
        let unlocked = false;
        if (posInLevel === 0) {
            unlocked = true; // first unit of level is always open
        } else {
            const prevUnit = levelUnits[posInLevel - 1];
            const prevKey  = `${uid}_${prevUnit.id}`;
            unlocked = !!(progress[prevKey]?.evalPassed);
        }

        result[unit.id] = {
            unlocked,
            contentCompleted: p.contentCompleted || false,
            completedTopics:  Array.isArray(p.completedTopics) ? p.completedTopics : [],
            evalPassed:       p.evalPassed       || false,
            evalScore:        p.evalScore        || 0,
            attempts:         p.attempts         || 0,
            completedAt:      p.completedAt      || null,
        };
    }
    return result;
}

// ── GET /certs-for-user/:userId — all curriculum certs for a user ─────────────
// MUST be before GET /:cid or Express will treat 'certs-for-user' as a classroom id
router.get('/certs-for-user/:userId', authMiddleware, (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const userCerts = certs
        .filter(c => c.userId === userId)
        .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
    res.json({ success: true, certificates: userCerts });
});

// ── GET /:cid — full curriculum (faculty) ─────────────────────────────────────
router.get('/:cid', authMiddleware, (req, res) => {
    const curr = getCurr(req.params.cid);
    res.json({ success: true, curriculum: curr });
});

// ── GET /:cid/student — curriculum + student progress ─────────────────────────
router.get('/:cid/student', authMiddleware, (req, res) => {
    const cid  = req.params.cid;
    const curr = getCurr(cid);
    const prog = buildStudentProgress(req.user.id, cid);
    // Strip correct answers from eval questions for students
    const safe = JSON.parse(JSON.stringify(curr));
    for (const lvl of safe.levels) {
        for (const unit of lvl.units) {
            unit.evalQuestions = (unit.evalQuestions || []).map(q => ({
                id: q.id, question: q.question, questionType: q.questionType || 'multiple_choice',
                options: q.options, hint: q.hint, codeSnippet: q.codeSnippet || null,
                codeLines: q.codeLines || null,
            }));
        }
    }
    res.json({ success: true, curriculum: safe, progress: prog });
});

// ── POST /:cid/levels — create level ─────────────────────────────────────────
router.post('/:cid/levels', authMiddleware, requireFaculty, (req, res) => {
    const curr = getCurr(req.params.cid);
    const { name, locked } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required.' });
    const level = {
        id:     genId('lvl'),
        name:   name.trim(),
        order:  curr.levels.length,
        locked: locked !== false,
        units:  [],
    };
    curr.levels.push(level);
    persistCurriculum();
    res.json({ success: true, level });
});

// ── PUT /:cid/levels/:lid ─────────────────────────────────────────────────────
router.put('/:cid/levels/:lid', authMiddleware, requireFaculty, (req, res) => {
    const curr = getCurr(req.params.cid);
    const lvl  = curr.levels.find(l => l.id === req.params.lid);
    if (!lvl) return res.status(404).json({ success: false, message: 'Level not found.' });
    if (req.body.name   !== undefined) lvl.name   = req.body.name;
    if (req.body.order  !== undefined) lvl.order  = req.body.order;
    if (req.body.locked !== undefined) lvl.locked = req.body.locked;
    persistCurriculum();
    res.json({ success: true, level: lvl });
});

// ── DELETE /:cid/levels/:lid ──────────────────────────────────────────────────
router.delete('/:cid/levels/:lid', authMiddleware, requireFaculty, (req, res) => {
    const curr = getCurr(req.params.cid);
    const idx  = curr.levels.findIndex(l => l.id === req.params.lid);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Level not found.' });
    curr.levels.splice(idx, 1);
    persistCurriculum();
    res.json({ success: true });
});

// ── POST /:cid/levels/:lid/units — create unit ────────────────────────────────
router.post('/:cid/levels/:lid/units', authMiddleware, requireFaculty, (req, res) => {
    const curr = getCurr(req.params.cid);
    const lvl  = curr.levels.find(l => l.id === req.params.lid);
    if (!lvl) return res.status(404).json({ success: false, message: 'Level not found.' });
    const { title, passScore } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required.' });
    const unit = {
        id:            genId('unit'),
        title:         title.trim(),
        order:         lvl.units.length,
        passScore:     passScore || 70,
        topics:        [],
        evalQuestions: [],
    };
    lvl.units.push(unit);
    persistCurriculum();
    res.json({ success: true, unit });
});

// ── PUT /:cid/units/:uid ──────────────────────────────────────────────────────
router.put('/:cid/units/:uid', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const { unit } = found;
    if (req.body.title     !== undefined) unit.title     = req.body.title;
    if (req.body.order     !== undefined) unit.order     = req.body.order;
    if (req.body.passScore !== undefined) unit.passScore = req.body.passScore;
    persistCurriculum();
    res.json({ success: true, unit });
});

// ── DELETE /:cid/units/:uid ───────────────────────────────────────────────────
router.delete('/:cid/units/:uid', authMiddleware, requireFaculty, (req, res) => {
    const cid  = req.params.cid;
    const uid  = req.params.uid;
    const curr = getCurr(cid);
    for (const lvl of curr.levels) {
        const idx = lvl.units.findIndex(u => u.id === uid);
        if (idx !== -1) {
            lvl.units.splice(idx, 1);
            persistCurriculum();
            return res.json({ success: true });
        }
    }
    res.status(404).json({ success: false, message: 'Unit not found.' });
});

// ── POST /:cid/units/:uid/topics ──────────────────────────────────────────────
router.post('/:cid/units/:uid/topics', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required.' });
    const topic = { id: genId('topic'), title: title.trim(), content: content || '', order: found.unit.topics.length };
    found.unit.topics.push(topic);
    persistCurriculum();
    res.json({ success: true, topic });
});

// ── PUT /:cid/units/:uid/topics/:tid ─────────────────────────────────────────
router.put('/:cid/units/:uid/topics/:tid', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const topic = found.unit.topics.find(t => t.id === req.params.tid);
    if (!topic) return res.status(404).json({ success: false, message: 'Topic not found.' });
    if (req.body.title   !== undefined) topic.title   = req.body.title;
    if (req.body.content !== undefined) topic.content = req.body.content;
    if (req.body.order   !== undefined) topic.order   = req.body.order;
    persistCurriculum();
    res.json({ success: true, topic });
});

// ── DELETE /:cid/units/:uid/topics/:tid ───────────────────────────────────────
router.delete('/:cid/units/:uid/topics/:tid', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const idx = found.unit.topics.findIndex(t => t.id === req.params.tid);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Topic not found.' });
    found.unit.topics.splice(idx, 1);
    persistCurriculum();
    res.json({ success: true });
});

// ── POST /:cid/units/:uid/questions — add eval question ───────────────────────
router.post('/:cid/units/:uid/questions', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const { question, questionType, options, correctAnswer, hint, codeSnippet, codeLines } = req.body;
    if (!question) return res.status(400).json({ success: false, message: 'Question text required.' });
    const q = {
        id:           genId('q'),
        question:     question.trim(),
        questionType: questionType || 'multiple_choice',
        options:      options      || [],
        correctAnswer: correctAnswer || '',
        hint:         hint         || '',
        codeSnippet:  codeSnippet  || null,
        codeLines:    codeLines    || null,
        order:        found.unit.evalQuestions.length,
    };
    found.unit.evalQuestions.push(q);
    persistCurriculum();
    res.json({ success: true, question: q });
});

// ── PUT /:cid/units/:uid/questions/:qid ───────────────────────────────────────
router.put('/:cid/units/:uid/questions/:qid', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const q = found.unit.evalQuestions.find(x => x.id === req.params.qid);
    if (!q) return res.status(404).json({ success: false, message: 'Question not found.' });
    Object.assign(q, {
        question:      req.body.question      ?? q.question,
        questionType:  req.body.questionType  ?? q.questionType,
        options:       req.body.options       ?? q.options,
        correctAnswer: req.body.correctAnswer ?? q.correctAnswer,
        hint:          req.body.hint          ?? q.hint,
        codeSnippet:   req.body.codeSnippet   ?? q.codeSnippet,
        codeLines:     req.body.codeLines     ?? q.codeLines,
    });
    persistCurriculum();
    res.json({ success: true, question: q });
});

// ── DELETE /:cid/units/:uid/questions/:qid ────────────────────────────────────
router.delete('/:cid/units/:uid/questions/:qid', authMiddleware, requireFaculty, (req, res) => {
    const found = findUnit(req.params.cid, req.params.uid);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const idx = found.unit.evalQuestions.findIndex(x => x.id === req.params.qid);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Question not found.' });
    found.unit.evalQuestions.splice(idx, 1);
    persistCurriculum();
    res.json({ success: true });
});

// ── POST /:cid/units/:uid/complete-content — student marks content read ───────
router.post('/:cid/units/:uid/complete-content', authMiddleware, (req, res) => {
    const uid  = req.params.uid;
    const key  = `${req.user.id}_${uid}`;
    if (!progress[key]) progress[key] = {};
    progress[key].contentCompleted = true;
    persistProgress();
    res.json({ success: true });
});

// ── POST /:cid/units/:uid/topics/:tid/complete — student finishes one topic ───
router.post('/:cid/units/:uid/topics/:tid/complete', authMiddleware, (req, res) => {
    const cid = req.params.cid;
    const uid = req.params.uid;
    const tid = req.params.tid;
    const key = `${req.user.id}_${uid}`;

    if (!progress[key]) progress[key] = {};
    if (!Array.isArray(progress[key].completedTopics)) progress[key].completedTopics = [];
    if (!progress[key].completedTopics.includes(tid)) {
        progress[key].completedTopics.push(tid);
    }

    // If every topic in the unit is now complete, mark contentCompleted = true
    const found = findUnit(cid, uid);
    if (found) {
        const allTopicIds = (found.unit.topics || []).map(t => t.id);
        const allDone = allTopicIds.length > 0 && allTopicIds.every(id => progress[key].completedTopics.includes(id));
        if (allDone) progress[key].contentCompleted = true;
    }

    persistProgress();
    res.json({ success: true, completedTopics: progress[key].completedTopics });
});

// ── POST /:cid/units/:uid/submit-eval — student submits evaluation ────────────
router.post('/:cid/units/:uid/submit-eval', authMiddleware, (req, res) => {
    const cid     = req.params.cid;
    const unitId  = req.params.uid;
    const userId  = req.user.id;
    const { answers } = req.body;   // { [questionId]: selectedAnswer }
    if (!answers) return res.status(400).json({ success: false, message: 'answers required.' });

    const found = findUnit(cid, unitId);
    if (!found) return res.status(404).json({ success: false, message: 'Unit not found.' });
    const { unit } = found;

    // Score the answers
    const questions = unit.evalQuestions || [];
    let correct = 0;
    const results = questions.map(q => {
        const submitted = String(answers[q.id] || '').trim().toLowerCase();
        const expected  = String(q.correctAnswer || '').trim().toLowerCase();
        // Also accept just the letter if correctAnswer is "A) some text"
        const expectedLetter = expected.match(/^([a-d])[).]?\s*/i)?.[1]?.toLowerCase() || expected;
        const isCorrect = submitted === expected || submitted === expectedLetter ||
                          submitted === expected.replace(/^[a-d][).]\s*/i,'');
        if (isCorrect) correct++;
        return { questionId: q.id, correct: isCorrect, correctAnswer: q.correctAnswer };
    });

    const total    = questions.length;
    const score    = total ? Math.round((correct / total) * 100) : 0;
    const passed   = score >= (unit.passScore || 70);

    const key = `${userId}_${unitId}`;
    if (!progress[key]) progress[key] = { attempts: 0 };
    progress[key].attempts        = (progress[key].attempts || 0) + 1;
    progress[key].evalScore       = Math.max(progress[key].evalScore || 0, score);
    progress[key].contentCompleted = true;
    if (passed) {
        progress[key].evalPassed  = true;
        progress[key].completedAt = new Date().toISOString();
    }
    persistProgress();

    res.json({ success: true, score, correct, total, passed, results, passScore: unit.passScore || 70 });
});

// ── GET /:cid/my-progress ─────────────────────────────────────────────────────
router.get('/:cid/my-progress', authMiddleware, (req, res) => {
    const prog = buildStudentProgress(req.user.id, req.params.cid);
    res.json({ success: true, progress: prog });
});

// ── POST /:cid/issue-level-cert — award a level-completion certificate ────────
router.post('/:cid/issue-level-cert', authMiddleware, (req, res) => {
    const cid    = String(req.params.cid);
    const userId = req.user.id;
    const { levelId, levelName, classroomName, language, score } = req.body;

    if (!levelId || !levelName) {
        return res.status(400).json({ success: false, message: 'levelId and levelName required.' });
    }

    // Verify: all units in this level must have evalPassed = true
    const curr = getCurr(cid);
    const level = curr.levels.find(l => l.id === levelId);
    if (!level) return res.status(404).json({ success: false, message: 'Level not found.' });

    const units = [...(level.units || [])].sort((a, b) => a.order - b.order);
    if (units.length === 0) {
        return res.status(400).json({ success: false, message: 'No units in this level.' });
    }
    const allPassed = units.every(u => progress[`${userId}_${u.id}`]?.evalPassed);
    if (!allPassed) {
        return res.status(403).json({ success: false, message: 'Not all units passed for this level.' });
    }

    // Upsert: one cert per (userId, classroomId, levelId)
    const existing = certs.findIndex(c => c.userId === userId && c.classroomId === cid && c.levelId === levelId);
    const certData = {
        id:            existing >= 0 ? certs[existing].id : `cert_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        userId,
        classroomId:   cid,
        classroomName: classroomName || `Classroom ${cid}`,
        language:      language || 'general',
        levelId,
        levelName,
        score:         score || 0,
        issuedAt:      existing >= 0 ? certs[existing].issuedAt : new Date().toISOString(),
    };

    if (existing >= 0) { certs[existing] = certData; }
    else               { certs.push(certData); }
    persistCerts();

    res.json({ success: true, certificate: certData });
});

module.exports = router;
