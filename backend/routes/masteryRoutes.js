/**
 * masteryRoutes.js — cross-system level mastery (Assessment ↔ Classroom)
 *
 *   GET  /api/mastery/:userId/:language   → mastered + unlocked levels for a language
 *   POST /api/mastery                      → record a mastery (used by the assessment page)
 *        body: { language, level, source }
 */

const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const mastery = require('../services/masteryService');

// ── GET /:userId/:language — mastered + unlocked levels ───────────────────────
router.get('/:userId/:language', authMiddleware, (req, res) => {
    const { userId, language } = req.params;
    const mastered = mastery.getMasteredLevels(userId, language);
    const unlocked = mastery.LEVELS.filter(l => mastery.isLevelUnlocked(userId, language, l));
    res.json({ success: true, language: String(language).toLowerCase(), mastered, unlocked });
});

// ── POST / — record a mastery for the logged-in user ──────────────────────────
router.post('/', authMiddleware, (req, res) => {
    const userId = req.user && req.user.id;
    const { language, level, source = 'assessment' } = req.body;
    if (!userId)            return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (!language || !level) return res.status(400).json({ success: false, message: 'language and level required' });

    const rec = mastery.recordMastery(userId, language, level, source);
    if (!rec) return res.status(400).json({ success: false, message: 'Invalid language/level' });
    res.json({ success: true, mastery: rec });
});

module.exports = router;
