-- ============================================================================
-- MIGRATION: Add Classroom Mode Tables
-- Run this if your database was created before classroom tables were added.
-- Usage: mysql -u root -p codearena < migrate_classroom_tables.sql
-- ============================================================================

USE codearena;

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

-- Student <-> Classroom enrollment
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classrooms_faculty      ON classrooms(faculty_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_classroom   ON classroom_enrollments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student     ON classroom_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_classroom_lessons       ON classroom_lessons(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_questions     ON classroom_questions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_sessions      ON classroom_sessions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_answers_session ON classroom_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_classroom_answers_student ON classroom_answers(student_id);

SELECT 'Classroom tables migration complete!' AS status;
