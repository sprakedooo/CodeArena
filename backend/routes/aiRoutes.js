/**
 * aiRoutes.js — Phase 1 AI Endpoints for CodeArena
 *
 * Endpoints:
 *   POST /api/ai/analyze-code       — Analyze submitted code with GPT
 *   POST /api/ai/hint               — Get a progressive hint (levels 1–3)
 *   POST /api/ai/ask                — Global AI Assistant chat
 *   GET  /api/ai/teaching-insights  — Faculty: AI insights about their classrooms
 *   GET  /api/ai/next-task/:userId  — Recommend the student's next learning task
 */

const express = require('express');
const router  = express.Router();
const { authMiddleware, requireFaculty } = require('../middleware/authMiddleware');
const { pool } = require('../config/database');
const {
    analyzeCode,
    getProgressiveHint,
    globalAssistant,
    facultyAssistant,
    generateTeachingInsights,
    recommendNextTask,
} = require('../services/openaiService');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getUserRow(userId) {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
        return rows[0] || null;
    } catch { return null; }
}

async function getUserProgress(userId) {
    try {
        const [rows] = await pool.query(
            `SELECT lp.*, pl.title, pl.lesson_id, lpath.language, lpath.title AS path_title
             FROM lesson_progress lp
             JOIN path_lessons pl        ON lp.lesson_id  = pl.lesson_id
             JOIN learning_paths lpath   ON pl.path_id    = lpath.path_id
             WHERE lp.user_id = ?
             ORDER BY lp.completed_at DESC`,
            [userId]
        );
        return rows;
    } catch { return []; }
}

async function getUserWeaknesses(userId) {
    try {
        const [rows] = await pool.query(
            `SELECT topic, language FROM weaknesses
             WHERE user_id = ? AND resolved = 0
             ORDER BY error_rate DESC LIMIT 5`,
            [userId]
        );
        return rows.map(r => `${r.topic} (${r.language})`);
    } catch { return []; }
}

