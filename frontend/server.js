/**
 * ============================================================================
 * CODEARENA FRONTEND SERVER
 * Static File Server for Frontend Assets
 * ============================================================================
 *
 * PURPOSE:
 * Serves the frontend HTML, CSS, and JavaScript files.
 * This provides a proper web server instead of opening files directly.
 *
 * PORT: 8080 (Frontend)
 * BACKEND: 3000 (API Server)
 * ============================================================================
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Serve static files from frontend directory
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Redirect root to login page
app.get('/', (req, res) => {
    res.redirect('/pages/login.html');
});

// Serve index for SPA-style routing (optional)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'dashboard.html'));
});

app.get('/play', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'lesson_game.html'));
});

app.get('/feedback', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'feedback.html'));
});

app.get('/playground', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'playground.html'));
});

app.get('/select-language', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'select_language.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   CODEARENA - FRONTEND SERVER                              ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║   Frontend running at: http://localhost:${PORT}                ║`);
    console.log('║   Open browser to start using CodeArena                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
});

module.exports = app;
