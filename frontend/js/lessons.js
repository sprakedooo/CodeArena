/**
 * ============================================================================
 * LESSONS JAVASCRIPT (lessons.js)
 * ============================================================================
 *
 * PURPOSE:
 * Handles lesson display and interaction:
 * - Fetching and displaying lesson list
 * - Opening and viewing lesson content
 * - Marking lessons as complete
 * - Requesting AI help for lesson content
 *
 * FOR THESIS PANELISTS:
 * This file demonstrates the lesson delivery feature and shows how
 * AI assistance can be integrated into the learning experience.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = 'http://localhost:3000/api';

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

// Current lesson being viewed
let currentLesson = null;

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if user is logged in
 */
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

/**
 * Initialize page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    const user = checkAuth();
    if (!user) return;

    // Setup logout button
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

    // Setup difficulty filter
    const difficultyFilter = document.getElementById('difficultyFilter');
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', function () {
            loadLessons(this.value);
        });
    }

    // Load lessons
    loadLessons();
});

// ─────────────────────────────────────────────────────────────────────────────
// LESSON LIST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches and displays all lessons
 *
 * @param {string} difficulty - Optional filter by difficulty level
 */
async function loadLessons(difficulty = '') {
    const container = document.getElementById('lessonList');
    if (!container) return;

    // Show loading state
    container.innerHTML = '<p class="text-muted">Loading lessons...</p>';

    try {
        // Build API URL with optional filter
        let url = `${API_BASE_URL}/lessons`;
        if (difficulty) {
            url += `?difficulty=${difficulty}`;
        }

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && data.lessons.length > 0) {
            // Display lessons as cards
            container.innerHTML = data.lessons.map(lesson => `
                <div class="card lesson-card" onclick="openLesson(${lesson.id})">
                    <div style="display: flex; align-items: flex-start;">
                        <span class="lesson-number">${lesson.orderNumber}</span>
                        <div style="flex: 1;">
                            <h3 style="margin-bottom: var(--spacing-xs);">${escapeHtml(lesson.title)}</h3>
                            <p class="text-muted" style="margin-bottom: var(--spacing-sm);">
                                ${escapeHtml(lesson.description)}
                            </p>
                            <span class="badge badge-${escapeHtml(lesson.difficulty)}">${escapeHtml(lesson.difficulty)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted">No lessons available.</p>';
        }
    } catch (error) {
        console.error('Error loading lessons:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                Unable to load lessons. Please check your connection and try again.
            </div>
        `;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// LESSON VIEWER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opens a specific lesson for viewing
 *
 * @param {number} lessonId - The ID of the lesson to open
 */
async function openLesson(lessonId) {
    try {
        const response = await fetch(`${API_BASE_URL}/lessons/${lessonId}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success) {
            currentLesson = data.lesson;
            displayLesson(data.lesson);
        } else {
            alert('Lesson not found');
        }
    } catch (error) {
        console.error('Error loading lesson:', error);
        alert('Unable to load lesson. Please try again.');
    }
}

/**
 * Displays lesson content in the viewer
 *
 * @param {object} lesson - Lesson object with title, content, etc.
 */
function displayLesson(lesson) {
    // Hide lesson list, show viewer
    document.getElementById('lessonList').classList.add('hidden');
    document.getElementById('lessonViewer').classList.remove('hidden');

    // Update lesson title
    document.getElementById('lessonTitle').textContent = lesson.title;

    // Update difficulty badge
    const badge = document.getElementById('lessonBadge');
    badge.textContent = lesson.difficulty;
    badge.className = `badge badge-${escapeHtml(lesson.difficulty)}`;

    // Insert lesson content (HTML - from trusted database source)
    document.getElementById('lessonContent').innerHTML = lesson.content;

    // Reset AI help section
    const aiResponse = document.getElementById('aiHelpResponse');
    if (aiResponse) {
        aiResponse.classList.add('hidden');
        aiResponse.innerHTML = '';
    }
}

/**
 * Closes the lesson viewer and returns to lesson list
 */
function closeLessonViewer() {
    // Hide viewer, show list
    document.getElementById('lessonViewer').classList.add('hidden');
    document.getElementById('lessonList').classList.remove('hidden');

    currentLesson = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LESSON PROGRESS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marks current lesson as completed
 */
async function markComplete() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !currentLesson) return;

    try {
        const response = await fetch(`${API_BASE_URL}/progress/lesson-complete`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                studentId: user.id,
                lessonId: currentLesson.id
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`Lesson completed! You have completed ${data.lessonsCompleted} of ${data.totalLessons} lessons.`);
        }
    } catch (error) {
        console.error('Error marking lesson complete:', error);
        alert('Unable to save progress. Please try again.');
    }
}

/**
 * Navigates to related quiz
 */
function goToQuiz() {
    if (currentLesson) {
        // Store lesson ID for quiz page
        localStorage.setItem('lastLessonId', currentLesson.id);
    }
    window.location.href = 'quizzes.html';
}

// ─────────────────────────────────────────────────────────────────────────────
// AI HELP FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Requests AI-powered help for the current lesson
 * This demonstrates the AI assistance feature
 */
function requestAIHelp() {
    if (!currentLesson) return;

    const responseContainer = document.getElementById('aiHelpResponse');
    if (!responseContainer) return;

    // Show loading state
    responseContainer.classList.remove('hidden');
    responseContainer.innerHTML = '<p><span class="spinner"></span> Generating AI assistance...</p>';

    // Simulate AI response (in production, this would call the AI service)
    setTimeout(() => {
        // Generate contextual help based on lesson title
        const aiHelp = generateAIHelp(currentLesson.title);

        responseContainer.innerHTML = `
            <div style="background: white; padding: var(--spacing-md); border-radius: var(--radius-sm); margin-top: var(--spacing-sm);">
                <p><strong>AI Assistant says:</strong></p>
                <p>${aiHelp}</p>
                <p class="text-muted" style="font-size: 0.875rem; margin-top: var(--spacing-sm);">
                    <em>This is a demonstration of the AI help feature. In the full system,
                    this will provide personalized explanations based on your specific questions.</em>
                </p>
            </div>
        `;
    }, 1500);
}

/**
 * Generates mock AI help based on lesson topic
 * This simulates what the AI would provide
 *
 * @param {string} lessonTitle - The title of the current lesson
 * @returns {string} AI-generated help text
 */
function generateAIHelp(lessonTitle) {
    // Map of lesson topics to helpful explanations
    const helpTexts = {
        'Introduction to Programming': `
            Think of programming like writing a recipe. Just as a recipe tells a cook what steps
            to follow, a program tells a computer what to do. The key is breaking down tasks
            into small, clear instructions. Start simple - even "Hello World" is your first program!
        `,
        'Variables and Data Types': `
            Imagine variables as labeled boxes where you store things. The label is the variable name,
            and what's inside is the value. Different boxes hold different types of things:
            numbers (integers), text (strings), true/false (booleans). Example:
            <code>let age = 20;</code> creates a box labeled "age" containing 20.
        `,
        'Control Structures: Conditionals': `
            Conditionals are like decision points in a flowchart. "If this, then do that."
            Think of it like: IF it's raining (condition is true), THEN take an umbrella.
            ELSE (condition is false), don't take one. Your code makes decisions the same way!
        `,
        'Loops and Iteration': `
            Loops help you avoid repetition. Instead of writing the same code 10 times,
            you write it once inside a loop that runs 10 times. Think of it like telling
            someone to "knock on the door 3 times" instead of "knock, knock, knock."
        `
    };

    // Return specific help or generic help
    return helpTexts[lessonTitle] || `
        This lesson covers important programming concepts. Take your time to understand each part.
        Try writing small code examples yourself to reinforce what you learn. Practice is key!
    `;
}
