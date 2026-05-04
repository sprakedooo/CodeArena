/**
 * ============================================================================
 * QUIZZES JAVASCRIPT (quizzes.js)
 * ============================================================================
 *
 * PURPOSE:
 * Handles all quiz functionality:
 * - Loading and displaying available quizzes
 * - Quiz-taking interface with question navigation
 * - Answer submission and automatic scoring
 * - Displaying results with AI-powered feedback
 *
 * FOR THESIS PANELISTS:
 * This is a KEY file demonstrating the assessment feature with:
 * 1. Automatic scoring
 * 2. AI-powered hints based on performance
 * These are core differentiators of this thesis system.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = `http://${window.location.hostname}:3000/api`;

/**
 * Returns headers with JWT Authorization token
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

/**
 * Escapes HTML to prevent XSS attacks
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quiz state object - tracks current quiz session
 */
let quizState = {
    currentQuiz: null,        // The quiz being taken
    currentQuestionIndex: 0,  // Which question we're on (0-based)
    answers: [],              // Student's answers [{questionId: 1, answer: 'A'}, ...]
    isSubmitted: false        // Whether quiz has been submitted
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION CHECK
// ─────────────────────────────────────────────────────────────────────────────

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!isLoggedIn || !user) {
        window.location.href = 'login.html';
        return null;
    }

    // Update dashboard link based on role
    const dashboardLink = document.getElementById('dashboardLink');
    if (dashboardLink) {
        dashboardLink.href = user.role === 'faculty'
            ? 'dashboard_faculty.html'
            : 'dashboard_student.html';
    }

    return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    const user = checkAuth();
    if (!user) return;

    // Setup logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }

    // Load quiz list
    loadQuizzes();
});

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ LIST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches and displays all available quizzes
 */
async function loadQuizzes() {
    const container = document.getElementById('quizList');
    if (!container) return;

    container.innerHTML = '<p class="text-muted">Loading quizzes...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/quizzes`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && data.quizzes.length > 0) {
            container.innerHTML = data.quizzes.map(quiz => `
                <div class="card">
                    <h3 style="margin-bottom: var(--spacing-sm);">${escapeHtml(quiz.title)}</h3>
                    <p class="text-muted" style="margin-bottom: var(--spacing-md);">
                        ${escapeHtml(quiz.description)}
                    </p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="text-muted">${quiz.questionCount} questions</span>
                        <button class="btn btn-primary" onclick="startQuiz(${quiz.id})">
                            Take Quiz
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted">No quizzes available.</p>';
        }
    } catch (error) {
        console.error('Error loading quizzes:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                Unable to load quizzes. Please check your connection.
            </div>
        `;
    }
}

/**
 * Returns to quiz list from quiz-taking or results view
 */
function backToQuizList() {
    // Reset state
    quizState = {
        currentQuiz: null,
        currentQuestionIndex: 0,
        answers: [],
        isSubmitted: false
    };

    // Show quiz list, hide others
    document.getElementById('quizListSection').classList.remove('hidden');
    document.getElementById('quizTakingSection').classList.add('hidden');
    document.getElementById('quizResultsSection').classList.add('hidden');

    // Reload quizzes
    loadQuizzes();
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ TAKING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Starts a quiz - fetches questions and shows quiz interface
 *
 * @param {number} quizId - ID of the quiz to start
 */
async function startQuiz(quizId) {
    try {
        const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            // Initialize quiz state
            quizState.currentQuiz = data.quiz;
            quizState.currentQuestionIndex = 0;
            quizState.answers = [];
            quizState.isSubmitted = false;

            // Initialize answers array with empty values
            data.quiz.questions.forEach(q => {
                quizState.answers.push({
                    questionId: q.id,
                    answer: null
                });
            });

            // Show quiz taking interface
            showQuizInterface();
        }
    } catch (error) {
        console.error('Error starting quiz:', error);
        alert('Unable to start quiz. Please try again.');
    }
}

/**
 * Shows the quiz taking interface and displays first question
 */
function showQuizInterface() {
    // Hide quiz list, show quiz interface
    document.getElementById('quizListSection').classList.add('hidden');
    document.getElementById('quizTakingSection').classList.remove('hidden');
    document.getElementById('quizResultsSection').classList.add('hidden');

    // Update quiz title
    document.getElementById('quizTitle').textContent = quizState.currentQuiz.title;
    document.getElementById('quizDescription').textContent = quizState.currentQuiz.description;

    // Update total questions
    document.getElementById('totalQuestions').textContent = quizState.currentQuiz.questions.length;

    // Display first question
    displayQuestion(0);
}

/**
 * Displays a specific question
 *
 * @param {number} index - Question index (0-based)
 */
function displayQuestion(index) {
    const quiz = quizState.currentQuiz;
    const question = quiz.questions[index];

    // Update current question number
    document.getElementById('currentQuestion').textContent = index + 1;

    // Update progress bar
    const progress = ((index + 1) / quiz.questions.length) * 100;
    document.getElementById('quizProgress').style.width = `${progress}%`;

    // Build question HTML
    const container = document.getElementById('questionContainer');
    const currentAnswer = quizState.answers[index].answer;

    container.innerHTML = `
        <div class="card" style="margin: var(--spacing-md) 0;">
            <h3 style="margin-bottom: var(--spacing-lg);">
                Question ${index + 1}: ${escapeHtml(question.question)}
            </h3>
            <div class="options">
                ${question.options.map((option, i) => {
        const optionLetter = option.charAt(0); // Get 'A', 'B', 'C', or 'D'
        const isSelected = currentAnswer === optionLetter;
        return `
                        <label class="quiz-option ${isSelected ? 'selected' : ''}"
                               onclick="selectAnswer('${optionLetter}', ${index})">
                            <input type="radio"
                                   name="question${index}"
                                   value="${optionLetter}"
                                   ${isSelected ? 'checked' : ''}
                                   style="margin-right: 10px;">
                            ${escapeHtml(option)}
                        </label>
                    `;
    }).join('')}
            </div>
        </div>
    `;

    // Update navigation buttons
    updateNavigationButtons(index);
}

