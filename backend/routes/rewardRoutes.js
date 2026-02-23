/**
 * ============================================================================
 * REWARD ROUTES (rewardRoutes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Manages the game-based reward system including:
 * - Points accumulation
 * - Badge achievements
 * - Level progression tracking
 * - Leaderboard (future feature)
 *
 * GAME MECHANICS:
 * - Points: Earned for correct answers (amount varies by difficulty)
 * - Badges: Awarded for achievements (first answer, streaks, etc.)
 * - Levels: Beginner → Intermediate → Advanced
 *
 * ENDPOINTS:
 * GET  /api/rewards/:userId       - Get user's rewards summary
 * GET  /api/rewards/badges        - Get all available badges
 * POST /api/rewards/add-points    - Add points to user
 * POST /api/rewards/award-badge   - Award a badge to user
 *
 * FOR THESIS PANELISTS:
 * This demonstrates gamification elements that increase student engagement.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Import database service
const dbService = require('../services/dbService');

// ─────────────────────────────────────────────────────────────────────────────
// BADGE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All available badges in the system
 * Each badge has unlock criteria
 */
const badgeDefinitions = [
    {
        id: 'first_login',
        name: 'Welcome Aboard',
        description: 'Logged into the system for the first time',
        icon: '🎉',
        points: 10
    },
    {
        id: 'first_correct',
        name: 'First Steps',
        description: 'Answered your first question correctly',
        icon: '✅',
        points: 20
    },
    {
        id: 'streak_5',
        name: 'On Fire',
        description: 'Got 5 correct answers in a row',
        icon: '🔥',
        points: 50
    },
    {
        id: 'streak_10',
        name: 'Unstoppable',
        description: 'Got 10 correct answers in a row',
        icon: '⚡',
        points: 100
    },
    {
        id: 'perfect_quiz',
        name: 'Perfect Score',
        description: 'Completed a quiz with 100% accuracy',
        icon: '💯',
        points: 75
    },
    {
        id: 'level_intermediate',
        name: 'Rising Star',
        description: 'Advanced to Intermediate level',
        icon: '⭐',
        points: 100
    },
    {
        id: 'level_advanced',
        name: 'Programming Master',
        description: 'Advanced to Advanced level',
        icon: '👑',
        points: 200
    },
    {
        id: 'python_beginner',
        name: 'Python Novice',
        description: 'Completed beginner Python questions',
        icon: '🐍',
        points: 50
    },
    {
        id: 'java_beginner',
        name: 'Java Novice',
        description: 'Completed beginner Java questions',
        icon: '☕',
        points: 50
    },
    {
        id: 'cpp_beginner',
        name: 'C++ Novice',
        description: 'Completed beginner C++ questions',
        icon: '⚡',
        points: 50
    },
    {
        id: 'fast_learner',
        name: 'Fast Learner',
        description: 'Answered 10 questions correctly in one session',
        icon: '🚀',
        points: 75
    },
    {
        id: 'persistent',
        name: 'Never Give Up',
        description: 'Retried a wrong answer and got it right',
        icon: '💪',
        points: 30
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// POINTS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Points awarded for correct answers by difficulty level
 */
const pointsConfig = {
    beginner: 10,
    intermediate: 20,
    advanced: 30
};

/**
 * Points required for level advancement
 */
const levelThresholds = {
    intermediate: 200,  // Need 200 points to advance to intermediate
    advanced: 500       // Need 500 points to advance to advanced
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK USER REWARDS DATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tracks rewards for each user
 */
let userRewards = {
    1: {  // Demo user
        totalPoints: 150,
        currentLevel: 'beginner',
        badges: ['first_login', 'first_correct'],
        pointsHistory: [
            { points: 10, reason: 'Badge: first_login', date: '2024-01-15' },
            { points: 20, reason: 'Badge: first_correct', date: '2024-01-15' },
            { points: 10, reason: 'Correct answer (beginner)', date: '2024-01-15' }
        ]
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get User Rewards Summary
// GET /api/rewards/:userId
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns complete rewards summary for a user
 * Used on dashboard and game interface
 */
router.get('/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);

    // Try database first
    if (dbService.isDbAvailable()) {
        try {
            const dbRewards = await dbService.getUserRewards(userId);
            if (dbRewards && dbRewards.length > 0) {
                // Calculate totals from database rewards
                let totalPoints = 0;
                const badges = [];
                const recentActivity = [];

                dbRewards.forEach(r => {
                    totalPoints += r.points_amount || 0;
                    if (r.badge_id && !badges.includes(r.badge_id)) {
                        badges.push(r.badge_id);
                    }
                    recentActivity.push({
                        points: r.points_amount,
                        reason: r.description,
                        date: r.earned_at
                    });
                });

                const currentLevel = totalPoints >= 500 ? 'advanced' :
                                    totalPoints >= 200 ? 'intermediate' : 'beginner';
                const nextLevel = currentLevel === 'beginner' ? 'intermediate' :
                                 currentLevel === 'intermediate' ? 'advanced' : null;
                const pointsToNextLevel = nextLevel ? levelThresholds[nextLevel] - totalPoints : 0;
                const earnedBadges = badgeDefinitions.filter(b => badges.includes(b.id));

                return res.json({
                    success: true,
                    rewards: {
                        totalPoints: totalPoints,
                        currentLevel: currentLevel,
                        levelProgress: {
                            current: currentLevel,
                            next: nextLevel,
                            pointsNeeded: pointsToNextLevel > 0 ? pointsToNextLevel : 0,
                            progressPercent: nextLevel ?
                                Math.min(100, Math.round((totalPoints / levelThresholds[nextLevel]) * 100)) : 100
                        },
                        badges: {
                            earned: earnedBadges,
                            total: badgeDefinitions.length,
                            earnedCount: earnedBadges.length
                        },
                        recentActivity: recentActivity.slice(-5)
                    }
                });
            }
        } catch (error) {
            console.error('Database rewards error:', error);
        }
    }

    // Fallback to mock data
    if (!userRewards[userId]) {
        userRewards[userId] = {
            totalPoints: 0,
            currentLevel: 'beginner',
            badges: [],
            pointsHistory: []
        };
    }

    const rewards = userRewards[userId];

    // Calculate level progress
    const nextLevel = rewards.currentLevel === 'beginner' ? 'intermediate' :
                      rewards.currentLevel === 'intermediate' ? 'advanced' : null;
    const pointsToNextLevel = nextLevel ? levelThresholds[nextLevel] - rewards.totalPoints : 0;

    // Get badge details for user's earned badges
    const earnedBadges = badgeDefinitions.filter(b => rewards.badges.includes(b.id));

    res.json({
        success: true,
        rewards: {
            totalPoints: rewards.totalPoints,
            currentLevel: rewards.currentLevel,
            levelProgress: {
                current: rewards.currentLevel,
                next: nextLevel,
                pointsNeeded: pointsToNextLevel > 0 ? pointsToNextLevel : 0,
                progressPercent: nextLevel ?
                    Math.min(100, Math.round((rewards.totalPoints / levelThresholds[nextLevel]) * 100)) : 100
            },
            badges: {
                earned: earnedBadges,
                total: badgeDefinitions.length,
                earnedCount: earnedBadges.length
            },
            recentActivity: rewards.pointsHistory.slice(-5)
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get All Available Badges
// GET /api/rewards/badges
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all badges available in the system
 * Used to show locked/unlocked badges on profile
 */
router.get('/badges/all', (req, res) => {
    res.json({
        success: true,
        totalBadges: badgeDefinitions.length,
        badges: badgeDefinitions
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Add Points to User
// POST /api/rewards/add-points
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adds points to a user's total
 * Also checks for level advancement
 *
 * Request Body:
 * {
 *   "userId": 1,
 *   "points": 20,
 *   "reason": "Correct answer (intermediate)"
 * }
 */
router.post('/add-points', async (req, res) => {
    const { userId, points, reason } = req.body;

    // VALIDATION
    if (!userId || !points) {
        return res.status(400).json({
            success: false,
            message: 'userId and points are required'
        });
    }

    // Save to database if available
    if (dbService.isDbAvailable()) {
        await dbService.addReward(userId, 'points', points, null, reason || 'Points earned');
    }

    // Initialize user if needed
    if (!userRewards[userId]) {
        userRewards[userId] = {
            totalPoints: 0,
            currentLevel: 'beginner',
            badges: [],
            pointsHistory: []
        };
    }

    // Add points
    userRewards[userId].totalPoints += points;
    userRewards[userId].pointsHistory.push({
        points: points,
        reason: reason || 'Points earned',
        date: new Date().toISOString().split('T')[0]
    });

    // Check for level advancement
    let leveledUp = false;
    let newLevel = userRewards[userId].currentLevel;

    if (newLevel === 'beginner' && userRewards[userId].totalPoints >= levelThresholds.intermediate) {
        newLevel = 'intermediate';
        leveledUp = true;
        // Award level badge
        if (!userRewards[userId].badges.includes('level_intermediate')) {
            userRewards[userId].badges.push('level_intermediate');
            if (dbService.isDbAvailable()) {
                await dbService.addReward(userId, 'badge', 100, 'level_intermediate', 'Advanced to Intermediate');
            }
        }
    } else if (newLevel === 'intermediate' && userRewards[userId].totalPoints >= levelThresholds.advanced) {
        newLevel = 'advanced';
        leveledUp = true;
        if (!userRewards[userId].badges.includes('level_advanced')) {
            userRewards[userId].badges.push('level_advanced');
            if (dbService.isDbAvailable()) {
                await dbService.addReward(userId, 'badge', 200, 'level_advanced', 'Advanced to Advanced');
            }
        }
    }

    userRewards[userId].currentLevel = newLevel;

    // RESPONSE
    res.json({
        success: true,
        message: leveledUp ? `Congratulations! You advanced to ${newLevel} level!` : `Earned ${points} points!`,
        pointsAdded: points,
        totalPoints: userRewards[userId].totalPoints,
        currentLevel: newLevel,
        leveledUp: leveledUp
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Award Badge to User
// POST /api/rewards/award-badge
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Awards a specific badge to a user
 *
 * Request Body:
 * {
 *   "userId": 1,
 *   "badgeId": "streak_5"
 * }
 */
router.post('/award-badge', (req, res) => {
    const { userId, badgeId } = req.body;

    // VALIDATION
    if (!userId || !badgeId) {
        return res.status(400).json({
            success: false,
            message: 'userId and badgeId are required'
        });
    }

    // Check if badge exists
    const badge = badgeDefinitions.find(b => b.id === badgeId);
    if (!badge) {
        return res.status(404).json({
            success: false,
            message: 'Badge not found'
        });
    }

    // Initialize user if needed
    if (!userRewards[userId]) {
        userRewards[userId] = {
            totalPoints: 0,
            currentLevel: 'beginner',
            badges: [],
            pointsHistory: []
        };
    }

    // Check if already has badge
    if (userRewards[userId].badges.includes(badgeId)) {
        return res.json({
            success: true,
            alreadyHad: true,
            message: 'Badge already earned'
        });
    }

    // Award badge
    userRewards[userId].badges.push(badgeId);

    // Award badge points
    userRewards[userId].totalPoints += badge.points;
    userRewards[userId].pointsHistory.push({
        points: badge.points,
        reason: `Badge: ${badge.name}`,
        date: new Date().toISOString().split('T')[0]
    });

    // RESPONSE
    res.json({
        success: true,
        message: `Badge earned: ${badge.name}!`,
        badge: badge,
        pointsAwarded: badge.points,
        totalPoints: userRewards[userId].totalPoints
    });
});

// Export router and data
module.exports = router;
module.exports.userRewards = userRewards;
module.exports.badgeDefinitions = badgeDefinitions;
module.exports.pointsConfig = pointsConfig;
