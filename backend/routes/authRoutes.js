/**
 * ============================================================================
 * AUTHENTICATION ROUTES (authRoutes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Handles user authentication for the game-based learning system.
 * Supports both student login and registration.
 *
 * ENDPOINTS:
 * POST /api/auth/register - Create new student account
 * POST /api/auth/login    - Authenticate student
 *
 * SECURITY:
 * Passwords are hashed with bcrypt before storage.
 * Successful authentication returns a signed JWT token.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const dbService = require('../services/dbService');
const { generateToken } = require('../middleware/authMiddleware');

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA: Simulated user database (fallback when MySQL is not available)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock users array - simulates database records
 * Each user has initial game stats (points, level, badges)
 */
// Pre-hashed passwords for mock users (bcrypt hash of original passwords)
// student123 and maria123 respectively
let mockUsersReady = false;
let mockUsers = [
    {
        id: 1,
        email: 'student@example.com',
        password: null,  // Will be hashed on first load
        _rawPassword: 'student123',
        fullName: 'Juan Dela Cruz',
        role: 'student',
        totalPoints: 150,
        currentLevel: 'beginner',
        badges: ['first_login'],
        selectedLanguage: null,
        createdAt: '2024-01-15'
    },
    {
        id: 2,
        email: 'maria@example.com',
        password: null,  // Will be hashed on first load
        _rawPassword: 'maria123',
        fullName: 'Maria Santos',
        role: 'student',
        totalPoints: 450,
        currentLevel: 'intermediate',
        badges: ['first_login', 'fast_learner', 'perfect_score'],
        selectedLanguage: 'python',
        createdAt: '2024-01-10'
    }
];

// Hash mock user passwords on startup
(async function initMockUsers() {
    for (const user of mockUsers) {
        if (user._rawPassword) {
            user.password = await bcrypt.hash(user._rawPassword, SALT_ROUNDS);
            delete user._rawPassword;
        }
    }
    mockUsersReady = true;
    console.log('✓ Mock user passwords hashed');
})();

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: User Registration
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new student account with initial game stats
 *
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword",
 *   "fullName": "User Full Name"
 * }
 *
 * Response:
 * - Success: Returns new user with initial game stats
 * - Failure: Returns error message
 */
router.post('/register', async (req, res) => {
    // Extract registration data from request
    const { email, password, fullName } = req.body;

    // VALIDATION: Check all required fields
    if (!email || !password || !fullName) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required: email, password, fullName'
        });
    }

    // VALIDATION: Email format
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address'
        });
    }

    // VALIDATION: Password length
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long'
        });
    }

    // VALIDATION: Name length
    if (fullName.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Full name must be 100 characters or less'
        });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Try database first
    if (dbService.isDbAvailable()) {
        try {
            // Check if email exists in database
            const existingUser = await dbService.findUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
            }

            // Create user in database with hashed password
            const newUser = await dbService.createUser({ email, password: hashedPassword, fullName });
            if (newUser) {
                const userData = {
                    id: newUser.id,
                    email: newUser.email,
                    fullName: newUser.fullName,
                    role: 'student',
                    totalPoints: 0,
                    currentLevel: 'beginner',
                    badges: ['first_login']
                };
                return res.status(201).json({
                    success: true,
                    message: 'Registration successful! Welcome to the learning game!',
                    token: generateToken(userData),
                    user: userData
                });
            }
        } catch (error) {
            console.error('Database registration error:', error);
        }
    }

    // Fallback to mock data
    const existingUser = mockUsers.find(user => user.email === email);
    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: 'Email already registered'
        });
    }

    // CREATE: New user with hashed password
    const newUser = {
        id: mockUsers.length + 1,
        email: email,
        password: hashedPassword,
        fullName: fullName,
        role: 'student',
        totalPoints: 0,
        currentLevel: 'beginner',
        badges: ['first_login'],
        selectedLanguage: null,
        createdAt: new Date().toISOString().split('T')[0]
    };

    mockUsers.push(newUser);

    const userData = {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        totalPoints: newUser.totalPoints,
        currentLevel: newUser.currentLevel,
        badges: newUser.badges
    };

    res.status(201).json({
        success: true,
        message: 'Registration successful! Welcome to the learning game!',
        token: generateToken(userData),
        user: userData
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: User Login
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticates a student and returns their game profile
 *
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "userpassword"
 * }
 *
 * Response includes game stats for immediate display on dashboard
 */
router.post('/login', async (req, res) => {
    // Extract credentials
    const { email, password } = req.body;

    // VALIDATION: Check credentials provided
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    // Try database first
    if (dbService.isDbAvailable()) {
        try {
            const user = await dbService.findUserByEmail(email);
            if (user && await bcrypt.compare(password, user.password)) {
                await dbService.updateUserLogin(user.user_id);
                const userData = {
                    id: user.user_id,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role || 'student',
                    totalPoints: user.total_points,
                    currentLevel: user.current_level,
                    badges: JSON.parse(user.badges || '[]'),
                    selectedLanguage: user.selected_language
                };
                return res.json({
                    success: true,
                    message: 'Login successful! Ready to learn!',
                    token: generateToken(userData),
                    user: userData
                });
            }
        } catch (error) {
            console.error('Database login error:', error);
        }
    }

    // Fallback to mock data
    if (!mockUsersReady) {
        // Wait briefly for mock passwords to finish hashing
        await new Promise(resolve => {
            const check = () => mockUsersReady ? resolve() : setTimeout(check, 50);
            check();
        });
    }
    const user = mockUsers.find(u => u.email === email);

    if (!user || !user.password || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    const userData = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role || 'student',
        totalPoints: user.totalPoints,
        currentLevel: user.currentLevel,
        badges: user.badges,
        selectedLanguage: user.selectedLanguage
    };

    res.json({
        success: true,
        message: 'Login successful! Ready to learn!',
        token: generateToken(userData),
        user: userData
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get User Profile
// GET /api/auth/profile/:userId
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves user profile with current game stats
 * Used to refresh dashboard data
 */
router.get('/profile/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);

    // Find user
    const user = mockUsers.find(u => u.id === userId);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Return profile without password
    res.json({
        success: true,
        user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            totalPoints: user.totalPoints,
            currentLevel: user.currentLevel,
            badges: user.badges,
            selectedLanguage: user.selectedLanguage
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Faculty / Admin Login (CMS Access)
// POST /api/auth/admin
// ─────────────────────────────────────────────────────────────────────────────
// Simple password gate for the Content Manager. No user account required.
// Default faculty password: admin123
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

router.post('/admin', (req, res) => {
    const { password } = req.body;

    if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: 'Incorrect faculty password.' });
    }

    // Issue a JWT as a virtual "faculty" user so protected routes work
    const token = generateToken({ id: 0, email: 'faculty@codearena', role: 'faculty', fullName: 'Faculty' });

    res.json({
        success: true,
        message: 'Faculty access granted.',
        token,
        user: { id: 0, fullName: 'Faculty', email: 'faculty@codearena', role: 'faculty' }
    });
});

// Export router and mockUsers (for other routes to access)
module.exports = router;
module.exports.mockUsers = mockUsers;