/**
 * Records the selected answer for current question
 *
 * @param {string} answer - Selected answer letter (A, B, C, or D)
 * @param {number} questionIndex - Index of the question
 */
function selectAnswer(answer, questionIndex) {
    // Store answer
    quizState.answers[questionIndex].answer = answer;

    // Update visual selection
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

/**
 * Updates navigation button visibility
 *
 * @param {number} index - Current question index
 */
function updateNavigationButtons(index) {
    const totalQuestions = quizState.currentQuiz.questions.length;
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Previous button - hidden on first question
    if (index === 0) {
        prevBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
    }

    // Next/Submit buttons
    if (index === totalQuestions - 1) {
        // Last question - show submit, hide next
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    } else {
        // Not last question - show next, hide submit
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

/**
 * Navigates to previous question
 */
function previousQuestion() {
    if (quizState.currentQuestionIndex > 0) {
        quizState.currentQuestionIndex--;
        displayQuestion(quizState.currentQuestionIndex);
    }
}

/**
 * Navigates to next question
 */
function nextQuestion() {
    const totalQuestions = quizState.currentQuiz.questions.length;

    if (quizState.currentQuestionIndex < totalQuestions - 1) {
        quizState.currentQuestionIndex++;
        displayQuestion(quizState.currentQuestionIndex);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ SUBMISSION AND RESULTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submits the quiz for grading
 * This is where automatic scoring and AI hints happen
 */
async function submitQuiz() {
    // Check if all questions are answered
    const unanswered = quizState.answers.filter(a => a.answer === null);
    if (unanswered.length > 0) {
        const proceed = confirm(
            `You have ${unanswered.length} unanswered question(s). Submit anyway?`
        );
        if (!proceed) return;
    }

    // Get user info
    const user = JSON.parse(localStorage.getItem('user'));

    try {
        // Submit to backend for scoring
        const response = await fetch(`${API_BASE_URL}/quizzes/submit`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                quizId: quizState.currentQuiz.id,
                studentId: user.id,
                answers: quizState.answers
            })
        });

        const data = await response.json();

        if (data.success) {
            quizState.isSubmitted = true;
            displayResults(data.result);

            // Record quiz attempt in progress
            recordQuizAttempt(user.id, data.result);
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('Unable to submit quiz. Please try again.');
    }
}

/**
 * Displays quiz results with AI feedback
 *
 * @param {object} result - Quiz result from backend
 */
function displayResults(result) {
    // Hide quiz interface, show results
    document.getElementById('quizTakingSection').classList.add('hidden');
    document.getElementById('quizResultsSection').classList.remove('hidden');

    // Display score
    document.getElementById('scoreDisplay').textContent = `${result.score.percentage}%`;

    // Display pass/fail status
    const passStatus = document.getElementById('passStatus');
    if (result.passed) {
        passStatus.innerHTML = `
            <span class="badge" style="background: #dcfce7; color: #166534; padding: 8px 16px; font-size: 1rem;">
                ✓ PASSED
            </span>
        `;
    } else {
        passStatus.innerHTML = `
            <span class="badge" style="background: #fee2e2; color: #991b1b; padding: 8px 16px; font-size: 1rem;">
                ✗ NOT PASSED
            </span>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AI HINT DISPLAY - KEY THESIS FEATURE
    // ═══════════════════════════════════════════════════════════════════════
    document.getElementById('aiHintText').innerHTML = `
        <strong>Performance Analysis:</strong><br>
        ${result.aiHint}
    `;

    // Display detailed results
    const detailedContainer = document.getElementById('detailedResults');
    detailedContainer.innerHTML = result.detailedResults.map((item, index) => `
        <div class="card" style="margin-bottom: var(--spacing-sm); padding: var(--spacing-md);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <strong>Question ${index + 1}:</strong> ${escapeHtml(item.question)}
                    <br>
                    <span class="text-muted">Your answer: ${escapeHtml(item.studentAnswer || 'No answer')}</span>
                    ${!item.isCorrect ? `<br><span class="text-success">Correct answer: ${escapeHtml(item.correctAnswer)}</span>` : ''}
                </div>
                <span class="${item.isCorrect ? 'text-success' : 'text-danger'}" style="font-size: 1.5rem;">
                    ${item.isCorrect ? '✓' : '✗'}
                </span>
            </div>
        </div>
    `).join('');
}

/**
 * Records quiz attempt in student progress
 */
async function recordQuizAttempt(studentId, result) {
    try {
        await fetch(`${API_BASE_URL}/progress/quiz-attempt`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                studentId: studentId,
                quizId: result.quizId,
                score: result.score.percentage,
                passed: result.passed
            })
        });
    } catch (error) {
        console.error('Error recording quiz attempt:', error);
    }
}

/**
 * Retakes the current quiz
 */
function retakeQuiz() {
    const quizId = quizState.currentQuiz.id;
    startQuiz(quizId);
}
