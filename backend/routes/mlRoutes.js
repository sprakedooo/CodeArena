/**
 * ============================================================================
 * MACHINE LEARNING ROUTES (mlRoutes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Provides API endpoints for the Decision Tree ML model predictions.
 * These endpoints enable the frontend to request intelligent recommendations
 * based on student performance data.
 *
 * ENDPOINTS:
 * GET  /api/ml/predict/:userId/:language     - Get all ML predictions
 * GET  /api/ml/difficulty/:userId/:language  - Get difficulty recommendation
 * GET  /api/ml/intervention/:userId/:language - Check if intervention needed
 * GET  /api/ml/topic-priority/:userId/:language - Get topic priority
 * POST /api/ml/analyze                        - Analyze custom data
 *
 * FOR THESIS PANELISTS:
 * This module demonstrates the integration of Machine Learning (Decision Tree)
 * into the adaptive learning system. The ML model provides:
 * - Personalized difficulty recommendations
 * - Early intervention detection
 * - Topic priority suggestions
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Import the Decision Tree ML service
const {
    predictDifficulty,
    predictIntervention,
    predictTopicPriority,
    getComprehensivePrediction,
    trainingDataSample
} = require('../services/decisionTreeML');

// Mock progress data store (in production, this would come from database)
let progressStore = {};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Get or Create Progress Data
// ─────────────────────────────────────────────────────────────────────────────

function getProgressData(userId, language) {
    const key = `${userId}_${language}`;

    if (!progressStore[key]) {
        // Default progress for new users
        progressStore[key] = {
            userId: userId,
            language: language,
            accuracy: 0,
            consecutiveCorrect: 0,
            consecutiveWrong: 0,
            questionsAnswered: 0,
            correctAnswers: 0,
            currentLevel: 'beginner',
            totalPoints: 0,
            topicPerformance: {},
            lastUpdated: new Date().toISOString()
        };
    }

    return progressStore[key];
}

// Allow external modules to update progress
function updateProgressData(userId, language, data) {
    const key = `${userId}_${language}`;
    progressStore[key] = {
        ...progressStore[key],
        ...data,
        lastUpdated: new Date().toISOString()
    };
    return progressStore[key];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Comprehensive ML Prediction
// GET /api/ml/predict/:userId/:language
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all ML predictions for a student
 * This is the main endpoint for AI-powered recommendations
 */