async function logAIInteraction(userId, sessionType, prompt, response) {
    try {
        await pool.query(
            `INSERT INTO ai_feedback_logs (user_id, session_type, prompt, response, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [userId, sessionType, (prompt || '').slice(0, 500), (response || '').slice(0, 2000)]
        );
    } catch { /* non-fatal */ }
}

// ── POST /api/ai/analyze-code ─────────────────────────────────────────────────
router.post('/analyze-code', authMiddleware, async (req, res) => {
    const { code, language, level, topic, taskDesc, expectedOutput, actualOutput } = req.body;

    if (!code || !language) {
        return res.status(400).json({ error: 'code and language are required.' });
    }

    try {
        const result = await analyzeCode({
            code,
            language:       language       || 'python',
            level:          level          || 'beginner',
            topic:          topic          || 'general',
            taskDesc:       taskDesc       || '',
            expectedOutput: expectedOutput || '',
            actualOutput:   actualOutput   || '',
        });

        await logAIInteraction(
            req.user.id,
            'code_analysis',
            `Analyze ${language} code: ${topic || 'general'}`,
            JSON.stringify(result)
        );

        res.json({ success: true, analysis: result });
    } catch (err) {
        console.error('[AI] analyze-code error:', err.message);
        res.status(500).json({ error: 'AI analysis failed.', details: err.message });
    }
});

// ── POST /api/ai/hint ─────────────────────────────────────────────────────────
router.post('/hint', authMiddleware, async (req, res) => {
    const { questionText, topic, language, level, hintLevel, studentAnswer } = req.body;

    if (!questionText) {
        return res.status(400).json({ error: 'questionText is required.' });
    }

    const parsedLevel = Math.min(3, Math.max(1, parseInt(hintLevel) || 1));

    try {
        const hint = await getProgressiveHint({
            questionText,
            topic:         topic         || 'programming',
            language:      language      || 'python',
            level:         level         || 'beginner',
            hintLevel:     parsedLevel,
            studentAnswer: studentAnswer || '',
        });

        await logAIInteraction(
            req.user.id,
            'hint',
            `Hint L${parsedLevel} for: ${questionText.slice(0, 100)}`,
            hint
        );

        res.json({ success: true, hint, hintLevel: parsedLevel });
    } catch (err) {
        console.error('[AI] hint error:', err.message);
        res.status(500).json({ error: 'Hint generation failed.', details: err.message });
    }
});

// ── POST /api/ai/ask ──────────────────────────────────────────────────────────
router.post('/ask', authMiddleware, async (req, res) => {
    const { message, conversationHistory = [] } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'message is required.' });
    }

    try {
        const user = await getUserRow(req.user.id);
        const isFaculty = req.user.role === 'faculty';

        let reply;

        if (isFaculty) {
            // Faculty: use educator-focused assistant
            let classrooms = [];
            let totalStudents = 0;
            try {
                const [rows] = await pool.query(
                    `SELECT c.name, COUNT(DISTINCT ce.student_id) AS student_count
                     FROM classrooms c
                     LEFT JOIN classroom_enrollments ce ON ce.classroom_id = c.classroom_id AND ce.status = 'active'
                     WHERE c.faculty_id = ?
                     GROUP BY c.classroom_id`,
                    [req.user.id]
                );
                classrooms    = rows.map(r => `${r.name} (${r.student_count} students)`);
                totalStudents = rows.reduce((sum, r) => sum + (r.student_count || 0), 0);
            } catch { /* no DB */ }

            reply = await facultyAssistant({
                message,
                facultyName:  user ? (user.full_name || 'Professor') : 'Professor',
                classrooms,
                totalStudents,
                conversationHistory,
            });

            await logAIInteraction(req.user.id, 'faculty_guidance', message, reply);
        } else {
            // Student: use learner-focused assistant
            const progress   = await getUserProgress(req.user.id);
            const weakTopics = await getUserWeaknesses(req.user.id);

            const studentName = user ? (user.full_name || 'Student') : 'Student';
            const level       = user ? (user.selected_language || 'beginner') : 'beginner';
            const language    = user ? (user.selected_language || 'python')   : 'python';
            const lastLesson  = progress.length ? `${progress[0].title} (${progress[0].language})` : null;

            reply = await globalAssistant({
                message,
                studentName,
                level,
                language,
                lastLesson,
                weakTopics,
                conversationHistory,
            });

            await logAIInteraction(req.user.id, 'guidance', message, reply);
        }

        res.json({ success: true, reply });
    } catch (err) {
        console.error('[AI] ask error:', err.message);
        res.status(500).json({ error: 'Assistant failed.', details: err.message });
    }
});

// ── GET /api/ai/teaching-insights ────────────────────────────────────────────
router.get('/teaching-insights', authMiddleware, requireFaculty, async (req, res) => {
    try {
        const user        = await getUserRow(req.user.id);
        const facultyName = user ? (user.full_name || 'Faculty') : 'Faculty';

        // Classrooms owned by this faculty
        let classrooms = [];
        try {
            const [rows] = await pool.query(
                `SELECT c.classroom_id, c.name, c.language,
                        COUNT(DISTINCT ce.student_id) AS student_count
                 FROM classrooms c
                 LEFT JOIN classroom_enrollments ce ON ce.classroom_id = c.classroom_id AND ce.status = 'active'
                 WHERE c.faculty_id = ?
                 GROUP BY c.classroom_id`,
                [req.user.id]
            );
            classrooms = rows;
        } catch { /* no classrooms yet */ }

        let weakTopics    = [];
        let atRiskCount   = 0;
        let totalStudents = 0;
        let improvedCount = 0;

        if (classrooms.length) {
            const classroomIds = classrooms.map(c => c.classroom_id);
            try {
                const [memberRows] = await pool.query(
                    `SELECT DISTINCT student_id FROM classroom_enrollments
                     WHERE classroom_id IN (?) AND status = 'active'`,
                    [classroomIds]
                );
                totalStudents = memberRows.length;

                if (totalStudents > 0) {
                    const studentIds = memberRows.map(r => r.student_id);

                    const [weakRows] = await pool.query(
                        `SELECT topic, language, COUNT(*) AS cnt FROM weaknesses
                         WHERE user_id IN (?) GROUP BY topic, language
                         ORDER BY cnt DESC LIMIT 10`,
                        [studentIds]
                    );
                    weakTopics = weakRows.map(r => `${r.topic} (${r.language})`);

                    const [atRiskRows] = await pool.query(
                        `SELECT user_id, COUNT(*) AS cnt FROM weaknesses
                         WHERE user_id IN (?) AND resolved = 0
                         GROUP BY user_id HAVING cnt >= 2`,
                        [studentIds]
                    );
                    atRiskCount = atRiskRows.length;

                    const [improvedRows] = await pool.query(
                        `SELECT DISTINCT user_id FROM lesson_progress
                         WHERE user_id IN (?)
                         AND completed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
                        [studentIds]
                    );
                    improvedCount = improvedRows.length;
                }
            } catch { /* non-fatal */ }
        }

        const insights = await generateTeachingInsights({
            facultyName,
            classrooms: classrooms.map(c => `${c.name} (${c.language}, ${c.student_count} students)`),
            weakTopics,
            atRiskCount,
            totalStudents,
            improvedCount,
        });

        await logAIInteraction(req.user.id, 'teaching_insights', 'faculty insights request', JSON.stringify(insights));

        res.json({ success: true, insights });
    } catch (err) {
        console.error('[AI] teaching-insights error:', err.message);
        res.status(500).json({ error: 'Teaching insights failed.', details: err.message });
    }
});

