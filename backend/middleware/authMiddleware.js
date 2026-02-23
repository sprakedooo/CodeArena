/**
 * ============================================================================
 * AUTHENTICATION MIDDLEWARE (authMiddleware.js)
 * ============================================================================
 *
 * PURPOSE:
 * Validates JWT tokens on protected API routes.
 * Attaches decoded user info to req.user on success.
 * Returns 401 Unauthorized on invalid/missing tokens.
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

/**
 * Middleware to verify JWT tokens
 *
 * Usage: app.use('/api/protected', authMiddleware);
 *
 * Expects header: Authorization: Bearer <token>
 * On success: sets req.user = { id, email, role, fullName }
 * On failure: returns 401 JSON response
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
}

/**
 * Helper to generate a JWT token for a user
 *
 * @param {object} user - User object with id, email, role, fullName
 * @returns {string} Signed JWT token (expires in 24h)
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id || user.user_id,
            email: user.email,
            role: user.role,
            fullName: user.fullName || user.full_name
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

/**
 * Middleware to restrict access to faculty/admin users only.
 * Must be used AFTER authMiddleware (requires req.user to be set).
 */
function requireFaculty(req, res, next) {
    if (!req.user || req.user.role !== 'faculty') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Faculty only.'
        });
    }
    next();
}

module.exports = { authMiddleware, requireFaculty, generateToken };
