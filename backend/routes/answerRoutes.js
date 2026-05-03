/**
 * ============================================================================
 * ANSWER ROUTES (answerRoutes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Handles answer checking and AI hint generation.
 * This is where the GAME MECHANICS and AI ASSISTANCE come together.
 *
 * WORKFLOW:
 * 1. Student submits an answer
 * 2. System checks if correct
 * 3. If CORRECT: Award points, check for level advancement
 * 4. If WRONG: Generate AI hint, record weak area
 *
 * ENDPOINTS:
 * POST /api/answers/check - Check answer and get result/hint
 *
 * FOR THESIS PANELISTS:
 * This module demonstrates the AI-powered hint generation system.
 * Hints are contextual and based on the specific question topic.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Import question bank for answer validation
const { questionBank } = require('./questionRoutes');

// Import AI service for hint generation
const aiService = require('../services/aiService');

// Import adaptive engine for level advancement
const adaptiveEngine = require('../services/adaptiveEngine');

// Import database service
const dbService = require('../services/dbService');
const { incrementMockProgress } = require('./progressRoutes');
const { generateLiveHint, generateCorrectMessage } = require('../services/openaiService');

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY TRACKING (Mock Database)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tracks user answers for weak area analysis
 * Structure: { odwUserId: [answerRecords] }
 */
let userAnswerHistory = {};

/**
 * Tracks consecutive correct answers for level advancement
 * Structure: { odwUserId: { language: count } }
 */
let streakTracker = {};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Check Answer
// POST /api/answers/check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks student's answer and returns appropriate response
 *
 * Request Body:
 * {
 *   "userId": 1,
 *   "questionId": 5,
 *   "selectedAnswer": "B"
 * }
 *
 * Response includes:
 * - Whether answer is correct
 * - Points earned (if correct)
 * - AI hint (if wrong)
 * - Level advancement info (if applicable)
 *
 * THIS IS THE CORE GAME MECHANIC
 */
