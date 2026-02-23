/**
 * ============================================================================
 * ADAPTIVE ENGINE (adaptiveEngine.js)
 * Core Logic for Adaptive Difficulty Adjustment
 * ============================================================================
 *
 * PURPOSE:
 * Implements the ADAPTIVE LEARNING algorithm that adjusts question
 * difficulty based on student performance. This is what makes the
 * system "intelligent" - it responds to each student's ability level.
 *
 * ADAPTIVE LEARNING LOGIC:
 * 1. Track consecutive correct answers (streak)
 * 2. When streak reaches threshold, increase difficulty
 * 3. When accuracy drops below threshold, provide support
 * 4. Adjust question selection based on current level
 *
 * FOR THESIS PANELISTS:
 * This module demonstrates the core ADAPTIVE LEARNING concept.
 * The system automatically adjusts to each learner's pace:
 * - Fast learners advance to harder questions quickly
 * - Struggling learners receive appropriate-level content
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for level advancement
 * These thresholds determine when a student advances
 */
const ADAPTIVE_CONFIG = {
    // Streak required to advance from beginner to intermediate
    BEGINNER_TO_INTERMEDIATE_STREAK: 5,

    // Streak required to advance from intermediate to advanced
    INTERMEDIATE_TO_ADVANCED_STREAK: 7,

    // Minimum accuracy for level advancement
    MIN_ACCURACY_FOR_ADVANCEMENT: 70,

    // Points milestones for rewards
    STREAK_MILESTONES: [3, 5, 7, 10],

    // Accuracy threshold for "needs help" flag
    STRUGGLING_ACCURACY: 50
};

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL ADVANCEMENT LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if student should advance to next difficulty level
 *
 * @param {number} currentStreak - Current consecutive correct answers
 * @param {string} currentLevel - Current difficulty level
 * @returns {object} Level advancement result
 *
 * THIS IS THE CORE ADAPTIVE ALGORITHM
 */
