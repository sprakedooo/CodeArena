-- ============================================================================
-- CODEARENA — PHASE 1 SCHEMA
-- AI-Powered Computer-Aided Instruction System
-- ============================================================================
-- Run: mysql -u root -p < backend/config/schema.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS codearena;
USE codearena;

-- ============================================================================
-- DROP ALL TABLES (clean slate)
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ai_feedback_logs;
DROP TABLE IF EXISTS weaknesses;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS lesson_progress;
DROP TABLE IF EXISTS path_lessons;
DROP TABLE IF EXISTS learning_paths;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS classroom_answers;
DROP TABLE IF EXISTS classroom_sessions;
DROP TABLE IF EXISTS classroom_questions;
DROP TABLE IF EXISTS classroom_lessons;
DROP TABLE IF EXISTS classroom_enrollments;
DROP TABLE IF EXISTS classrooms;
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
    user_id         INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            ENUM('student','faculty') DEFAULT 'student',
    avatar          TEXT,
    bio             TEXT,
    total_points    INT DEFAULT 0,
    current_level   ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    badges          JSON,
    selected_language VARCHAR(50) DEFAULT NULL,
    current_path_id INT DEFAULT NULL,
    total_xp        INT DEFAULT 0,
    streak          INT DEFAULT 0,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- LEARNING PATHS
