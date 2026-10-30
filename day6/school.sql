-- Day 6: A School Database (SQLite)

PRAGMA foreign_keys = ON;

-- Drop old tables so the script can be run again (children first)
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- ---------- Tables ----------

CREATE TABLE students (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  title   TEXT NOT NULL,
  credits INTEGER NOT NULL
);

-- Join table: one row = one student enrolled on one course (with a grade)
CREATE TABLE enrolments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id  INTEGER NOT NULL,
  grade      INTEGER,  -- stays NULL until the student is graded
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id)  REFERENCES courses(id),
  UNIQUE (student_id, course_id)  -- the same student cannot enrol on the same course twice
);

-- Index: speeds up "which students are on this course?" lookups
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);

-- ---------- Sample data ----------

INSERT INTO students (name, email) VALUES
  ('Amina Otieno',    'amina@example.com'),
  ('Brian Kamau',     'brian@example.com'),
  ('Cynthia Wanjiru', 'cynthia@example.com'),
  ('David Mwangi',    'david@example.com');

INSERT INTO courses (title, credits) VALUES
  ('Web Development',    4),
  ('Databases',          3),
  ('Embedded Systems',   4),
  ('Digital Electronics', 3);

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 78),
  (1, 2, 85),
  (2, 1, 64),
  (2, 3, 72),
  (3, 1, 81),
  (3, 2, 90),
  (3, 3, NULL);

-- ---------- Queries ----------

-- 1. All courses for one student (by name)
SELECT courses.title, courses.credits, enrolments.grade
FROM students
JOIN enrolments ON enrolments.student_id = students.id
JOIN courses    ON courses.id = enrolments.course_id
WHERE students.name = 'Amina Otieno';
-- Expected: Web Development (4, 78) and Databases (3, 85)

-- 2. All students on one course
SELECT students.name, students.email, enrolments.grade
FROM courses
JOIN enrolments ON enrolments.course_id = courses.id
JOIN students   ON students.id = enrolments.student_id
WHERE courses.title = 'Databases';
-- Expected: Amina Otieno (85) and Cynthia Wanjiru (90)

-- 3. Number of students per course (LEFT JOIN keeps courses with no students)
SELECT courses.title, COUNT(enrolments.id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id, courses.title
ORDER BY student_count DESC;
-- Expected: Web Development 3, Databases 2, Embedded Systems 2, Digital Electronics 0

-- 4. Students who have no enrolments
SELECT students.name, students.email
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.id IS NULL;
-- Expected: David Mwangi

-- 5. Update one enrolment's grade (Cynthia's grade for Embedded Systems)
UPDATE enrolments
SET grade = 88
WHERE student_id = (SELECT id FROM students WHERE name = 'Cynthia Wanjiru')
  AND course_id  = (SELECT id FROM courses  WHERE title = 'Embedded Systems');

-- Check the update worked
SELECT students.name, courses.title, enrolments.grade
FROM enrolments
JOIN students ON students.id = enrolments.student_id
JOIN courses  ON courses.id = enrolments.course_id
WHERE students.name = 'Cynthia Wanjiru';
-- Expected: Web Development 81, Databases 90, Embedded Systems 88