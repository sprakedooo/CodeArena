/**
 * ============================================================================
 * QUIZ ROUTES (quizRoutes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Handles quiz operations - retrieval, submission, and automatic scoring.
 * Integrates with AI service to provide intelligent hints based on performance.
 *
 * ENDPOINTS:
 * GET  /api/quizzes              - Get all quizzes
 * GET  /api/quizzes/:id          - Get specific quiz with questions
 * POST /api/quizzes/submit       - Submit quiz answers and get score
 * POST /api/quizzes              - Create new quiz (Faculty only)
 *
 * NOTE FOR PANELISTS:
 * This module demonstrates the integration point for AI-powered hints.
 * The AI service is currently mocked but shows the intended functionality.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

// Import AI service for generating hints
const aiService = require('../services/aiService');

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA: Sample quizzes with questions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quiz data structure with multiple-choice questions.
 * Each quiz is linked to a lesson for sequential learning.
 */
let mockQuizzes = [
    {
        id: 1,
        title: 'Quiz: Introduction to Programming',
        lessonId: 1,
        description: 'Test your understanding of basic programming concepts.',
        questions: [
            {
                id: 1,
                question: 'What is programming?',
                options: [
                    'A) A type of computer hardware',
                    'B) The process of creating instructions for computers',
                    'C) A social media platform',
                    'D) A type of video game'
                ],
                correctAnswer: 'B'
            },
            {
                id: 2,
                question: 'Which of the following is a programming language?',
                options: [
                    'A) HTML',
                    'B) Microsoft Word',
                    'C) JavaScript',
                    'D) Photoshop'
                ],
                correctAnswer: 'C'
            },
            {
                id: 3,
                question: 'What does a compiler do?',
                options: [
                    'A) Runs the computer hardware',
                    'B) Translates code into machine-readable format',
                    'C) Connects to the internet',
                    'D) Creates graphics'
                ],
                correctAnswer: 'B'
            }
        ],
        createdBy: 2,
        createdAt: '2024-01-15'
    },
    {
        id: 2,
        title: 'Quiz: Variables and Data Types',
        lessonId: 2,
        description: 'Check your knowledge of variables and data types.',
        questions: [
            {
                id: 1,
                question: 'What is a variable in programming?',
                options: [
                    'A) A constant value that never changes',
                    'B) A container for storing data values',
                    'C) A type of loop',
                    'D) A programming language'
                ],
                correctAnswer: 'B'
            },
            {
                id: 2,
                question: 'Which data type would you use to store "Hello World"?',
                options: [
                    'A) Integer',
                    'B) Boolean',
                    'C) String',
                    'D) Float'
                ],
                correctAnswer: 'C'
            },
            {
                id: 3,
                question: 'What is the value of: let x = 10 + 5;',
                options: [
                    'A) "10 + 5"',
                    'B) 105',
                    'C) 15',
                    'D) Error'
                ],
                correctAnswer: 'C'
            },
            {
                id: 4,
                question: 'Which data type stores true or false values?',
                options: [
                    'A) String',
                    'B) Integer',
                    'C) Float',
                    'D) Boolean'
                ],
                correctAnswer: 'D'
            }
        ],
        createdBy: 2,
        createdAt: '2024-01-16'
    },
    {
        id: 3,
        title: 'Quiz: Control Structures',
        lessonId: 3,
        description: 'Test your understanding of conditionals and decision making.',
        questions: [
            {
                id: 1,
                question: 'What does an if statement do?',
                options: [
                    'A) Repeats code multiple times',
                    'B) Executes code only if a condition is true',
                    'C) Declares a variable',
                    'D) Ends the program'
                ],
                correctAnswer: 'B'
            },
            {
                id: 2,
                question: 'In "if (x > 5)", what does ">" mean?',
                options: [
                    'A) x is assigned 5',
                    'B) x is less than 5',
                    'C) x is greater than 5',
                    'D) x equals 5'
                ],
                correctAnswer: 'C'
            },
            {
                id: 3,
                question: 'When does the "else" block execute?',
                options: [
                    'A) Always',
                    'B) When the if condition is true',
                    'C) When the if condition is false',
                    'D) Never'
                ],
                correctAnswer: 'C'
            }
        ],
        createdBy: 2,
        createdAt: '2024-01-17'
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get All Quizzes
// GET /api/quizzes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all available quizzes (without correct answers).
 * Used to display quiz list for students to choose from.
 */
router.get('/', (req, res) => {
    // Map quizzes to summary format (hide questions and answers)
    const quizSummaries = mockQuizzes.map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        lessonId: quiz.lessonId,
        description: quiz.description,
        questionCount: quiz.questions.length
    }));

    res.json({
        success: true,
        count: quizSummaries.length,
        quizzes: quizSummaries
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Get Quiz by ID (For Taking Quiz)
// GET /api/quizzes/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns quiz with questions but WITHOUT correct answers.
 * This is what students see when taking a quiz.
 */
router.get('/:id', (req, res) => {
    const quizId = parseInt(req.params.id);

    // Find the quiz
    const quiz = mockQuizzes.find(q => q.id === quizId);

    if (!quiz) {
        return res.status(404).json({
            success: false,
            message: 'Quiz not found'
        });
    }

    // Remove correct answers from questions before sending
    const quizForStudent = {
        id: quiz.id,
        title: quiz.title,
        lessonId: quiz.lessonId,
        description: quiz.description,
        questions: quiz.questions.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options
            // NOTE: correctAnswer is NOT included
        }))
    };

    res.json({
        success: true,
        quiz: quizForStudent
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Submit Quiz Answers
// POST /api/quizzes/submit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processes quiz submission, calculates score, and returns AI-powered hints.
 *
 * Request Body Expected:
 * {
 *   "quizId": 1,
 *   "studentId": 1,
 *   "answers": [
 *     { "questionId": 1, "answer": "B" },
 *     { "questionId": 2, "answer": "C" }
 *   ]
 * }
 *
 * THIS IS WHERE AI INTEGRATION HAPPENS:
 * Based on the score, the AI service generates appropriate hints
 * to help the student improve.
 */
router.post('/submit', (req, res) => {
    const { quizId, studentId, answers } = req.body;

    // VALIDATION: Check required fields
    if (!quizId || !studentId || !answers) {
        return res.status(400).json({
            success: false,
            message: 'Required: quizId, studentId, and answers array'
        });
    }

    // FIND: The quiz being submitted
    const quiz = mockQuizzes.find(q => q.id === quizId);

    if (!quiz) {
        return res.status(404).json({
            success: false,
            message: 'Quiz not found'
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SCORING: Calculate quiz results
    // ─────────────────────────────────────────────────────────────────────────

    let correctCount = 0;
    const totalQuestions = quiz.questions.length;
    const detailedResults = [];

    // Check each answer
    quiz.questions.forEach(question => {
        const studentAnswer = answers.find(a => a.questionId === question.id);
        const isCorrect = studentAnswer && studentAnswer.answer === question.correctAnswer;

        if (isCorrect) {
            correctCount++;
        }

        detailedResults.push({
            questionId: question.id,
            question: question.question,
            studentAnswer: studentAnswer ? studentAnswer.answer : 'No answer',
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect
        });
    });

    // Calculate percentage score
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

    // ─────────────────────────────────────────────────────────────────────────
    // AI INTEGRATION: Get hints based on performance
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * This is where the AI service provides personalized feedback.
     * The hint is generated based on the student's score percentage.
     */
    const aiHint = aiService.generateHint(scorePercentage, quiz.title);

    // ─────────────────────────────────────────────────────────────────────────
    // RESPONSE: Return complete quiz result
    // ─────────────────────────────────────────────────────────────────────────

    res.json({
        success: true,
        result: {
            quizId: quizId,
            quizTitle: quiz.title,
            studentId: studentId,
            score: {
                correct: correctCount,
                total: totalQuestions,
                percentage: scorePercentage
            },
            passed: scorePercentage >= 60,  // 60% passing grade
            detailedResults: detailedResults,
            // AI-POWERED HINT
            aiHint: aiHint,
            submittedAt: new Date().toISOString()
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: Create New Quiz (Faculty Only)
// POST /api/quizzes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new quiz with questions.
 * Only Faculty members should have access to this endpoint.
 */
router.post('/', (req, res) => {
    const { title, lessonId, description, questions, facultyId } = req.body;

    // VALIDATION
    if (!title || !description || !questions || questions.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Required: title, description, and questions array'
        });
    }

    // CREATE: New quiz object
    const newQuiz = {
        id: mockQuizzes.length + 1,
        title: title,
        lessonId: lessonId || null,
        description: description,
        questions: questions,
        createdBy: facultyId || 2,
        createdAt: new Date().toISOString().split('T')[0]
    };

    mockQuizzes.push(newQuiz);

    res.status(201).json({
        success: true,
        message: 'Quiz created successfully',
        quiz: {
            id: newQuiz.id,
            title: newQuiz.title,
            questionCount: newQuiz.questions.length
        }
    });
});

module.exports = router;
