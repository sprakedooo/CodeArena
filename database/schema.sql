-- ============================================================================
-- AI-POWERED GAME-BASED ADAPTIVE LEARNING SYSTEM
-- Database Schema (MySQL)
-- ============================================================================
--
-- PURPOSE:
-- This SQL file creates all tables needed for the game-based adaptive
-- learning system. Tables support:
-- - User authentication and profiles
-- - Programming language selection
-- - Questions organized by language and difficulty level
-- - Answer tracking for adaptive learning
-- - Progress and level advancement
-- - Reward system (points, badges)
-- - AI-generated feedback storage
--
-- FOR THESIS PANELISTS:
-- This schema demonstrates proper relational database design with:
-- - Primary keys for unique identification
-- - Foreign keys for data integrity
-- - Level and language columns for adaptive filtering
-- - Performance tracking for AI analysis
--
-- HOW TO USE:
-- 1. Create database: CREATE DATABASE ai_cai_game;
-- 2. Select database: USE ai_cai_game;
-- 3. Run this entire file to create all tables
-- ============================================================================


-- ============================================================================
-- CREATE DATABASE
-- ============================================================================

CREATE DATABASE IF NOT EXISTS ai_cai_game;
USE ai_cai_game;


-- ============================================================================
-- TABLE 1: users
-- ============================================================================
-- PURPOSE: Stores student accounts with game-related statistics
--
-- EXPLANATION:
-- This is the central user table. Unlike traditional CAI systems,
-- this includes gamification fields (total_points, current_level, badges)
-- that support the reward-based learning approach.
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    -- Primary Key: Unique identifier for each user
    user_id INT AUTO_INCREMENT PRIMARY KEY,

    -- Authentication fields
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- Will store hashed password in production
    full_name VARCHAR(100) NOT NULL,

    -- Game statistics
    total_points INT DEFAULT 0,                          -- Accumulated points
    current_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    badges JSON DEFAULT '[]',                            -- Array of earned badge IDs

    -- Language preference
    selected_language VARCHAR(20) DEFAULT NULL,          -- python, java, or cpp

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,

    -- Indexes for faster queries
    INDEX idx_email (email),
    INDEX idx_level (current_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert demo users
INSERT INTO users (email, password, full_name, total_points, current_level, badges, selected_language) VALUES
('student@example.com', 'student123', 'Juan Dela Cruz', 150, 'beginner', '["first_login"]', 'python'),
('maria@example.com', 'maria123', 'Maria Santos', 450, 'intermediate', '["first_login", "fast_learner"]', 'python');


-- ============================================================================
-- TABLE 2: programming_languages
-- ============================================================================
-- PURPOSE: Stores available programming languages
--
-- EXPLANATION:
-- This table defines the programming languages available for study.
-- Each language has associated metadata for display and filtering.
-- ============================================================================

CREATE TABLE IF NOT EXISTS programming_languages (
    -- Primary Key
    language_id INT AUTO_INCREMENT PRIMARY KEY,

    -- Language information
    language_code VARCHAR(20) NOT NULL UNIQUE,  -- 'python', 'java', 'cpp'
    language_name VARCHAR(50) NOT NULL,          -- 'Python', 'Java', 'C++'
    description TEXT,
    icon VARCHAR(10) DEFAULT '',                -- Emoji icon
    difficulty_label VARCHAR(50),                -- 'Recommended for beginners'

    -- Active status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert the three supported languages
INSERT INTO programming_languages (language_code, language_name, description, icon, difficulty_label) VALUES
('python', 'Python', 'A beginner-friendly language known for its simple syntax and versatility.', '🐍', 'Recommended for beginners'),
('java', 'Java', 'A powerful object-oriented language used in enterprise applications.', '☕', 'Intermediate'),
('cpp', 'C++', 'A high-performance language for system programming and game development.', '⚡', 'Advanced');


-- ============================================================================
-- TABLE 3: questions
-- ============================================================================
-- PURPOSE: Stores all programming questions organized by language and level
--
-- EXPLANATION:
-- Questions are the core content of the adaptive learning system.
-- Each question is tagged with:
-- - language: Which programming language
-- - level: Difficulty (beginner, intermediate, advanced)
-- - topic: Specific topic for weak area tracking
--
-- The level field is CRITICAL for adaptive learning - questions are
-- served based on the student's current level.
-- ============================================================================

CREATE TABLE IF NOT EXISTS questions (
    -- Primary Key
    question_id INT AUTO_INCREMENT PRIMARY KEY,

    -- Classification (IMPORTANT for adaptive learning)
    language_code VARCHAR(20) NOT NULL,                              -- python, java, cpp
    level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,     -- Difficulty level
    topic VARCHAR(100) NOT NULL,                                     -- Specific topic (e.g., 'Loops', 'Variables')

    -- Question content
    question_text TEXT NOT NULL,
    options JSON NOT NULL,                   -- Array: ["A) option1", "B) option2", ...]
    correct_answer VARCHAR(5) NOT NULL,      -- 'A', 'B', 'C', or 'D'

    -- AI hint shown when answer is wrong
    hint TEXT NOT NULL,

    -- Explanation shown after answering
    explanation TEXT,

    -- Points awarded for correct answer
    points_value INT DEFAULT 10,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key
    FOREIGN KEY (language_code) REFERENCES programming_languages(language_code),

    -- Indexes for adaptive question selection
    INDEX idx_language (language_code),
    INDEX idx_level (level),
    INDEX idx_language_level (language_code, level),  -- Composite index for efficient filtering
    INDEX idx_topic (topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample Python beginner questions
INSERT INTO questions (language_code, level, topic, question_text, options, correct_answer, hint, explanation, points_value) VALUES
('python', 'beginner', 'Variables',
 'How do you create a variable named "age" with value 25 in Python?',
 '["A) int age = 25", "B) age = 25", "C) var age = 25", "D) let age = 25"]',
 'B',
 'Python does not require type declarations. Variables are created by simple assignment.',
 'In Python, you simply write variable_name = value. No type keyword needed.',
 10),

('python', 'beginner', 'Data Types',
 'What is the data type of: x = "Hello"',
 '["A) int", "B) float", "C) str", "D) char"]',
 'C',
 'Text enclosed in quotes is called a string in Python.',
 'Strings (str) are sequences of characters enclosed in quotes.',
 10),

('python', 'beginner', 'Output',
 'Which function is used to display output in Python?',
 '["A) echo()", "B) console.log()", "C) print()", "D) System.out.println()"]',
 'C',
 'The Python output function is simple and starts with "p".',
 'print() is the built-in function for displaying output in Python.',
 10);

-- Insert sample Python intermediate questions
INSERT INTO questions (language_code, level, topic, question_text, options, correct_answer, hint, explanation, points_value) VALUES
('python', 'intermediate', 'Loops',
 'What does this code print?\nfor i in range(3):\n    print(i)',
 '["A) 1 2 3", "B) 0 1 2", "C) 0 1 2 3", "D) 1 2"]',
 'B',
 'range() starts from 0 by default and stops BEFORE the specified number.',
 'range(3) generates 0, 1, 2 (three numbers starting from 0).',
 20),

('python', 'intermediate', 'Functions',
 'Which keyword is used to define a function in Python?',
 '["A) function", "B) func", "C) def", "D) define"]',
 'C',
 'It is a short form of "define".',
 'def is used to define functions in Python.',
 20);


-- ============================================================================
-- TABLE 4: user_answers
-- ============================================================================
-- PURPOSE: Records every answer submitted by students
--
-- EXPLANATION:
-- This table is essential for:
-- 1. Tracking individual question responses
-- 2. Identifying weak areas (topics with many wrong answers)
-- 3. Calculating accuracy for level advancement
-- 4. Enabling AI feedback generation
--
-- The is_correct field is critical for adaptive algorithm decisions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_answers (
    -- Primary Key
    answer_id INT AUTO_INCREMENT PRIMARY KEY,

    -- Foreign Keys
    user_id INT NOT NULL,
    question_id INT NOT NULL,

    -- Answer details
    selected_answer VARCHAR(5) NOT NULL,     -- What the student chose
    is_correct BOOLEAN NOT NULL,             -- Was it right?

    -- AI hint (if answer was wrong)
    hint_shown TEXT,

    -- Points earned (0 if wrong)
    points_earned INT DEFAULT 0,

    -- Time tracking
    time_spent_seconds INT DEFAULT NULL,     -- How long student took

    -- Timestamp
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE,

    -- Indexes for performance analysis
    INDEX idx_user (user_id),
    INDEX idx_question (question_id),
    INDEX idx_correct (is_correct),
    INDEX idx_user_correct (user_id, is_correct)  -- For accuracy calculation
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================================
-- TABLE 5: progress
-- ============================================================================
-- PURPOSE: Tracks student progress per programming language
--
-- EXPLANATION:
-- This table enables ADAPTIVE LEARNING by tracking:
-- - Current level per language (determines question difficulty)
-- - Questions answered and accuracy (for level advancement)
-- - Consecutive correct answers (streak tracking)
--
-- The level field here drives the question selection algorithm.
-- ============================================================================

CREATE TABLE IF NOT EXISTS progress (
    -- Primary Key
    progress_id INT AUTO_INCREMENT PRIMARY KEY,

    -- Foreign Keys
    user_id INT NOT NULL,
    language_code VARCHAR(20) NOT NULL,

    -- Current level (CRITICAL for adaptive learning)
    current_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',

    -- Statistics
    questions_answered INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    accuracy_percent DECIMAL(5,2) DEFAULT 0.00,

    -- Streak tracking (for level advancement)
    consecutive_correct INT DEFAULT 0,

    -- Topic-wise performance (JSON for flexibility)
    topic_performance JSON DEFAULT '{}',

    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (language_code) REFERENCES programming_languages(language_code),

    -- Unique constraint: One progress record per user per language
    UNIQUE KEY unique_user_language (user_id, language_code),

    -- Indexes
    INDEX idx_user (user_id),
    INDEX idx_language (language_code),
    INDEX idx_level (current_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert demo progress
INSERT INTO progress (user_id, language_code, current_level, questions_answered, correct_answers, accuracy_percent, consecutive_correct) VALUES
(1, 'python', 'beginner', 12, 8, 66.67, 2);


-- ============================================================================
-- TABLE 6: rewards
-- ============================================================================
-- PURPOSE: Tracks points history and badge awards
--
-- EXPLANATION:
-- This table implements the GAMIFICATION aspect of the system:
-- - Records every point transaction
-- - Tracks badge achievements
-- - Enables leaderboard features (future)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rewards (
    -- Primary Key
    reward_id INT AUTO_INCREMENT PRIMARY KEY,

    -- Foreign Key
    user_id INT NOT NULL,

    -- Reward details
    reward_type ENUM('points', 'badge', 'level_up') NOT NULL,
    points_amount INT DEFAULT 0,                          -- Points earned
    badge_id VARCHAR(50) DEFAULT NULL,                    -- Badge identifier
    description VARCHAR(255),                             -- Why reward was given

    -- Timestamp
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_user (user_id),
    INDEX idx_type (reward_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert demo rewards
INSERT INTO rewards (user_id, reward_type, points_amount, badge_id, description) VALUES
(1, 'badge', 10, 'first_login', 'Welcome badge for first login'),
(1, 'points', 10, NULL, 'Correct answer in Python beginner'),
(1, 'points', 10, NULL, 'Correct answer in Python beginner');


-- ============================================================================
-- TABLE 7: feedback
-- ============================================================================
-- PURPOSE: Stores AI-generated feedback for students
--
-- EXPLANATION:
-- This table stores the personalized feedback generated by the AI system.
-- Feedback includes:
-- - Overall assessment of performance
-- - Identified weak areas with recommendations
-- - Strong areas to acknowledge
-- - Suggested next steps
--
-- This is a KEY table for demonstrating AI-powered features.
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback (
    -- Primary Key
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,

    -- Foreign Keys
    user_id INT NOT NULL,
    language_code VARCHAR(20) NOT NULL,

    -- AI-generated content
    overall_assessment TEXT,                 -- General performance summary
    weak_areas JSON DEFAULT '[]',            -- Array of weak topics with advice
    strong_areas JSON DEFAULT '[]',          -- Array of mastered topics
    next_steps JSON DEFAULT '[]',            -- Recommended actions

    -- Generation metadata
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,

    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (language_code) REFERENCES programming_languages(language_code),

    -- Indexes
    INDEX idx_user (user_id),
    INDEX idx_language (language_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert demo feedback
INSERT INTO feedback (user_id, language_code, overall_assessment, weak_areas, strong_areas, next_steps) VALUES
(1, 'python',
 'You are making good progress in Python basics. Focus on loops to improve further.',
 '[{"topic": "Loops", "accuracy": 50, "message": "You are struggling with loops. Practice more!"}]',
 '[{"topic": "Data Types", "accuracy": 100, "message": "Excellent understanding of data types!"}]',
 '["Review the lesson on Loops", "Practice 5 more loop questions", "Try nested loop examples"]'
);


-- ============================================================================
-- VIEWS: Useful queries for analytics
-- ============================================================================

-- View: Student Performance Summary
CREATE OR REPLACE VIEW v_student_performance AS
SELECT
    u.user_id,
    u.full_name,
    u.total_points,
    u.current_level,
    p.language_code,
    p.questions_answered,
    p.accuracy_percent,
    p.consecutive_correct
FROM users u
LEFT JOIN progress p ON u.user_id = p.user_id
ORDER BY u.total_points DESC;

-- View: Question Statistics
CREATE OR REPLACE VIEW v_question_stats AS
SELECT
    q.question_id,
    q.language_code,
    q.level,
    q.topic,
    COUNT(ua.answer_id) as times_answered,
    SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) as times_correct,
    ROUND(AVG(ua.is_correct) * 100, 2) as success_rate
FROM questions q
LEFT JOIN user_answers ua ON q.question_id = ua.question_id
GROUP BY q.question_id;


-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
--
-- TABLE SUMMARY:
-- 1. users                 - Student accounts with game stats
-- 2. programming_languages - Available languages (Python, Java, C++)
-- 3. questions            - Questions by language and level
-- 4. user_answers         - Individual answer records
-- 5. progress             - Per-language progress tracking
-- 6. rewards              - Points and badge history
-- 7. feedback             - AI-generated learning feedback
--
-- KEY ADAPTIVE LEARNING FIELDS:
-- - questions.level        : Determines question difficulty
-- - progress.current_level : Student's current ability level
-- - progress.accuracy_percent : Used for level advancement
-- - user_answers.is_correct : Feeds AI analysis
--
-- ============================================================================
