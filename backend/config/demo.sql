-- ============================================================================
-- CODEARENA — COMPLETE DEMO SETUP
-- Schema + seed data for a full demonstration on any PC
-- ============================================================================
-- Usage:
--   mysql -u root -p < backend/config/demo.sql
--
-- Demo Accounts:
--   Faculty  → faculty@codearena.com  / faculty123
--   Student  → student@codearena.com  / student123
--
-- After running this script, also copy:
--   data/curriculum.json  →  (same path on the other PC)
-- The curriculum.json holds classroom lesson content (JSON-based storage).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS codearena CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE codearena;

-- ============================================================================
-- DROP ALL TABLES (clean slate)
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS ai_feedback_logs;
DROP TABLE IF EXISTS weaknesses;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS lesson_progress;
DROP TABLE IF EXISTS path_lessons;
DROP TABLE IF EXISTS learning_paths;
DROP TABLE IF EXISTS assignment_submissions;
DROP TABLE IF EXISTS assignment_test_cases;
DROP TABLE IF EXISTS coding_assignments;
DROP TABLE IF EXISTS announcement_comments;
DROP TABLE IF EXISTS classroom_announcements;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS classroom_answers;
DROP TABLE IF EXISTS classroom_sessions;
DROP TABLE IF EXISTS classroom_questions;
DROP TABLE IF EXISTS lesson_files;
DROP TABLE IF EXISTS classroom_lessons;
DROP TABLE IF EXISTS classroom_enrollments;
DROP TABLE IF EXISTS classrooms;
DROP TABLE IF EXISTS contributions;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS progress;
DROP TABLE IF EXISTS user_answers;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE users (
    user_id          INT AUTO_INCREMENT PRIMARY KEY,
    email            VARCHAR(255) UNIQUE NOT NULL,
    password         VARCHAR(255) NOT NULL,
    full_name        VARCHAR(255) NOT NULL,
    role             ENUM('student','faculty','admin') DEFAULT 'student',
    avatar           TEXT,
    bio              TEXT,
    total_points     INT DEFAULT 0,
    current_level    ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    badges           JSON,
    selected_language VARCHAR(50) DEFAULT NULL,
    current_path_id  INT DEFAULT NULL,
    total_xp         INT DEFAULT 0,
    streak           INT DEFAULT 0,
    google_id        VARCHAR(255) DEFAULT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- LEARNING PATHS
-- ============================================================================
CREATE TABLE learning_paths (
    path_id      INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    language     VARCHAR(50)  NOT NULL,
    description  TEXT,
    difficulty   ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    icon         VARCHAR(100) DEFAULT 'code',
    color        VARCHAR(20)  DEFAULT '#7c3aed',
    order_index  INT     DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PATH LESSONS
-- ============================================================================
CREATE TABLE path_lessons (
    lesson_id         INT AUTO_INCREMENT PRIMARY KEY,
    path_id           INT NOT NULL,
    title             VARCHAR(255) NOT NULL,
    content           LONGTEXT,
    order_index       INT  DEFAULT 0,
    estimated_minutes INT  DEFAULT 10,
    xp_reward         INT  DEFAULT 20,
    is_published      BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (path_id) REFERENCES learning_paths(path_id) ON DELETE CASCADE
);

-- ============================================================================
-- LESSON PROGRESS
-- ============================================================================
CREATE TABLE lesson_progress (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    lesson_id       INT NOT NULL,
    status          ENUM('not_started','in_progress','completed') DEFAULT 'not_started',
    completed_at    TIMESTAMP NULL,
    time_spent_secs INT DEFAULT 0,
    UNIQUE KEY uq_user_lesson (user_id, lesson_id),
    FOREIGN KEY (user_id)   REFERENCES users(user_id)       ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES path_lessons(lesson_id) ON DELETE CASCADE
);

-- ============================================================================
-- WEAKNESSES
-- ============================================================================
CREATE TABLE weaknesses (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    topic            VARCHAR(100) NOT NULL,
    language         VARCHAR(50)  NOT NULL,
    error_count      INT  DEFAULT 1,
    total_attempts   INT  DEFAULT 1,
    error_rate       DECIMAL(5,2) DEFAULT 100.00,
    last_detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved         BOOLEAN DEFAULT FALSE,
    UNIQUE KEY uq_user_topic_lang (user_id, topic, language),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- CERTIFICATES
-- ============================================================================
CREATE TABLE certificates (
    certificate_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    language_code  VARCHAR(20) NOT NULL,
    level          ENUM('beginner','intermediate','advanced') NOT NULL,
    mastery        VARCHAR(20),
    score          INT DEFAULT 0,
    accuracy       INT DEFAULT 0,
    issued_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cert_user_lang_level (user_id, language_code, level),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- AI FEEDBACK LOGS
-- ============================================================================
CREATE TABLE ai_feedback_logs (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    session_type ENUM('code_analysis','hint','guidance','teaching_insights','assessment') NOT NULL,
    context_data JSON,
    prompt       TEXT,
    response     LONGTEXT,
    classroom_id INT DEFAULT NULL,
    lesson_id    INT DEFAULT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- CLASSROOMS
-- ============================================================================
CREATE TABLE classrooms (
    classroom_id   INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id     INT NOT NULL,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    subject        VARCHAR(100),
    language       VARCHAR(50) DEFAULT 'python',
    enrollment_key VARCHAR(20) UNIQUE NOT NULL,
    banner_image   TEXT DEFAULT NULL,
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- CLASSROOM ENROLLMENTS
-- ============================================================================
CREATE TABLE classroom_enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id  INT NOT NULL,
    student_id    INT NOT NULL,
    enrolled_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status        ENUM('active','removed') DEFAULT 'active',
    UNIQUE KEY uq_enrollment (classroom_id, student_id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id)   REFERENCES users(user_id)           ON DELETE CASCADE
);

-- ============================================================================
-- CLASSROOM LESSONS
-- ============================================================================
CREATE TABLE classroom_lessons (
    lesson_id    INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id INT NOT NULL,
    faculty_id   INT NOT NULL,
    title        VARCHAR(255) NOT NULL,
    content      LONGTEXT NOT NULL,
    language     VARCHAR(50),
    order_index  INT DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES users(user_id)           ON DELETE CASCADE
);

-- ============================================================================
-- LESSON FILE ATTACHMENTS
-- ============================================================================
CREATE TABLE lesson_files (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    lesson_id     INT NOT NULL,
    classroom_id  INT NOT NULL,
    filename      VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size     INT DEFAULT 0,
    file_type     VARCHAR(50),
    uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id)    REFERENCES classroom_lessons(lesson_id)  ON DELETE CASCADE,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id)      ON DELETE CASCADE
);

-- ============================================================================
-- CLASSROOM QUESTIONS
-- ============================================================================
CREATE TABLE classroom_questions (
    question_id  INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id INT NOT NULL,
    faculty_id   INT NOT NULL,
    question_text TEXT NOT NULL,
    type         ENUM('mcq','fill_blank','output_pred','ordering') DEFAULT 'mcq',
    options      JSON,
    correct_answer TEXT NOT NULL,
    hint         TEXT,
    difficulty   ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    points       INT DEFAULT 10,
    topic        VARCHAR(100),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES users(user_id)           ON DELETE CASCADE
);

-- ============================================================================
-- CLASSROOM SESSIONS
-- ============================================================================
CREATE TABLE classroom_sessions (
    session_id   INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id INT NOT NULL,
    faculty_id   INT NOT NULL,
    title        VARCHAR(255) NOT NULL,
    game_mode    ENUM('mcq','fill_blank','output_pred','ordering') DEFAULT 'mcq',
    question_ids JSON,
    status       ENUM('pending','active','closed') DEFAULT 'pending',
    starts_at    TIMESTAMP NULL,
    ends_at      TIMESTAMP NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES users(user_id)           ON DELETE CASCADE
);

-- ============================================================================
-- CLASSROOM ANSWERS
-- ============================================================================
CREATE TABLE classroom_answers (
    answer_id    INT AUTO_INCREMENT PRIMARY KEY,
    session_id   INT NOT NULL,
    student_id   INT NOT NULL,
    question_id  INT NOT NULL,
    answer       TEXT,
    is_correct   BOOLEAN DEFAULT FALSE,
    points_earned INT DEFAULT 0,
    answered_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES classroom_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(user_id)                 ON DELETE CASCADE
);

-- ============================================================================
-- SUBMISSIONS
-- ============================================================================
CREATE TABLE submissions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    assignment_id  INT DEFAULT NULL,
    classroom_id   INT DEFAULT NULL,
    code           LONGTEXT NOT NULL,
    language       VARCHAR(50) NOT NULL,
    score          INT DEFAULT 0,
    passed_tests   INT DEFAULT 0,
    total_tests    INT DEFAULT 0,
    attempt_number INT DEFAULT 1,
    ai_feedback    LONGTEXT,
    submitted_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- CLASSROOM ANNOUNCEMENTS
-- ============================================================================
CREATE TABLE classroom_announcements (
    announcement_id INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id    INT NOT NULL,
    faculty_id      INT NOT NULL,
    body            TEXT NOT NULL,
    link_url        VARCHAR(500) DEFAULT '',
    link_label      VARCHAR(200) DEFAULT '',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES users(user_id)           ON DELETE CASCADE
);

-- ============================================================================
-- ANNOUNCEMENT COMMENTS
-- ============================================================================
CREATE TABLE announcement_comments (
    comment_id       INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id  INT NOT NULL,
    user_id          INT NOT NULL,
    body             TEXT NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES classroom_announcements(announcement_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)         REFERENCES users(user_id)                           ON DELETE CASCADE
);

-- ============================================================================
-- CODING ASSIGNMENTS
-- ============================================================================
CREATE TABLE coding_assignments (
    assignment_id  INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id   INT NOT NULL,
    faculty_id     INT NOT NULL,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    language       VARCHAR(50)  DEFAULT 'python',
    starter_code   LONGTEXT,
    max_points     INT          DEFAULT 100,
    scoring_mode   ENUM('per_test','all_or_nothing') DEFAULT 'per_test',
    deadline       TIMESTAMP    NULL,
    status         ENUM('draft','published') DEFAULT 'published',
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES users(user_id)           ON DELETE CASCADE
);

-- ============================================================================
-- ASSIGNMENT TEST CASES
-- ============================================================================
CREATE TABLE assignment_test_cases (
    test_case_id    INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id   INT NOT NULL,
    label           VARCHAR(100) DEFAULT 'Test',
    input           TEXT,
    expected_output TEXT,
    is_hidden       BOOLEAN      DEFAULT FALSE,
    order_index     INT          DEFAULT 0,
    FOREIGN KEY (assignment_id) REFERENCES coding_assignments(assignment_id) ON DELETE CASCADE
);

-- ============================================================================
-- ASSIGNMENT SUBMISSIONS
-- ============================================================================
CREATE TABLE assignment_submissions (
    submission_id      INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id      INT NOT NULL,
    student_id         INT NOT NULL,
    code               LONGTEXT NOT NULL,
    language           VARCHAR(50) NOT NULL,
    test_results       JSON,
    passed_tests       INT DEFAULT 0,
    total_tests        INT DEFAULT 0,
    score              INT DEFAULT 0,
    execution_time_ms  INT DEFAULT 0,
    submitted_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_assign_student (assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES coding_assignments(assignment_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id)    REFERENCES users(user_id)                    ON DELETE CASCADE
);

-- ============================================================================
-- QUESTIONS
-- ============================================================================
CREATE TABLE questions (
    question_id    INT AUTO_INCREMENT PRIMARY KEY,
    language_code  VARCHAR(20) NOT NULL,
    level          ENUM('beginner','intermediate','advanced') NOT NULL,
    topic          VARCHAR(100) NOT NULL,
    question_text  TEXT NOT NULL,
    question_type  VARCHAR(30) DEFAULT 'multiple_choice',
    options        JSON NOT NULL,
    correct_answer VARCHAR(500) NOT NULL,
    code_snippet   TEXT DEFAULT NULL,
    code_lines     JSON DEFAULT NULL,
    hint           TEXT,
    explanation    TEXT,
    points_value   INT DEFAULT 10,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- USER ANSWERS
-- ============================================================================
CREATE TABLE user_answers (
    answer_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    question_id     INT NOT NULL,
    selected_answer VARCHAR(500) NOT NULL,
    is_correct      BOOLEAN NOT NULL,
    points_earned   INT DEFAULT 0,
    hint_level_used INT DEFAULT 0,
    answered_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES users(user_id)         ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);

-- ============================================================================
-- PROGRESS
-- ============================================================================
CREATE TABLE progress (
    progress_id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    language_code       VARCHAR(20) NOT NULL,
    current_level       ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    questions_answered  INT DEFAULT 0,
    correct_answers     INT DEFAULT 0,
    consecutive_correct INT DEFAULT 0,
    accuracy_percent    DECIMAL(5,2) DEFAULT 0.00,
    last_activity       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_lang (user_id, language_code),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- REWARDS
-- ============================================================================
CREATE TABLE rewards (
    reward_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    reward_type  ENUM('xp','badge','level_up') NOT NULL,
    xp_amount    INT DEFAULT 0,
    badge_id     VARCHAR(50),
    description  VARCHAR(255),
    earned_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- FEEDBACK
-- ============================================================================
CREATE TABLE feedback (
    feedback_id        INT AUTO_INCREMENT PRIMARY KEY,
    user_id            INT NOT NULL,
    language_code      VARCHAR(20) NOT NULL,
    overall_assessment TEXT,
    weak_areas         JSON,
    strong_areas       JSON,
    next_steps         JSON,
    encouragement      TEXT,
    generated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- CONTRIBUTIONS
-- ============================================================================
CREATE TABLE contributions (
    contribution_id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id      INT NOT NULL,
    type            ENUM('blog','course') NOT NULL DEFAULT 'blog',
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    content         LONGTEXT,
    language        VARCHAR(30) DEFAULT 'general',
    tags            VARCHAR(500) DEFAULT '',
    cover_image     TEXT,
    status          ENUM('published','draft') DEFAULT 'published',
    view_count      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_path_lessons_path       ON path_lessons(path_id);
CREATE INDEX idx_lesson_progress_user    ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson  ON lesson_progress(lesson_id);
CREATE INDEX idx_weaknesses_user         ON weaknesses(user_id);
CREATE INDEX idx_ai_logs_user            ON ai_feedback_logs(user_id);
CREATE INDEX idx_certificates_user       ON certificates(user_id);
CREATE INDEX idx_submissions_user        ON submissions(user_id);
CREATE INDEX idx_questions_lang_level    ON questions(language_code, level);
CREATE INDEX idx_user_answers_user       ON user_answers(user_id);
CREATE INDEX idx_progress_user           ON progress(user_id);
CREATE INDEX idx_classrooms_faculty      ON classrooms(faculty_id);
CREATE INDEX idx_enrollments_classroom   ON classroom_enrollments(classroom_id);
CREATE INDEX idx_enrollments_student     ON classroom_enrollments(student_id);
CREATE INDEX idx_announcements_room      ON classroom_announcements(classroom_id);
CREATE INDEX idx_ann_comments_ann        ON announcement_comments(announcement_id);
CREATE INDEX idx_coding_assignments_room ON coding_assignments(classroom_id);
CREATE INDEX idx_assignment_tc_assign    ON assignment_test_cases(assignment_id);
CREATE INDEX idx_assignment_sub_assign   ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_sub_student  ON assignment_submissions(student_id);

-- ============================================================================
-- ██████████████████████████████████████████████████████████████████████████
-- SEED DATA
-- ██████████████████████████████████████████████████████████████████████████
-- ============================================================================

-- ============================================================================
-- DEMO ACCOUNTS
-- faculty123 → $2b$10$SfZs7k.X.wwkr1QNVpbzEOEV9wjPdOxCR7fk9QoFsjEZjt/YHkG2m
-- student123 → $2b$10$DgFiUCcmDnn5ZXTxal55Eubu7BfrYtdAnAn75R1C4F1r9UX4FiyJi
-- user_id 1 = faculty,  user_id 2 = student
-- ============================================================================
INSERT INTO users (email, password, full_name, role, selected_language, total_points, current_level, total_xp, streak, badges) VALUES
('faculty@codearena.com',
 '$2b$10$SfZs7k.X.wwkr1QNVpbzEOEV9wjPdOxCR7fk9QoFsjEZjt/YHkG2m',
 'Prof. Maria Santos', 'faculty', NULL, 0, 'beginner', 0, 0, NULL),
('student@codearena.com',
 '$2b$10$DgFiUCcmDnn5ZXTxal55Eubu7BfrYtdAnAn75R1C4F1r9UX4FiyJi',
 'Mark Jade Cabangon', 'student', 'python', 420, 'intermediate', 840, 7,
 '["first_login","fast_learner","perfect_score"]');

-- ============================================================================
-- CLASSROOM  (faculty_id = 1)
-- ============================================================================
INSERT INTO classrooms (faculty_id, name, description, subject, language, enrollment_key, is_active) VALUES
(1, 'Python101', 'Introduction to Python Programming for beginners. Learn variables, control flow, functions, and more.', 'Computer Science', 'python', 'PYTH-2024', TRUE),
(1, 'Web Dev Basics', 'Introduction to JavaScript and web development fundamentals.', 'Information Technology', 'javascript', 'WDEV-2024', TRUE);

-- ============================================================================
-- ENROLLMENT  (student_id = 2)
-- ============================================================================
INSERT INTO classroom_enrollments (classroom_id, student_id, status) VALUES
(1, 2, 'active'),
(2, 2, 'active');

-- ============================================================================
-- CLASSROOM ANNOUNCEMENTS
-- ============================================================================
INSERT INTO classroom_announcements (classroom_id, faculty_id, body) VALUES
(1, 1, 'Welcome to Python101! Please complete the Beginner level units before our first synchronous session. Reach out if you have any questions.'),
(1, 1, 'Reminder: The first unit evaluation covers Variables, Data Types, and Operators. Good luck everyone! 🐍'),
(2, 1, 'Welcome to Web Dev Basics! We will be covering HTML, CSS, and JavaScript fundamentals this semester.');

-- ============================================================================
-- PROGRESS  (user_id = 2, student)
-- ============================================================================
INSERT INTO progress (user_id, language_code, current_level, questions_answered, correct_answers, consecutive_correct, accuracy_percent) VALUES
(2, 'python',     'intermediate', 60, 51, 7, 85.00),
(2, 'javascript', 'beginner',     20, 15, 3, 75.00),
(2, 'java',       'beginner',      5,  3, 1, 60.00);

-- ============================================================================
-- REWARDS  (user_id = 2)
-- ============================================================================
INSERT INTO rewards (user_id, reward_type, xp_amount, badge_id, description) VALUES
(2, 'badge',   0,   'first_login',   'Logged in for the first time'),
(2, 'badge',   0,   'fast_learner',  'Answered 10 questions correctly in a row'),
(2, 'badge',   0,   'perfect_score', 'Scored 100% on an assessment'),
(2, 'xp',    200,   NULL,            'Completed Python Beginner Assessment'),
(2, 'level_up',  0, NULL,            'Advanced to Intermediate level in Python'),
(2, 'xp',    100,   NULL,            'Completed JavaScript Beginner level');

-- ============================================================================
-- CERTIFICATES  (user_id = 2)
-- ============================================================================
INSERT INTO certificates (user_id, language_code, level, mastery, score, accuracy) VALUES
(2, 'python',     'beginner',     'Expert',     200, 90),
(2, 'javascript', 'beginner',     'Proficient', 160, 80);

-- ============================================================================
-- FEEDBACK
-- ============================================================================
INSERT INTO feedback (user_id, language_code, overall_assessment, weak_areas, strong_areas, next_steps, encouragement) VALUES
(2, 'python',
 'Mark is performing excellently at the Beginner level and is ready for Intermediate challenges.',
 '["Error Handling","File I/O"]',
 '["Variables","Control Flow","Functions","Lists"]',
 '["Study exception handling with try/except","Practice file reading and writing","Explore list comprehensions"]',
 'Great work, Mark! Your strong foundation in Python basics will carry you far. Keep up the momentum!');

-- ============================================================================
-- CONTRIBUTIONS  (faculty_id = 1)
-- ============================================================================
INSERT INTO contributions (faculty_id, type, title, description, content, language, tags, status) VALUES
(1, 'blog', 'Getting Started with Python: A Beginner''s Roadmap',
 'A practical guide outlining the key concepts every Python beginner should master.',
 '<h2>Why Python?</h2><p>Python is consistently ranked as one of the most popular programming languages in the world. Its clean syntax makes it ideal for beginners, while its powerful libraries make it indispensable for professionals.</p><h2>Your Learning Roadmap</h2><ol><li><strong>Basics</strong> – variables, data types, operators</li><li><strong>Control Flow</strong> – if/else, loops</li><li><strong>Functions</strong> – defining and calling functions</li><li><strong>Data Structures</strong> – lists, dictionaries, tuples</li><li><strong>OOP</strong> – classes and objects</li></ol><p>Follow this path consistently and you will be writing real Python programs within weeks!</p>',
 'python', 'python,beginner,roadmap', 'published'),
(1, 'course', 'Python Fundamentals: From Zero to Hero',
 'A comprehensive beginner course covering all Python fundamentals with hands-on exercises.',
 '<h2>Course Overview</h2><p>This course is designed for absolute beginners. No prior programming experience is needed.</p><h2>What You Will Learn</h2><ul><li>Python syntax and semantics</li><li>Working with variables and data types</li><li>Control flow: conditions and loops</li><li>Writing reusable functions</li><li>Working with lists and dictionaries</li></ul>',
 'python', 'python,course,fundamentals', 'published');

-- ============================================================================
-- LEARNING PATHS
-- ============================================================================
INSERT INTO learning_paths (title, language, description, difficulty, icon, color, order_index) VALUES
('Python Basics',           'python',     'Start your Python journey with core fundamentals.',               'beginner',     'code',                    '#3776AB', 1),
('Python Intermediate',     'python',     'Level up with functions, OOP, and file handling.',                'intermediate', 'integration_instructions', '#2563eb', 2),
('Python Advanced',         'python',     'Master decorators, generators, and advanced patterns.',           'advanced',     'local_fire_department',   '#dc2626', 3),
('JavaScript Essentials',   'javascript', 'Build interactive web experiences with JavaScript.',              'beginner',     'javascript',              '#F7DF1E', 4),
('Java Fundamentals',       'java',       'Enterprise-grade programming with Java.',                         'beginner',     'coffee',                  '#E76F00', 5),
('C++ Programming',         'cpp',        'High-performance systems programming with C++.',                  'intermediate', 'memory',                  '#659AD2', 6);

-- ============================================================================
-- PATH LESSONS — Python Basics (path_id = 1)
-- ============================================================================
INSERT INTO path_lessons (path_id, title, content, order_index, estimated_minutes, xp_reward) VALUES
(1, 'Introduction to Python',
'<h2>What is Python?</h2><p>Python is a beginner-friendly, high-level programming language created by Guido van Rossum in 1991. It powers web apps (Instagram, Pinterest), data science, AI, and automation.</p><h3>Why Python?</h3><ul><li>Readable syntax — almost like English</li><li>Huge ecosystem of libraries</li><li>Used at Google, NASA, Netflix</li><li>Perfect first language</li></ul><h3>Your First Program</h3><pre><code class="language-python">print("Hello, World!")</code></pre><p>One line. No semicolons. No boilerplate. That is Python.</p><div class="info-box">💡 Python uses <strong>indentation</strong> (4 spaces) instead of braces to define code blocks.</div>',
1, 8, 20),

(1, 'Variables and Data Types',
'<h2>Storing Data</h2><p>Variables are named containers for data. Python infers the type automatically.</p><pre><code class="language-python">name = "Maria"      # str\nage = 20            # int\ngpa = 1.75          # float\nis_enrolled = True  # bool</code></pre><h3>The Four Core Types</h3><table><tr><th>Type</th><th>Example</th><th>Use</th></tr><tr><td>str</td><td>"hello"</td><td>Text</td></tr><tr><td>int</td><td>42</td><td>Whole numbers</td></tr><tr><td>float</td><td>3.14</td><td>Decimals</td></tr><tr><td>bool</td><td>True/False</td><td>Logic</td></tr></table><h3>Checking Types</h3><pre><code class="language-python">print(type(age))   # &lt;class "int"&gt;</code></pre><div class="info-box">💡 Use lowercase_with_underscores for variable names: <code>student_name</code>, not <code>StudentName</code>.</div>',
2, 10, 20),

(1, 'Operators and Expressions',
'<h2>Working with Data</h2><p>Python supports a rich set of operators for performing calculations and comparisons.</p><h3>Arithmetic Operators</h3><pre><code class="language-python">print(10 + 3)   # 13  addition\nprint(10 - 3)   # 7   subtraction\nprint(10 * 3)   # 30  multiplication\nprint(10 / 3)   # 3.333... division\nprint(10 // 3)  # 3   floor division\nprint(10 % 3)   # 1   modulo (remainder)\nprint(10 ** 3)  # 1000 exponentiation</code></pre><h3>Comparison Operators</h3><pre><code class="language-python">print(5 == 5)   # True\nprint(5 != 3)   # True\nprint(5 > 3)    # True\nprint(5 <= 3)   # False</code></pre><div class="info-box">⚠️ <code>==</code> checks equality; <code>=</code> assigns a value. Never confuse them!</div>',
3, 10, 20),

(1, 'Input and Output',
'<h2>Interacting with Users</h2><h3>Output with print()</h3><pre><code class="language-python">print("Welcome!")                    # basic\nprint("Score:", 95)                  # multiple values\nprint(f"Hello, {name}!")             # f-string (recommended)\nprint("Line1\\nLine2")               # newline escape</code></pre><h3>Input with input()</h3><pre><code class="language-python">name = input("Enter your name: ")\nprint(f"Hello, {name}!")</code></pre><div class="info-box">⚠️ <code>input()</code> always returns a <strong>string</strong>. Convert to use as a number:</div><pre><code class="language-python">age = int(input("Enter your age: "))\nheight = float(input("Enter height (m): "))\nprint(f"In 5 years you will be {age + 5}")</code></pre>',
4, 10, 20),

(1, 'Conditionals (if / elif / else)',
'<h2>Making Decisions</h2><pre><code class="language-python">grade = int(input("Enter grade: "))\n\nif grade >= 90:\n    print("Excellent!")\nelif grade >= 75:\n    print("Passed")\nelif grade >= 60:\n    print("Conditional Passed")\nelse:\n    print("Failed")</code></pre><h3>Logical Operators</h3><pre><code class="language-python">age = 20\nis_enrolled = True\n\nif age >= 18 and is_enrolled:\n    print("Eligible for scholarship")\n\nif age < 18 or not is_enrolled:\n    print("Not eligible")</code></pre><div class="info-box">💡 Python uses <code>and</code>, <code>or</code>, <code>not</code> — not <code>&amp;&amp;</code>, <code>||</code>, <code>!</code>.</div>',
5, 12, 25),

(1, 'Loops (for and while)',
'<h2>Repeating Actions</h2><h3>for Loop</h3><pre><code class="language-python">for i in range(5):\n    print(i)        # 0 1 2 3 4\n\nfor i in range(1, 6):\n    print(i)        # 1 2 3 4 5\n\nfruits = ["apple", "mango", "banana"]\nfor fruit in fruits:\n    print(fruit)</code></pre><h3>while Loop</h3><pre><code class="language-python">count = 0\nwhile count < 3:\n    print("count:", count)\n    count += 1</code></pre><h3>Loop Control</h3><pre><code class="language-python">for i in range(10):\n    if i == 5:\n        break       # exit loop\n    if i % 2 == 0:\n        continue    # skip even\n    print(i)        # prints 1 3</code></pre><div class="info-box">⚠️ Make sure while loops always reach their stop condition!</div>',
6, 12, 25),

(1, 'Functions',
'<h2>Reusable Code Blocks</h2><pre><code class="language-python">def greet(name):\n    print(f"Hello, {name}!")\n\ngreet("Maria")\ngreet("Juan")</code></pre><h3>Return Values</h3><pre><code class="language-python">def add(a, b):\n    return a + b\n\nresult = add(3, 7)\nprint(result)   # 10</code></pre><h3>Default Parameters</h3><pre><code class="language-python">def greet(name, greeting="Hello"):\n    print(f"{greeting}, {name}!")\n\ngreet("Maria")          # Hello, Maria!\ngreet("Juan", "Hi")     # Hi, Juan!</code></pre><div class="info-box">💡 Each function should do <em>one thing</em>. Keep them short and focused.</div>',
7, 15, 30),

(1, 'Lists and Basic Data Structures',
'<h2>Storing Collections</h2><h3>Lists</h3><pre><code class="language-python">fruits = ["apple", "banana", "cherry"]\nprint(fruits[0])        # apple (first)\nprint(fruits[-1])       # cherry (last)\nprint(len(fruits))      # 3\n\nfruits.append("mango")  # add to end\nfruits.remove("banana") # remove by value\nfruits.pop()            # remove last\nfruits.sort()           # sort in place</code></pre><h3>List Slicing</h3><pre><code class="language-python">nums = [0, 1, 2, 3, 4, 5]\nprint(nums[1:4])    # [1, 2, 3]\nprint(nums[:3])     # [0, 1, 2]\nprint(nums[3:])     # [3, 4, 5]</code></pre><h3>Tuples (immutable lists)</h3><pre><code class="language-python">point = (10, 20)\nprint(point[0])    # 10</code></pre>',
8, 15, 30);

-- ============================================================================
-- PATH LESSONS — Python Intermediate (path_id = 2)
-- ============================================================================
INSERT INTO path_lessons (path_id, title, content, order_index, estimated_minutes, xp_reward) VALUES
(2, 'Dictionaries and Sets',
'<h2>Key-Value Storage</h2><pre><code class="language-python">student = {\n    "name": "Maria",\n    "age": 20,\n    "gpa": 1.75\n}\n\nprint(student["name"])          # Maria\nprint(student.get("grade", "N/A")) # N/A (safe access)\n\nstudent["year"] = 2             # add key\ndel student["gpa"]              # remove key\n\nfor key, value in student.items():\n    print(f"{key}: {value}")</code></pre><h3>Sets</h3><pre><code class="language-python">unique = {1, 2, 3, 2, 1}    # {1, 2, 3}\na = {1, 2, 3}\nb = {2, 3, 4}\nprint(a & b)   # {2, 3}  intersection\nprint(a | b)   # {1,2,3,4} union</code></pre>',
1, 15, 30),

(2, 'List Comprehensions',
'<h2>Elegant List Building</h2><p>List comprehensions create lists in a single readable line.</p><pre><code class="language-python"># Traditional\nsquares = []\nfor x in range(5):\n    squares.append(x**2)\n\n# List comprehension\nsquares = [x**2 for x in range(5)]\nprint(squares)   # [0, 1, 4, 9, 16]\n\n# With condition\nevens = [x for x in range(10) if x % 2 == 0]\nprint(evens)     # [0, 2, 4, 6, 8]\n\n# Nested\nmatrix = [[i*j for j in range(1,4)] for i in range(1,4)]</code></pre><div class="info-box">💡 If the comprehension gets long or complex, use a regular loop for readability.</div>',
2, 12, 30),

(2, 'Functions: Advanced',
'<h2>Beyond the Basics</h2><h3>*args and **kwargs</h3><pre><code class="language-python">def total(*args):\n    return sum(args)\n\nprint(total(1, 2, 3, 4))    # 10\n\ndef describe(**kwargs):\n    for k, v in kwargs.items():\n        print(f"{k} = {v}")\n\ndescribe(name="Ana", age=21)</code></pre><h3>Lambda Functions</h3><pre><code class="language-python">square = lambda x: x ** 2\nprint(square(5))    # 25\n\nnums = [3, 1, 4, 1, 5]\nnums.sort(key=lambda x: -x)  # descending</code></pre><h3>Scope</h3><pre><code class="language-python">x = 10          # global\ndef foo():\n    x = 20      # local — does not affect global\n    print(x)    # 20\nfoo()\nprint(x)        # 10</code></pre>',
3, 15, 35),

(2, 'Object-Oriented Programming',
'<h2>Classes and Objects</h2><pre><code class="language-python">class Student:\n    school = "CodeArena"    # class attribute\n\n    def __init__(self, name, age):\n        self.name = name    # instance attributes\n        self.age  = age\n\n    def greet(self):\n        print(f"Hi, I am {self.name}!")\n\n    def __str__(self):\n        return f"Student({self.name}, {self.age})"\n\ns = Student("Maria", 20)\ns.greet()           # Hi, I am Maria!\nprint(str(s))       # Student(Maria, 20)\nprint(Student.school) # CodeArena</code></pre><h3>Inheritance</h3><pre><code class="language-python">class GradStudent(Student):\n    def __init__(self, name, age, thesis):\n        super().__init__(name, age)\n        self.thesis = thesis</code></pre>',
4, 20, 40),

(2, 'Error Handling',
'<h2>Handling Exceptions</h2><pre><code class="language-python">try:\n    age = int(input("Enter age: "))\n    print(f"Next year: {age + 1}")\nexcept ValueError:\n    print("Please enter a valid number.")\nexcept Exception as e:\n    print(f"Unexpected error: {e}")\nelse:\n    print("No errors occurred!")\nfinally:\n    print("This always runs.")</code></pre><h3>Common Exceptions</h3><ul><li><code>ValueError</code> — invalid value (e.g. int("abc"))</li><li><code>TypeError</code> — wrong type operation</li><li><code>IndexError</code> — list index out of range</li><li><code>KeyError</code> — dictionary key missing</li><li><code>FileNotFoundError</code> — file does not exist</li></ul><h3>Raising Exceptions</h3><pre><code class="language-python">def divide(a, b):\n    if b == 0:\n        raise ValueError("Cannot divide by zero")\n    return a / b</code></pre>',
5, 15, 35);

-- ============================================================================
-- LESSON PROGRESS — student (user_id=2) completed some lessons
-- ============================================================================
INSERT INTO lesson_progress (user_id, lesson_id, status, completed_at, time_spent_secs) VALUES
(2, 1, 'completed', DATE_SUB(NOW(), INTERVAL 14 DAY), 480),
(2, 2, 'completed', DATE_SUB(NOW(), INTERVAL 13 DAY), 600),
(2, 3, 'completed', DATE_SUB(NOW(), INTERVAL 12 DAY), 590),
(2, 4, 'completed', DATE_SUB(NOW(), INTERVAL 11 DAY), 610),
(2, 5, 'completed', DATE_SUB(NOW(), INTERVAL 9  DAY), 720),
(2, 6, 'completed', DATE_SUB(NOW(), INTERVAL 8  DAY), 730),
(2, 7, 'completed', DATE_SUB(NOW(), INTERVAL 7  DAY), 900),
(2, 8, 'completed', DATE_SUB(NOW(), INTERVAL 6  DAY), 910),
(2, 9, 'in_progress', NULL, 200);

-- ============================================================================
-- ████  ASSESSMENT QUESTIONS  ████
-- Minimum 22 per (language, level) — Assessment draws exactly 20.
-- Mix: multiple_choice, fill_blank, output_prediction, code_ordering
-- ============================================================================

-- ============================================================================
-- PYTHON — BEGINNER  (25 questions)
-- ============================================================================
INSERT INTO questions (language_code, level, topic, question_text, question_type, options, correct_answer, code_snippet, code_lines, hint, explanation, points_value) VALUES

-- MCQ
('python','beginner','Output & Print','Which function is used to display output in Python?',
 'multiple_choice','["echo()","printf()","print()","display()"]','C',NULL,NULL,
 'Think about the built-in function you call every day in Python.',
 'print() is Python''s built-in output function.',10),

('python','beginner','Data Types','What data type does Python assign to the value 3.14?',
 'multiple_choice','["int","double","float","decimal"]','C',NULL,NULL,
 'Numbers with decimal points are a specific numeric type.',
 'Floating-point numbers (float) represent decimals in Python.',10),

('python','beginner','Variables','Which is the correct way to create a variable in Python?',
 'multiple_choice','["var x = 5","int x = 5","x = 5","declare x = 5"]','C',NULL,NULL,
 'Python does not require a keyword to declare a variable.',
 'Python uses simple assignment: x = 5. No keyword needed.',10),

('python','beginner','Operators','Which operator performs exponentiation (power) in Python?',
 'multiple_choice','["^","**","^^","exp()"]','B',NULL,NULL,
 'It looks like two multiplication signs next to each other.',
 '** is the exponentiation operator: 2**3 = 8.',10),

('python','beginner','Strings','What does len("Python") return?',
 'multiple_choice','["5","6","7","Error"]','B',NULL,NULL,
 'Count the characters in the string.',
 '"Python" has 6 characters: P-y-t-h-o-n.',10),

('python','beginner','Comments','How do you write a single-line comment in Python?',
 'multiple_choice','["// comment","/* comment */","# comment","-- comment"]','C',NULL,NULL,
 'Python uses a symbol that looks like a hashtag.',
 'Python uses # for single-line comments.',10),

('python','beginner','Functions','What keyword is used to define a function in Python?',
 'multiple_choice','["function","func","define","def"]','D',NULL,NULL,
 'It is a short form of "define".',
 'def is the keyword to define a function in Python.',10),

('python','beginner','Booleans','Which is a valid Boolean value in Python?',
 'multiple_choice','["true","TRUE","True","yes"]','C',NULL,NULL,
 'Python is case-sensitive — check the capitalisation.',
 'Python Booleans are True and False (capital T/F).',10),

('python','beginner','Loops','What does range(1, 5) produce?',
 'multiple_choice','["1,2,3,4,5","1,2,3,4","0,1,2,3,4","2,3,4"]','B',NULL,NULL,
 'range(start, stop) includes start but excludes stop.',
 'range(1,5) gives 1,2,3,4 — it stops before 5.',10),

('python','beginner','Input','What does the input() function always return?',
 'multiple_choice','["int","float","str","bool"]','C',NULL,NULL,
 'Even if the user types a number, the function wraps it.',
 'input() always returns a string. Convert with int() or float() as needed.',10),

('python','beginner','Lists','What is the index of the first element in a Python list?',
 'multiple_choice','["1","-1","0","First"]','C',NULL,NULL,
 'Python uses zero-based indexing.',
 'List indexing starts at 0. my_list[0] is the first element.',10),

('python','beginner','Operators','What does the // operator do in Python?',
 'multiple_choice','["Regular division","Floor (integer) division","Modulo","Power"]','B',NULL,NULL,
 'It rounds down the result to the nearest whole number.',
 '// is floor division: 10//3 = 3 (drops the decimal).',10),

('python','beginner','Conditionals','Which is the correct syntax for an if statement in Python?',
 'multiple_choice','["if x > 5:","if (x > 5)","if x > 5 then","if x > 5;"]','A',NULL,NULL,
 'Python uses a colon, not brackets or "then".',
 'Python if syntax: if condition: (colon, no parentheses required).',10),

('python','beginner','Lists','Which creates an empty list in Python?',
 'multiple_choice','["list = {}","list = ()","list = []","list = <>"]','C',NULL,NULL,
 'Lists use square brackets.',
 '[] creates an empty list. {} is a dict/set, () is a tuple.',10),

('python','beginner','Data Types','What is the output of type(True)?',
 'multiple_choice','["<class ''bool''>","<class ''int''>","<class ''str''>","<class ''logic''>"]','A',NULL,NULL,
 'True is a specific Python data type.',
 'True and False are of type bool.',10),

-- FILL IN THE BLANK
('python','beginner','Type Conversion','Convert the string "42" to an integer.',
 'fill_blank','[]','int',
 'age = ___("42")',
 NULL,'Use the built-in conversion function for integers.',
 'int() converts a string to an integer: int("42") → 42.',10),

('python','beginner','Loops','Complete the loop to iterate exactly 5 times.',
 'fill_blank','[]','5',
 'for i in range(___):\n    print(i)',
 NULL,'range(n) generates n values starting from 0.',
 'range(5) produces 0,1,2,3,4 — exactly 5 iterations.',10),

('python','beginner','Functions','Complete the function definition.',
 'fill_blank','[]','def',
 '___ greet(name):\n    print("Hello,", name)',
 NULL,'What keyword starts a function definition in Python?',
 'def is the keyword used to define functions.',10),

('python','beginner','Lists','Get the number of items in the list.',
 'fill_blank','[]','len',
 'fruits = ["apple", "banana", "cherry"]\ncount = ___(fruits)',
 NULL,'There is a built-in function that returns the length of a sequence.',
 'len() returns the number of elements in a list.',10),

('python','beginner','Lists','Add the number 4 to the end of the list.',
 'fill_blank','[]','append',
 'my_list = [1, 2, 3]\nmy_list.___(4)',
 NULL,'Which list method adds an element to the end?',
 'list.append(value) adds an element to the end of the list.',10),

-- OUTPUT PREDICTION
('python','beginner','Operators','What is the output of the following code?',
 'output_prediction','[]','1',
 'x = 10\ny = 3\nprint(x % y)',
 NULL,'% is the modulo (remainder) operator.',
 '10 divided by 3 = 3 remainder 1. So 10 % 3 = 1.',10),

('python','beginner','Strings','What is the output of the following code?',
 'output_prediction','[]','Pyt',
 'name = "Python"\nprint(name[0:3])',
 NULL,'String slicing [start:stop] extracts characters.',
 'name[0:3] extracts indices 0,1,2 → "Pyt".',10),

('python','beginner','Lists','What is the output of the following code?',
 'output_prediction','[]','15',
 'nums = [1, 2, 3, 4, 5]\nprint(sum(nums))',
 NULL,'sum() adds all elements of a list.',
 '1+2+3+4+5 = 15.',10),

('python','beginner','Operators','What is the output of the following code?',
 'output_prediction','[]','256',
 'print(2 ** 8)',
 NULL,'** is exponentiation.',
 '2 to the power of 8 = 256.',10),

-- CODE ORDERING
('python','beginner','Functions','Arrange the lines to create a function that calculates and prints the area of a rectangle.',
 'code_ordering','[]','',
 NULL,
 '["def area(width, height):", "    return width * height", "result = area(5, 3)", "print(result)"]',
 'Define the function first, then call it.',
 'Functions must be defined before they are called. The function body is indented.',10);

-- ============================================================================
-- PYTHON — INTERMEDIATE  (22 questions)
-- ============================================================================
INSERT INTO questions (language_code, level, topic, question_text, question_type, options, correct_answer, code_snippet, code_lines, hint, explanation, points_value) VALUES

-- MCQ
('python','intermediate','Dictionaries','What is a Python dictionary?',
 'multiple_choice','["Ordered sequence of values","Collection of key-value pairs","A list of unique values","An immutable sequence"]','B',NULL,NULL,
 'Think about how you look something up by a name or key.',
 'A dictionary stores data as key-value pairs: {"key": value}.',20),

('python','intermediate','Lists','Which list method removes and returns the last element?',
 'multiple_choice','["remove()","delete()","pop()","discard()"]','C',NULL,NULL,
 'This method both removes and returns the element.',
 'list.pop() removes and returns the last element. pop(i) removes index i.',20),

('python','intermediate','Control Flow','What does the pass statement do in Python?',
 'multiple_choice','["Skips the current function","Serves as a placeholder that does nothing","Breaks out of a loop","Continues to the next iteration"]','B',NULL,NULL,
 'It is used when a statement is syntactically required but no action is needed.',
 'pass is a null operation — code continues normally after it.',20),

('python','intermediate','File I/O','Which mode opens a file for writing (overwrites existing content)?',
 'multiple_choice','["r - read only","w - write (overwrite)","a - append","x - create new file"]','B',NULL,NULL,
 'w stands for write — it overwrites the file if it already exists.',
 'open(f, "w") opens for writing, creating the file if needed and truncating if it exists.',20),

('python','intermediate','Exceptions','Which exception is raised when dividing by zero?',
 'multiple_choice','["ValueError","ArithmeticError","ZeroDivisionError","MathError"]','C',NULL,NULL,
 'The exception name describes exactly what happened.',
 'ZeroDivisionError is raised whenever you divide or modulo by zero.',20),

('python','intermediate','Built-ins','What does enumerate() return when used in a for loop?',
 'multiple_choice','["Only the values","Index-value pairs","A dictionary","A reversed list"]','B',NULL,NULL,
 'It adds a counter to an iterable.',
 'enumerate(iterable) yields (index, value) tuples.',20),

('python','intermediate','Functions','What is a lambda function?',
 'multiple_choice','["A class method","A named recursive function","An anonymous one-line function","A built-in function"]','C',NULL,NULL,
 'It has no name and is written inline.',
 'lambda args: expression creates an anonymous function.',20),

('python','intermediate','List Comprehensions','What does [x**2 for x in range(5)] produce?',
 'multiple_choice','["[1,4,9,16,25]","[0,1,4,9,16]","[0,2,4,6,8]","[1,2,3,4,5]"]','B',NULL,NULL,
 'range(5) starts at 0.',
 'range(5) = 0..4. Squaring each: 0,1,4,9,16.',20),

('python','intermediate','Strings','Which method splits a string into a list of words?',
 'multiple_choice','["split()","list()","words()","tokenize()"]','A',NULL,NULL,
 'The method name describes what it does to the string.',
 '"hello world".split() returns ["hello", "world"].',20),

('python','intermediate','OOP','What does the __init__ method do in a class?',
 'multiple_choice','["Destroys the object","Initialises instance attributes when an object is created","Returns a string representation","Copies the object"]','B',NULL,NULL,
 'It is the constructor.',
 '__init__ is the constructor — it runs when you create a new object.',20),

('python','intermediate','Exceptions','Which statement structure handles exceptions in Python?',
 'multiple_choice','["catch-throw","try-except","handle-error","begin-rescue"]','B',NULL,NULL,
 'Python''s syntax differs from Java/C#.',
 'Python uses try: ... except ExceptionType: ... to handle errors.',20),

('python','intermediate','Functions','What does *args allow in a function definition?',
 'multiple_choice','["Named keyword arguments only","Variable number of positional arguments","Default parameter values","Class methods"]','B',NULL,NULL,
 'The * unpacks positional arguments.',
 '*args collects any number of positional arguments into a tuple.',20),

-- FILL IN THE BLANK
('python','intermediate','List Comprehensions','Complete the list comprehension to get all even numbers from 0 to 9.',
 'fill_blank','[]','2',
 'evens = [x for x in range(10) if x % ___ == 0]',
 NULL,'A number is even if its remainder when divided by what is 0?',
 'x % 2 == 0 checks divisibility by 2.',20),

('python','intermediate','OOP','Complete the class definition.',
 'fill_blank','[]','class',
 '___ Dog:\n    def __init__(self, name):\n        self.name = name',
 NULL,'What keyword defines a class in Python?',
 'class keyword is used to define a class.',20),

('python','intermediate','Exceptions','Catch the correct exception for invalid type conversion.',
 'fill_blank','[]','ValueError',
 'try:\n    x = int("abc")\nexcept ___:\n    print("Not a number")',
 NULL,'int("abc") raises a specific exception related to the value.',
 'int("abc") raises ValueError because "abc" is not a valid integer.',20),

('python','intermediate','Functions','Unpack the dictionary as keyword arguments.',
 'fill_blank','[]','**',
 'def greet(name, age): pass\ninfo = {"name": "Ana", "age": 20}\ngreet(___info)',
 NULL,'A double symbol is used to unpack dictionaries.',
 '** unpacks a dictionary into keyword arguments.',20),

('python','intermediate','Sorting','Sort the list in descending order.',
 'fill_blank','[]','reverse',
 'nums = [3, 1, 4, 1, 5]\nnums.sort(___ = True)',
 NULL,'The parameter name hints at reversing the order.',
 'sort(reverse=True) sorts in descending order.',20),

-- OUTPUT PREDICTION
('python','intermediate','Dictionaries','What is the output of the following code?',
 'output_prediction','[]','0',
 'd = {"a": 1, "b": 2}\nprint(d.get("c", 0))',
 NULL,'dict.get(key, default) returns default if key is not found.',
 '"c" is not in the dictionary, so .get() returns the default value 0.',20),

('python','intermediate','List Comprehensions','What is the output of the following code?',
 'output_prediction','[]','[2, 4]',
 'print([x for x in range(1, 6) if x % 2 == 0])',
 NULL,'Which numbers from 1–5 are divisible by 2?',
 '2 and 4 are even numbers in range(1,6).',20),

('python','intermediate','Strings','What is the output of the following code?',
 'output_prediction','[]','Hello World',
 's = "hello world"\nprint(s.title())',
 NULL,'.title() capitalises the first letter of each word.',
 '.title() returns "Hello World" — each word capitalised.',20),

-- CODE ORDERING
('python','intermediate','OOP','Arrange these lines to create a Person class and call its greet method.',
 'code_ordering','[]','',
 NULL,
 '["class Person:", "    def __init__(self, name):", "        self.name = name", "    def greet(self):", "        print(f''Hello, {self.name}!'')", "p = Person(''Ana'')", "p.greet()"]',
 'Define the class and its methods before creating an instance.',
 'Classes are defined first. __init__ sets up attributes. Methods are called on instances.',20),

('python','intermediate','File I/O','Arrange the lines to safely read a file using a context manager.',
 'code_ordering','[]','',
 NULL,
 '["with open(''data.txt'', ''r'') as f:", "    content = f.read()", "print(content)"]',
 'The with statement handles opening and closing automatically.',
 'with open() as f: is the recommended pattern for file I/O.',20);

-- ============================================================================
-- PYTHON — ADVANCED  (20 questions)
-- ============================================================================
INSERT INTO questions (language_code, level, topic, question_text, question_type, options, correct_answer, code_snippet, code_lines, hint, explanation, points_value) VALUES

-- MCQ
('python','advanced','Generators','What makes a function a generator in Python?',
 'multiple_choice','["Using return with a list","Using the yield keyword","Inheriting from Generator","Using async/await"]','B',NULL,NULL,
 'Generators produce values one at a time.',
 'yield turns a function into a generator — it pauses and resumes execution.',30),

('python','advanced','Decorators','What does a decorator do to a function?',
 'multiple_choice','["Deletes it","Renames it","Wraps it to add behaviour without modifying its code","Makes it a class method"]','C',NULL,NULL,
 'Think of it as a wrapper around the original function.',
 'Decorators use the @syntax to wrap a function, adding behaviour before/after it runs.',30),

('python','advanced','OOP','What is the purpose of @property in Python?',
 'multiple_choice','["Makes an attribute private","Turns a method into a readable attribute","Declares a static method","Deletes an attribute"]','B',NULL,NULL,
 'It lets you access a method like an attribute.',
 '@property allows a method to be accessed as if it were an attribute.',30),

('python','advanced','OOP','What does super() do in a subclass?',
 'multiple_choice','["Creates a new parent class","Calls the parent class method or __init__","Deletes the parent class","Copies parent attributes"]','B',NULL,NULL,
 'It delegates to the parent in the inheritance chain.',
 'super() returns a proxy object that delegates method calls to the parent class.',30),

('python','advanced','Context Managers','What does a context manager guarantee?',
 'multiple_choice','["Faster execution","Automatic cleanup via __enter__ and __exit__","Thread safety","Memory optimisation"]','B',NULL,NULL,
 'Think about what with open(...) as f: does when the block exits.',
 '__exit__ is always called, even if an exception occurs, ensuring cleanup.',30),

('python','advanced','Generators','What is a generator expression?',
 'multiple_choice','["A list comprehension that returns a list","A lazy iterable defined with () instead of []","A function that returns multiple values","A dictionary comprehension"]','B',NULL,NULL,
 'It looks like a list comprehension but with parentheses.',
 '(x**2 for x in range(10)) is a generator expression — lazy, memory-efficient.',30),

('python','advanced','Concurrency','What is the GIL in CPython?',
 'multiple_choice','["Global Import Library","General Interface Layer","Global Interpreter Lock that allows only one thread to run Python bytecode at a time","Graphics Instruction Layer"]','C',NULL,NULL,
 'It is a mutex that protects access to Python objects.',
 'The GIL prevents true parallelism in CPU-bound multi-threaded Python programs.',30),

('python','advanced','Metaclasses','What is a metaclass in Python?',
 'multiple_choice','["A class that cannot be instantiated","A subclass of object","The class of a class — controls class creation","An abstract base class"]','C',NULL,NULL,
 'Just as classes create objects, metaclasses create classes.',
 'type is the default metaclass. Custom metaclasses control how classes are created.',30),

('python','advanced','Itertools','What does itertools.chain(*iterables) do?',
 'multiple_choice','["Zips iterables together","Chains iterables end-to-end into one sequence","Filters iterables","Creates a cross product"]','B',NULL,NULL,
 'Think of it as concatenating iterables.',
 'itertools.chain([1,2],[3,4]) → 1,2,3,4 — iterates through each iterable in turn.',30),

('python','advanced','Closures','What is a closure in Python?',
 'multiple_choice','["A class with private attributes","A function that captures and remembers variables from its enclosing scope","A decorator that closes a file","A finally block"]','B',NULL,NULL,
 'It involves a function remembering its environment.',
 'A closure is an inner function that references variables from the outer function''s scope.',30),

('python','advanced','OOP','What is the difference between @staticmethod and @classmethod?',
 'multiple_choice','["No difference","@staticmethod receives no implicit first argument; @classmethod receives the class (cls)","@staticmethod receives self; @classmethod receives cls","@staticmethod is faster"]','B',NULL,NULL,
 'Consider what implicit argument each receives.',
 '@staticmethod is a plain function in a class. @classmethod receives cls as first argument.',30),

-- FILL IN THE BLANK
('python','advanced','Generators','Complete the generator function.',
 'fill_blank','[]','yield',
 'def countdown(n):\n    while n > 0:\n        ___ n\n        n -= 1',
 NULL,'What keyword makes a function a generator?',
 'yield pauses the function and returns a value to the caller.',30),

('python','advanced','Decorators','Complete the decorator definition.',
 'fill_blank','[]','wrapper',
 'def my_decorator(func):\n    def ___():\n        print("Before")\n        func()\n        print("After")\n    return ___',
 NULL,'The inner function is conventionally named this.',
 'The inner function (wrapper) wraps the original function.',30),

('python','advanced','Context Managers','Complete the context manager protocol.',
 'fill_blank','[]','__exit__',
 'class MyCtx:\n    def __enter__(self):\n        return self\n    def ___(self, exc_type, exc_val, exc_tb):\n        pass  # cleanup here',
 NULL,'What is the counterpart to __enter__?',
 '__exit__ is called when the with block ends, handling cleanup.',30),

('python','advanced','Closures','Complete the closure that creates a multiplier.',
 'fill_blank','[]','factor',
 'def make_multiplier(factor):\n    def multiply(x):\n        return x * ___\n    return multiply\n\ndouble = make_multiplier(2)\nprint(double(5))  # 10',
 NULL,'The inner function uses a variable from the outer scope.',
 'factor is captured from the enclosing scope — that is what makes it a closure.',30),

-- OUTPUT PREDICTION
('python','advanced','Generators','What is the output of the following code?',
 'output_prediction','[]','0\n2\n4',
 'def evens(n):\n    for i in range(n):\n        if i % 2 == 0:\n            yield i\n\nfor v in evens(5):\n    print(v)',
 NULL,'Trace through the generator yielding even values.',
 'evens(5) yields 0,2,4 — the even numbers less than 5.',30),

('python','advanced','Decorators','What is the output of the following code?',
 'output_prediction','[]','Before\nHello\nAfter',
 'def deco(fn):\n    def wrapper():\n        print("Before")\n        fn()\n        print("After")\n    return wrapper\n\n@deco\ndef say_hello():\n    print("Hello")\n\nsay_hello()',
 NULL,'Trace through what the decorator wraps around the original call.',
 '@deco replaces say_hello with wrapper, which prints Before, calls fn(), then After.',30),

('python','advanced','List Comprehensions','What is the output of the following code?',
 'output_prediction','[]','[1, 8, 27, 64, 125]',
 'cubes = [n**3 for n in range(1, 6)]\nprint(cubes)',
 NULL,'Cube each integer from 1 to 5.',
 '1³=1, 2³=8, 3³=27, 4³=64, 5³=125.',30),

-- CODE ORDERING
('python','advanced','Decorators','Arrange the lines to create a timing decorator.',
 'code_ordering','[]','',
 NULL,
 '["import time", "def timer(func):", "    def wrapper(*args, **kwargs):", "        start = time.time()", "        result = func(*args, **kwargs)", "        print(f''Elapsed: {time.time()-start:.4f}s'')", "        return result", "    return wrapper"]',
 'Import first, then define the outer function, inner function, timing logic.',
 'The wrapper measures elapsed time around the original function call.',30),

('python','advanced','Generators','Arrange the lines to create a generator that yields Fibonacci numbers.',
 'code_ordering','[]','',
 NULL,
 '["def fibonacci():", "    a, b = 0, 1", "    while True:", "        yield a", "        a, b = b, a + b"]',
 'Initialise the pair, loop forever, yield the current value, advance.',
 'Each iteration yields a and moves the pair forward by one Fibonacci step.',30);

-- ============================================================================
-- JAVASCRIPT — BEGINNER  (22 questions)
-- ============================================================================
INSERT INTO questions (language_code, level, topic, question_text, question_type, options, correct_answer, code_snippet, code_lines, hint, explanation, points_value) VALUES

-- MCQ
('javascript','beginner','Variables','Which keyword declares a block-scoped variable in modern JavaScript?',
 'multiple_choice','["var","let","define","local"]','B',NULL,NULL,
 'Introduced in ES6, it replaced var for most use cases.',
 'let declares block-scoped variables, unlike var which is function-scoped.',10),

('javascript','beginner','Variables','Which keyword declares a constant in JavaScript?',
 'multiple_choice','["const","final","immutable","fixed"]','A',NULL,NULL,
 'Its value cannot be reassigned.',
 'const declares a variable whose binding cannot be reassigned.',10),

('javascript','beginner','Operators','What does === check in JavaScript?',
 'multiple_choice','["Value only","Type only","Both value and type (strict equality)","Reference equality"]','C',NULL,NULL,
 'It is stricter than ==.',
 '=== checks both value and type: 5 === "5" is false.',10),

('javascript','beginner','Data Types','What does typeof null return?',
 'multiple_choice','["null","undefined","object","empty"]','C',NULL,NULL,
 'This is a famous JavaScript quirk — typeof null has always returned an unexpected type name.',
 'typeof null returns "object" — a historical bug in JavaScript.',10),

('javascript','beginner','Arrays','Which method adds an element to the end of an array?',
 'multiple_choice','["append()","add()","push()","insert()"]','C',NULL,NULL,
 'Think of pushing something onto a stack.',
 'array.push(value) adds one or more elements to the end.',10),

('javascript','beginner','Functions','What is the correct syntax for an arrow function?',
 'multiple_choice','["function() =>","=> function()","const f = () => {}","f: () -> {}"]','C',NULL,NULL,
 'Arrow functions use the => symbol.',
 'Arrow function syntax: const fn = (params) => expression;',10),

('javascript','beginner','Variables','What is the value of an unassigned variable in JavaScript?',
 'multiple_choice','["null","0","empty string","undefined"]','D',NULL,NULL,
 'JavaScript has a special value for declared-but-not-assigned variables.',
 'Declaring let x; without assignment gives x the value undefined.',10),

('javascript','beginner','Output','How do you print to the browser console in JavaScript?',
 'multiple_choice','["print()","echo()","console.log()","System.out.println()"]','C',NULL,NULL,
 'It uses the built-in console object.',
 'console.log() outputs to the browser''s developer console.',10),

('javascript','beginner','Strings','Which method converts a string to uppercase?',
 'multiple_choice','["toUpper()","capitalize()","toUpperCase()","upper()"]','C',NULL,NULL,
 'JavaScript string methods are camelCase.',
 '"hello".toUpperCase() returns "HELLO".',10),

('javascript','beginner','Arrays','Which method removes and returns the last element of an array?',
 'multiple_choice','["shift()","remove()","pop()","delete()"]','C',NULL,NULL,
 'Opposite of push().',
 'array.pop() removes and returns the last element.',10),

('javascript','beginner','Type Conversion','Which correctly converts the string "42" to a number?',
 'multiple_choice','["int(42)","Number(42)","str.toInt()","toNum(42)"]','B',NULL,NULL,
 'JavaScript has a global Number function.',
 'Number("42") converts the string to the number 42.',10),

('javascript','beginner','Special Values','What is NaN in JavaScript?',
 'multiple_choice','["Null And Nothing","Not a Number — result of invalid numeric operations","Negative and Null","Native Array Node"]','B',NULL,NULL,
 'It stands for an acronym describing an invalid numeric result.',
 'NaN (Not a Number) is returned by operations like 0/0 or parseInt("abc").',10),

-- FILL IN THE BLANK
('javascript','beginner','Functions','Complete the function declaration.',
 'fill_blank','[]','function',
 '___ greet(name) {\n  return "Hello, " + name;\n}',
 NULL,'What keyword declares a named function?',
 'function keyword declares a named function.',10),

('javascript','beginner','Conditionals','Complete the ternary expression.',
 'fill_blank','[]','?',
 'let result = age >= 18 ___ "adult" : "minor";',
 NULL,'The ternary operator uses a specific symbol to separate condition from values.',
 'Ternary syntax: condition ? valueIfTrue : valueIfFalse.',10),

('javascript','beginner','Arrays','Iterate over every element of the array.',
 'fill_blank','[]','forEach',
 'const nums = [1, 2, 3];\nnums.___(n => console.log(n));',
 NULL,'Which array method executes a callback for each element?',
 'forEach() executes a function for each element in an array.',10),

('javascript','beginner','Objects','Access the name property of the object.',
 'fill_blank','[]','name',
 'const person = { name: "Ana", age: 21 };\nconsole.log(person.___);',
 NULL,'Access a property using dot notation.',
 'Dot notation: object.propertyName accesses the property.',10),

-- OUTPUT PREDICTION
('javascript','beginner','Operators','What is the output of the following code?',
 'output_prediction','[]','10',
 'let x = 5;\nx += 5;\nconsole.log(x);',
 NULL,'+= adds to the current value.',
 '5 + 5 = 10.',10),

('javascript','beginner','Strings','What is the output of the following code?',
 'output_prediction','[]','4',
 'let s = "CodeArena";\nconsole.log(s.indexOf("A"));',
 NULL,'indexOf returns the zero-based position of the first matching character.',
 'C=0,o=1,d=2,e=3,A=4 — "A" first appears at index 4.',10),

('javascript','beginner','Arrays','What is the output of the following code?',
 'output_prediction','[]','3',
 'const arr = [10, 20, 30];\nconsole.log(arr.length);',
 NULL,'What property gives the count of elements?',
 '.length returns the number of elements: 3.',10),

-- CODE ORDERING
('javascript','beginner','Functions','Arrange the lines to define and call a function that squares a number.',
 'code_ordering','[]','',
 NULL,
 '["function square(n) {", "  return n * n;", "}", "const result = square(5);", "console.log(result);"]',
 'Declare the function before calling it.',
 'Function declaration comes first, then calling it and logging the result.',10),

('javascript','beginner','Arrays','Arrange the lines to filter even numbers from an array.',
 'code_ordering','[]','',
 NULL,
 '["const nums = [1, 2, 3, 4, 5, 6];", "const evens = nums.filter(n => n % 2 === 0);", "console.log(evens);"]',
 'Create the array, then filter it, then log.',
 '.filter() returns a new array with elements passing the test.',10),

('javascript','beginner','Loops','Arrange the lines to create a for loop that prints 1 to 5.',
 'code_ordering','[]','',
 NULL,
 '["for (let i = 1; i <= 5; i++) {", "  console.log(i);", "}"]',
 'A for loop has initialisation, condition, and increment.',
 'for(init; condition; increment) is the standard for loop syntax.',10);

-- ============================================================================
-- JAVA — BEGINNER  (22 questions)
-- ============================================================================
INSERT INTO questions (language_code, level, topic, question_text, question_type, options, correct_answer, code_snippet, code_lines, hint, explanation, points_value) VALUES

-- MCQ
('java','beginner','Output','Which statement prints output in Java?',
 'multiple_choice','["print()","console.log()","System.out.println()","echo()"]','C',NULL,NULL,
 'Java uses System.out for standard output.',
 'System.out.println() prints with a newline. System.out.print() prints without.',10),

('java','beginner','Data Types','Which is NOT a primitive data type in Java?',
 'multiple_choice','["int","double","String","boolean"]','C',NULL,NULL,
 'One of these is a class, not a primitive.',
 'String is a class in Java. int, double, boolean, char are primitives.',10),

('java','beginner','Variables','How do you declare an integer variable in Java?',
 'multiple_choice','["x = 5","var x = 5","int x = 5","integer x = 5"]','C',NULL,NULL,
 'Java requires explicit type declarations.',
 'Java is statically typed: int x = 5; declares and initialises an int.',10),

('java','beginner','Methods','What keyword defines a method that returns no value?',
 'multiple_choice','["null","empty","none","void"]','D',NULL,NULL,
 'It means "nothing" in Latin.',
 'void is the return type when a method does not return a value.',10),

('java','beginner','OOP','Which keyword creates a new object in Java?',
 'multiple_choice','["create","make","new","object"]','C',NULL,NULL,
 'Java uses a keyword to allocate memory for a new object.',
 'new keyword allocates memory and calls the constructor: new Dog().',10),

('java','beginner','Access Modifiers','What does the public access modifier mean?',
 'multiple_choice','["Accessible only within the class","Accessible within the package","Accessible from anywhere","Accessible only to subclasses"]','C',NULL,NULL,
 'It is the most permissive modifier.',
 'public members are accessible from any class in any package.',10),

('java','beginner','Strings','How do you compare two Strings for equality in Java?',
 'multiple_choice','["str1 == str2","str1.equals(str2)","str1.compare(str2)","str1 === str2"]','B',NULL,NULL,
 '== compares references, not content.',
 '.equals() compares string content. == compares object references.',10),

('java','beginner','Arrays','How do you declare an integer array of size 5 in Java?',
 'multiple_choice','["int arr = new int[5]","int[] arr = new int[5]","array<int> arr(5)","int arr[5]"]','B',NULL,NULL,
 'The square brackets go after the type.',
 'Java array declaration: int[] arr = new int[5];',10),

('java','beginner','Loops','Which loop is best when the number of iterations is known?',
 'multiple_choice','["while","do-while","for","foreach"]','C',NULL,NULL,
 'This loop has initialisation, condition, and increment built in.',
 'for loops are ideal when the iteration count is known: for(int i=0;i<n;i++).',10),

('java','beginner','OOP','What is a constructor?',
 'multiple_choice','["A method that destroys an object","A special method called when an object is created","A static utility method","A method that returns void"]','B',NULL,NULL,
 'It shares its name with the class.',
 'A constructor has the same name as the class and initialises the object.',10),

('java','beginner','Exceptions','Which keyword is used to throw an exception in Java?',
 'multiple_choice','["raise","error","throw","except"]','C',NULL,NULL,
 'Java uses the verb form of "exception".',
 'throw new ExceptionType() explicitly throws an exception.',10),

('java','beginner','Inheritance','Which keyword enables inheritance in Java?',
 'multiple_choice','["implements","inherits","extends","derives"]','C',NULL,NULL,
 'A class "extends" its parent.',
 'class Dog extends Animal { } — Dog inherits from Animal.',10),

-- FILL IN THE BLANK
('java','beginner','Output','Complete the print statement.',
 'fill_blank','[]','System.out.println',
 '___(\"Hello, World!\");',
 NULL,'Java uses System.out for console output.',
 'System.out.println() prints a line to standard output.',10),

('java','beginner','Variables','Declare an integer variable.',
 'fill_blank','[]','int',
 '___ score = 95;',
 NULL,'What is Java''s primitive integer type?',
 'int is the 32-bit integer primitive type in Java.',10),

('java','beginner','Loops','Complete the for loop to print 1 through 5.',
 'fill_blank','[]','i++',
 'for (int i = 1; i <= 5; ___) {\n    System.out.println(i);\n}',
 NULL,'The third part of a for loop increments the counter.',
 'i++ increments i by 1 each iteration.',10),

('java','beginner','OOP','Complete the constructor.',
 'fill_blank','[]','this',
 'class Dog {\n    String name;\n    Dog(String name) {\n        ___.name = name;\n    }\n}',
 NULL,'Which keyword refers to the current instance?',
 'this.name refers to the instance variable, distinguishing it from the parameter.',10),

-- OUTPUT PREDICTION
('java','beginner','Operators','What is the output of the following code?',
 'output_prediction','[]','15',
 'int a = 10;\na += 5;\nSystem.out.println(a);',
 NULL,'+= adds to the current value.',
 '10 + 5 = 15.',10),

('java','beginner','Strings','What is the output of the following code?',
 'output_prediction','[]','9',
 'String s = "CodeArena";\nSystem.out.println(s.length());',
 NULL,'Count the characters: C-o-d-e-A-r-e-n-a.',
 '"CodeArena" has 9 characters.',10),

('java','beginner','Arrays','What is the output of the following code?',
 'output_prediction','[]','30',
 'int[] nums = {10, 20, 30};\nSystem.out.println(nums[2]);',
 NULL,'Array indexing starts at 0.',
 'Index 2 is the third element: 30.',10),

-- CODE ORDERING
('java','beginner','Methods','Arrange the lines to define and call a method that adds two numbers.',
 'code_ordering','[]','',
 NULL,
 '["public static int add(int a, int b) {", "    return a + b;", "}", "int result = add(3, 4);", "System.out.println(result);"]',
 'Define the method before calling it.',
 'Static methods can be called without creating an object.',10),

('java','beginner','OOP','Arrange the lines to define a simple class and create an instance.',
 'code_ordering','[]','',
 NULL,
 '["class Dog {", "    String name;", "    Dog(String name) {", "        this.name = name;", "    }", "}", "Dog d = new Dog(\\"Rex\\");", "System.out.println(d.name);"]',
 'Define the class structure, then instantiate it.',
 'Class definition first, then constructor, then object creation.',10),

('java','beginner','Loops','Arrange the lines for a while loop that counts down from 3.',
 'code_ordering','[]','',
 NULL,
 '["int n = 3;", "while (n > 0) {", "    System.out.println(n);", "    n--;", "}"]',
 'Initialise the counter, write the condition, decrement inside the loop.',
 'The counter must be decremented inside the loop to avoid an infinite loop.',10);

-- ============================================================================
-- USER ANSWERS — demo history for the student (user_id=2)
-- Shows some answered questions for Python beginner
-- ============================================================================
INSERT INTO user_answers (user_id, question_id, selected_answer, is_correct, points_earned, hint_level_used) VALUES
(2, 1,  'C', TRUE,  10, 0),
(2, 2,  'C', TRUE,  10, 0),
(2, 3,  'C', TRUE,  10, 0),
(2, 4,  'B', TRUE,  10, 0),
(2, 5,  'B', TRUE,  10, 0),
(2, 6,  'C', TRUE,  10, 0),
(2, 7,  'D', TRUE,  10, 0),
(2, 8,  'C', TRUE,  10, 0),
(2, 9,  'B', TRUE,  10, 0),
(2, 10, 'C', TRUE,  10, 0),
(2, 11, 'C', TRUE,  10, 0),
(2, 12, 'B', TRUE,  10, 1),
(2, 13, 'C', TRUE,  10, 0),
(2, 14, 'B', TRUE,  10, 0),
(2, 15, 'A', FALSE,  0, 2),
(2, 16, 'int', TRUE,  10, 0),
(2, 17, '5',   TRUE,  10, 0),
(2, 18, 'def', TRUE,  10, 0),
(2, 19, 'len', TRUE,  10, 0),
(2, 20, 'append', TRUE, 10, 0);

-- ============================================================================
-- WEAKNESSES — auto-detected weak areas for the student
-- ============================================================================
INSERT INTO weaknesses (user_id, topic, language, error_count, total_attempts, error_rate, resolved) VALUES
(2, 'Data Types',   'python', 1, 3,  33.33, FALSE),
(2, 'File I/O',     'python', 2, 4,  50.00, FALSE),
(2, 'typeof quirks','javascript', 1, 2, 50.00, FALSE);

-- ============================================================================
-- ████  DONE  ████
-- ============================================================================
SELECT CONCAT(
  '✓ CodeArena demo database ready!  ',
  (SELECT COUNT(*) FROM users), ' users  |  ',
  (SELECT COUNT(*) FROM questions), ' questions  |  ',
  (SELECT COUNT(*) FROM classrooms), ' classrooms'
) AS status;
