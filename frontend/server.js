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
const PORT = process.env.PORT || 3001;

// Serve static files from frontend directory
app.use('/css',    express.static(path.join(__dirname, 'css')));
app.use('/js',     express.static(path.join(__dirname, 'js')));
app.use('/pages',  express.static(path.join(__dirname, 'pages')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Also serve pages/ at root so relative links (login.html, dashboard.html, etc.)
// work when the user navigates from the landing page at localhost:8080/
app.use(express.static(path.join(__dirname, 'pages')));

// Root serves the marketing homepage (index)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
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

// ── Catch-all: serve any page by name ────────────────────────────────────────
// Allows clean URLs: /learn, /learn.html, /profile, /analytics, etc.
// Must come AFTER all specific routes above.
const fs = require('fs');

app.get('/:page([a-zA-Z0-9_.-]+)', (req, res) => {
    // Strip .html suffix so both /login and /login.html are handled
    const name = req.params.page.replace(/\.html$/, '');
    // Try exact .html match first, then with appended .html
    const candidates = [
        path.join(__dirname, 'pages', name + '.html'),
        path.join(__dirname, 'pages', name),
    ];
    for (const filePath of candidates) {
        if (fs.existsSync(filePath)) return res.sendFile(filePath);
    }
    // Not found — serve 404 page if it exists, otherwise plain text
    const notFound = path.join(__dirname, 'pages', '404.html');
    if (fs.existsSync(notFound)) return res.status(404).sendFile(notFound);
    res.status(404).send('Page not found');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   CODEARENA - FRONTEND SERVER                              ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║   Local:   http://localhost:${PORT}                           ║`);
    console.log(`║   Network: http://192.168.1.8:${PORT}                         ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
});

module.exports = app;