router.post('/check', async (req, res) => {
    const { userId, questionId, selectedAnswer, submittedOrder } = req.body;

    // ─────────────────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────────────────

    if (!userId || !questionId || (selectedAnswer === undefined && submittedOrder === undefined)) {
        return res.status(400).json({
            success: false,
            message: 'Required: userId, questionId, and selectedAnswer or submittedOrder'
        });
    }

    // Try to get question from database first, then fallback to mock
    let question = null;
    if (dbService.isDbAvailable()) {
        question = await dbService.getQuestionById(questionId);
    }

    // Fallback to mock data
    if (!question) {
        question = questionBank.find(q => q.id === questionId);
    }

    if (!question) {
        return res.status(404).json({
            success: false,
            message: 'Question not found'
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHECK ANSWER (supports multiple question types)
    // ─────────────────────────────────────────────────────────────────────────

    const questionType = question.questionType || 'multiple_choice';
    let isCorrect = false;

    switch (questionType) {
        case 'fill_blank':
            isCorrect = selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
            break;
        case 'output_prediction':
            isCorrect = selectedAnswer.trim() === question.correctAnswer.trim();
            break;
        case 'code_ordering':
            isCorrect = Array.isArray(submittedOrder) &&
                Array.isArray(question.correctOrder) &&
                submittedOrder.length === question.correctOrder.length &&
                submittedOrder.every((val, idx) => val === question.correctOrder[idx]);
            break;
        default: // multiple_choice
            isCorrect = selectedAnswer.toUpperCase() === question.correctAnswer;
            break;
    }

    // Initialize user history if not exists
    if (!userAnswerHistory[userId]) {
        userAnswerHistory[userId] = [];
    }

    // Record this answer
    const answerRecord = {
        questionId: questionId,
        topic: question.topic,
        language: question.language,
        level: question.level,
        selectedAnswer: selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect,
        timestamp: new Date().toISOString()
    };
    userAnswerHistory[userId].push(answerRecord);

    // Save to database if available, with fallback to mock on any error
    let savedToDb = false;
    if (dbService.isDbAvailable()) {
        try {
            const pointsEarned = isCorrect ? aiService.calculatePoints(question.level) : 0;
            await dbService.saveAnswer(userId, questionId, selectedAnswer, isCorrect, pointsEarned, isCorrect ? null : question.hint);
            await dbService.incrementProgress(userId, question.language, isCorrect);
            savedToDb = true;
        } catch (dbErr) {
            console.warn('DB save failed, using mock progress:', dbErr.message);
        }
    }
    if (!savedToDb) {
        incrementMockProgress(userId, question.language, isCorrect, question.topic);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE CORRECT ANSWER
    // ─────────────────────────────────────────────────────────────────────────

    if (isCorrect) {
        // Calculate points based on level
        const pointsEarned = aiService.calculatePoints(question.level);

        // Update streak
        if (!streakTracker[userId]) {
            streakTracker[userId] = {};
        }
        if (!streakTracker[userId][question.language]) {
            streakTracker[userId][question.language] = 0;
        }
        streakTracker[userId][question.language]++;

        // Check for level advancement
        const currentStreak = streakTracker[userId][question.language];
        const levelUp = adaptiveEngine.checkLevelAdvancement(currentStreak, question.level);

        // Generate AI correct message (with rule-based fallback)
        let correctMsg = aiService.getCorrectAnswerMessage();
        try {
            correctMsg = await generateCorrectMessage({
                questionText: question.questionText,
                correctAnswer: question.correctAnswer,
                topic: question.topic,
                language: question.language,
                level: question.level
            });
        } catch (e) { /* fallback to rule-based */ }

        // Build response for correct answer
        const response = {
            success: true,
            correct: true,
            message: correctMsg,
            pointsEarned: pointsEarned,
            explanation: question.explanation,
            streak: currentStreak
        };

        // Add level up info if applicable
        if (levelUp.shouldAdvance) {
            response.levelUp = {
                newLevel: levelUp.newLevel,
                message: levelUp.message
            };
            // Reset streak after level up
            streakTracker[userId][question.language] = 0;
        }

        return res.json(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE WRONG ANSWER - AI HINT GENERATION
    // ─────────────────────────────────────────────────────────────────────────

    // Reset streak on wrong answer
    if (streakTracker[userId] && streakTracker[userId][question.language]) {
        streakTracker[userId][question.language] = 0;
    }

    // Generate OpenAI hint with rule-based fallback
    let aiHintText = aiService.generateHint(question.topic, question.language, question.level);
    let encouragement = aiService.getEncouragementMessage();
    try {
        aiHintText = await generateLiveHint({
            questionText: question.questionText,
            correctAnswer: question.correctAnswer,
            selectedAnswer: selectedAnswer,
            topic: question.topic,
            language: question.language,
            level: question.level
        });
    } catch (e) { /* fallback to rule-based */ }

    // Build response for wrong answer
    res.json({
        success: true,
        correct: false,
        message: encouragement,
        aiHint: {
            hint: question.hint,
            topicAdvice: aiHintText,
            topic: question.topic
        },
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        weakArea: {
            topic: question.topic,
            language: question.language,
            level: question.level,
            message: `This question was about ${question.topic}. Consider reviewing this topic.`
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get User's Answer History
// GET /api/answers/history/:userId
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns user's answer history for analytics
 */
router.get('/history/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);

    const history = userAnswerHistory[userId] || [];

    // Calculate statistics
    const totalAnswers = history.length;
    const correctAnswers = history.filter(a => a.isCorrect).length;
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    // Group by topic for weak area analysis
    const topicPerformance = {};
    history.forEach(answer => {
        if (!topicPerformance[answer.topic]) {
            topicPerformance[answer.topic] = { total: 0, correct: 0 };
        }
        topicPerformance[answer.topic].total++;
        if (answer.isCorrect) {
            topicPerformance[answer.topic].correct++;
        }
    });

    res.json({
        success: true,
        userId: userId,
        statistics: {
            totalAnswers: totalAnswers,
            correctAnswers: correctAnswers,
            accuracy: accuracy
        },
        topicPerformance: topicPerformance,
        recentAnswers: history.slice(-10)  // Last 10 answers
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Current Streak
// GET /api/answers/streak/:userId/:language
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns user's current streak for a language
 * Used for game UI display
 */
router.get('/streak/:userId/:language', (req, res) => {
    const userId = parseInt(req.params.userId);
    const language = req.params.language.toLowerCase();

    const streak = (streakTracker[userId] && streakTracker[userId][language]) || 0;

    res.json({
        success: true,
        userId: userId,
        language: language,
        currentStreak: streak,
        nextMilestone: adaptiveEngine.getNextMilestone(streak)
    });
});

// Export router and tracking data
module.exports = router;
module.exports.userAnswerHistory = userAnswerHistory;
module.exports.streakTracker = streakTracker;