// ── GET /api/ai/next-task/:userId ─────────────────────────────────────────────
router.get('/next-task/:userId', authMiddleware, async (req, res) => {
    const userId = parseInt(req.params.userId);

    if (req.user.role !== 'faculty' && req.user.id !== userId) {
        return res.status(403).json({ error: 'Forbidden.' });
    }

    try {
        const user     = await getUserRow(userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const progress   = await getUserProgress(userId);
        const weakTopics = await getUserWeaknesses(userId);

        const studentName    = user.full_name || 'Student';
        const language       = user.selected_language || 'python';
        const lastLesson     = progress.length ? progress[0].title : null;
        const completedCount = progress.filter(p => p.status === 'completed').length;

        let totalLessons = 6;
        try {
            const [countRows] = await pool.query(
                `SELECT COUNT(*) AS cnt FROM path_lessons pl
                 JOIN learning_paths lp ON pl.path_id = lp.path_id
                 WHERE lp.language = ? AND pl.is_published = 1`,
                [language]
            );
            totalLessons = countRows[0]?.cnt || 6;
        } catch { /* use default */ }

        const recommendation = await recommendNextTask({
            studentName,
            level: 'beginner',
            language,
            lastLesson,
            weakTopics,
            completedLessons: completedCount,
            totalLessons,
        });

        res.json({ success: true, task: recommendation, recommendation });
    } catch (err) {
        console.error('[AI] next-task error:', err.message);
        res.status(500).json({ error: 'Next task recommendation failed.', details: err.message });
    }
});

// ── POST /api/ai/ask-code ─────────────────────────────────────────────────────
// Ask the AI assistant about a specific code snippet from a blog/course.
// Body: { code, language, question, conversationHistory? }
router.post('/ask-code', authMiddleware, async (req, res) => {
    const { code, language, question, conversationHistory = [] } = req.body;

    if (!question || !question.trim()) {
        return res.status(400).json({ error: 'question is required.' });
    }

    // Build a message that includes the code context
    const lang      = language || 'code';
    const codeBlock = code ? `\`\`\`${lang}\n${code}\n\`\`\`` : '';
    const message   = codeBlock
        ? `I am looking at this ${lang} code snippet:\n\n${codeBlock}\n\nMy question: ${question}`
        : question;

    try {
        // Try OpenAI route first
        const user   = await getUserRow(req.user.id);
        const weakTopics = await getUserWeaknesses(req.user.id);
        const studentName = user?.full_name || 'Student';
        const level       = user?.selected_language || 'beginner';

        const reply = await globalAssistant({
            message,
            studentName,
            level,
            language: lang,
            lastLesson: null,
            weakTopics,
            conversationHistory,
        });

        await logAIInteraction(req.user.id, 'code_question', message.slice(0, 300), reply);
        return res.json({ success: true, reply });

    } catch (err) {
        // Fallback: rule-based response so the feature still works without OpenAI key
        const q = question.toLowerCase();
        const langName = { python:'Python', javascript:'JavaScript', java:'Java', cpp:'C++' }[lang] || lang;
        const lines    = (code || '').split('\n').length;

        let reply = '';
        if (/explain|what|describe|how does/.test(q)) {
            reply = `This ${langName} snippet has ${lines} line(s). It ${lines <= 5 ? 'is a short' : 'is a multi-line'} example.\n\n`
                  + `Key things to notice:\n• Read it top to bottom — each line builds on the previous.\n`
                  + `• Look at variable names — they hint at the purpose of each value.\n`
                  + `• Try running it in the Playground and changing values to see what changes!\n\n`
                  + `Feel free to ask a more specific question about any part.`;
        } else if (/error|bug|wrong|fix|issue|problem/.test(q)) {
            reply = `To debug ${langName} code:\n\n`
                  + `1. **Read the error message carefully** — it tells you the line number and type.\n`
                  + `2. **Add print statements** to trace variable values step by step.\n`
                  + `3. **Check for common issues**: missing colons (Python), unclosed brackets, wrong indentation, or undefined variables.\n`
                  + `4. **Run it in the Playground** — you can modify and re-run instantly!\n\n`
                  + `Share the specific error message and I can help pinpoint the problem.`;
        } else if (/better|improve|optimize|refactor|clean/.test(q)) {
            reply = `Here are ${langName} best practices that can improve this code:\n\n`
                  + `• Use descriptive variable names that explain their purpose.\n`
                  + `• Break long code into smaller, focused functions.\n`
                  + `• Add comments for non-obvious logic.\n`
                  + `• Avoid repeating the same code block — use loops or functions.\n`
                  + `• Test edge cases: empty inputs, large numbers, negative values.\n\n`
                  + `Try the Playground to experiment with improvements!`;
        } else if (/run|execute|output|result|print/.test(q)) {
            reply = `Click **"Try it in Playground"** below the code to run it instantly!\n\n`
                  + `In the Playground you can:\n• Edit the code and see output immediately.\n`
                  + `• Change variable values to experiment.\n`
                  + `• Test edge cases and see how the code behaves.\n\n`
                  + `If you share what output you expected vs. what you got, I can help explain the difference.`;
        } else {
            reply = `Great question about this ${langName} code! Here's some guidance:\n\n`
                  + `• **Try it yourself** — click "Try it in Playground" to run and experiment.\n`
                  + `• **Break it down** — understand what each line does individually.\n`
                  + `• **Test with different inputs** — change values and observe results.\n\n`
                  + `Ask me something more specific like:\n`
                  + `"Explain what this code does", "Why does it output X?", or "How can I improve it?"`;
        }

        await logAIInteraction(req.user.id, 'code_question_fallback', question, reply);
        return res.json({ success: true, reply, fallback: true });
    }
});

// ── POST /api/ai/track-session ────────────────────────────────────────────────
// Called after a solo quiz session to save XP + update weakness tracking.
// Body: { xpEarned, language, results:[{topic, isCorrect}] }
router.post('/track-session', authMiddleware, async (req, res) => {
    const { xpEarned = 0, language = 'python', results = [] } = req.body;
    const userId = req.user.id;

    try {
        // Award XP
        if (xpEarned > 0) {
            await pool.query('UPDATE users SET total_xp = total_xp + ? WHERE user_id = ?', [xpEarned, userId]);
            await pool.query(
                `INSERT INTO rewards (user_id, reward_type, xp_amount, description, earned_at)
                 VALUES (?, 'xp', ?, ?, NOW())`,
                [userId, xpEarned, `Solo quiz session — ${xpEarned} XP`]
            );
        }

        // Update weaknesses per topic
        for (const { topic, isCorrect } of results) {
            if (!topic) continue;
            if (!isCorrect) {
                await pool.query(
                    `INSERT INTO weaknesses (user_id, topic, language, error_count, total_attempts, error_rate)
                     VALUES (?, ?, ?, 1, 1, 100.00)
                     ON DUPLICATE KEY UPDATE
                       error_count    = error_count + 1,
                       total_attempts = total_attempts + 1,
                       error_rate     = ROUND(error_count / total_attempts * 100, 2),
                       last_detected_at = NOW(), resolved = 0`,
                    [userId, topic, language]
                );
            } else {
                await pool.query(
                    `UPDATE weaknesses
                     SET total_attempts = total_attempts + 1,
                         error_rate     = ROUND(error_count / total_attempts * 100, 2),
                         resolved       = IF(error_rate <= 25, 1, 0)
                     WHERE user_id = ? AND topic = ? AND language = ?`,
                    [userId, topic, language]
                );
            }
        }

        // Fetch updated XP
        const [userRows] = await pool.query('SELECT total_xp, streak FROM users WHERE user_id = ?', [userId]);
        res.json({ success: true, totalXp: userRows[0]?.total_xp || 0 });
    } catch (err) {
        console.error('[AI] track-session error:', err.message);
        res.status(500).json({ error: 'Session tracking failed.', details: err.message });
    }
});

module.exports = router;
