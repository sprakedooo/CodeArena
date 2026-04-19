-- ============================================================================
-- CODEARENA DATABASE SCHEMA
-- AI-Powered Game-Based Adaptive Learning System
-- ============================================================================
--
-- This schema creates all tables needed for the CodeArena system.
-- Run this script to set up your MySQL database.
--
-- Usage: mysql -u root -p < schema.sql
-- ============================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS codearena;
USE codearena;

-- ============================================================================
-- USERS TABLE
-- Stores student accounts and game progress
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('student', 'faculty') DEFAULT 'student',
    total_points INT DEFAULT 0,
    current_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    badges JSON,
    selected_language VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- QUESTIONS TABLE
-- Programming questions for all languages and levels
-- ============================================================================
CREATE TABLE IF NOT EXISTS questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    language_code VARCHAR(20) NOT NULL,
    level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
    topic VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    options JSON NOT NULL,
    correct_answer CHAR(1) NOT NULL,
    hint TEXT,
    explanation TEXT,
    points_value INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- USER_ANSWERS TABLE
-- Records all answers submitted by users
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_answers (
    answer_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_answer CHAR(1) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_earned INT DEFAULT 0,
    hint_shown TEXT,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);

-- ============================================================================
-- PROGRESS TABLE
-- Tracks learning progress per user per language
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    language_code VARCHAR(20) NOT NULL,
    current_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    questions_answered INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    consecutive_correct INT DEFAULT 0,
    accuracy_percent DECIMAL(5,2) DEFAULT 0.00,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_language (user_id, language_code)
);

