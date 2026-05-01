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
const { generateToken, authMiddleware, requireFaculty } = require('../middleware/authMiddleware');
const { generateOTP, sendOTPEmail } = require('../services/emailService');

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Convert name to Title Case: "jub manlunas" → "Jub Manlunas"
const toTitleCase = str =>
    str.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

// ─── OTP store (in-memory, works with or without DB) ─────────────────────────
// Key: email → { otp, expiresAt, fullName, hashedPassword, role }
const otpStore = {};

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
        password: null,
        _rawPassword: 'maria123',
        fullName: 'Maria Santos',
        role: 'student',
        totalPoints: 450,
        currentLevel: 'intermediate',
        badges: ['first_login', 'fast_learner', 'perfect_score'],
        selectedLanguage: 'python',
        createdAt: '2024-01-10'
    },
    {
        id: 99,
        email: 'faculty@codearena.edu',
        password: null,
        _rawPassword: 'faculty123',
        fullName: 'Prof. Reyes',
        role: 'faculty',
        totalPoints: 0,
        currentLevel: null,
        badges: [],
        selectedLanguage: null,
        createdAt: '2024-01-01'
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
// Faculty registration code (required to register as faculty)
const FACULTY_CODE = process.env.FACULTY_CODE || 'FACULTY2024';

router.post('/register', async (req, res) => {
    // Extract registration data from request
    const { email, password, role, facultyCode } = req.body;
    const fullName = req.body.fullName ? toTitleCase(req.body.fullName) : '';

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

    // Determine role — faculty requires a valid faculty code
    let userRole = 'student';
    if (role === 'faculty') {
        if (facultyCode !== FACULTY_CODE) {
            return res.status(403).json({
                success: false,
                message: 'Invalid faculty registration code'
            });
        }
        userRole = 'faculty';
    }

    // Check if email already exists (DB or mock)
    if (dbService.isDbAvailable()) {
        try {
            const existingUser = await dbService.findUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Email already registered' });
            }
        } catch (err) {
            console.error('DB check error:', err);
        }
    } else {
        const existingUser = mockUsers.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }
    }

    // Also reject if there's already a pending OTP for this email (rate-limit re-registration spam)
    if (otpStore[email] && otpStore[email].expiresAt > Date.now()) {
        // Allow resend via the dedicated endpoint instead
        return res.status(400).json({
            success: false,
            message: 'A verification email was already sent. Please check your inbox or use "Resend OTP".',
            needsVerification: true,
            email
        });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate and store OTP
    const otp = generateOTP();
    otpStore[email] = {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        fullName,
        hashedPassword,
        role: userRole
    };

    // Send OTP email
    try {
        await sendOTPEmail(email, fullName, otp);
    } catch (emailErr) {
        console.error('Failed to send OTP email:', emailErr);
        delete otpStore[email];
        return res.status(500).json({
            success: false,
            message: 'Failed to send verification email. Please check your email address and try again.'
        });
    }

    return res.status(200).json({
        success: true,
        needsVerification: true,
        email,
        message: 'Verification code sent! Please check your email.'
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Verify Email OTP
// POST /api/auth/verify-email
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const pending = otpStore[email];

    if (!pending) {
        return res.status(400).json({ success: false, message: 'No pending verification for this email. Please register again.' });
    }

    if (Date.now() > pending.expiresAt) {
        delete otpStore[email];
        return res.status(400).json({ success: false, message: 'Verification code has expired. Please register again.' });
    }

    if (otp.trim() !== pending.otp) {
        return res.status(400).json({ success: false, message: 'Incorrect verification code. Please try again.' });
    }

    // OTP is valid — create the user
    const { fullName, hashedPassword, role: userRole } = pending;
    delete otpStore[email];

    // Try database first
    if (dbService.isDbAvailable()) {
        try {
            const newUser = await dbService.createUser({ email, password: hashedPassword, fullName, role: userRole });
            if (newUser) {
                const userData = {
                    id: newUser.id,
                    email: newUser.email,
                    fullName: newUser.fullName,
                    role: userRole,
                    totalPoints: 0,
                    currentLevel: 'beginner',
                    badges: ['first_login']
                };
                return res.status(201).json({
                    success: true,
                    message: 'Email verified! Welcome to CodeArena!',
                    token: generateToken(userData),
                    user: userData
                });
            }
        } catch (error) {
            console.error('Database registration error after OTP verify:', error);
        }
    }

    // Fallback: create in mock store
    const newUser = {
        id: mockUsers.length + 1,
        email,
        password: hashedPassword,
        fullName,
        role: userRole,
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

    return res.status(201).json({
        success: true,
        message: 'Email verified! Welcome to CodeArena!',
        token: generateToken(userData),
        user: userData
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Resend OTP
// POST /api/auth/resend-otp
// ─────────────────────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const pending = otpStore[email];
    if (!pending) {
        return res.status(400).json({ success: false, message: 'No pending registration found. Please register again.' });
    }

    // Regenerate OTP and reset expiry
    const otp = generateOTP();
    pending.otp = otp;
    pending.expiresAt = Date.now() + 10 * 60 * 1000;

    try {
        await sendOTPEmail(email, pending.fullName, otp);
        return res.json({ success: true, message: 'A new verification code has been sent.' });
    } catch (emailErr) {
        console.error('Resend OTP email error:', emailErr);
        return res.status(500).json({ success: false, message: 'Failed to resend email. Please try again.' });
    }
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
                    totalXp: user.total_xp || 0,
                    streak: user.streak || 0,
                    badges: [],
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

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get All Students (Faculty View)
// GET /api/auth/students
// ─────────────────────────────────────────────────────────────────────────────
router.get('/students', authMiddleware, requireFaculty, (req, res) => {
    const students = mockUsers.map(u => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role || 'student',
        totalPoints: u.totalPoints || 0,
        currentLevel: u.currentLevel || 'beginner',
        badges: u.badges || [],
        selectedLanguage: u.selectedLanguage || null,
        createdAt: u.createdAt || null
    }));

    res.json({ success: true, students, count: students.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE OAUTH ROUTES
// GET  /api/auth/google           — redirect to Google consent screen
// GET  /api/auth/google/callback  — Google returns here with auth code
// ─────────────────────────────────────────────────────────────────────────────
const passport = require('passport');
require('../config/passport'); // registers the Google strategy

// Start Google OAuth flow
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Google redirects here after user consents
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: 'http://localhost:8080/pages/login.html?error=oauth_failed' }),
    (req, res) => {
        // req.user is set by passport strategy
        const user  = req.user;
        const token = generateToken({
            id:       user.id,
            email:    user.email,
            role:     user.role || 'student',
            fullName: user.fullName,
        });

        // Build safe user payload for frontend
        const userPayload = encodeURIComponent(JSON.stringify({
            id:               user.id,
            email:            user.email,
            fullName:         user.fullName,
            role:             user.role || 'student',
            totalPoints:      user.totalPoints || 0,
            currentLevel:     user.currentLevel || 'beginner',
            selectedLanguage: user.selectedLanguage || null,
            avatar:           user.avatar || null,
        }));

        // Redirect to frontend callback page with token + user in URL
        res.redirect(`http://localhost:8080/pages/oauth-callback.html?token=${token}&user=${userPayload}`);
    }
);

// Export router and mockUsers (for other routes to access)
module.exports = router;
module.exports.mockUsers = mockUsers;
