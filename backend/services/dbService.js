/**
 * ============================================================================
 * DATABASE SERVICE (dbService.js)
 * ============================================================================
 *
 * PURPOSE:
 * Provides database operations with fallback to mock data.
 * This allows the system to work with or without MySQL configured.
 *
 * USAGE:
 * const dbService = require('./services/dbService');
 * const users = await dbService.getUsers();
 * ============================================================================
 */

const db = require('../config/database');

// Track if database is available
let dbAvailable = false;

/**
 * Initialize and test database connection
 */
async function init() {
    try {
        dbAvailable = await db.testConnection();
        if (dbAvailable) await ensureQuestionColumns();
        return dbAvailable;
    } catch (error) {
        console.log('Database not available, using mock data');
        dbAvailable = false;
        return false;
    }
}

/**
 * Check if database is available
 */
function isDbAvailable() {
    return dbAvailable;
}

/**
 * Ensure the questions table has the columns introduced for multi-type support.
 * Safe to run on every startup — uses ALTER TABLE only when the column is absent.
 */
async function ensureQuestionColumns() {
    if (!dbAvailable) return;
    const newCols = [
        ["question_type",  "ALTER TABLE questions ADD COLUMN question_type VARCHAR(30) DEFAULT 'multiple_choice'"],
        ["code_snippet",   "ALTER TABLE questions ADD COLUMN code_snippet TEXT DEFAULT NULL"],
        ["code_lines",     "ALTER TABLE questions ADD COLUMN code_lines JSON DEFAULT NULL"],
    ];
    // Widen correct_answer so it can hold fill-blank/output answers (more than 1 char)
    const widenCorrect = "ALTER TABLE questions MODIFY COLUMN correct_answer VARCHAR(500) NOT NULL DEFAULT ''";
    try {
        const [cols] = await db.pool.query("SHOW COLUMNS FROM questions");
        const existing = cols.map(c => c.Field);
        for (const [col, sql] of newCols) {
            if (!existing.includes(col)) {
                await db.pool.query(sql);
                console.log(`✓ questions: added column ${col}`);
            }
        }
        // Widen correct_answer if it is still CHAR(1)
        const caCol = cols.find(c => c.Field === 'correct_answer');
        if (caCol && caCol.Type === 'char(1)') {
            await db.pool.query(widenCorrect);
            console.log('✓ questions: widened correct_answer to VARCHAR(500)');
        }
    } catch (e) {
        // Non-fatal — will fall back to in-memory for any incompatible query
        console.warn('ensureQuestionColumns warning:', e.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find user by email
 */
async function findUserByEmail(email) {
    if (!dbAvailable) return null;

    try {
        const results = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error('Error finding user:', error);
        return null;
    }
}

/**
 * Create new user
 */
async function createUser(userData) {
    if (!dbAvailable) return null;

    try {
        const role = userData.role === 'faculty' ? 'faculty' : 'student';
        const result = await db.query(
            `INSERT INTO users (email, password, full_name, role, selected_language)
             VALUES (?, ?, ?, ?, ?)`,
            [userData.email, userData.password, userData.fullName, role, userData.selectedLanguage || null]
        );
        return { id: result.insertId, ...userData };
    } catch (error) {
        console.error('Error creating user:', error);
        return null;
    }
}

/**
 * Update user login timestamp and day streak.
 * - Same calendar day as last login  → keep streak unchanged
 * - Exactly 1 calendar day ago       → increment streak
 * - More than 1 day ago              → reset streak to 1
 * Returns the new streak value.
 */
async function updateUserLogin(userId) {
    if (!dbAvailable) return 0;

    try {
        const rows = await db.query(
            'SELECT streak, last_activity_at FROM users WHERE user_id = ?',
            [userId]
        );
        if (!rows.length) return 0;

        const { streak, last_activity_at } = rows[0];
        const now  = new Date();
        const last = last_activity_at ? new Date(last_activity_at) : null;

        let newStreak = streak || 0;

        if (!last) {
            newStreak = 1;
        } else {
            const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastDay  = new Date(last.getFullYear(), last.getMonth(), last.getDate());
            const diffDays = Math.round((todayDay - lastDay) / 86400000);

            if (diffDays === 0) {
                // Same day — keep current streak
            } else if (diffDays === 1) {
                newStreak = (streak || 0) + 1; // Consecutive day
            } else {
                newStreak = 1; // Missed a day — reset
            }
        }

        await db.query(
            'UPDATE users SET last_activity_at = CURRENT_TIMESTAMP, streak = ? WHERE user_id = ?',
            [newStreak, userId]
        );

        return newStreak;
    } catch (error) {
        console.error('Error updating login streak:', error);
        return 0;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get questions by language and level
 */
async function getQuestions(language, level) {
    if (!dbAvailable) return null;

    try {
        const results = await db.query(
            `SELECT question_id as id, language_code as language, level, topic,
                    question_text as question,
                    COALESCE(question_type, 'multiple_choice') as questionType,
                    options, correct_answer as correctAnswer,
                    code_snippet as codeSnippet, code_lines as codeLines,
                    hint, explanation, points_value as points
             FROM questions
             WHERE language_code = ? AND level = ?`,
            [language, level]
        );

        return results.map(parseQuestionRow);
    } catch (error) {
        console.error('Error getting questions:', error);
        return null;
    }
}

/**
 * Get question by ID
 */
async function getQuestionById(questionId) {
    if (!dbAvailable) return null;

    try {
        const results = await db.query(
            `SELECT question_id as id, language_code as language, level, topic,
                    question_text as question,
                    COALESCE(question_type, 'multiple_choice') as questionType,
                    options, correct_answer as correctAnswer,
                    code_snippet as codeSnippet, code_lines as codeLines,
                    hint, explanation, points_value as points
             FROM questions WHERE question_id = ?`,
            [questionId]
        );

        if (results.length === 0) return null;
        return parseQuestionRow(results[0]);
    } catch (error) {
        console.error('Error getting question:', error);
        return null;
    }
}

function parseQuestionRow(q) {
    const parseJson = (v) => {
        if (Array.isArray(v)) return v;
        if (!v) return [];
        try { return JSON.parse(v); } catch { return []; }
    };
    return {
        ...q,
        options:    parseJson(q.options),
        codeLines:  q.codeLines  ? (Array.isArray(q.codeLines)  ? q.codeLines  : (() => { try { return JSON.parse(q.codeLines);  } catch { return null; } })()) : null,
    };
}

/**
 * Get all questions (optionally filtered by language/level) — faculty CMS
 */
async function getAllQuestions({ language, level } = {}) {
    if (!dbAvailable) return null;

    try {
        let sql = `SELECT question_id AS id, language_code AS language, level, topic,
                          question_text AS question,
                          COALESCE(question_type, 'multiple_choice') AS questionType,
                          options, correct_answer AS correctAnswer,
                          code_snippet AS codeSnippet, code_lines AS codeLines,
                          hint, explanation, points_value AS points
                   FROM questions`;
        const where = [];
        const params = [];
        if (language) { where.push('language_code = ?'); params.push(language.toLowerCase()); }
        if (level)    { where.push('level = ?');         params.push(level.toLowerCase()); }
        if (where.length) sql += ' WHERE ' + where.join(' AND ');
        sql += ' ORDER BY question_id DESC';

        const results = await db.query(sql, params);
        return results.map(parseQuestionRow);
    } catch (error) {
        console.error('Error getting all questions:', error);
        return null;
    }
}

/**
 * Create a question — faculty CMS. Returns the new question id, or null on failure.
 */
async function createQuestion(q) {
    if (!dbAvailable) return null;

    const type = q.questionType || q.type || 'multiple_choice';
    try {
        const result = await db.query(
            `INSERT INTO questions
               (language_code, level, topic, question_text, question_type,
                options, correct_answer, code_snippet, code_lines,
                hint, explanation, points_value)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                (q.language || '').toLowerCase(),
                (q.level || 'beginner').toLowerCase(),
                q.topic || 'General',
                q.question || '',
                type,
                JSON.stringify(q.options || []),
                (q.correctAnswer || '').toString().trim(),
                q.codeSnippet || null,
                q.codeLines ? JSON.stringify(q.codeLines) : null,
                q.hint || '',
                q.explanation || '',
                parseInt(q.points) || 10
            ]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error creating question:', error);
        return null;
    }
}

/**
 * Update a question by id — faculty CMS. Returns affected row count, or null on failure.
 */
async function updateQuestion(id, q) {
    if (!dbAvailable) return null;

    const type = q.questionType || q.type || 'multiple_choice';
    try {
        const result = await db.query(
            `UPDATE questions SET
                language_code = ?, level = ?, topic = ?, question_text = ?,
                question_type = ?, options = ?, correct_answer = ?,
                code_snippet = ?, code_lines = ?,
                hint = ?, explanation = ?, points_value = ?
             WHERE question_id = ?`,
            [
                (q.language || '').toLowerCase(),
                (q.level || 'beginner').toLowerCase(),
                q.topic || 'General',
                q.question || '',
                type,
                JSON.stringify(q.options || []),
                (q.correctAnswer || '').toString().trim(),
                q.codeSnippet || null,
                q.codeLines ? JSON.stringify(q.codeLines) : null,
                q.hint || '',
                q.explanation || '',
                parseInt(q.points) || 10,
                id
            ]
        );
        return result.affectedRows;
    } catch (error) {
        console.error('Error updating question:', error);
        return null;
    }
}

/**
 * Delete a question by id — faculty CMS. Returns affected row count, or null on failure.
 */
async function deleteQuestion(id) {
    if (!dbAvailable) return null;

    try {
        const result = await db.query('DELETE FROM questions WHERE question_id = ?', [id]);
        return result.affectedRows;
    } catch (error) {
        console.error('Error deleting question:', error);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANSWER OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save user answer
 */
async function saveAnswer(userId, questionId, selectedAnswer, isCorrect, pointsEarned, hintShown = null) {
    if (!dbAvailable) return null;

    try {
        const result = await db.query(
            `INSERT INTO user_answers (user_id, question_id, selected_answer, is_correct, points_earned, hint_level_used)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, questionId, selectedAnswer, isCorrect, pointsEarned, hintShown || 0]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error saving answer:', error);
        return null;
    }
}

/**
 * Get user answer history
 */
async function getUserAnswerHistory(userId, language = null) {
    if (!dbAvailable) return [];

    try {
        let sql = `
            SELECT ua.*, q.topic, q.language_code, q.level
            FROM user_answers ua
            JOIN questions q ON ua.question_id = q.question_id
            WHERE ua.user_id = ?
        `;
        const params = [userId];

        if (language) {
            sql += ' AND q.language_code = ?';
            params.push(language);
        }

        sql += ' ORDER BY ua.answered_at DESC';

        return await db.query(sql, params);
    } catch (error) {
        console.error('Error getting answer history:', error);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get user progress for a language
 */
async function getProgress(userId, language) {
    if (!dbAvailable) return null;

    try {
        const results = await db.query(
            `SELECT * FROM progress WHERE user_id = ? AND language_code = ?`,
            [userId, language]
        );
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error('Error getting progress:', error);
        return null;
    }
}

/**
 * Update or create progress
 */
async function updateProgress(userId, language, updates) {
    if (!dbAvailable) return null;

    // Whitelist of allowed column names to prevent SQL injection
    const ALLOWED_COLUMNS = new Set([
        'current_level', 'questions_answered', 'correct_answers',
        'consecutive_correct', 'total_points', 'badges'
    ]);

    try {
        // Check if progress exists
        const existing = await getProgress(userId, language);

        if (existing) {
            // Update existing — only allow whitelisted columns
            const setClauses = [];
            const params = [];

            for (const [key, value] of Object.entries(updates)) {
                if (ALLOWED_COLUMNS.has(key)) {
                    setClauses.push(`${key} = ?`);
                    params.push(value);
                }
            }

            params.push(userId, language);

            await db.query(
                `UPDATE progress SET ${setClauses.join(', ')}, last_activity = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND language_code = ?`,
                params
            );
        } else {
            // Create new
            await db.query(
                `INSERT INTO progress (user_id, language_code, current_level, questions_answered, correct_answers, consecutive_correct)
                 VALUES (?, ?, 'beginner', 0, 0, 0)`,
                [userId, language]
            );
        }

        return await getProgress(userId, language);
    } catch (error) {
        console.error('Error updating progress:', error);
        return null;
    }
}

/**
 * Increment progress counters
 */
async function incrementProgress(userId, language, isCorrect) {
    if (!dbAvailable) return null;

    try {
        const progress = await getProgress(userId, language);

        if (!progress) {
            await updateProgress(userId, language, {});
        }

        const questionsAnswered = (progress?.questions_answered || 0) + 1;
        const correctAnswers = (progress?.correct_answers || 0) + (isCorrect ? 1 : 0);
        const consecutiveCorrect = isCorrect ? (progress?.consecutive_correct || 0) + 1 : 0;
        const accuracy = questionsAnswered > 0 ? ((correctAnswers / questionsAnswered) * 100).toFixed(2) : 0;

        await db.query(
            `UPDATE progress SET
                questions_answered = ?,
                correct_answers = ?,
                consecutive_correct = ?,
                accuracy_percent = ?,
                last_activity = CURRENT_TIMESTAMP
             WHERE user_id = ? AND language_code = ?`,
            [questionsAnswered, correctAnswers, consecutiveCorrect, accuracy, userId, language]
        );

        return await getProgress(userId, language);
    } catch (error) {
        console.error('Error incrementing progress:', error);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// REWARD OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add reward
 */
async function addReward(userId, rewardType, pointsAmount = 0, badgeId = null, description = '') {
    if (!dbAvailable) return null;

    try {
        const result = await db.query(
            `INSERT INTO rewards (user_id, reward_type, xp_amount, badge_id, description)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, rewardType, pointsAmount, badgeId, description]
        );

        // Update user's total XP
        if (pointsAmount > 0) {
            await db.query(
                `UPDATE users SET total_xp = total_xp + ? WHERE user_id = ?`,
                [pointsAmount, userId]
            );
        }

        return result.insertId;
    } catch (error) {
        console.error('Error adding reward:', error);
        return null;
    }
}

/**
 * Get user rewards
 */
async function getUserRewards(userId) {
    if (!dbAvailable) return [];

    try {
        return await db.query(
            `SELECT * FROM rewards WHERE user_id = ? ORDER BY earned_at DESC`,
            [userId]
        );
    } catch (error) {
        console.error('Error getting rewards:', error);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save feedback
 */
async function saveFeedback(userId, language, feedback) {
    if (!dbAvailable) return null;

    try {
        const result = await db.query(
            `INSERT INTO feedback (user_id, language_code, overall_assessment, weak_areas, strong_areas, next_steps)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId,
                language,
                feedback.overallAssessment,
                JSON.stringify(feedback.weakAreas || []),
                JSON.stringify(feedback.strongAreas || []),
                JSON.stringify(feedback.nextSteps || [])
            ]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error saving feedback:', error);
        return null;
    }
}

/**
 * Get user feedback
 */
async function getUserFeedback(userId, language = null) {
    if (!dbAvailable) return null;

    try {
        let sql = 'SELECT * FROM feedback WHERE user_id = ?';
        const params = [userId];

        if (language) {
            sql += ' AND language_code = ?';
            params.push(language);
        }

        sql += ' ORDER BY generated_at DESC LIMIT 1';

        const results = await db.query(sql, params);

        if (results.length === 0) return null;

        const f = results[0];
        const safeParseArray = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            try { return JSON.parse(val); } catch { return []; }
        };
        return {
            ...f,
            weak_areas: safeParseArray(f.weak_areas),
            strong_areas: safeParseArray(f.strong_areas),
            next_steps: safeParseArray(f.next_steps)
        };
    } catch (error) {
        console.error('Error getting feedback:', error);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    init,
    isDbAvailable,

    // Users
    findUserByEmail,
    createUser,
    updateUserLogin,

    // Questions
    getQuestions,
    getQuestionById,
    getAllQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    ensureQuestionColumns,

    // Answers
    saveAnswer,
    getUserAnswerHistory,

    // Progress
    getProgress,
    updateProgress,
    incrementProgress,

    // Rewards
    addReward,
    getUserRewards,

    // Feedback
    saveFeedback,
    getUserFeedback
};
