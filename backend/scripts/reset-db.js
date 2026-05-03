/**
 * reset-db.js — CodeArena Phase 1 Database Reset
 *
 * Drops all existing tables and rebuilds the Phase 1 schema.
 * Run from project root: node backend/scripts/reset-db.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fs   = require('fs');
const mysql = require('mysql2/promise');

const SCHEMA_PATH = path.join(__dirname, '../config/schema.sql');

async function resetDatabase() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   CodeArena — Phase 1 Database Reset             ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    const conn = await mysql.createConnection({
        host:               process.env.DB_HOST     || 'localhost',
        user:               process.env.DB_USER     || 'root',
        password:           process.env.DB_PASSWORD || 'root',
        multipleStatements: true,
    });

    console.log('✔  Connected to MySQL');

    const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    console.log('✔  Schema file loaded');

    console.log('⚙  Executing schema (drop → recreate → seed)…');
    await conn.query(sql);
    console.log('✔  Done!');
    console.log('');
    console.log('  Demo accounts created:');
    console.log('  ┌─────────────────────────────────────────────┐');
    console.log('  │  Student  │ student@codearena.com / student123 │');
    console.log('  │  Faculty  │ faculty@codearena.com / faculty123 │');
    console.log('  └─────────────────────────────────────────────┘');
    console.log('');
    console.log('  Learning paths seeded: Python Basics (6 lessons)');
    console.log('  Plus: Python Intermediate, JavaScript, Java, C++ (empty)');
    console.log('');

    await conn.end();
    console.log('✔  Connection closed. Database is ready for Phase 1.');
    console.log('');
}

resetDatabase().catch(err => {
    console.error('');
    console.error('✖  Reset failed:', err.message);
    console.error('');
    console.error('  Make sure MySQL is running and credentials are correct.');
    console.error('  Check your .env file: DB_HOST, DB_USER, DB_PASSWORD');
    console.error('');
    process.exit(1);
});