router.get('/predict/:userId/:language', (req, res) => {
    const { userId, language } = req.params;

    // Get student progress data
    const progressData = getProgressData(userId, language);

    // Get comprehensive ML prediction
    const prediction = getComprehensivePrediction(progressData);

    res.json({
        success: true,
        message: 'ML predictions generated successfully',
        userId: userId,
        language: language,
        predictions: prediction,
        metadata: {
            modelType: 'DecisionTree',
            version: '1.0',
            dataPoints: progressData.questionsAnswered
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Difficulty Recommendation
// GET /api/ml/difficulty/:userId/:language
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns ML-based difficulty recommendation
 * Used to determine if student should advance or review
 */
router.get('/difficulty/:userId/:language', (req, res) => {
    const { userId, language } = req.params;

    const progressData = getProgressData(userId, language);
    const prediction = predictDifficulty(progressData);

    res.json({
        success: true,
        message: 'Difficulty prediction generated',
        userId: userId,
        language: language,
        currentLevel: progressData.currentLevel,
        recommendation: prediction
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Check Intervention Need
// GET /api/ml/intervention/:userId/:language
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if student needs intervention/support
 * Used to trigger help features or alerts
 */
router.get('/intervention/:userId/:language', (req, res) => {
    const { userId, language } = req.params;

    const progressData = getProgressData(userId, language);
    const prediction = predictIntervention(progressData);

    res.json({
        success: true,
        message: 'Intervention check completed',
        userId: userId,
        language: language,
        needsIntervention: prediction.urgency !== 'none',
        intervention: prediction
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Topic Priority
// GET /api/ml/topic-priority/:userId/:language
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns recommended topic to focus on
 * Based on topic-level performance analysis
 */
router.get('/topic-priority/:userId/:language', (req, res) => {
    const { userId, language } = req.params;

    const progressData = getProgressData(userId, language);
    const prediction = predictTopicPriority(progressData);

    res.json({
        success: true,
        message: 'Topic priority generated',
        userId: userId,
        language: language,
        topicRecommendation: prediction
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Analyze Custom Data
// POST /api/ml/analyze
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes custom performance data
 * Useful for testing and demonstration
 *
 * Request Body:
 * {
 *   "accuracy": 75,
 *   "consecutiveCorrect": 3,
 *   "consecutiveWrong": 0,
 *   "questionsAnswered": 15,
 *   "currentLevel": "beginner",
 *   "topicPerformance": { "Variables": { "correct": 4, "answered": 5 } }
 * }
 */
router.post('/analyze', (req, res) => {
    const studentData = req.body;

    // Validate required fields
    if (!studentData || Object.keys(studentData).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Please provide student performance data'
        });
    }

    // Get all predictions
    const predictions = getComprehensivePrediction(studentData);

    res.json({
        success: true,
        message: 'Custom data analyzed successfully',
        inputData: studentData,
        predictions: predictions,
        explanation: {
            difficulty: `Based on accuracy of ${studentData.accuracy || 0}% and ${studentData.consecutiveCorrect || 0} consecutive correct answers`,
            intervention: `Urgency level determined by overall performance patterns`,
            topicPriority: `Recommendation based on topic-level accuracy analysis`
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Model Information
// GET /api/ml/model-info
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns information about the ML model
 * Useful for thesis demonstration
 */
router.get('/model-info', (req, res) => {
    res.json({
        success: true,
        model: {
            name: 'Decision Tree Classifier',
            type: 'Machine Learning - Supervised Classification',
            version: '1.0',
            description: 'A Decision Tree model that predicts optimal learning paths based on student performance',
            features: [
                'accuracy - Overall correctness percentage (0-100)',
                'consecutiveCorrect - Current correct answer streak',
                'consecutiveWrong - Current wrong answer streak',
                'questionsAnswered - Total questions completed',
                'currentLevel - Current difficulty level (beginner/intermediate/advanced)',
                'topicPerformance - Per-topic accuracy breakdown'
            ],
            predictions: [
                'Difficulty Level Recommendation (INCREASE/MAINTAIN/DECREASE)',
                'Intervention Detection (NEEDS_HELP/AT_RISK/NEEDS_REVIEW/ON_TRACK)',
                'Topic Priority (FOCUS_WEAK_TOPIC/PRACTICE_MORE/EXPLORE_NEW/REINFORCE)'
            ],
            decisionRules: {
                difficultyIncrease: 'accuracy >= 80% AND consecutiveCorrect >= 5 AND currentLevel < advanced',
                difficultyDecrease: 'accuracy < 50%',
                interventionHigh: 'consecutiveWrong >= 3',
                interventionMedium: 'accuracy < 40%'
            }
        },
        trainingDataSample: trainingDataSample.slice(0, 3) // Show sample
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Update Progress (Internal use)
// POST /api/ml/update-progress
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates the progress store with new data
 * Called after each answer submission
 */
router.post('/update-progress', (req, res) => {
    const { userId, language, progressData } = req.body;

    if (!userId || !language) {
        return res.status(400).json({
            success: false,
            message: 'userId and language are required'
        });
    }

    const updated = updateProgressData(userId, language, progressData);

    res.json({
        success: true,
        message: 'Progress updated',
        progress: updated
    });
});

// Export router and helper functions
module.exports = router;
module.exports.getProgressData = getProgressData;
module.exports.updateProgressData = updateProgressData;
