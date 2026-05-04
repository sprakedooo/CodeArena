/**
 * passport.js — Google OAuth 2.0 strategy configuration
 *
 * Flow:
 *   1. User clicks "Sign in with Google"
 *   2. Browser goes to GET /api/auth/google  → redirected to Google consent screen
 *   3. Google redirects to GET /api/auth/google/callback with a code
 *   4. Passport exchanges code for profile info
 *   5. We find-or-create a user in DB/mock, then issue a JWT
 *   6. Redirect to frontend with token in query string
 */

const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dbService      = require('../services/dbService');
const db             = require('../config/database');
const { generateToken } = require('../middleware/authMiddleware');

// ─── In-memory Google user store (mock fallback) ──────────────────────────────
// Keyed by Google sub (unique Google account ID)
const mockGoogleUsers = {};
let _nextMockId = 500; // start above existing mock IDs

// ─── Helper: find or create user by Google profile ───────────────────────────
async function findOrCreateGoogleUser(profile) {
    const toTitleCase = str =>
        str.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    const googleId = profile.id;
    const email    = (profile.emails?.[0]?.value || '').toLowerCase();
    const fullName = toTitleCase(profile.displayName || email.split('@')[0]);
    const avatar   = profile.photos?.[0]?.value || null;

    // ── Database path ─────────────────────────────────────────────────────────
    if (dbService.isDbAvailable()) {
        try {
            // Try to find by google_id first
            let [user] = await db.query(
                'SELECT * FROM users WHERE google_id = ? LIMIT 1', [googleId]
            );

            if (!user && email) {
                // Try to find existing account by email and link Google to it
                [user] = await db.query(
                    'SELECT * FROM users WHERE email = ? LIMIT 1', [email]
                );
                if (user) {
                    await db.query(
                        'UPDATE users SET google_id = ?, avatar = ? WHERE user_id = ?',
                        [googleId, avatar, user.user_id]
                    );
                }
            }

            if (!user) {
                // Create brand new user
                const result = await db.query(
                    `INSERT INTO users (email, full_name, google_id, avatar, role, total_points, current_level, selected_language, created_at)
                     VALUES (?, ?, ?, ?, 'student', 0, 'beginner', NULL, NOW())`,
                    [email, fullName, googleId, avatar]
                );
                [user] = await db.query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [result.insertId]);
            }

            return {
                id:               user.user_id,
                email:            user.email,
                fullName:         user.full_name,
                role:             user.role || 'student',
                totalPoints:      user.total_points || 0,
                currentLevel:     user.current_level || 'beginner',
                selectedLanguage: user.selected_language || null,
                avatar:           user.avatar || avatar,
            };
        } catch (err) {
            console.error('Google OAuth DB error:', err.message);
            // Fall through to mock
        }
    }

    // ── Mock fallback ─────────────────────────────────────────────────────────
    if (mockGoogleUsers[googleId]) {
        return mockGoogleUsers[googleId];
    }

    // Check if email already exists in mock
    const existing = Object.values(mockGoogleUsers).find(u => u.email === email);
    if (existing) {
        existing.googleId = googleId;
        mockGoogleUsers[googleId] = existing;
        return existing;
    }

    // Create new mock user
    const newUser = {
        id:               _nextMockId++,
        email,
        fullName,
        role:             'student',
        totalPoints:      0,
        currentLevel:     'beginner',
        selectedLanguage: null,
        avatar,
        googleId,
        createdAt:        new Date().toISOString(),
    };
    mockGoogleUsers[googleId] = newUser;
    return newUser;
}

// ─── Register Google strategy ─────────────────────────────────────────────────
passport.use(new GoogleStrategy(
    {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
        scope:        ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await findOrCreateGoogleUser(profile);
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

// Minimal session serialisation (we use JWT so sessions are short-lived)
passport.serializeUser((user, done)   => done(null, user.id));
passport.deserializeUser((id, done)   => done(null, { id }));

module.exports = { passport, generateToken };