-- ============================================================================
-- REWARDS TABLE
-- Points and badges earned by users
-- ============================================================================
CREATE TABLE IF NOT EXISTS rewards (
    reward_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reward_type ENUM('points', 'badge', 'level_up') NOT NULL,
    points_amount INT DEFAULT 0,
    badge_id VARCHAR(50),
    description VARCHAR(255),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- FEEDBACK TABLE
-- AI-generated feedback for users
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    language_code VARCHAR(20) NOT NULL,
    overall_assessment TEXT,
    weak_areas JSON,
    strong_areas JSON,
    next_steps JSON,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- SAMPLE DATA: Demo User
-- ============================================================================
-- Passwords are bcrypt-hashed (student123 and maria123 respectively)
INSERT INTO users (email, password, full_name, role, total_points, current_level, badges) VALUES
('student@example.com', '$2b$10$DgFiUCcmDnn5ZXTxal55Eubu7BfrYtdAnAn75R1C4F1r9UX4FiyJi', 'Juan Dela Cruz', 'student', 150, 'beginner', '["first_login"]'),
('maria@example.com', '$2b$10$0jORJv28ymD7M5TEh6KBae21RoHdF7/8zevQeDZs5eyPWQgydRfgy', 'Maria Santos', 'student', 450, 'intermediate', '["first_login", "fast_learner", "perfect_score"]');

-- ============================================================================
-- SAMPLE DATA: Python Questions (Beginner)
-- ============================================================================
INSERT INTO questions (language_code, level, topic, question_text, options, correct_answer, hint, explanation) VALUES
('python', 'beginner', 'Variables', 'How do you create a variable named "age" with value 25 in Python?',
 '["A) int age = 25", "B) age = 25", "C) var age = 25", "D) let age = 25"]', 'B',
 'Python does not require type declarations. Variables are created by simple assignment.',
 'In Python, you simply write variable_name = value. No type keyword needed.'),

('python', 'beginner', 'Data Types', 'What is the data type of: x = "Hello"',
 '["A) int", "B) float", "C) str", "D) char"]', 'C',
 'Text enclosed in quotes is called a string in Python.',
 'Strings (str) are sequences of characters enclosed in quotes.'),

('python', 'beginner', 'Output', 'Which function is used to display output in Python?',
 '["A) echo()", "B) console.log()", "C) print()", "D) System.out.println()"]', 'C',
 'The Python output function is simple and starts with "p".',
 'print() is the built-in function for displaying output in Python.'),

('python', 'beginner', 'Comments', 'How do you write a single-line comment in Python?',
 '["A) // comment", "B) /* comment */", "C) # comment", "D) -- comment"]', 'C',
 'Python uses a special symbol that looks like a hashtag.',
 'The hash symbol (#) is used for single-line comments in Python.'),

('python', 'beginner', 'Input', 'Which function gets user input in Python?',
 '["A) scan()", "B) read()", "C) input()", "D) get()"]', 'C',
 'The function name directly describes what it does - getting input.',
 'input() reads a line of text from the user.');

-- ============================================================================
-- SAMPLE DATA: Python Questions (Intermediate)
-- ============================================================================
INSERT INTO questions (language_code, level, topic, question_text, options, correct_answer, hint, explanation, points_value) VALUES
('python', 'intermediate', 'Loops', 'What does this code print?\nfor i in range(3):\n    print(i)',
 '["A) 1 2 3", "B) 0 1 2", "C) 0 1 2 3", "D) 1 2"]', 'B',
 'range() starts from 0 by default and stops BEFORE the specified number.',
 'range(3) generates 0, 1, 2 (three numbers starting from 0).', 20),

('python', 'intermediate', 'Conditionals', 'What keyword is used for "else if" in Python?',
 '["A) else if", "B) elseif", "C) elif", "D) elsif"]', 'C',
 'Python combines "else" and "if" into a shorter keyword.',
 'elif is Pythons way of writing else if.', 20),

('python', 'intermediate', 'Lists', 'How do you add an item to the end of a list in Python?',
 '["A) list.add(item)", "B) list.append(item)", "C) list.push(item)", "D) list.insert(item)"]', 'B',
 'The method name suggests adding something at the end.',
 'append() adds an element to the end of a list.', 20),

('python', 'intermediate', 'Functions', 'Which keyword is used to define a function in Python?',
 '["A) function", "B) func", "C) def", "D) define"]', 'C',
 'Its a short form of "define".',
 'def is used to define functions in Python.', 20);

-- ============================================================================
-- SAMPLE DATA: Java Questions (Beginner)
-- ============================================================================
INSERT INTO questions (language_code, level, topic, question_text, options, correct_answer, hint, explanation) VALUES
('java', 'beginner', 'Variables', 'How do you declare an integer variable "age" with value 25 in Java?',
 '["A) age = 25", "B) int age = 25;", "C) integer age = 25", "D) var age = 25"]', 'B',
 'Java requires you to specify the data type before the variable name.',
 'Java is statically typed: type variableName = value;'),

('java', 'beginner', 'Output', 'Which statement prints "Hello" in Java?',
 '["A) print(\\"Hello\\")", "B) console.log(\\"Hello\\")", "C) System.out.println(\\"Hello\\");", "D) echo \\"Hello\\""]', 'C',
 'Java uses System.out for console output.',
 'System.out.println() is Javas standard output method.'),

('java', 'beginner', 'Data Types', 'Which data type stores text in Java?',
 '["A) char", "B) text", "C) String", "D) varchar"]', 'C',
 'The type name starts with a capital letter in Java.',
 'String (capital S) is the class for text in Java.');

-- ============================================================================
-- SAMPLE DATA: C++ Questions (Beginner)
-- ============================================================================
INSERT INTO questions (language_code, level, topic, question_text, options, correct_answer, hint, explanation) VALUES
('cpp', 'beginner', 'Variables', 'How do you declare an integer variable "num" with value 10 in C++?',
 '["A) num = 10", "B) int num = 10;", "C) integer num = 10", "D) var num = 10"]', 'B',
 'C++ requires type declaration like Java.',
 'C++ syntax: type variableName = value;'),

('cpp', 'beginner', 'Output', 'Which is the correct way to output in C++?',
 '["A) print(\\"Hello\\")", "B) printf(\\"Hello\\")", "C) cout << \\"Hello\\"", "D) System.out.println(\\"Hello\\")"]', 'C',
 'C++ uses stream operators with cout.',
 'cout with << operator is the C++ way to output.'),

('cpp', 'beginner', 'Headers', 'Which header is needed for cout?',
 '["A) #include <stdio.h>", "B) #include <iostream>", "C) #include <conio.h>", "D) #include <output>"]', 'B',
 'iostream handles input/output streams.',
 '<iostream> provides cout and cin for I/O operations.');

-- ============================================================================
-- CLASSROOM MODE TABLES (Moodle-inspired)
-- ============================================================================

-- Virtual classrooms created by faculty
CREATE TABLE IF NOT EXISTS classrooms (
    classroom_id   INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id     INT NOT NULL,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    subject        VARCHAR(100),
    enrollment_key VARCHAR(20) UNIQUE NOT NULL,
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Student ↔ Classroom enrollment
CREATE TABLE IF NOT EXISTS classroom_enrollments (
    enrollment_id  INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id   INT NOT NULL,
    student_id     INT NOT NULL,
    enrolled_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status         ENUM('active', 'removed') DEFAULT 'active',
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id)   REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (classroom_id, student_id)
);

-- Faculty-authored lessons per classroom
CREATE TABLE IF NOT EXISTS classroom_lessons (
    lesson_id      INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id   INT NOT NULL,
    faculty_id     INT NOT NULL,
    title          VARCHAR(255) NOT NULL,
    content        TEXT NOT NULL,
    language       VARCHAR(50),
    order_index    INT DEFAULT 0,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES users(user_id) ON DELETE CASCADE
);

-- Faculty-authored questions/challenges per classroom
CREATE TABLE IF NOT EXISTS classroom_questions (
    question_id    INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id   INT NOT NULL,
    faculty_id     INT NOT NULL,
    question_text  TEXT NOT NULL,
    type           ENUM('mcq', 'fill_blank', 'output_pred', 'ordering') DEFAULT 'mcq',
    options        JSON,
    correct_answer TEXT NOT NULL,
    hint           TEXT,
    difficulty     ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    points         INT DEFAULT 10,
    topic          VARCHAR(100),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES users(user_id) ON DELETE CASCADE
);

-- Faculty-scheduled game sessions
CREATE TABLE IF NOT EXISTS classroom_sessions (
    session_id     INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id   INT NOT NULL,
    faculty_id     INT NOT NULL,
    title          VARCHAR(255) NOT NULL,
    game_mode      ENUM('mcq', 'fill_blank', 'output_pred', 'ordering') DEFAULT 'mcq',
    question_ids   JSON,
    status         ENUM('pending', 'active', 'closed') DEFAULT 'pending',
    starts_at      TIMESTAMP NULL,
    ends_at        TIMESTAMP NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES users(user_id) ON DELETE CASCADE
);

-- Student answers within classroom sessions
CREATE TABLE IF NOT EXISTS classroom_answers (
    answer_id      INT AUTO_INCREMENT PRIMARY KEY,
    session_id     INT NOT NULL,
    student_id     INT NOT NULL,
    question_id    INT NOT NULL,
    answer         TEXT,
    is_correct     BOOLEAN DEFAULT FALSE,
    points_earned  INT DEFAULT 0,
    answered_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id)  REFERENCES classroom_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id)  REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES for better performance
-- ============================================================================
CREATE INDEX idx_questions_language_level ON questions(language_code, level);
CREATE INDEX idx_user_answers_user ON user_answers(user_id);
CREATE INDEX idx_progress_user ON progress(user_id);
CREATE INDEX idx_rewards_user ON rewards(user_id);
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_classrooms_faculty ON classrooms(faculty_id);
CREATE INDEX idx_enrollments_classroom ON classroom_enrollments(classroom_id);
CREATE INDEX idx_enrollments_student ON classroom_enrollments(student_id);
CREATE INDEX idx_classroom_lessons ON classroom_lessons(classroom_id);
CREATE INDEX idx_classroom_questions ON classroom_questions(classroom_id);
CREATE INDEX idx_classroom_sessions ON classroom_sessions(classroom_id);
CREATE INDEX idx_classroom_answers_session ON classroom_answers(session_id);
CREATE INDEX idx_classroom_answers_student ON classroom_answers(student_id);

-- ============================================================================
-- DONE! Database is ready.
-- ============================================================================
SELECT 'CodeArena database schema created successfully!' AS status;
