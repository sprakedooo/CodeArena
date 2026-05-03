/**
 * dailyChallengeRoutes.js — AI-powered daily coding challenge
 * GET  /api/daily-challenge          – get today's challenge (auth optional)
 * POST /api/daily-challenge/submit   – submit answer (auth required)
 */

const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');

// ── Cache ─────────────────────────────────────────────────────────────────────
let cache = { dateKey: null, challenge: null };

// Rotate languages by day-of-year
const LANGS = ['python', 'javascript', 'java', 'cpp'];
function todayLang() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const doy = Math.floor((now - start) / 86400000);
    return LANGS[doy % LANGS.length];
}

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

// ── Fallback challenges (one per language) ────────────────────────────────────
const FALLBACK = {
    python: {
        title: 'FizzBuzz Variant',
        description: 'Write a Python function `fizzbuzz(n)` that returns a list of strings. For multiples of 3 output "Fizz", multiples of 5 output "Buzz", multiples of both output "FizzBuzz", otherwise the number as a string. Return the list for numbers 1 to n.',
        difficulty: 'beginner',
        language: 'python',
        hint: 'Use the modulo operator (%) to check divisibility.',
        xpReward: 50,
        starterCode: 'def fizzbuzz(n):\n    # Your code here\n    pass',
        examples: [{ input: '15', output: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]' }]
    },
    javascript: {
        title: 'Palindrome Checker',
        description: 'Write a JavaScript function `isPalindrome(str)` that returns true if the string is a palindrome (reads the same forwards and backwards), ignoring case and non-alphanumeric characters.',
        difficulty: 'beginner',
        language: 'javascript',
        hint: 'Reverse the cleaned string and compare it to the original.',
        xpReward: 50,
        starterCode: 'function isPalindrome(str) {\n    // Your code here\n}',
        examples: [{ input: '"A man, a plan, a canal: Panama"', output: 'true' }]
    },
    java: {
        title: 'Fibonacci Sequence',
        description: 'Write a Java method `fibonacci(int n)` that returns the n-th Fibonacci number (0-indexed). fibonacci(0) = 0, fibonacci(1) = 1, fibonacci(2) = 1, and so on.',
        difficulty: 'intermediate',
        language: 'java',
        hint: 'Consider using an iterative approach to avoid recursion overhead.',
        xpReward: 75,
        starterCode: 'public static int fibonacci(int n) {\n    // Your code here\n    return 0;\n}',
        examples: [{ input: '10', output: '55' }]
    },
    cpp: {
        title: 'Two Sum',
        description: 'Write a C++ function that finds two numbers in a vector that add up to a target sum. Return their indices as a vector<int>. Assume exactly one solution exists.',
        difficulty: 'intermediate',
        language: 'cpp',
        hint: 'Use a hash map (unordered_map) to achieve O(n) time complexity.',
        xpReward: 75,
        starterCode: '#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n    return {};\n}',
        examples: [{ input: '[2,7,11,15], target=9', output: '[0,1]' }]
    }
};

// ── Generate challenge via OpenAI ─────────────────────────────────────────────
async function generateChallenge(lang) {
    try {
        const openaiService = require('../services/openaiService');
        if (!openaiService.generateCodingAssignment) throw new Error('No assignment generator');

        const result = await openaiService.generateCodingAssignment({
            topic: 'daily challenge',
            language: lang,
            difficulty: ['beginner','beginner','intermediate','advanced'][Math.floor(Math.random()*4)]
        });
        if (!result?.title) throw new Error('Bad response');

        return {
            title:       result.title,
            description: result.description,
            difficulty:  result.difficulty || 'beginner',
            language:    lang,
            hint:        result.hint || result.testCases?.[0]?.hint || 'Think step by step.',
            xpReward:    result.difficulty === 'advanced' ? 150 : result.difficulty === 'intermediate' ? 100 : 50,
            starterCode: result.starterCode || '',
            examples:    result.testCases?.filter(t => !t.hidden).slice(0,2).map(t => ({ input: t.input, output: t.expected_output })) || [],
        };
    } catch(e) {
        console.warn('OpenAI daily challenge failed, using fallback:', e.message);
        return FALLBACK[lang] || FALLBACK.python;
    }
}

// ── GET today's challenge ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const key = todayKey();
    if (cache.dateKey === key && cache.challenge) {
        return res.json({ success:true, challenge: cache.challenge, cached: true });
    }

    const lang = todayLang();
    const challenge = await generateChallenge(lang);
    cache = { dateKey: key, challenge };

    res.json({ success:true, challenge, date: key });
});

// ── POST submit answer ────────────────────────────────────────────────────────
router.post('/submit', authMiddleware, async (req, res) => {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ success:false, message:'Code is required' });

    // Simple submission tracking — for now just award XP
    const ch  = cache.challenge || FALLBACK[language] || FALLBACK.python;
    const xp  = ch.xpReward || 50;

    // In a full implementation, run code against test cases using executeRoutes logic.
    // For now: award XP and mark as submitted.
    res.json({
        success:  true,
        passed:   true,
        xpEarned: xp,
        message:  `Great work! You earned ${xp} XP for today's challenge!`,
        date:     todayKey()
    });
});

module.exports = router;
