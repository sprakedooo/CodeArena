/**
 * ============================================================================
 * DASHBOARD JAVASCRIPT (dashboard.js)
 * ============================================================================
 *
 * PURPOSE:
 * Handles dashboard functionality for both Student and Faculty dashboards.
 * Loads progress data, statistics, and manages navigation.
 *
 * FOR THESIS PANELISTS:
 * This file demonstrates data fetching and display for the dashboard views.
 * It shows how progress tracking data is presented to users.
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

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify user is logged in, redirect to login if not
 */
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!isLoggedIn || !user) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return null;
    }

    return user;
}

/**
 * Handle logout
 */
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize dashboard when page loads
 */
document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    const user = checkAuth();
    if (!user) return;

    // Display user name
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = user.fullName;
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    }

    // Load appropriate dashboard data based on user role
    if (user.role === 'faculty') {
        loadFacultyDashboard();
    } else {
        loadStudentDashboard(user.id);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT DASHBOARD FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads all data for student dashboard
 *
 * @param {number} studentId - The logged-in student's ID
 */
async function loadStudentDashboard(studentId) {
    try {
        // Fetch student progress from API
        const progressResponse = await fetch(`${API_BASE_URL}/progress/${studentId}`, {
            headers: getAuthHeaders()
        });
        const progressData = await progressResponse.json();

        if (progressData.success) {
            displayStudentProgress(progressData.progress);
        }

        // Fetch recent lessons
        loadRecentLessons();

        // Fetch quiz history
        loadQuizHistory(studentId);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Display error message to user
        displayError('Unable to load dashboard data. Please refresh the page.');
    }
}

/**
 * Displays student progress statistics
 *
 * @param {object} progress - Progress data from API
 */
function displayStudentProgress(progress) {
    // Update lessons completed
    const lessonsElement = document.getElementById('lessonsCompleted');
    if (lessonsElement) {
        lessonsElement.textContent = `${progress.lessons.completed}/${progress.lessons.total}`;
    }

    // Update lesson progress bar
    const lessonProgress = document.getElementById('lessonProgress');
    if (lessonProgress) {
        lessonProgress.style.width = `${progress.lessons.percentage}%`;
    }

    // Update quizzes passed
    const quizzesElement = document.getElementById('quizzesPassed');
    if (quizzesElement) {
        quizzesElement.textContent = `${progress.quizzes.passed}/${progress.quizzes.total}`;
    }

    // Update quiz progress bar
    const quizProgress = document.getElementById('quizProgress');
    if (quizProgress) {
        quizProgress.style.width = `${progress.quizzes.percentage}%`;
    }

    // Update average score
    const averageElement = document.getElementById('averageScore');
    if (averageElement) {
        averageElement.textContent = `${progress.quizzes.averageScore}%`;
    }
}

/**
 * Loads recent lessons for the dashboard
 */
async function loadRecentLessons() {
    try {
        const response = await fetch(`${API_BASE_URL}/lessons`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        const container = document.getElementById('recentLessons');
        if (!container) return;

        if (data.success && data.lessons.length > 0) {
            // Display first 3 lessons
            const recentLessons = data.lessons.slice(0, 3);

            container.innerHTML = recentLessons.map(lesson => `
                <div style="display: flex; align-items: center; padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--border-color);">
                    <span class="lesson-number">${escapeHtml(String(lesson.orderNumber))}</span>
                    <div style="flex: 1;">
                        <strong>${escapeHtml(lesson.title)}</strong>
                        <span class="badge badge-${escapeHtml(lesson.difficulty)}" style="margin-left: 8px;">${escapeHtml(lesson.difficulty)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted">No lessons available.</p>';
        }
    } catch (error) {
        console.error('Error loading lessons:', error);
    }
}

/**
 * Loads quiz history for the dashboard
 *
 * @param {number} studentId - Student's ID
 */
async function loadQuizHistory(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/quiz-history/${studentId}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();

        const container = document.getElementById('recentQuizResults');
        if (!container) return;

        if (data.success && data.quizHistory.length > 0) {
            // Display last 3 quiz attempts
            const recentAttempts = data.quizHistory.slice(-3).reverse();

            container.innerHTML = recentAttempts.map(attempt => `
                <div style="display: flex; justify-content: space-between; padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--border-color);">
                    <span>Quiz ${attempt.quizId}</span>
                    <span>
                        <strong class="${attempt.passed ? 'text-success' : 'text-danger'}">${attempt.score}%</strong>
                        ${attempt.passed ? '✓' : '✗'}
                    </span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted">No quiz attempts yet.</p>';
        }
    } catch (error) {
        console.error('Error loading quiz history:', error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACULTY DASHBOARD FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads all data for faculty dashboard
 */
async function loadFacultyDashboard() {
    try {
        // Fetch analytics data
        const analyticsResponse = await fetch(`${API_BASE_URL}/progress/analytics/all`, {
            headers: getAuthHeaders()
        });
        const analyticsData = await analyticsResponse.json();

        if (analyticsData.success) {
            displayClassStatistics(analyticsData.classStatistics);
            displayStudentTable(analyticsData.students);
        }

        // Fetch content counts
        loadContentSummary();

    } catch (error) {
        console.error('Error loading faculty dashboard:', error);
        displayError('Unable to load analytics data. Please refresh the page.');
    }
}

/**
 * Displays class-wide statistics
 *
 * @param {object} stats - Class statistics from API
 */
function displayClassStatistics(stats) {
    // Total students
    const totalStudentsEl = document.getElementById('totalStudents');
    if (totalStudentsEl) {
        totalStudentsEl.textContent = stats.totalStudents;
    }

    // Class average
    const classAverageEl = document.getElementById('classAverage');
    if (classAverageEl) {
        classAverageEl.textContent = `${stats.averageQuizScore}%`;
    }

    // Students needing attention
    const needAttentionEl = document.getElementById('needAttention');
    if (needAttentionEl) {
        needAttentionEl.textContent = stats.studentsNeedingAttention;
    }
}

/**
 * Displays student performance table
 *
 * @param {array} students - Array of student progress data
 */
function displayStudentTable(students) {
    const tableBody = document.getElementById('studentTable');
    if (!tableBody) return;

    if (students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">No student data available.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = students.map(student => `
        <tr>
            <td>${escapeHtml(student.studentName)}</td>
            <td>
                <div class="progress-bar" style="width: 100px; display: inline-block; vertical-align: middle;">
                    <div class="progress-bar-fill" style="width: ${student.lessonProgress}%"></div>
                </div>
                <span style="margin-left: 8px;">${student.lessonProgress}%</span>
            </td>
            <td>${student.quizzesPassed}</td>
            <td class="${student.averageScore >= 60 ? 'text-success' : 'text-danger'}">
                ${student.averageScore}%
            </td>
            <td>
                ${student.needsAttention
            ? '<span class="badge" style="background: #fee2e2; color: #991b1b;">Needs Help</span>'
            : '<span class="badge" style="background: #dcfce7; color: #166534;">On Track</span>'
        }
            </td>
        </tr>
    `).join('');
}

/**
 * Loads content summary (lesson/quiz counts)
 */
async function loadContentSummary() {
    try {
        // Fetch lessons count
        const lessonsResponse = await fetch(`${API_BASE_URL}/lessons`, {
            headers: getAuthHeaders()
        });
        const lessonsData = await lessonsResponse.json();

        // Fetch quizzes count
        const quizzesResponse = await fetch(`${API_BASE_URL}/quizzes`, {
            headers: getAuthHeaders()
        });
        const quizzesData = await quizzesResponse.json();

        // Update display
        const totalLessonsEl = document.getElementById('totalLessons');
        if (totalLessonsEl && lessonsData.success) {
            totalLessonsEl.textContent = lessonsData.count;
        }

        const totalQuizzesEl = document.getElementById('totalQuizzes');
        if (totalQuizzesEl && quizzesData.success) {
            totalQuizzesEl.textContent = quizzesData.count;
        }

        const todayAttemptsEl = document.getElementById('todayAttempts');
        if (todayAttemptsEl) {
            // Mock value for demo
            todayAttemptsEl.textContent = '5';
        }
    } catch (error) {
        console.error('Error loading content summary:', error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Displays error message on the dashboard
 *
 * @param {string} message - Error message to display
 */
function displayError(message) {
    // Create error alert at top of main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.textContent = message;
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
    }
}
