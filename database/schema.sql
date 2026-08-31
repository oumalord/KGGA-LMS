-- KGGA LMS Neon schema
-- Run this script once in the Neon SQL Editor before deploying the backend.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS audit_log (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS badges (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS courses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS enrollments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS purchases (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS surveys (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS certificates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS notes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS submissions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS event_registrations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS resources (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS kgga_videos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), record JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, content_base64 TEXT NOT NULL, content_type TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

CREATE INDEX IF NOT EXISTS users_record_idx ON users USING GIN (record);
CREATE INDEX IF NOT EXISTS audit_log_record_idx ON audit_log USING GIN (record);
CREATE INDEX IF NOT EXISTS badges_record_idx ON badges USING GIN (record);
CREATE INDEX IF NOT EXISTS settings_record_idx ON settings USING GIN (record);
CREATE INDEX IF NOT EXISTS courses_record_idx ON courses USING GIN (record);
CREATE INDEX IF NOT EXISTS enrollments_record_idx ON enrollments USING GIN (record);
CREATE INDEX IF NOT EXISTS purchases_record_idx ON purchases USING GIN (record);
CREATE INDEX IF NOT EXISTS surveys_record_idx ON surveys USING GIN (record);
CREATE INDEX IF NOT EXISTS certificates_record_idx ON certificates USING GIN (record);
CREATE INDEX IF NOT EXISTS notes_record_idx ON notes USING GIN (record);
CREATE INDEX IF NOT EXISTS submissions_record_idx ON submissions USING GIN (record);
CREATE INDEX IF NOT EXISTS events_record_idx ON events USING GIN (record);
CREATE INDEX IF NOT EXISTS event_registrations_record_idx ON event_registrations USING GIN (record);
CREATE INDEX IF NOT EXISTS resources_record_idx ON resources USING GIN (record);
CREATE INDEX IF NOT EXISTS kgga_videos_record_idx ON kgga_videos USING GIN (record);

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique ON users ((record->>'authUserId'));
CREATE UNIQUE INDEX IF NOT EXISTS settings_key_unique ON settings ((record->>'key'));
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_course_user_unique ON enrollments ((record->>'courseId'), (record->>'userId'));
CREATE UNIQUE INDEX IF NOT EXISTS purchases_course_user_unique ON purchases ((record->>'courseId'), (record->>'userId'));
CREATE UNIQUE INDEX IF NOT EXISTS surveys_course_user_unique ON surveys ((record->>'courseId'), (record->>'userId'));
CREATE UNIQUE INDEX IF NOT EXISTS certificates_course_user_unique ON certificates ((record->>'courseId'), (record->>'userId'));
CREATE UNIQUE INDEX IF NOT EXISTS notes_course_module_user_unique ON notes ((record->>'courseId'), (record->>'moduleId'), (record->>'userId'));
CREATE UNIQUE INDEX IF NOT EXISTS submissions_course_lesson_user_unique ON submissions ((record->>'courseId'), (record->>'lessonId'), (record->>'userId'));
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_event_user_unique ON event_registrations ((record->>'eventId'), (record->>'userId'));