-- ============================================================================
CREATE TABLE learning_paths (
    path_id     INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    language    VARCHAR(50)  NOT NULL,
    description TEXT,
    difficulty  ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    icon        VARCHAR(100) DEFAULT 'code',
    color       VARCHAR(20)  DEFAULT '#7c3aed',
    order_index INT          DEFAULT 0,
    is_published BOOLEAN     DEFAULT TRUE,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PATH LESSONS
-- ============================================================================
CREATE TABLE path_lessons (
    lesson_id          INT AUTO_INCREMENT PRIMARY KEY,
    path_id            INT NOT NULL,
    title              VARCHAR(255) NOT NULL,
    content            LONGTEXT NOT NULL,
    order_index        INT  DEFAULT 0,
    estimated_minutes  INT  DEFAULT 10,
    xp_reward          INT  DEFAULT 20,
    is_published       BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (path_id) REFERENCES learning_paths(path_id) ON DELETE CASCADE
);

-- ============================================================================
-- LESSON PROGRESS
-- ============================================================================
CREATE TABLE lesson_progress (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    lesson_id        INT NOT NULL,
    status           ENUM('not_started','in_progress','completed') DEFAULT 'not_started',
    completed_at     TIMESTAMP NULL,
    time_spent_secs  INT DEFAULT 0,
    UNIQUE KEY uq_user_lesson (user_id, lesson_id),
    FOREIGN KEY (user_id)   REFERENCES users(user_id)       ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES path_lessons(lesson_id) ON DELETE CASCADE
);

-- ============================================================================
-- WEAKNESSES  (AI-detected per student)
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
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES users(user_id)           ON DELETE CASCADE
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
-- SUBMISSIONS  (coding assignments)
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
-- ANNOUNCEMENTS
-- ============================================================================
CREATE TABLE announcements (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id INT NOT NULL,
    author_id    INT NOT NULL,
    title        VARCHAR(255),
    message      TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (author_id)    REFERENCES users(user_id)           ON DELETE CASCADE
);

-- ============================================================================
-- QUESTIONS  (quiz / practice questions)
-- ============================================================================
CREATE TABLE questions (
    question_id   INT AUTO_INCREMENT PRIMARY KEY,
    language_code VARCHAR(20) NOT NULL,
    level         ENUM('beginner','intermediate','advanced') NOT NULL,
    topic         VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    options       JSON NOT NULL,
    correct_answer CHAR(1) NOT NULL,
    hint          TEXT,
    explanation   TEXT,
    points_value  INT DEFAULT 10,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- USER ANSWERS
-- ============================================================================
CREATE TABLE user_answers (
    answer_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    question_id     INT NOT NULL,
    selected_answer CHAR(1) NOT NULL,
    is_correct      BOOLEAN NOT NULL,
    points_earned   INT DEFAULT 0,
    hint_level_used INT DEFAULT 0,
    answered_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES users(user_id)     ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);

-- ============================================================================
-- PROGRESS
-- ============================================================================
CREATE TABLE progress (
    progress_id        INT AUTO_INCREMENT PRIMARY KEY,
    user_id            INT NOT NULL,
    language_code      VARCHAR(20) NOT NULL,
    current_level      ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    questions_answered INT DEFAULT 0,
    correct_answers    INT DEFAULT 0,
    consecutive_correct INT DEFAULT 0,
    accuracy_percent   DECIMAL(5,2) DEFAULT 0.00,
    last_activity      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
-- FEEDBACK  (AI-generated performance feedback)
-- ============================================================================
CREATE TABLE feedback (
    feedback_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id           INT NOT NULL,
    language_code     VARCHAR(20) NOT NULL,
    overall_assessment TEXT,
    weak_areas        JSON,
    strong_areas      JSON,
    next_steps        JSON,
    encouragement     TEXT,
    generated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contributions (
    contribution_id   INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id        INT NOT NULL,
    type              ENUM('blog','course') NOT NULL DEFAULT 'blog',
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    content           LONGTEXT,
    language          VARCHAR(30) DEFAULT 'general',
    tags              VARCHAR(500) DEFAULT '',
    cover_image       TEXT,
    status            ENUM('published','draft') DEFAULT 'published',
    view_count        INT DEFAULT 0,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- SAMPLE DATA: Demo User
-- ============================================================================
-- Passwords are bcrypt-hashed (student123 and maria123 respectively)
INSERT INTO users (email, password, full_name, role, total_points, current_level, badges) VALUES
('student@example.com', '$2b$10$DgFiUCcmDnn5ZXTxal55Eubu7BfrYtdAnAn75R1C4F1r9UX4FiyJi', 'Juan Dela Cruz', 'student', 150, 'beginner', '["first_login"]'),
('maria@example.com', '$2b$10$0jORJv28ymD7M5TEh6KBae21RoHdF7/8zevQeDZs5eyPWQgydRfgy', 'Maria Santos', 'student', 450, 'intermediate', '["first_login", "fast_learner", "perfect_score"]');

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_path_lessons_path    ON path_lessons(path_id);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_weaknesses_user      ON weaknesses(user_id);
CREATE INDEX idx_ai_logs_user         ON ai_feedback_logs(user_id);
CREATE INDEX idx_submissions_user     ON submissions(user_id);
CREATE INDEX idx_questions_lang_level ON questions(language_code, level);
CREATE INDEX idx_user_answers_user    ON user_answers(user_id);
CREATE INDEX idx_progress_user        ON progress(user_id);
CREATE INDEX idx_classrooms_faculty   ON classrooms(faculty_id);
CREATE INDEX idx_enrollments_classroom ON classroom_enrollments(classroom_id);
CREATE INDEX idx_enrollments_student  ON classroom_enrollments(student_id);
CREATE INDEX idx_announcements_room   ON announcements(classroom_id);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Demo users  (passwords: student123 / faculty123)
INSERT INTO users (email, password, full_name, role, selected_language, total_xp, streak) VALUES
('student@codearena.com', '$2b$10$DgFiUCcmDnn5ZXTxal55Eubu7BfrYtdAnAn75R1C4F1r9UX4FiyJi', 'Juan Dela Cruz', 'student', 'python', 0, 0),
('faculty@codearena.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC18Log5L5ii.LrVHrH.', 'Prof. Maria Santos', 'faculty', NULL, 0, 0);

-- ============================================================================
-- LEARNING PATHS — Python
-- ============================================================================
INSERT INTO learning_paths (title, language, description, difficulty, icon, color, order_index) VALUES
('Python Basics',         'python', 'Start your programming journey with Python fundamentals.', 'beginner',     'code',            '#3776AB', 1),
('Python Intermediate',   'python', 'Level up with functions, OOP, and file handling.',         'intermediate', 'integration_instructions', '#2563eb', 2),
('JavaScript Essentials', 'javascript', 'Build interactive web experiences with JavaScript.',   'beginner',     'javascript',      '#F7DF1E', 3),
('Java Fundamentals',     'java',   'Enterprise-grade programming with Java.',                  'beginner',     'coffee',          '#E76F00', 4),
('C++ Programming',       'cpp',    'High-performance systems programming with C++.',           'intermediate', 'memory',          '#659AD2', 5);

-- ============================================================================
-- PATH LESSONS — Python Basics (path_id = 1)
-- ============================================================================
INSERT INTO path_lessons (path_id, title, content, order_index, estimated_minutes, xp_reward) VALUES
(1, 'Introduction to Python',
'<h2>What is Python?</h2>
<p>Python is a beginner-friendly, general-purpose programming language created by <strong>Guido van Rossum</strong> in 1991. It is widely used in web development, data science, artificial intelligence, and automation.</p>
<h3>Why Learn Python?</h3>
<ul>
  <li>Clean and readable syntax — reads almost like English</li>
  <li>Huge community and ecosystem</li>
  <li>Used at Google, NASA, Netflix, and Instagram</li>
  <li>Ideal first language for beginners</li>
</ul>
<h3>Your First Python Program</h3>
<pre><code class="language-python">print("Hello, World!")</code></pre>
<p>This single line displays text on the screen. In Python, you do not need semicolons, curly braces, or class declarations just to print something.</p>
<div class="info-box">💡 <strong>Tip:</strong> Python uses indentation (spaces) instead of braces to define code blocks. Consistency matters!</div>',
1, 8, 20),

(1, 'Variables and Data Types',
'<h2>Storing Data with Variables</h2>
<p>A variable is a named container that stores a value. In Python, you create a variable simply by assigning a value to a name — no type declaration needed.</p>
<pre><code class="language-python">name = "Maria"
age = 20
gpa = 1.75
is_enrolled = True</code></pre>
<h3>The Four Basic Data Types</h3>
<ul>
  <li><code>str</code> — text, e.g. <code>"Hello"</code></li>
  <li><code>int</code> — whole numbers, e.g. <code>42</code></li>
  <li><code>float</code> — decimal numbers, e.g. <code>3.14</code></li>
  <li><code>bool</code> — True or False</li>
</ul>
<h3>Checking the Type</h3>
<pre><code class="language-python">x = 42
print(type(x))   # &lt;class int&gt;</code></pre>
<div class="info-box">💡 <strong>Tip:</strong> Variable names should be lowercase and use underscores for spaces: <code>student_name</code>, not <code>StudentName</code>.</div>',
2, 10, 20),

(1, 'Input and Output',
'<h2>Talking to the User</h2>
<p>Programs become useful when they can receive input and display results.</p>
<h3>Displaying Output</h3>
<pre><code class="language-python">print("Welcome to CodeArena!")
print("Your score is:", 95)</code></pre>
<h3>Reading Input</h3>
<pre><code class="language-python">name = input("Enter your name: ")
print("Hello,", name)</code></pre>
<div class="info-box">⚠️ <strong>Important:</strong> <code>input()</code> always returns a <em>string</em>. To use it as a number, convert it first.</div>
<h3>Type Conversion</h3>
<pre><code class="language-python">age = int(input("Enter your age: "))
print("In 5 years you will be", age + 5)</code></pre>',
3, 10, 20),

(1, 'Conditionals (if / elif / else)',
'<h2>Making Decisions in Code</h2>
<p>Conditionals allow your program to choose different paths based on conditions.</p>
<pre><code class="language-python">grade = int(input("Enter grade: "))

if grade >= 90:
    print("Excellent!")
elif grade >= 75:
    print("Passed")
else:
    print("Failed")</code></pre>
<h3>Comparison Operators</h3>
<ul>
  <li><code>==</code> equal to</li>
  <li><code>!=</code> not equal to</li>
  <li><code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>, <code>&lt;=</code></li>
</ul>
<h3>Logical Operators</h3>
<pre><code class="language-python">if age >= 18 and is_enrolled:
    print("Eligible for scholarship")</code></pre>
<div class="info-box">💡 <strong>Tip:</strong> Python uses <code>and</code>, <code>or</code>, <code>not</code> — not <code>&&</code> or <code>||</code> like other languages.</div>',
4, 12, 25),

(1, 'Loops (for and while)',
'<h2>Repeating Actions</h2>
<p>Loops let you execute a block of code multiple times without rewriting it.</p>
<h3>The for Loop</h3>
<pre><code class="language-python">for i in range(5):
    print(i)  # prints 0, 1, 2, 3, 4</code></pre>
<h3>Looping Over a List</h3>
<pre><code class="language-python">fruits = ["apple", "mango", "banana"]
for fruit in fruits:
    print(fruit)</code></pre>
<h3>The while Loop</h3>
<pre><code class="language-python">count = 0
while count < 3:
    print("count is", count)
    count += 1</code></pre>
<div class="info-box">⚠️ <strong>Watch out:</strong> A while loop that never reaches its stopping condition will run forever (infinite loop). Always make sure the condition eventually becomes False.</div>',
5, 12, 25),

(1, 'Functions',
'<h2>Reusable Blocks of Code</h2>
<p>A function is a named block of code that performs a specific task. You define it once and call it as many times as needed.</p>
<pre><code class="language-python">def greet(name):
    print("Hello,", name)

greet("Maria")
greet("Juan")</code></pre>
<h3>Returning Values</h3>
<pre><code class="language-python">def add(a, b):
    return a + b

result = add(3, 7)
print(result)  # 10</code></pre>
<h3>Default Parameters</h3>
<pre><code class="language-python">def greet(name, greeting="Hello"):
    print(greeting + ",", name)

greet("Maria")           # Hello, Maria
greet("Juan", "Hi")     # Hi, Juan</code></pre>
<div class="info-box">💡 <strong>Best practice:</strong> Each function should do <em>one thing</em> and do it well. Keep them short and focused.</div>',
6, 15, 30);

-- ============================================================================
-- DONE
-- ============================================================================
SELECT 'CodeArena Phase 1 schema created successfully!' AS status;

-- Faculty Contributions (blogs and courses for Learn Programming page)
