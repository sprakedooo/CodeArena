-- ============================================================================
-- MIGRATION: Coding Assignments System
-- Usage: mysql -u root -p codearena < migrate_assignments.sql
-- ============================================================================

USE codearena;

-- Assignments posted by faculty per classroom
CREATE TABLE IF NOT EXISTS coding_assignments (
    assignment_id  INT AUTO_INCREMENT PRIMARY KEY,
    classroom_id   INT NOT NULL,
    faculty_id     INT NOT NULL,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    language       VARCHAR(50) NOT NULL DEFAULT 'python',
    starter_code   TEXT,
    max_points     INT DEFAULT 100,
    scoring_mode   ENUM('per_test','all_or_nothing') DEFAULT 'per_test',
    deadline       TIMESTAMP NULL,
    status         ENUM('draft','published','closed') DEFAULT 'published',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES users(user_id) ON DELETE CASCADE
);

-- Test cases for each assignment
CREATE TABLE IF NOT EXISTS assignment_test_cases (
    test_case_id   INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id  INT NOT NULL,
    label          VARCHAR(100) DEFAULT NULL,
    input          TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden      BOOLEAN DEFAULT FALSE,
    order_index    INT DEFAULT 0,
    FOREIGN KEY (assignment_id) REFERENCES coding_assignments(assignment_id) ON DELETE CASCADE
);

-- Student submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
    submission_id    INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id    INT NOT NULL,
    student_id       INT NOT NULL,
    code             TEXT NOT NULL,
    language         VARCHAR(50) NOT NULL,
    status           ENUM('running','completed','error') DEFAULT 'completed',
    test_results     JSON,
    passed_tests     INT DEFAULT 0,
    total_tests      INT DEFAULT 0,
    score            INT DEFAULT 0,
    execution_time_ms INT DEFAULT 0,
    submitted_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES coding_assignments(assignment_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id)   REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assign_classroom ON coding_assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_testcase_assign  ON assignment_test_cases(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submission_assign ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submission_student ON assignment_submissions(student_id);

SELECT 'Assignments migration complete!' AS status;
