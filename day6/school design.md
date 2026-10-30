# School Database Design

A small relational database for a school, written for SQLite. It stores students, the courses they can take, and which student is enrolled on which course, with a grade.

## Tables

### students

- Stores one row per student.
- Columns: `id` (primary key), `name` (required), `email` (required and unique, so two students cannot share an email).

### courses

- Stores one row per course.
- Columns: `id` (primary key), `title` (required), `credits` (required).

### enrolments

- Stores the fact that a student is enrolled on a course, together with the grade.
- Columns: `id` (primary key), `student_id` (foreign key to `students`), `course_id` (foreign key to `courses`), `grade` (empty until the student is graded).
- A `UNIQUE (student_id, course_id)` rule stops the same student enrolling on the same course twice.

## Relationships

- **students to enrolments: one-to-many.** One student can have many enrolments, but each enrolment belongs to exactly one student.
- **courses to enrolments: one-to-many.** One course can have many enrolments, but each enrolment belongs to exactly one course.
- **students to courses: many-to-many.** A student can take many courses, and a course can have many students.

### Why a join table is needed

- A relational table cannot store a list in one cell, so a many-to-many relationship cannot be stored directly in `students` or `courses`.
- Putting course ids in a comma-separated column would be hard to search, hard to update and would break the foreign key rules.
- The `enrolments` table solves this by storing one row for each student and course pair, turning one many-to-many relationship into two one-to-many relationships.
- It also gives a natural home to data that belongs to the pair rather than to either side, such as the `grade`.

## Index

- **Index added:** `CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);`
- **Reason:** Queries such as "all students on one course" and "number of students per course" search `enrolments` by `course_id`. Without an index, the database must scan every enrolment row. With the index, it jumps straight to the matching rows, which matters as the school grows.
- The `UNIQUE (student_id, course_id)` rule already creates an index that helps searches by `student_id`, but it does not help searches by `course_id` alone, which is why this extra index is useful.
- The trade-off is a little extra storage and slightly slower inserts.

## SQL or NoSQL?

I would choose SQL for this system. The data is structured and highly related: students, courses and enrolments always have the same fields, and the many-to-many relationship between students and courses is exactly what relational tables and joins are built for. SQL also enforces the rules we need, such as unique emails, foreign keys that stop an enrolment pointing at a student who does not exist, and a rule against duplicate enrolments, and it supports questions like counting students per course with a simple `GROUP BY`. A NoSQL database could work well for flexible or very large amounts of loosely structured data, but a school's records are small, consistent and connected, so the strict structure and data integrity of SQL are more valuable here.