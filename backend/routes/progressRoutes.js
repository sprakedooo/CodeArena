/**
 * ============================================================================
 * PROGRESS ROUTES (progressRoutes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Tracks and manages student learning progress including:
 * - Current learning level per language
 * - Questions answered and accuracy
 * - Level progression (Beginner → Intermediate → Advanced)
 * - Topic mastery tracking
 *
 * ADAPTIVE LEARNING:
 * Progress data is used to select appropriate questions for each student.
 *
 * ENDPOINTS:
 * GET  /api/progress/:userId              - Get overall progress
 * GET  /api/progress/:userId/:language    - Get language-specific progress
 * POST /api/progress/update               - Update progress after answer
 * GET  /api/progress/level/:userId        - Get current level
 *
 * FOR THESIS PANELISTS:
 * This demonstrates how the system tracks learning progress to enable
 * adaptive question selection and performance monitoring.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Import database service
const dbService = require('../services/dbService');

// ─────────────────────────────────────────────────────────────────────────────
// MOCK PROGRESS DATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tracks progress for each user by language
 * This data drives the adaptive learning algorithm
 */
let userProgress = {
    1: {  // Demo user
        python: {
            level: 'beginner',
            questionsAnswered: 12,
            correctAnswers: 8,
            accuracy: 67,
            topicProgress: {
                'Variables': { answered: 3, correct: 2 },
                'Data Types': { answered: 2, correct: 2 },
                'Loops': { answered: 4, correct: 2 },
                'Output': { answered: 3, correct: 2 }
            },
            consecutiveCorrect: 2,
            lastActive: '2024-01-22'
        },
        java: {
            level: 'beginner',
            questionsAnswered: 0,
            correctAnswers: 0,
            accuracy: 0,
            topicProgress: {},
            consecutiveCorrect: 0,
            lastActive: null
        },
        cpp: {
            level: 'beginner',
            questionsAnswered: 0,
            correctAnswers: 0,
            accuracy: 0,
            topicProgress: {},
            consecutiveCorrect: 0,
            lastActive: null
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL ADVANCEMENT THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Criteria for advancing to next level:
 * - Minimum questions answered
 * - Minimum accuracy percentage
 * - Consecutive correct answers
 */
const levelCriteria = {
    toIntermediate: {
        questionsRequired: 10,
        accuracyRequired: 70,
        consecutiveRequired: 5
    },
    toAdvanced: {
        questionsRequired: 15,
        accuracyRequired: 80,
        consecutiveRequired: 7
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Overall Progress
// GET /api/progress/:userId
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns complete progress summary for all languages
 * Used on the main dashboard
 */
router.get('/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);

    // Try database first
    if (dbService.isDbAvailable()) {
        try {
            const languages = ['python', 'java', 'cpp'];
            const byLanguage = {};
            let totalQuestions = 0;
            let totalCorrect = 0;

            for (const lang of languages) {
                const dbProgress = await dbService.getProgress(userId, lang);
                if (dbProgress) {
                    totalQuestions += dbProgress.questions_answered || 0;
                    totalCorrect += dbProgress.correct_answers || 0;
                    byLanguage[lang] = {
                        language: lang.charAt(0).toUpperCase() + lang.slice(1),
                        level: dbProgress.current_level,
                        questionsAnswered: dbProgress.questions_answered,
                        accuracy: parseFloat(dbProgress.accuracy_percent) || 0,
                        lastActive: dbProgress.last_activity
                    };
                } else {
                    byLanguage[lang] = formatProgressSummary(createEmptyProgress(), lang);
                }
            }

            const overallAccuracy = totalQuestions > 0 ?
                Math.round((totalCorrect / totalQuestions) * 100) : 0;

            return res.json({
                success: true,
                userId: userId,
                overall: {
                    totalQuestions: totalQuestions,
                    totalCorrect: totalCorrect,
                    accuracy: overallAccuracy
                },
                byLanguage: byLanguage
            });
        } catch (error) {
            console.error('Database progress error:', error);
        }
    }

    // Fallback to mock data
    if (!userProgress[userId]) {
        userProgress[userId] = {
            python: createEmptyProgress(),
            java: createEmptyProgress(),
            cpp: createEmptyProgress()
        };
    }

    const progress = userProgress[userId];

    // Calculate overall statistics
    let totalQuestions = 0;
    let totalCorrect = 0;

    ['python', 'java', 'cpp'].forEach(lang => {
        totalQuestions += progress[lang].questionsAnswered;
        totalCorrect += progress[lang].correctAnswers;
    });

    const overallAccuracy = totalQuestions > 0 ?
        Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Build response
    res.json({
        success: true,
        userId: userId,
        overall: {
            totalQuestions: totalQuestions,
            totalCorrect: totalCorrect,
            accuracy: overallAccuracy
        },
        byLanguage: {
            python: formatProgressSummary(progress.python, 'Python'),
            java: formatProgressSummary(progress.java, 'Java'),
            cpp: formatProgressSummary(progress.cpp, 'C++')
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Language-Specific Progress
// GET /api/progress/:userId/:language
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns detailed progress for a specific language
 * Includes topic-by-topic breakdown for identifying weak areas
 */
router.get('/:userId/:language', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const language = req.params.language.toLowerCase();

    // Validate language
    if (!['python', 'javascript', 'java', 'cpp'].includes(language)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid language. Use: python, javascript, java, or cpp'
        });
    }

    // Try database first
    if (dbService.isDbAvailable()) {
        try {
            const dbProgress = await dbService.getProgress(userId, language);
            if (dbProgress) {
                const langProgress = {
                    level: dbProgress.current_level,
                    questionsAnswered: dbProgress.questions_answered,
                    correctAnswers: dbProgress.correct_answers,
                    accuracy: parseFloat(dbProgress.accuracy_percent) || 0,
                    consecutiveCorrect: dbProgress.consecutive_correct,
                    lastActive: dbProgress.last_activity
                };

                const nextLevel = getNextLevel(langProgress.level);
                const levelProgress = nextLevel ?
                    calculateLevelProgress(langProgress, langProgress.level) : null;

                return res.json({
                    success: true,
                    language: language,
                    progress: langProgress,
                    levelProgress: levelProgress,
                    topicBreakdown: {},
                    weakTopics: [],
                    nextLevelCriteria: nextLevel ? levelCriteria[`to${capitalize(nextLevel)}`] : null
                });
            }
        } catch (error) {
            console.error('Database progress error:', error);
        }
    }

    // Fallback to mock data
    if (!userProgress[userId]) {
        userProgress[userId] = {
            python: createEmptyProgress(),
            javascript: createEmptyProgress(),
            java: createEmptyProgress(),
            cpp: createEmptyProgress()
        };
    }
    if (!userProgress[userId][language]) {
        userProgress[userId][language] = createEmptyProgress();
    }

    const langProgress = userProgress[userId][language];

    // Calculate level progress
    const nextLevel = getNextLevel(langProgress.level);
    const levelProgress = nextLevel ?
        calculateLevelProgress(langProgress, langProgress.level) : null;

    // Identify weak topics (accuracy < 60%)
    const weakTopics = [];
    Object.entries(langProgress.topicProgress).forEach(([topic, data]) => {
        if (data.answered > 0) {
            const topicAccuracy = Math.round((data.correct / data.answered) * 100);
            if (topicAccuracy < 60) {
                weakTopics.push({
                    topic: topic,
                    accuracy: topicAccuracy,
                    answered: data.answered,
                    correct: data.correct
                });
            }
        }
    });

    res.json({
        success: true,
        language: language,
        progress: {
            currentLevel: langProgress.level,
            questionsAnswered: langProgress.questionsAnswered,
            correctAnswers: langProgress.correctAnswers,
            accuracy: langProgress.accuracy,
            consecutiveCorrect: langProgress.consecutiveCorrect,
            lastActive: langProgress.lastActive
        },
        levelProgress: levelProgress,
        topicBreakdown: langProgress.topicProgress,
        weakTopics: weakTopics,
        nextLevelCriteria: nextLevel ? levelCriteria[`to${capitalize(nextLevel)}`] : null
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Update Progress After Answer
// POST /api/progress/update
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates progress after each answer
 * Called automatically after answer checking
 *
 * Request Body:
 * {
 *   "userId": 1,
 *   "language": "python",
 *   "topic": "Loops",
 *   "isCorrect": true
 * }
 */
router.post('/update', async (req, res) => {
    const { userId, language, topic, isCorrect } = req.body;

    // VALIDATION
    if (!userId || !language || !topic || isCorrect === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Required: userId, language, topic, isCorrect'
        });
    }

    const lang = language.toLowerCase();

    // Try database first
    if (dbService.isDbAvailable()) {
        try {
            const dbProgress = await dbService.incrementProgress(userId, lang, isCorrect);
            if (dbProgress) {
                const langProgress = {
                    questionsAnswered: dbProgress.questions_answered,
                    correctAnswers: dbProgress.correct_answers,
                    consecutiveCorrect: dbProgress.consecutive_correct,
                    accuracy: parseFloat(dbProgress.accuracy_percent) || 0,
                    level: dbProgress.current_level
                };

                const levelAdvancement = checkLevelAdvancement(langProgress);

                if (levelAdvancement.shouldAdvance) {
                    await dbService.updateProgress(userId, lang, {
                        current_level: levelAdvancement.newLevel,
                        consecutive_correct: 0
                    });
                    langProgress.level = levelAdvancement.newLevel;
                }

                return res.json({
                    success: true,
                    updated: true,
                    currentStats: {
                        questionsAnswered: langProgress.questionsAnswered,
                        accuracy: langProgress.accuracy,
                        consecutiveCorrect: langProgress.consecutiveCorrect,
                        level: langProgress.level
                    },
                    levelAdvancement: levelAdvancement
                });
            }
        } catch (error) {
            console.error('Database progress update error:', error);
        }
    }

    // Fallback to in-memory mock data
    if (!userProgress[userId]) {
        userProgress[userId] = {
            python: createEmptyProgress(),
            java: createEmptyProgress(),
            cpp: createEmptyProgress()
        };
    }

    const langProgress = userProgress[userId][lang];

    langProgress.questionsAnswered++;
    if (isCorrect) {
        langProgress.correctAnswers++;
        langProgress.consecutiveCorrect++;
    } else {
        langProgress.consecutiveCorrect = 0;
    }

    langProgress.accuracy = Math.round(
        (langProgress.correctAnswers / langProgress.questionsAnswered) * 100
    );

    if (!langProgress.topicProgress[topic]) {
        langProgress.topicProgress[topic] = { answered: 0, correct: 0 };
    }
    langProgress.topicProgress[topic].answered++;
    if (isCorrect) {
        langProgress.topicProgress[topic].correct++;
    }

    langProgress.lastActive = new Date().toISOString().split('T')[0];

    const levelAdvancement = checkLevelAdvancement(langProgress);

    if (levelAdvancement.shouldAdvance) {
        langProgress.level = levelAdvancement.newLevel;
        langProgress.consecutiveCorrect = 0;
    }

    res.json({
        success: true,
        updated: true,
        currentStats: {
            questionsAnswered: langProgress.questionsAnswered,
            accuracy: langProgress.accuracy,
            consecutiveCorrect: langProgress.consecutiveCorrect,
            level: langProgress.level
        },
        levelAdvancement: levelAdvancement
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Current Level
// GET /api/progress/level/:userId/:language
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns user's current level for a language
 * Used for question selection
 */
router.get('/level/:userId/:language', (req, res) => {
    const userId = parseInt(req.params.userId);
    const language = req.params.language.toLowerCase();

    if (!userProgress[userId] || !userProgress[userId][language]) {
        return res.json({
            success: true,
            level: 'beginner'  // Default
        });
    }

    res.json({
        success: true,
        level: userProgress[userId][language].level
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates empty progress object for new users
 */
function createEmptyProgress() {
    return {
        level: 'beginner',
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        topicProgress: {},
        consecutiveCorrect: 0,
        lastActive: null
    };
}

/**
 * Formats progress for API response
 */
function formatProgressSummary(progress, languageName) {
    return {
        language: languageName,
        level: progress.level,
        questionsAnswered: progress.questionsAnswered,
        accuracy: progress.accuracy,
        lastActive: progress.lastActive
    };
}

/**
 * Gets the next level name
 */
function getNextLevel(currentLevel) {
    if (currentLevel === 'beginner') return 'intermediate';
    if (currentLevel === 'intermediate') return 'advanced';
    return null;
}

/**
 * Capitalizes first letter
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Calculates progress toward next level
 */
function calculateLevelProgress(progress, currentLevel) {
    const criteria = currentLevel === 'beginner' ?
        levelCriteria.toIntermediate : levelCriteria.toAdvanced;

    return {
        questions: {
            current: progress.questionsAnswered,
            required: criteria.questionsRequired,
            met: progress.questionsAnswered >= criteria.questionsRequired
        },
        accuracy: {
            current: progress.accuracy,
            required: criteria.accuracyRequired,
            met: progress.accuracy >= criteria.accuracyRequired
        },
        streak: {
            current: progress.consecutiveCorrect,
            required: criteria.consecutiveRequired,
            met: progress.consecutiveCorrect >= criteria.consecutiveRequired
        }
    };
}

/**
 * Checks if user should advance to next level
 * THIS IS THE ADAPTIVE LEARNING LOGIC
 */
function checkLevelAdvancement(progress) {
    const currentLevel = progress.level;
    const nextLevel = getNextLevel(currentLevel);

    if (!nextLevel) {
        return { shouldAdvance: false, message: 'Already at maximum level' };
    }

    const criteria = nextLevel === 'intermediate' ?
        levelCriteria.toIntermediate : levelCriteria.toAdvanced;

    // Check all criteria
    const meetsCriteria =
        progress.questionsAnswered >= criteria.questionsRequired &&
        progress.accuracy >= criteria.accuracyRequired &&
        progress.consecutiveCorrect >= criteria.consecutiveRequired;

    if (meetsCriteria) {
        return {
            shouldAdvance: true,
            newLevel: nextLevel,
            message: `Congratulations! You've advanced to ${nextLevel} level!`
        };
    }

    return {
        shouldAdvance: false,
        currentLevel: currentLevel,
        message: 'Keep practicing to advance'
    };
}

// Export router and data
// Shared helper so answerRoutes can update mock progress without going through HTTP
function incrementMockProgress(userId, language, isCorrect, topic) {
    const lang = language.toLowerCase();
    if (!userProgress[userId]) {
        userProgress[userId] = {
            python: createEmptyProgress(),
            javascript: createEmptyProgress(),
            java: createEmptyProgress(),
            cpp: createEmptyProgress()
        };
    }
    if (!userProgress[userId][lang]) {
        userProgress[userId][lang] = createEmptyProgress();
    }
    const p = userProgress[userId][lang];
    p.questionsAnswered++;
    if (isCorrect) {
        p.correctAnswers++;
        p.consecutiveCorrect++;
    } else {
        p.consecutiveCorrect = 0;
    }
    p.accuracy = Math.round((p.correctAnswers / p.questionsAnswered) * 100);
    if (topic) {
        if (!p.topicProgress[topic]) p.topicProgress[topic] = { answered: 0, correct: 0 };
        p.topicProgress[topic].answered++;
        if (isCorrect) p.topicProgress[topic].correct++;
    }
    p.lastActive = new Date().toISOString().split('T')[0];
}

module.exports = router;
module.exports.userProgress = userProgress;
module.exports.incrementMockProgress = incrementMockProgress;
