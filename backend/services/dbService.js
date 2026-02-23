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
        const result = await db.query(
            `INSERT INTO users (email, password, full_name, selected_language)
             VALUES (?, ?, ?, ?)`,
            [userData.email, userData.password, userData.fullName, userData.selectedLanguage || null]
        );
        return { id: result.insertId, ...userData };
    } catch (error) {
        console.error('Error creating user:', error);
        return null;
    }
}

/**
 * Update user login timestamp
 */
async function updateUserLogin(userId) {
    if (!dbAvailable) return;

    try {
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
            [userId]
        );
    } catch (error) {
        console.error('Error updating login:', error);
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
                    question_text as question, options, correct_answer as correctAnswer,
                    hint, explanation, points_value as points
             FROM questions
             WHERE language_code = ? AND level = ?`,
            [language, level]
        );

        // Parse JSON options
        return results.map(q => ({
            ...q,
            options: (() => { try { return JSON.parse(q.options); } catch { return []; } })()
        }));
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
                    question_text as question, options, correct_answer as correctAnswer,
                    hint, explanation, points_value as points
             FROM questions WHERE question_id = ?`,
            [questionId]
        );

        if (results.length === 0) return null;

        const q = results[0];
        return {
            ...q,
            options: (() => { try { return JSON.parse(q.options); } catch { return []; } })()
        };
    } catch (error) {
        console.error('Error getting question:', error);
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
            `INSERT INTO user_answers (user_id, question_id, selected_answer, is_correct, points_earned, hint_shown)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, questionId, selectedAnswer, isCorrect, pointsEarned, hintShown]
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
            `INSERT INTO rewards (user_id, reward_type, points_amount, badge_id, description)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, rewardType, pointsAmount, badgeId, description]
        );

        // Update user's total points
        if (pointsAmount > 0) {
            await db.query(
                `UPDATE users SET total_points = total_points + ? WHERE user_id = ?`,
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
