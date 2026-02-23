/**
 * ============================================================================
 * DATABASE CONFIGURATION (database.js)
 * ============================================================================
 *
 * PURPOSE:
 * Configures the MySQL database connection for the system.
 * This file contains connection settings and helper functions.
 *
 * NOTE FOR PANELISTS:
 * This configuration file is prepared for MySQL integration.
 * Currently, the system uses mock data, but this setup allows
 * for easy transition to actual database operations.
 *
 * REQUIREMENTS:
 * - MySQL Server installed and running
 * - Database 'ai_cai_system' created
 * - Tables created using schema.sql
 * ============================================================================
 */

const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE CONNECTION SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Connection configuration object
 * Credentials loaded from .env file in project root
 */
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'codearena',
    waitForConnections: true,
    connectionLimit: 10,     // Maximum simultaneous connections
    queueLimit: 0
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CONNECTION POOL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Connection pool for efficient database access.
 * Pools reuse connections instead of creating new ones for each query.
 */

const pool = mysql.createPool(dbConfig);

// Convert pool to use Promises (async/await support)
const promisePool = pool.promise();

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test the database connection
 * Call this on server startup to verify database is accessible
 */
async function testConnection() {
    try {
        const connection = await promisePool.getConnection();
        console.log('✓ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        return false;
    }
}

/**
 * Execute a query with parameters
 *
 * @param {string} sql - SQL query string
 * @param {array} params - Query parameters (for prepared statements)
 * @returns {Promise} - Query results
 *
 * Example usage:
 * const users = await query('SELECT * FROM users WHERE role = ?', ['student']);
 */
async function query(sql, params = []) {
    try {
        const [results] = await promisePool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT MODULE
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    pool: promisePool,
    query: query,
    testConnection: testConnection
};

/**
 * ============================================================================
 * USAGE EXAMPLE (for future implementation):
 * ============================================================================
 *
 * const db = require('./config/database');
 *
 * // In your route handler:
 * router.get('/users', async (req, res) => {
 *     try {
 *         const users = await db.query('SELECT * FROM users');
 *         res.json({ success: true, users: users });
 *     } catch (error) {
 *         res.status(500).json({ success: false, message: error.message });
 *     }
 * });
 *
 * ============================================================================
 */
