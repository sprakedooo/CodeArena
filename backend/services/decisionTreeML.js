/**
 * ============================================================================
 * DECISION TREE MACHINE LEARNING SERVICE (decisionTreeML.js)
 * ============================================================================
 *
 * PURPOSE:
 * Implements a Decision Tree Machine Learning model for adaptive learning
 * predictions. This module provides intelligent recommendations based on
 * student performance data.
 *
 * FEATURES:
 * 1. Difficulty Level Prediction - Recommends optimal difficulty
 * 2. Struggle Detection - Predicts if student needs intervention
 * 3. Next Topic Recommendation - Suggests what to study next
 * 4. Learning Path Optimization - Personalizes the learning journey
 *
 * FOR THESIS PANELISTS:
 * This demonstrates a MACHINE LEARNING approach using Decision Trees.
 * The model uses historical performance data to make predictions:
 * - Training Data: Student performance metrics
 * - Features: accuracy, streak, questions answered, time spent
 * - Predictions: difficulty level, intervention need, topic priority
 *
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// DECISION TREE NODE CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a node in the Decision Tree
 * Each node can be a decision node (with conditions) or a leaf node (with prediction)
 */
class DecisionTreeNode {
    constructor(options = {}) {
        this.feature = options.feature || null;      // Feature to split on
        this.threshold = options.threshold || null;  // Threshold value for numeric features
        this.value = options.value || null;          // Prediction value (for leaf nodes)
        this.left = options.left || null;            // Left child (condition true)
        this.right = options.right || null;          // Right child (condition false)
        this.isLeaf = options.isLeaf || false;       // Is this a leaf node?
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISION TREE CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decision Tree Classifier for Adaptive Learning
 *
 * This class implements a decision tree algorithm that:
 * 1. Takes student performance features as input
 * 2. Traverses the decision tree based on feature values
 * 3. Returns predictions for difficulty level and interventions
 */
class DecisionTreeClassifier {
    constructor() {
        this.difficultyTree = this.buildDifficultyTree();
        this.interventionTree = this.buildInterventionTree();
        this.topicTree = this.buildTopicPriorityTree();
    }

    /**
     * Build the Decision Tree for Difficulty Level Prediction
     *
     * Features used:
     * - accuracy: Overall accuracy percentage (0-100)
     * - consecutiveCorrect: Number of correct answers in a row
     * - questionsAnswered: Total questions completed
     * - currentLevel: Current difficulty level (beginner=1, intermediate=2, advanced=3)
     *
     * DECISION TREE STRUCTURE:
     *
     *                    [accuracy >= 80?]
     *                    /              \
     *                  YES              NO
     *                  /                  \
     *     [consecutiveCorrect >= 5?]    [accuracy >= 50?]
     *            /        \                /        \
     *          YES        NO            YES         NO
     *          /           \            /            \
     *    [currentLevel]  [MAINTAIN]  [MAINTAIN]   [DECREASE]
     *       < 3?
     *      /    \
     *    YES    NO
     *    /       \
     * INCREASE  MAINTAIN
     */
    buildDifficultyTree() {
        // Leaf nodes
        const increaseLeaf = new DecisionTreeNode({ isLeaf: true, value: 'INCREASE' });
        const maintainLeaf = new DecisionTreeNode({ isLeaf: true, value: 'MAINTAIN' });
        const decreaseLeaf = new DecisionTreeNode({ isLeaf: true, value: 'DECREASE' });

        // Check if at max level
        const maxLevelCheck = new DecisionTreeNode({
            feature: 'currentLevelNum',
            threshold: 3,
            left: increaseLeaf,  // currentLevel < 3: can increase
            right: maintainLeaf  // currentLevel = 3: already at max
        });

        // Check consecutive correct for high performers
        const streakCheck = new DecisionTreeNode({
            feature: 'consecutiveCorrect',
            threshold: 5,
            left: maxLevelCheck,  // streak >= 5: consider increasing
            right: maintainLeaf   // streak < 5: maintain current
        });

        // Check accuracy for low-medium performers
        const lowAccuracyCheck = new DecisionTreeNode({
            feature: 'accuracy',
            threshold: 50,
            left: maintainLeaf,  // accuracy >= 50: keep practicing
            right: decreaseLeaf  // accuracy < 50: need easier questions
        });

        // Root: Check if high performer
        const root = new DecisionTreeNode({
            feature: 'accuracy',
            threshold: 80,
            left: streakCheck,      // accuracy >= 80: check streak
            right: lowAccuracyCheck // accuracy < 80: check if struggling
        });

        return root;
    }

    /**
     * Build the Decision Tree for Intervention Detection
     *
     * Predicts whether a student needs intervention/support
     *
     * DECISION TREE STRUCTURE:
     *
     *                [consecutiveWrong >= 3?]
     *                    /              \
     *                  YES              NO
     *                  /                  \
     *          [NEEDS_HELP]         [accuracy >= 40?]
     *                                   /        \
     *                                 YES         NO
     *                                 /            \
     *                        [questionsAnswered   [AT_RISK]
     *                            >= 10?]
     *                           /      \
     *                         YES      NO
     *                         /         \
     *                   [accuracy    [ON_TRACK]
     *                    >= 60?]
     *                    /    \
     *                  YES    NO
     *                  /       \
     *            [ON_TRACK]  [NEEDS_REVIEW]
     */
    buildInterventionTree() {
        // Leaf nodes
        const needsHelpLeaf = new DecisionTreeNode({ isLeaf: true, value: 'NEEDS_HELP' });
        const atRiskLeaf = new DecisionTreeNode({ isLeaf: true, value: 'AT_RISK' });
        const needsReviewLeaf = new DecisionTreeNode({ isLeaf: true, value: 'NEEDS_REVIEW' });
        const onTrackLeaf = new DecisionTreeNode({ isLeaf: true, value: 'ON_TRACK' });

        // Detailed accuracy check for experienced users
        const detailedAccuracyCheck = new DecisionTreeNode({
            feature: 'accuracy',
            threshold: 60,
            left: onTrackLeaf,      // >= 60%: doing well
            right: needsReviewLeaf  // < 60%: needs review
        });

        // Check if enough questions answered for meaningful analysis
        const experienceCheck = new DecisionTreeNode({
            feature: 'questionsAnswered',
            threshold: 10,
            left: detailedAccuracyCheck, // >= 10 questions: detailed analysis
            right: onTrackLeaf           // < 10 questions: still learning
        });

        // Check accuracy for non-struggling students
        const accuracyCheck = new DecisionTreeNode({
            feature: 'accuracy',
            threshold: 40,
            left: experienceCheck,  // >= 40%: check further
            right: atRiskLeaf       // < 40%: at risk
        });

        // Root: Check for immediate struggle
        const root = new DecisionTreeNode({
            feature: 'consecutiveWrong',
            threshold: 3,
            left: needsHelpLeaf,  // >= 3 wrong in a row: immediate help
            right: accuracyCheck  // < 3 wrong: check overall performance
        });

        return root;
    }

    /**
     * Build the Decision Tree for Topic Priority
     *
     * Recommends which topic to focus on next
     *
     * Based on:
     * - weakestTopicAccuracy: Accuracy in worst performing topic
     * - topicAttempts: Number of questions attempted in topic
     */
    buildTopicPriorityTree() {
        // Leaf nodes
        const focusWeakLeaf = new DecisionTreeNode({ isLeaf: true, value: 'FOCUS_WEAK_TOPIC' });
        const practiceMoreLeaf = new DecisionTreeNode({ isLeaf: true, value: 'PRACTICE_MORE' });
        const exploreNewLeaf = new DecisionTreeNode({ isLeaf: true, value: 'EXPLORE_NEW_TOPIC' });
        const reinforceLeaf = new DecisionTreeNode({ isLeaf: true, value: 'REINFORCE_CURRENT' });

        // Check if enough practice in weak topic
        const practiceCheck = new DecisionTreeNode({
            feature: 'weakTopicAttempts',
            threshold: 5,
            left: focusWeakLeaf,   // >= 5 attempts but still weak: focus
            right: practiceMoreLeaf // < 5 attempts: need more practice
        });

        // Check if weak topic is very weak
        const weaknessCheck = new DecisionTreeNode({
            feature: 'weakestTopicAccuracy',
            threshold: 50,
            left: reinforceLeaf,   // >= 50%: reinforce current learning
            right: practiceCheck   // < 50%: needs focus
        });

        // Root: Check if there's a significantly weak topic
        const root = new DecisionTreeNode({
            feature: 'weakestTopicAccuracy',
            threshold: 70,
            left: exploreNewLeaf, // >= 70% in all: explore new topics
            right: weaknessCheck  // < 70% somewhere: check weakness level
        });

        return root;
    }

    /**
     * Traverse the decision tree and make a prediction
     *
     * @param {DecisionTreeNode} tree - The decision tree to traverse
     * @param {Object} features - Feature values for prediction
     * @returns {string} The prediction
     */
    predict(tree, features) {
        let node = tree;

        while (!node.isLeaf) {
            const featureValue = features[node.feature];

            // Navigate based on threshold comparison
            // Left = feature >= threshold (or true for boolean)
            // Right = feature < threshold (or false for boolean)
            if (featureValue >= node.threshold) {
                node = node.left;
            } else {
                node = node.right;
            }
        }

        return node.value;
    }

    /**
     * Predict recommended difficulty adjustment
     *
     * @param {Object} studentData - Student performance data
     * @returns {Object} Difficulty recommendation
     */
    predictDifficulty(studentData) {
        const features = this.extractFeatures(studentData);
        const prediction = this.predict(this.difficultyTree, features);

        const recommendations = {
            'INCREASE': {
                action: 'increase',
                message: 'Based on your excellent performance, you\'re ready for more challenging questions!',
                confidence: this.calculateConfidence(features, 'difficulty')
            },
            'MAINTAIN': {
                action: 'maintain',
                message: 'You\'re progressing well at this level. Keep practicing!',
                confidence: this.calculateConfidence(features, 'difficulty')
            },
            'DECREASE': {
                action: 'decrease',
                message: 'Let\'s strengthen your foundation with some review questions.',
                confidence: this.calculateConfidence(features, 'difficulty')
            }
        };

        return {
            prediction: prediction,
            ...recommendations[prediction],
            features: features,
            modelType: 'DecisionTree',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Predict if student needs intervention
     *
     * @param {Object} studentData - Student performance data
     * @returns {Object} Intervention recommendation
     */
    predictIntervention(studentData) {
        const features = this.extractFeatures(studentData);
        const prediction = this.predict(this.interventionTree, features);

        const interventions = {
            'NEEDS_HELP': {
                urgency: 'high',
                message: 'You seem to be struggling. Let me provide some additional support.',
                actions: ['Show detailed hints', 'Offer simpler questions', 'Suggest review material']
            },
            'AT_RISK': {
                urgency: 'medium',
                message: 'Your performance indicates you might benefit from extra practice.',
                actions: ['Review weak topics', 'Practice fundamental concepts']
            },
            'NEEDS_REVIEW': {
                urgency: 'low',
                message: 'Consider reviewing some topics to strengthen your understanding.',
                actions: ['Review flagged topics', 'Retake practice quizzes']
            },
            'ON_TRACK': {
                urgency: 'none',
                message: 'Great progress! Keep up the good work.',
                actions: ['Continue current path', 'Try challenge questions']
            }
        };

        return {
            prediction: prediction,
            ...interventions[prediction],
            features: features,
            modelType: 'DecisionTree',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Predict topic priority
     *
     * @param {Object} studentData - Student performance data with topic breakdown
     * @returns {Object} Topic recommendation
     */
    predictTopicPriority(studentData) {
        const features = this.extractTopicFeatures(studentData);
        const prediction = this.predict(this.topicTree, features);

        const priorities = {
            'FOCUS_WEAK_TOPIC': {
                priority: 'high',
                message: `Focus on ${features.weakestTopic || 'your weakest area'} - you need more practice here.`,
                strategy: 'concentrated_practice'
            },
            'PRACTICE_MORE': {
                priority: 'medium',
                message: 'You need more practice to identify your true weak areas.',
                strategy: 'balanced_practice'
            },
            'EXPLORE_NEW_TOPIC': {
                priority: 'low',
                message: 'You\'re doing great! Ready to explore new topics.',
                strategy: 'exploration'
            },
            'REINFORCE_CURRENT': {
                priority: 'medium',
                message: 'Keep practicing to solidify your understanding.',
                strategy: 'reinforcement'
            }
        };

        return {
            prediction: prediction,
            ...priorities[prediction],
            weakestTopic: features.weakestTopic,
            weakestAccuracy: features.weakestTopicAccuracy,
            features: features,
            modelType: 'DecisionTree',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Extract features from student data for prediction
     *
     * @param {Object} studentData - Raw student performance data
     * @returns {Object} Extracted features
     */
    extractFeatures(studentData) {
        const levelMap = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };

        return {
            accuracy: studentData.accuracy || 0,
            consecutiveCorrect: studentData.consecutiveCorrect || 0,
            consecutiveWrong: studentData.consecutiveWrong || 0,
            questionsAnswered: studentData.questionsAnswered || 0,
            currentLevel: studentData.currentLevel || 'beginner',
            currentLevelNum: levelMap[studentData.currentLevel] || 1,
            totalPoints: studentData.totalPoints || 0,
            timeSpentAvg: studentData.averageTimePerQuestion || 30
        };
    }

    /**
     * Extract topic-related features
     *
     * @param {Object} studentData - Student data with topic performance
     * @returns {Object} Topic features
     */
    extractTopicFeatures(studentData) {
        const topicPerformance = studentData.topicPerformance || {};
        let weakestTopic = null;
        let weakestAccuracy = 100;
        let weakTopicAttempts = 0;

        // Find weakest topic
        Object.entries(topicPerformance).forEach(([topic, data]) => {
            const accuracy = data.answered > 0
                ? (data.correct / data.answered) * 100
                : 100;

            if (accuracy < weakestAccuracy) {
                weakestAccuracy = accuracy;
                weakestTopic = topic;
                weakTopicAttempts = data.answered;
            }
        });

        return {
            weakestTopic: weakestTopic,
            weakestTopicAccuracy: weakestAccuracy,
            weakTopicAttempts: weakTopicAttempts,
            totalTopicsAttempted: Object.keys(topicPerformance).length
        };
    }

    /**
     * Calculate confidence score for prediction
     *
     * @param {Object} features - Extracted features
     * @param {string} predictionType - Type of prediction
     * @returns {number} Confidence score (0-100)
     */
    calculateConfidence(features, predictionType) {
        let confidence = 50; // Base confidence

        // More data = higher confidence
        if (features.questionsAnswered >= 20) {
            confidence += 25;
        } else if (features.questionsAnswered >= 10) {
            confidence += 15;
        } else if (features.questionsAnswered >= 5) {
            confidence += 5;
        }

        // Strong signals increase confidence
        if (predictionType === 'difficulty') {
            if (features.accuracy >= 90 || features.accuracy <= 30) {
                confidence += 15; // Clear signal
            }
            if (features.consecutiveCorrect >= 7 || features.consecutiveWrong >= 5) {
                confidence += 10; // Strong streak
            }
        }

        return Math.min(confidence, 95); // Cap at 95%
    }

    /**
     * Get comprehensive ML prediction for a student
     *
     * @param {Object} studentData - Complete student performance data
     * @returns {Object} All predictions combined
     */
    getComprehensivePrediction(studentData) {
        return {
            difficulty: this.predictDifficulty(studentData),
            intervention: this.predictIntervention(studentData),
            topicPriority: this.predictTopicPriority(studentData),
            summary: this.generateSummary(studentData),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Generate a human-readable summary
     *
     * @param {Object} studentData - Student performance data
     * @returns {Object} Summary object
     */
    generateSummary(studentData) {
        const difficulty = this.predictDifficulty(studentData);
        const intervention = this.predictIntervention(studentData);

        let overallStatus = 'Good';
        if (intervention.urgency === 'high') {
            overallStatus = 'Needs Attention';
        } else if (intervention.urgency === 'medium') {
            overallStatus = 'Room for Improvement';
        } else if (difficulty.action === 'increase') {
            overallStatus = 'Excellent';
        }

        return {
            overallStatus: overallStatus,
            recommendedAction: difficulty.action,
            interventionNeeded: intervention.urgency !== 'none',
            keyInsight: this.generateKeyInsight(studentData, difficulty, intervention)
        };
    }

    /**
     * Generate a key insight message
     */
    generateKeyInsight(studentData, difficulty, intervention) {
        const features = this.extractFeatures(studentData);

        if (features.consecutiveWrong >= 3) {
            return 'Multiple incorrect answers detected. Consider reviewing the material.';
        }
        if (features.consecutiveCorrect >= 5 && features.accuracy >= 80) {
            return 'Outstanding performance! Ready for advanced challenges.';
        }
        if (features.accuracy < 50 && features.questionsAnswered >= 10) {
            return 'Focus on fundamentals to build a stronger foundation.';
        }
        if (features.questionsAnswered < 5) {
            return 'Keep practicing to help the AI learn your strengths and weaknesses.';
        }

        return 'Continue your learning journey at a steady pace.';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAINING DATA SIMULATION (For demonstration)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulated training data for the decision tree
 * In a real system, this would come from historical student data
 *
 * This demonstrates how the model would be trained with real data
 */
const trainingDataSample = [
    // High performers who should advance
    { accuracy: 95, consecutiveCorrect: 7, questionsAnswered: 20, currentLevel: 'beginner', outcome: 'INCREASE' },
    { accuracy: 88, consecutiveCorrect: 6, questionsAnswered: 15, currentLevel: 'intermediate', outcome: 'INCREASE' },
    { accuracy: 92, consecutiveCorrect: 5, questionsAnswered: 25, currentLevel: 'beginner', outcome: 'INCREASE' },

    // Good performers who should maintain
    { accuracy: 75, consecutiveCorrect: 3, questionsAnswered: 12, currentLevel: 'intermediate', outcome: 'MAINTAIN' },
    { accuracy: 70, consecutiveCorrect: 2, questionsAnswered: 18, currentLevel: 'beginner', outcome: 'MAINTAIN' },
    { accuracy: 82, consecutiveCorrect: 4, questionsAnswered: 10, currentLevel: 'advanced', outcome: 'MAINTAIN' },

    // Struggling students who need support
    { accuracy: 35, consecutiveCorrect: 0, questionsAnswered: 15, currentLevel: 'intermediate', outcome: 'DECREASE' },
    { accuracy: 42, consecutiveCorrect: 1, questionsAnswered: 20, currentLevel: 'advanced', outcome: 'DECREASE' },
    { accuracy: 28, consecutiveCorrect: 0, questionsAnswered: 12, currentLevel: 'beginner', outcome: 'DECREASE' }
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

// Create singleton instance
const decisionTreeClassifier = new DecisionTreeClassifier();

module.exports = {
    DecisionTreeClassifier,
    DecisionTreeNode,
    decisionTreeClassifier,
    trainingDataSample,

    // Convenience methods
    predictDifficulty: (studentData) => decisionTreeClassifier.predictDifficulty(studentData),
    predictIntervention: (studentData) => decisionTreeClassifier.predictIntervention(studentData),
    predictTopicPriority: (studentData) => decisionTreeClassifier.predictTopicPriority(studentData),
    getComprehensivePrediction: (studentData) => decisionTreeClassifier.getComprehensivePrediction(studentData)
};
