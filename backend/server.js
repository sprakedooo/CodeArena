/**
 * ============================================================================
 * CODEARENA - AI-POWERED GAME-BASED ADAPTIVE LEARNING SYSTEM
 * Main Server Entry Point (server.js)
 * ============================================================================
 *
 * PURPOSE:
 * This file initializes the Express.js web server for CodeArena, a game-based
 * adaptive learning system. It connects all route modules and middleware.
 *
 * SYSTEM FEATURES:
 * - Programming language selection (Python, Java, C++)
 * - Adaptive question difficulty (Beginner → Intermediate → Advanced)
 * - Game mechanics (points, badges, level progression)
 * - AI-powered hints and feedback
 * - Machine Learning (Decision Tree) for intelligent predictions
 *
 * FOR THESIS PANELISTS:
 * This server demonstrates a working backend that supports adaptive learning
 * through dynamic question selection, AI-generated assistance, and ML predictions.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: IMPORT REQUIRED MODULES
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');       // Web framework for Node.js
const cors = require('cors');             // Cross-origin resource sharing

// Import database service
const dbService = require('./services/dbService');

// Import authentication middleware
const { authMiddleware } = require('./middleware/authMiddleware');

// Import route handlers for each feature
const authRoutes = require('./routes/authRoutes');           // Login/Register
const languageRoutes = require('./routes/languageRoutes');   // Language selection
const questionRoutes = require('./routes/questionRoutes');   // Question fetching
const answerRoutes = require('./routes/answerRoutes');       // Answer checking + hints
const rewardRoutes = require('./routes/rewardRoutes');       // Points and badges
const progressRoutes = require('./routes/progressRoutes');   // Progress tracking
const feedbackRoutes = require('./routes/feedbackRoutes');   // AI feedback
const mlRoutes = require('./routes/mlRoutes');               // ML predictions
const lessonRoutes = require('./routes/lessonRoutes');       // Programming lessons
const executeRoutes = require('./routes/executeRoutes');     // Code execution

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: INITIALIZE EXPRESS APPLICATION
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: CONFIGURE MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

// Enable CORS for frontend communication
app.use(cors());

// Parse JSON request bodies (built-in Express middleware)
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: REGISTER API ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Route Registration:
 * Each route module handles a specific feature of the game-based system.
 */

// PUBLIC routes (no auth required)
// Authentication: /api/auth/login, /api/auth/register
app.use('/api/auth', authRoutes);

// PROTECTED routes (JWT auth required)
// Language Selection: /api/languages
app.use('/api/languages', authMiddleware, languageRoutes);

// Questions: /api/questions (filtered by language and level)
app.use('/api/questions', authMiddleware, questionRoutes);

// Answer Checking: /api/answers/check (includes hint generation)
app.use('/api/answers', authMiddleware, answerRoutes);

// Rewards: /api/rewards (points, badges, achievements)
app.use('/api/rewards', authMiddleware, rewardRoutes);

// Progress: /api/progress (level tracking, advancement)
app.use('/api/progress', authMiddleware, progressRoutes);

// AI Feedback: /api/feedback (weak area analysis)
app.use('/api/feedback', authMiddleware, feedbackRoutes);

// ML Predictions: /api/ml (Decision Tree recommendations)
app.use('/api/ml', authMiddleware, mlRoutes);

// Lessons: /api/lessons (Programming fundamentals)
app.use('/api/lessons', authMiddleware, lessonRoutes);

// Code Execution: /api/execute
app.use('/api/execute', authMiddleware, executeRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: ROOT ENDPOINT - SERVER STATUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Root endpoint to verify server is running
 * Also displays available API endpoints for reference
 */
app.get('/', (req, res) => {
    res.json({
        system: 'CodeArena - AI-Powered Game-Based Adaptive Learning System',
        status: 'active',
        version: '2.0.0',
        features: [
            'Programming Language Selection (Python, Java, C++)',
            'Adaptive Difficulty (Beginner → Intermediate → Advanced)',
            'Game Mechanics (Points, Badges, Levels)',
            'AI-Powered Hints for Wrong Answers',
            'Weak Area Tracking and Feedback',
            'Decision Tree ML Model for Intelligent Predictions'
        ],
        endpoints: {
            auth: '/api/auth',
            languages: '/api/languages',
            questions: '/api/questions',
            answers: '/api/answers',
            rewards: '/api/rewards',
            progress: '/api/progress',
            feedback: '/api/feedback',
            ml: '/api/ml',
            lessons: '/api/lessons',
            execute: '/api/execute'
        },
        mlEndpoints: {
            predict: '/api/ml/predict/:userId/:language',
            difficulty: '/api/ml/difficulty/:userId/:language',
            intervention: '/api/ml/intervention/:userId/:language',
            topicPriority: '/api/ml/topic-priority/:userId/:language',
            modelInfo: '/api/ml/model-info',
            analyze: '/api/ml/analyze (POST)'
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: START THE SERVER
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   CODEARENA - AI-POWERED ADAPTIVE LEARNING SYSTEM         ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║   Server running at: http://localhost:${PORT}                 ║`);
    console.log('║   Press Ctrl+C to stop                                     ║');
    console.log('╠════════════════════════════════════════════════════════════╣');

    // Initialize database connection
    const dbConnected = await dbService.init();
    if (dbConnected) {
        console.log('║   Database: MySQL Connected                                ║');
    } else {
        console.log('║   Database: Using Mock Data (MySQL not available)         ║');
    }

    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║   Features: Language Selection | Adaptive Questions        ║');
    console.log('║             Points & Badges | AI Hints | ML Predictions    ║');
    console.log('║             Decision Tree Model | Progress Tracking        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
});
