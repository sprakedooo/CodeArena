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
// Try root .env first, then backend/.env as fallback
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');       // Web framework for Node.js
const cors = require('cors');             // Cross-origin resource sharing
const session = require('express-session');
const passport = require('passport');

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
const facultyRoutes = require('./routes/facultyRoutes');     // Faculty dashboard
const classroomRoutes = require('./routes/classroomRoutes'); // Classroom Mode
const assignmentRoutes = require('./routes/assignmentRoutes'); // Coding Assignments
const profileRoutes = require('./routes/profileRoutes');         // User profiles
const dailyChallengeRoutes = require('./routes/dailyChallengeRoutes'); // Daily Challenge
const aiRoutes             = require('./routes/aiRoutes');             // Phase 1 AI endpoints
const learningPathRoutes   = require('./routes/learningPathRoutes');   // Phase 1 Learning Paths
const contributionRoutes   = require('./routes/contributionRoutes');   // Faculty contributions (blogs & courses)

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

// Parse JSON request bodies — 10 MB limit to support base64 image uploads
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session (required by passport for the OAuth redirect flow)
app.use(session({
    secret: process.env.SESSION_SECRET || 'codearena-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 5 * 60 * 1000 } // 5 min — just long enough for OAuth redirect
}));

// Passport (Google OAuth)
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

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

// Faculty Dashboard: /api/faculty (auth + requireFaculty handled inside route)
app.use('/api/faculty', facultyRoutes);

// Classroom Mode: /api/classrooms (authMiddleware applied inside route)
app.use('/api/classrooms', classroomRoutes);

// Coding Assignments: /api/assignments (authMiddleware applied inside route)
app.use('/api/assignments', assignmentRoutes);

// User Profiles: /api/profile
app.use('/api/profile', profileRoutes);

// Daily Challenge: /api/daily-challenge (public GET, auth POST)
app.use('/api/daily-challenge', dailyChallengeRoutes);

// Phase 1 — AI Endpoints: /api/ai/...
app.use('/api/ai', aiRoutes);

// Phase 1 — Learning Paths: /api/paths/...
app.use('/api/paths', learningPathRoutes);

// Faculty Contributions (blogs & courses): /api/contributions/...
app.use('/api/contributions', contributionRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// INLINE HELPERS  (must be declared before use)
// ─────────────────────────────────────────────────────────────────────────────
const { authMiddleware: _auth } = require('./middleware/authMiddleware');
const { pool: _pool } = require('./config/database');

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ANALYTICS  GET /api/analytics/me
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/analytics/me', _auth, async (req, res) => {
    const userId = req.user.id;
    try {
        const [userRows] = await _pool.query(
            'SELECT user_id, full_name, total_xp, streak, selected_language FROM users WHERE user_id = ?', [userId]
        );
        const user = userRows[0] || {};

        // Paths progress
        const [pathRows] = await _pool.query(
            `SELECT lp.path_id, lp.title, lp.language,
                    COUNT(pl.lesson_id) AS lesson_count,
                    SUM(CASE WHEN lpr.status='completed' THEN 1 ELSE 0 END) AS completed_count
             FROM learning_paths lp
             LEFT JOIN path_lessons pl  ON pl.path_id  = lp.path_id AND pl.is_published = 1
             LEFT JOIN lesson_progress lpr ON lpr.lesson_id = pl.lesson_id AND lpr.user_id = ?
             GROUP BY lp.path_id`, [userId]
        );
        const paths = pathRows.map(p => ({
            ...p,
            progress_pct: p.lesson_count > 0 ? Math.round(p.completed_count / p.lesson_count * 100) : 0
        }));

        // Weaknesses
        const [weakRows] = await _pool.query(
            `SELECT topic, language, error_count, total_attempts, error_rate, resolved
             FROM weaknesses WHERE user_id = ? ORDER BY error_rate DESC`, [userId]
        );

        // Completed lesson count
        const [countRows] = await _pool.query(
            `SELECT COUNT(*) AS cnt FROM lesson_progress WHERE user_id = ? AND status = 'completed'`, [userId]
        );
        const completedLessons = countRows[0]?.cnt || 0;

        // Language breakdown (lessons completed per language)
        const langMap = {};
        paths.forEach(p => { langMap[p.language] = (langMap[p.language] || 0) + Number(p.completed_count || 0); });
        const langBreakdown = Object.entries(langMap).map(([language, count]) => ({ language, count }));

        // Recent activity (lessons completed per day last 7 days)
        const [actRows] = await _pool.query(
            `SELECT DATE(completed_at) AS date, COUNT(*) AS count
             FROM lesson_progress
             WHERE user_id = ? AND status = 'completed' AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(completed_at) ORDER BY date ASC`, [userId]
        );

        res.json({ success: true, user, paths, weaknesses: weakRows, completedLessons, langBreakdown, recentActivity: actRows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL LEADERBOARD  GET /api/leaderboard?language=python
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/leaderboard', _auth, async (req, res) => {
    const { language } = req.query;
    try {
        let rows;
        if (language && language !== 'all') {
            [rows] = await _pool.query(
                `SELECT u.user_id, u.full_name, u.total_xp, u.streak,
                        COUNT(DISTINCT r.reward_id) AS badge_count
                 FROM users u
                 LEFT JOIN rewards r ON r.user_id = u.user_id AND r.reward_type = 'badge'
                 WHERE u.selected_language = ? AND u.role = 'student'
                 GROUP BY u.user_id
                 ORDER BY u.total_xp DESC
                 LIMIT 50`,
                [language]
            );
        } else {
            [rows] = await _pool.query(
                `SELECT u.user_id, u.full_name, u.total_xp, u.streak,
                        COUNT(DISTINCT r.reward_id) AS badge_count
                 FROM users u
                 LEFT JOIN rewards r ON r.user_id = u.user_id AND r.reward_type = 'badge'
                 WHERE u.role = 'student'
                 GROUP BY u.user_id
                 ORDER BY u.total_xp DESC
                 LIMIT 50`,
                []
            );
        }
        res.json({ success: true, leaderboard: rows });
    } catch (err) {
        // Fallback: return requesting user only
        res.json({ success: true, leaderboard: [{ user_id: req.user.id, full_name: req.user.fullName || 'You', total_xp: 0, badge_count: 0 }] });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS  GET /api/notifications
// Returns last 20 rewards / achievements for the notification bell.
// Falls back to empty array if DB unavailable.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/notifications', _auth, async (req, res) => {
    const userId = req.user.id;
    try {
        // Try rewards table first
        const [rows] = await _pool.query(
            `SELECT reward_id, reward_type AS type, description AS message,
                    earned_at AS created_at
             FROM rewards
             WHERE user_id = ?
             ORDER BY earned_at DESC
             LIMIT 20`,
            [userId]
        );
        // Map reward_type → notification icon category
        const notifications = rows.map(r => ({
            ...r,
            type: r.type === 'badge' ? 'badge' : r.type === 'level_up' ? 'streak' : 'xp',
        }));
        res.json({ success: true, notifications });
    } catch (err) {
        // DB unavailable — return empty gracefully
        res.json({ success: true, notifications: [] });
    }
});

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

app.listen(PORT, '0.0.0.0', async () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   CODEARENA - AI-POWERED ADAPTIVE LEARNING SYSTEM         ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║   Local:   http://localhost:${PORT}                           ║`);
    console.log(`║   Network: http://192.168.1.8:${PORT}                         ║`);
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
