/**
 * ============================================================================
 * LANGUAGE ROUTES (languageRoutes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Handles programming language selection for the game-based system.
 * Students choose from Python, Java, or C++ before starting lessons.
 *
 * ENDPOINTS:
 * GET  /api/languages          - Get all available languages
 * POST /api/languages/select   - Select a language to study
 * GET  /api/languages/current  - Get user's current selected language
 *
 * FOR THESIS PANELISTS:
 * Language selection is the first step in the adaptive learning flow.
 * Questions are filtered based on the selected programming language.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA: Available programming languages
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Programming languages available in the system
 * Each language has metadata for display and question filtering
 */
let programmingLanguages = [
    {
        id: 1,
        name: 'Python',
        code: 'python',
        description: 'A beginner-friendly language known for its simple syntax and versatility.',
        icon: '🐍',
        difficulty: 'Recommended for beginners',
        totalQuestions: 15,  // Mock count
        topics: ['Variables', 'Data Types', 'Loops', 'Functions', 'Lists']
    },
    {
        id: 2,
        name: 'JavaScript',
        code: 'javascript',
        description: 'The language of the web. Build interactive sites, apps, and servers with JS.',
        icon: '🌐',
        difficulty: 'Beginner Friendly',
        totalQuestions: 15,
        topics: ['Variables', 'Functions', 'Arrays', 'DOM', 'Events']
    },
    {
        id: 3,
        name: 'Java',
        code: 'java',
        description: 'A powerful object-oriented language used in enterprise applications.',
        icon: '☕',
        difficulty: 'Intermediate',
        totalQuestions: 15,
        topics: ['Variables', 'Data Types', 'Loops', 'Classes', 'Objects']
    },
    {
        id: 4,
        name: 'C++',
        code: 'cpp',
        description: 'A high-performance language for system programming and game development.',
        icon: '⚡',
        difficulty: 'Advanced',
        totalQuestions: 15,
        topics: ['Variables', 'Pointers', 'Loops', 'Functions', 'Classes']
    }
];

// Mock user selections (shared state for demo)
let userLanguageSelections = {};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get All Languages
// GET /api/languages
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all available programming languages
 * Used on the language selection page
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Select a programming language to begin learning',
        languages: programmingLanguages.map(lang => ({
            id: lang.id,
            name: lang.name,
            code: lang.code,
            description: lang.description,
            icon: lang.icon,
            difficulty: lang.difficulty,
            totalQuestions: lang.totalQuestions
        }))
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Language Details
// GET /api/languages/:code
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns detailed information about a specific language
 * Including available topics and question count per level
 */
router.get('/:code', (req, res) => {
    const languageCode = req.params.code.toLowerCase();

    // Find the language
    const language = programmingLanguages.find(l => l.code === languageCode);

    if (!language) {
        return res.status(404).json({
            success: false,
            message: 'Language not found. Available: python, java, cpp'
        });
    }

    // Return detailed language info
    res.json({
        success: true,
        language: {
            ...language,
            levels: {
                beginner: { questionCount: 5, description: 'Basic syntax and concepts' },
                intermediate: { questionCount: 5, description: 'Control structures and functions' },
                advanced: { questionCount: 5, description: 'Complex problem solving' }
            }
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Select Language
// POST /api/languages/select
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Saves the user's language selection
 * This determines which questions will be presented
 *
 * Request Body:
 * {
 *   "userId": 1,
 *   "languageCode": "python"
 * }
 */
router.post('/select', (req, res) => {
    const { userId, languageCode } = req.body;

    // VALIDATION: Check required fields
    if (!userId || !languageCode) {
        return res.status(400).json({
            success: false,
            message: 'userId and languageCode are required'
        });
    }

    // VALIDATION: Check if language exists
    const language = programmingLanguages.find(
        l => l.code === languageCode.toLowerCase()
    );

    if (!language) {
        return res.status(400).json({
            success: false,
            message: 'Invalid language. Choose: python, javascript, java, or cpp'
        });
    }

    // Save selection
    userLanguageSelections[userId] = {
        languageCode: language.code,
        languageName: language.name,
        selectedAt: new Date().toISOString()
    };

    // RESPONSE: Confirm selection
    res.json({
        success: true,
        message: `Great choice! You selected ${language.name}. Let's start learning!`,
        selection: {
            userId: userId,
            language: {
                code: language.code,
                name: language.name,
                icon: language.icon
            },
            startingLevel: 'beginner',  // All users start at beginner
            availableTopics: language.topics
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get User's Current Language
// GET /api/languages/current/:userId
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the user's currently selected language
 * Used to restore session state
 */
router.get('/current/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);

    // Check if user has a selection
    const selection = userLanguageSelections[userId];

    if (!selection) {
        return res.json({
            success: true,
            hasSelection: false,
            message: 'No language selected yet'
        });
    }

    // Find full language details
    const language = programmingLanguages.find(
        l => l.code === selection.languageCode
    );

    res.json({
        success: true,
        hasSelection: true,
        selection: {
            languageCode: selection.languageCode,
            languageName: selection.languageName,
            icon: language.icon,
            selectedAt: selection.selectedAt
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CRUD ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/languages — Create a new language
router.post('/', (req, res) => {
    const { name, code, description, icon, difficulty, topics } = req.body;
    if (!name || !code) {
        return res.status(400).json({ success: false, message: 'name and code are required' });
    }
    if (programmingLanguages.find(l => l.code === code.toLowerCase())) {
        return res.status(409).json({ success: false, message: 'Language code already exists' });
    }
    const newLang = {
        id: Date.now(),
        name,
        code: code.toLowerCase(),
        description: description || '',
        icon: icon || '💻',
        difficulty: difficulty || 'Beginner Friendly',
        totalQuestions: 0,
        topics: topics || []
    };
    programmingLanguages.push(newLang);
    res.status(201).json({ success: true, language: newLang, message: 'Language created' });
});

// PUT /api/languages/:code — Update a language
router.put('/:code', (req, res) => {
    const code = req.params.code.toLowerCase();
    const idx = programmingLanguages.findIndex(l => l.code === code);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Language not found' });

    programmingLanguages[idx] = { ...programmingLanguages[idx], ...req.body, code };
    res.json({ success: true, language: programmingLanguages[idx], message: 'Language updated' });
});

// DELETE /api/languages/:code — Delete a language
router.delete('/:code', (req, res) => {
    const code = req.params.code.toLowerCase();
    const idx = programmingLanguages.findIndex(l => l.code === code);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Language not found' });

    programmingLanguages.splice(idx, 1);
    res.json({ success: true, message: `Language '${code}' deleted` });
});

// Export router and data for other modules
module.exports = router;
module.exports.programmingLanguages = programmingLanguages;
module.exports.userLanguageSelections = userLanguageSelections;
