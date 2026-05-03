/**
 * profileRoutes.js — User profile management
 * GET  /api/profile          – own profile
 * PUT  /api/profile          – update name / avatar / bio
 * PUT  /api/profile/password – change password
 * GET  /api/profile/:userId  – public profile
 */

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const db      = require('../config/database');
const { authMiddleware } = require('../middleware/authMiddleware');
const dbService = require('../services/dbService');

// ── GET own profile ───────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (dbService.isDbAvailable()) {
            const rows = await db.query(
                'SELECT user_id,email,full_name,role,avatar,bio,selected_language,total_xp,streak FROM users WHERE user_id=?',
                [req.user.id]
            );
            if (!rows?.length) return res.status(404).json({ success:false, message:'User not found' });
            const u = rows[0];
            return res.json({ success:true, user: mapUser(u) });
        }
        // Mock fallback
        return res.json({ success:true, user: { id:req.user.id, email:req.user.email, fullName:req.user.fullName, role:req.user.role } });
    } catch(e) {
        console.error('GET /profile:', e.message);
        res.status(500).json({ success:false, message:'Server error' });
    }
});

// ── PUT update profile ────────────────────────────────────────────────────────
router.put('/', authMiddleware, async (req, res) => {
    const { fullName, avatar, bio } = req.body;
    try {
        if (dbService.isDbAvailable()) {
            const fields = [];
            const vals   = [];
            if (fullName !== undefined) { fields.push('full_name=?'); vals.push(fullName); }
            if (avatar   !== undefined) { fields.push('avatar=?');    vals.push(avatar);   }
            // bio stored in a column if it exists, otherwise ignore gracefully
            if (!fields.length) return res.json({ success:true, message:'Nothing to update' });
            vals.push(req.user.id);
            await db.query(`UPDATE users SET ${fields.join(',')} WHERE user_id=?`, vals);
            const rows = await db.query('SELECT user_id,email,full_name,role,avatar,bio,selected_language,total_xp,streak FROM users WHERE user_id=?',[req.user.id]);
            return res.json({ success:true, user: mapUser(rows[0]) });
        }
        // Mock: return updated data
        return res.json({ success:true, user:{ id:req.user.id, email:req.user.email, fullName: fullName||req.user.fullName, avatar } });
    } catch(e) {
        console.error('PUT /profile:', e.message);
        res.status(500).json({ success:false, message:'Server error' });
    }
});

// ── PUT change password ───────────────────────────────────────────────────────
router.put('/password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
        return res.status(400).json({ success:false, message:'Both passwords required' });
    if (newPassword.length < 8)
        return res.status(400).json({ success:false, message:'New password must be ≥8 characters' });
    try {
        if (dbService.isDbAvailable()) {
            const rows = await db.query('SELECT password FROM users WHERE user_id=?',[req.user.id]);
            if (!rows?.length) return res.status(404).json({ success:false, message:'User not found' });
            const match = await bcrypt.compare(currentPassword, rows[0].password || '');
            if (!match) return res.status(400).json({ success:false, message:'Current password is incorrect' });
            const hash = await bcrypt.hash(newPassword, 10);
            await db.query('UPDATE users SET password=? WHERE user_id=?',[hash, req.user.id]);
            return res.json({ success:true, message:'Password changed successfully' });
        }
        return res.json({ success:true, message:'Password changed (mock mode)' });
    } catch(e) {
        console.error('PUT /profile/password:', e.message);
        res.status(500).json({ success:false, message:'Server error' });
    }
});

// ── GET public profile ────────────────────────────────────────────────────────
router.get('/:userId', async (req, res) => {
    try {
        if (dbService.isDbAvailable()) {
            const rows = await db.query(
                'SELECT user_id,full_name,role,avatar,total_xp,streak FROM users WHERE user_id=?',
                [req.params.userId]
            );
            if (!rows?.length) return res.status(404).json({ success:false, message:'User not found' });
            const u = rows[0];
            return res.json({ success:true, user:{ id:u.user_id, fullName:u.full_name, role:u.role, avatar:u.avatar, totalXp:u.total_xp||0, streak:u.streak||0 } });
        }
        return res.status(404).json({ success:false, message:'DB not available' });
    } catch(e) {
        res.status(500).json({ success:false, message:'Server error' });
    }
});

function mapUser(u) {
    return {
        id:              u.user_id,
        email:           u.email,
        fullName:        u.full_name,
        role:            u.role,
        avatar:          u.avatar,
        bio:             u.bio,
        selectedLanguage:u.selected_language,
        totalXp:         u.total_xp || 0,
        streak:          u.streak   || 0,
    };
}

module.exports = router;