function checkLevelAdvancement(currentStreak, currentLevel) {
    // Determine required streak based on current level
    let requiredStreak;
    let nextLevel;

    switch (currentLevel) {
        case 'beginner':
            requiredStreak = ADAPTIVE_CONFIG.BEGINNER_TO_INTERMEDIATE_STREAK;
            nextLevel = 'intermediate';
            break;
        case 'intermediate':
            requiredStreak = ADAPTIVE_CONFIG.INTERMEDIATE_TO_ADVANCED_STREAK;
            nextLevel = 'advanced';
            break;
        case 'advanced':
            // Already at highest level
            return {
                shouldAdvance: false,
                message: 'You are already at the highest level! Keep practicing to maintain mastery.'
            };
        default:
            requiredStreak = ADAPTIVE_CONFIG.BEGINNER_TO_INTERMEDIATE_STREAK;
            nextLevel = 'intermediate';
    }

    // Check if streak meets threshold
    if (currentStreak >= requiredStreak) {
        return {
            shouldAdvance: true,
            newLevel: nextLevel,
            message: `Congratulations! You've mastered ${currentLevel} level! ` +
                     `Welcome to ${nextLevel} - questions will now be more challenging.`,
            achievement: `level_${nextLevel}`
        };
    }

    // Not advancing yet - return progress info
    return {
        shouldAdvance: false,
        currentLevel: currentLevel,
        progress: {
            currentStreak: currentStreak,
            neededStreak: requiredStreak,
            remaining: requiredStreak - currentStreak
        },
        message: `${requiredStreak - currentStreak} more correct answers in a row to advance!`
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEXT MILESTONE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets the next streak milestone for rewards
 *
 * @param {number} currentStreak - Current streak count
 * @returns {object} Next milestone info
 */
function getNextMilestone(currentStreak) {
    const milestones = ADAPTIVE_CONFIG.STREAK_MILESTONES;

    // Find next milestone
    for (const milestone of milestones) {
        if (currentStreak < milestone) {
            return {
                nextMilestone: milestone,
                currentStreak: currentStreak,
                remaining: milestone - currentStreak,
                message: `${milestone - currentStreak} more to reach a ${milestone}-streak!`
            };
        }
    }

    // Beyond all milestones
    return {
        nextMilestone: null,
        currentStreak: currentStreak,
        message: 'Amazing streak! You\'re on fire!'
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIFFICULTY RECOMMENDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recommends appropriate difficulty based on performance
 *
 * @param {number} accuracy - Student's accuracy percentage
 * @param {string} currentLevel - Current difficulty level
 * @returns {object} Difficulty recommendation
 *
 * This helps ensure students aren't frustrated or bored
 */
function recommendDifficulty(accuracy, currentLevel) {
    // If accuracy is very high, suggest advancement
    if (accuracy >= 90) {
        return {
            recommendation: 'advance',
            message: 'You\'re excelling! Consider moving to more challenging questions.',
            suggestedLevel: getNextLevel(currentLevel) || currentLevel
        };
    }

    // If accuracy is appropriate, stay at current level
    if (accuracy >= ADAPTIVE_CONFIG.MIN_ACCURACY_FOR_ADVANCEMENT) {
        return {
            recommendation: 'maintain',
            message: 'You\'re doing well at this level. Keep practicing!',
            suggestedLevel: currentLevel
        };
    }

    // If accuracy is low, provide support
    if (accuracy >= ADAPTIVE_CONFIG.STRUGGLING_ACCURACY) {
        return {
            recommendation: 'support',
            message: 'Some topics need review. Focus on the hints provided.',
            suggestedLevel: currentLevel
        };
    }

    // If accuracy is very low, consider stepping back
    return {
        recommendation: 'review',
        message: 'Let\'s strengthen your foundation before moving forward.',
        suggestedLevel: getPreviousLevel(currentLevel) || currentLevel
    };
}

/**
 * Gets the next level up
 */
function getNextLevel(currentLevel) {
    const levels = ['beginner', 'intermediate', 'advanced'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
}

/**
 * Gets the previous level
 */
function getPreviousLevel(currentLevel) {
    const levels = ['beginner', 'intermediate', 'advanced'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex > 0 ? levels[currentIndex - 1] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION SELECTION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines which difficulty level questions to serve
 * Based on student's current state
 *
 * @param {object} studentProgress - Student's progress data
 * @returns {string} Level of questions to serve
 */
function selectQuestionLevel(studentProgress) {
    const { currentLevel, accuracy, consecutiveCorrect, consecutiveWrong } = studentProgress;

    // If on a hot streak, might preview harder questions
    if (consecutiveCorrect >= 3 && currentLevel !== 'advanced') {
        // 30% chance to show a "challenge" question from next level
        if (Math.random() < 0.3) {
            return {
                level: getNextLevel(currentLevel),
                isChallenge: true,
                message: 'Challenge Question! Try this harder one.'
            };
        }
    }

    // If struggling (multiple wrong in a row), ensure appropriate level
    if (consecutiveWrong >= 3 && currentLevel !== 'beginner') {
        return {
            level: currentLevel,  // Stay at current, don't penalize by going down
            isSupport: true,
            message: 'Let\'s practice some more at this level.'
        };
    }

    // Default: serve questions at current level
    return {
        level: currentLevel,
        isChallenge: false,
        isSupport: false
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes student performance and provides insights
 *
 * @param {object} performanceData - Performance statistics
 * @returns {object} Analysis results
 */
function analyzePerformance(performanceData) {
    const {
        questionsAnswered,
        correctAnswers,
        topicPerformance
    } = performanceData;

    const accuracy = questionsAnswered > 0 ?
        Math.round((correctAnswers / questionsAnswered) * 100) : 0;

    // Find struggling topics
    const strugglingTopics = [];
    const strongTopics = [];

    Object.entries(topicPerformance || {}).forEach(([topic, data]) => {
        if (data.answered > 0) {
            const topicAccuracy = Math.round((data.correct / data.answered) * 100);
            if (topicAccuracy < 60) {
                strugglingTopics.push({ topic, accuracy: topicAccuracy });
            } else if (topicAccuracy >= 80) {
                strongTopics.push({ topic, accuracy: topicAccuracy });
            }
        }
    });

    // Generate overall assessment
    let status;
    if (accuracy >= 80) {
        status = 'excellent';
    } else if (accuracy >= 60) {
        status = 'good';
    } else if (accuracy >= 40) {
        status = 'needs_practice';
    } else {
        status = 'needs_support';
    }

    return {
        overallAccuracy: accuracy,
        status: status,
        strugglingTopics: strugglingTopics.sort((a, b) => a.accuracy - b.accuracy),
        strongTopics: strongTopics.sort((a, b) => b.accuracy - a.accuracy),
        totalQuestions: questionsAnswered,
        correctCount: correctAnswers
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    checkLevelAdvancement,
    getNextMilestone,
    recommendDifficulty,
    selectQuestionLevel,
    analyzePerformance,
    ADAPTIVE_CONFIG
};
