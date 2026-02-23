/**
 * ============================================================================
 * AUTHENTICATION JAVASCRIPT (auth.js)
 * ============================================================================
 *
 * PURPOSE:
 * Handles user authentication - login and registration form submissions.
 * Communicates with the backend API and manages user sessions.
 *
 * FOR THESIS PANELISTS:
 * This file demonstrates client-side form handling and API communication.
 * User data is stored in localStorage for session management.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Backend API base URL
 * Change this if your server runs on a different port
 */
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Returns headers object with Authorization Bearer token for API requests
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Displays an alert message to the user
 *
 * @param {string} message - The message to display
 * @param {string} type - Alert type: 'success', 'error', 'warning', 'info'
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    // Clear previous alerts and show new one
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

/**
 * Stores user data in localStorage for session management
 *
 * @param {object} user - User object containing id, email, fullName, role
 */
function saveUserSession(user, token) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('isLoggedIn', 'true');
    if (token) {
        localStorage.setItem('token', token);
    }
}

/**
 * Retrieves current user from localStorage
 *
 * @returns {object|null} User object or null if not logged in
 */
function getCurrentUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * Redirects user to appropriate dashboard based on role
 *
 * @param {string} role - 'student' or 'faculty'
 */
function redirectToDashboard(role) {
    if (role === 'faculty') {
        window.location.href = 'dashboard_faculty.html';
    } else {
        window.location.href = 'dashboard_student.html';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN FORM HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles login form submission
 * Sends credentials to backend and processes response
 */
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async function (event) {
        // Prevent default form submission (page reload)
        event.preventDefault();

        // Get form values
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Basic validation
        if (!email || !password) {
            showAlert('Please fill in all fields', 'error');
            return;
        }

        try {
            // Send login request to backend API
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            // Parse response
            const data = await response.json();

            if (data.success) {
                // Login successful
                showAlert('Login successful! Redirecting...', 'success');

                // Save user session with JWT token
                saveUserSession(data.user, data.token);

                // Redirect to appropriate dashboard after brief delay
                setTimeout(() => {
                    redirectToDashboard(data.user.role);
                }, 1000);
            } else {
                // Login failed
                showAlert(data.message || 'Invalid credentials', 'error');
            }
        } catch (error) {
            // Network or server error
            console.error('Login error:', error);
            showAlert('Unable to connect to server. Please try again.', 'error');
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION FORM HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles registration form submission
 * Creates new user account via backend API
 */
const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async function (event) {
        // Prevent default form submission
        event.preventDefault();

        // Get form values
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const role = document.getElementById('role').value;

        // Validation
        if (!fullName || !email || !password || !confirmPassword || !role) {
            showAlert('Please fill in all fields', 'error');
            return;
        }

        // Check password match
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }

        // Check password length
        if (password.length < 6) {
            showAlert('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            // Send registration request to backend API
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fullName, email, password, role })
            });

            // Parse response
            const data = await response.json();

            if (data.success) {
                // Registration successful - auto-login with token
                showAlert('Account created successfully! Redirecting...', 'success');

                // Save session with token and redirect to dashboard
                saveUserSession(data.user, data.token);
                setTimeout(() => {
                    redirectToDashboard(data.user.role);
                }, 1000);
            } else {
                // Registration failed
                showAlert(data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            // Network or server error
            console.error('Registration error:', error);
            showAlert('Unable to connect to server. Please try again.', 'error');
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-REDIRECT IF ALREADY LOGGED IN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if user is already logged in when visiting login/register pages
 * Redirect to dashboard if session exists
 */
(function checkExistingSession() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const user = getCurrentUser();

    // If on login or register page and already logged in, redirect
    if (isLoggedIn === 'true' && user) {
        const currentPage = window.location.pathname;
        if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
            redirectToDashboard(user.role);
        }
    }
})();
