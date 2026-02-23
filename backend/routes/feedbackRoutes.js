/**
 * ============================================================================
 * FEEDBACK ROUTES (feedbackRoutes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Generates AI-powered feedback on student weak areas.
 * Analyzes performance data to provide personalized learning recommendations.
 *
 * KEY FEATURE:
 * This is where the AI analyzes student performance and generates
 * human-readable feedback about areas that need improvement.
 *
 * ENDPOINTS:
 * GET  /api/feedback/:userId              - Get AI feedback for user
 * GET  /api/feedback/:userId/:language    - Get language-specific feedback
 * POST /api/feedback/generate             - Generate new feedback analysis
 *
 * FOR THESIS PANELISTS:
 * This demonstrates AI-powered learning analytics that identify
 * struggling topics and generate actionable study recommendations.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Import AI service for feedback generation
const aiService = require('../services/aiService');

// Import database service
const dbService = require('../services/dbService');

// Import answer history for computing topic performance
const { userAnswerHistory } = require('./answerRoutes');

// ─────────────────────────────────────────────────────────────────────────────
// MOCK FEEDBACK STORAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stores generated feedback for each user
 * In production, this would be stored in database
 */
let userFeedback = {
    1: {  // Demo user
        python: {
            generatedAt: '2024-01-22',
            overallAssessment: 'You are making good progress in Python basics.',
            weakAreas: [
                {
                    topic: 'Loops',
                    accuracy: 50,
                    message: 'You are struggling with loops in Python. This is a common challenge!',
                    recommendation: 'Practice writing for loops that count from 1 to 10. Then try nested loops.'
                }
            ],
            strongAreas: [
                {
                    topic: 'Data Types',
                    accuracy: 100,
                    message: 'Excellent understanding of data types!'
                }
            ],
            nextSteps: [
                'Review the lesson on Loops before attempting more questions',
                'Try to understand the range() function better',
                'Practice 5 more loop questions to improve'
            ]
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get User Feedback
// GET /api/feedback/:userId
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns AI-generated feedback for all languages
 * Shows overview of weak areas across all studied languages
 */
router.get('/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);

    // Check if feedback exists
    if (!userFeedback[userId]) {
        return res.json({
            success: true,
            hasFeedback: false,
            message: 'No feedback generated yet. Answer some questions first!'
        });
    }

    const feedback = userFeedback[userId];

    // Compile feedback from all languages
    const compiledFeedback = {
        userId: userId,
        languages: {}
    };

    ['python', 'java', 'cpp', 'javascript'].forEach(lang => {
        if (feedback[lang]) {
            compiledFeedback.languages[lang] = {
                hasData: true,
                weakAreaCount: feedback[lang].weakAreas.length,
                topWeakArea: feedback[lang].weakAreas[0] || null,
                overallAssessment: feedback[lang].overallAssessment
            };
        } else {
            compiledFeedback.languages[lang] = {
                hasData: false
            };
        }
    });

    res.json({
        success: true,
        hasFeedback: true,
        feedback: compiledFeedback
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Language-Specific Feedback
// GET /api/feedback/:userId/:language
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns detailed AI feedback for a specific language
 * This is the main feedback display endpoint
 */
router.get('/:userId/:language', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const language = req.params.language.toLowerCase();

    // Validate language
    if (!['python', 'java', 'cpp', 'javascript'].includes(language)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid language. Use: python, java, cpp, or javascript'
        });
    }

    // Try database first
    if (dbService.isDbAvailable()) {
        try {
            const dbFeedback = await dbService.getUserFeedback(userId, language);
            if (dbFeedback) {
                return res.json({
                    success: true,
                    hasFeedback: true,
                    language: language,
                    feedback: {
                        generatedAt: dbFeedback.generated_at,
                        overallAssessment: dbFeedback.overall_assessment,
                        weakAreas: dbFeedback.weak_areas,
                        strongAreas: dbFeedback.strong_areas,
                        nextSteps: dbFeedback.next_steps,
                        encouragement: aiService.getEncouragementForFeedback(dbFeedback.weak_areas.length)
                    }
                });
            }
        } catch (error) {
            console.error('Database feedback error:', error);
        }
    }

    // Fallback to mock data
    if (!userFeedback[userId] || !userFeedback[userId][language]) {
        return res.json({
            success: true,
            hasFeedback: false,
            message: `No feedback for ${language} yet. Keep practicing!`
        });
    }

    const feedback = userFeedback[userId][language];

    res.json({
        success: true,
        hasFeedback: true,
        language: language,
        feedback: {
            generatedAt: feedback.generatedAt,
            overallAssessment: feedback.overallAssessment,
            weakAreas: feedback.weakAreas,
            strongAreas: feedback.strongAreas,
            nextSteps: feedback.nextSteps,
            encouragement: aiService.getEncouragementForFeedback(feedback.weakAreas.length)
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Generate New Feedback
// POST /api/feedback/generate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates new AI feedback based on current progress data
 * This is called after a learning session or manually by student
 *
 * Request Body:
 * {
 *   "userId": 1,
 *   "language": "python",
 *   "topicPerformance": {
 *     "Variables": { "answered": 5, "correct": 4 },
 *     "Loops": { "answered": 6, "correct": 2 }
 *   }
 * }
 *
 * THIS IS THE CORE AI FEEDBACK GENERATION
 */
router.post('/generate', async (req, res) => {
    const { userId, language } = req.body;
    let { topicPerformance } = req.body;

    // VALIDATION
    if (!userId || !language) {
        return res.status(400).json({
            success: false,
            message: 'Required: userId, language'
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COMPUTE TOPIC PERFORMANCE FROM ANSWER HISTORY IF NOT PROVIDED
    // ─────────────────────────────────────────────────────────────────────────

    if (!topicPerformance || Object.keys(topicPerformance).length === 0) {
        const history = userAnswerHistory[userId] || [];
        const langHistory = history.filter(a => a.language === language.toLowerCase());

        if (langHistory.length === 0) {
            return res.json({
                success: true,
                message: 'No answer history yet. Play some questions first!',
                feedback: null
            });
        }

        topicPerformance = {};
        langHistory.forEach(answer => {
            if (!topicPerformance[answer.topic]) {
                topicPerformance[answer.topic] = { answered: 0, correct: 0 };
            }
            topicPerformance[answer.topic].answered++;
            if (answer.isCorrect) {
                topicPerformance[answer.topic].correct++;
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AI FEEDBACK GENERATION LOGIC
    // ─────────────────────────────────────────────────────────────────────────

    const weakAreas = [];
    const strongAreas = [];

    // Analyze each topic
    Object.entries(topicPerformance).forEach(([topic, data]) => {
        if (data.answered > 0) {
            const accuracy = Math.round((data.correct / data.answered) * 100);

            if (accuracy < 60) {
                // WEAK AREA - Generate AI advice
                weakAreas.push({
                    topic: topic,
                    accuracy: accuracy,
                    message: aiService.generateWeakAreaMessage(topic, language, accuracy),
                    recommendation: aiService.generateStudyRecommendation(topic, language)
                });
            } else if (accuracy >= 80) {
                // STRONG AREA
                strongAreas.push({
                    topic: topic,
                    accuracy: accuracy,
                    message: `Great job with ${topic}! You're showing strong understanding.`
                });
            }
        }
    });

    // Generate overall assessment
    const overallAssessment = aiService.generateOverallAssessment(
        language,
        weakAreas.length,
        strongAreas.length
    );

    // Generate next steps
    const nextSteps = aiService.generateNextSteps(weakAreas, language);

    // Store feedback
    if (!userFeedback[userId]) {
        userFeedback[userId] = {};
    }

    const feedbackData = {
        generatedAt: new Date().toISOString().split('T')[0],
        overallAssessment: overallAssessment,
        weakAreas: weakAreas,
        strongAreas: strongAreas,
        nextSteps: nextSteps
    };

    userFeedback[userId][language] = feedbackData;

    // Save to database if available
    if (dbService.isDbAvailable()) {
        await dbService.saveFeedback(userId, language, feedbackData);
    }

    // RESPONSE
    res.json({
        success: true,
        message: 'Feedback generated successfully',
        feedback: feedbackData
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Quick Feedback Summary
// GET /api/feedback/quick/:userId/:language
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a quick one-line feedback for display on dashboard
 */
router.get('/quick/:userId/:language', (req, res) => {
    const userId = parseInt(req.params.userId);
    const language = req.params.language.toLowerCase();

    if (!userFeedback[userId] || !userFeedback[userId][language]) {
        return res.json({
            success: true,
            quickFeedback: 'Keep practicing to get personalized feedback!'
        });
    }

    const feedback = userFeedback[userId][language];
    let quickMessage = '';

    if (feedback.weakAreas.length > 0) {
        const topWeak = feedback.weakAreas[0];
        quickMessage = `Focus on ${topWeak.topic} - you scored ${topWeak.accuracy}% in this area.`;
    } else if (feedback.strongAreas.length > 0) {
        quickMessage = `Great progress! You're doing well in ${feedback.strongAreas[0].topic}.`;
    } else {
        quickMessage = 'Keep practicing to improve your skills!';
    }

    res.json({
        success: true,
        quickFeedback: quickMessage
    });
});

// Export router
module.exports = router;
module.exports.userFeedback = userFeedback;
