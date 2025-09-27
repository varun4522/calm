-- Comprehensive Database Setup and Fix Script for Calm Android App
-- This script fixes all database schema issues and creates missing tables/columns

-- 1. Create experts table (plural, not singular)
CREATE TABLE IF NOT EXISTS public.experts (
    id SERIAL PRIMARY KEY,
    registration_number TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    specialist TEXT NOT NULL,
    specialization TEXT,
    user_name TEXT,
    username TEXT,
    experience_years INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    bio TEXT,
    email TEXT,
    phone TEXT,
    qualifications TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to experts table if they don't exist
DO $$
BEGIN
    -- Add user_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experts' AND column_name = 'user_name') THEN
        ALTER TABLE experts ADD COLUMN user_name TEXT;
    END IF;
    
    -- Add username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experts' AND column_name = 'username') THEN
        ALTER TABLE experts ADD COLUMN username TEXT;
    END IF;
    
    -- Add specialization column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experts' AND column_name = 'specialization') THEN
        ALTER TABLE experts ADD COLUMN specialization TEXT;
    END IF;
    
    -- Backfill specialization from specialist column
    UPDATE experts SET specialization = specialist WHERE specialization IS NULL;
END $$;

-- 2. Create peer_listeners table with status column
CREATE TABLE IF NOT EXISTS public.peer_listeners (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    student_id TEXT NOT NULL,
    phone TEXT,
    course TEXT,
    year TEXT,
    status TEXT DEFAULT 'pending',
    password TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure status column exists in peer_listeners
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'peer_listeners' AND column_name = 'status') THEN
        ALTER TABLE peer_listeners ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 3. Create book_request table with expert_id column
CREATE TABLE IF NOT EXISTS public.book_request (
    id SERIAL PRIMARY KEY,
    student_reg TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_email TEXT,
    student_phone TEXT,
    expert_id INTEGER,
    expert_name TEXT,
    session_type TEXT NOT NULL,
    preferred_date DATE,
    preferred_time TIME,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (expert_id) REFERENCES experts(id)
);

-- Ensure expert_id column exists in book_request
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'book_request' AND column_name = 'expert_id') THEN
        ALTER TABLE book_request ADD COLUMN expert_id INTEGER;
        ALTER TABLE book_request ADD CONSTRAINT fk_book_request_expert 
            FOREIGN KEY (expert_id) REFERENCES experts(id);
    END IF;
END $$;

-- 4. Create sender_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sender_type_enum') THEN
        CREATE TYPE sender_type_enum AS ENUM ('STUDENT', 'EXPERT', 'PEER', 'ADMIN');
    END IF;
END $$;

-- 5. Insert sample experts data (only if table is empty)
INSERT INTO experts (registration_number, password, name, specialist, specialization, user_name, username, experience_years, rating, is_active, is_verified, bio, email, phone, qualifications)
SELECT * FROM (VALUES
    ('EXP001', 'password123', 'Dr. Sarah Johnson', 'Clinical Psychology', 'Clinical Psychology', 'sarah_johnson', 'sarah_j', 8, 4.8, true, true, 'Specialized in anxiety and depression treatment with 8+ years of experience.', 'sarah.johnson@mentalhealth.com', '+1-555-0101', 'PhD in Clinical Psychology, Licensed Clinical Psychologist'),
    ('EXP002', 'password123', 'Dr. Michael Chen', 'Cognitive Behavioral Therapy', 'Cognitive Behavioral Therapy', 'michael_chen', 'mike_c', 12, 4.9, true, true, 'Expert in CBT techniques for stress management and trauma recovery.', 'michael.chen@therapy.com', '+1-555-0102', 'PhD in Psychology, CBT Specialist Certification'),
    ('EXP003', 'password123', 'Dr. Emily Rodriguez', 'Family Therapy', 'Family Therapy', 'emily_rodriguez', 'emily_r', 6, 4.7, true, true, 'Passionate about helping families build stronger relationships and communication.', 'emily.rodriguez@familycare.com', '+1-555-0103', 'MSW, Licensed Marriage and Family Therapist'),
    ('EXP004', 'password123', 'Dr. James Wilson', 'Addiction Counseling', 'Addiction Counseling', 'james_wilson', 'james_w', 15, 4.9, true, true, 'Dedicated to helping individuals overcome addiction and build healthy lifestyles.', 'james.wilson@recovery.com', '+1-555-0104', 'PhD in Counseling Psychology, Certified Addiction Counselor'),
    ('EXP005', 'password123', 'Dr. Lisa Thompson', 'Child Psychology', 'Child Psychology', 'lisa_thompson', 'lisa_t', 10, 4.8, true, true, 'Specializing in child development and behavioral issues in young people.', 'lisa.thompson@childmind.com', '+1-555-0105', 'PhD in Developmental Psychology, Child Psychology Specialist')
) AS v(registration_number, password, name, specialist, specialization, user_name, username, experience_years, rating, is_active, is_verified, bio, email, phone, qualifications)
WHERE NOT EXISTS (SELECT 1 FROM experts LIMIT 1);

-- 6. Insert sample peer listeners (only if table is empty)
INSERT INTO peer_listeners (name, email, username, student_id, phone, course, year, status, password)
SELECT * FROM (VALUES
    ('Alex Kumar', 'alex.kumar@student.edu', 'alex_peer', 'STU001', '+1-555-1001', 'Computer Science', 'Third Year', 'active', 'peer123'),
    ('Maria Garcia', 'maria.garcia@student.edu', 'maria_peer', 'STU002', '+1-555-1002', 'Psychology', 'Fourth Year', 'active', 'peer123'),
    ('David Park', 'david.park@student.edu', 'david_peer', 'STU003', '+1-555-1003', 'Social Work', 'Graduate', 'active', 'peer123')
) AS v(name, email, username, student_id, phone, course, year, status, password)
WHERE NOT EXISTS (SELECT 1 FROM peer_listeners LIMIT 1);

-- 7. Enable Row Level Security and create policies
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_listeners ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_request ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed for your security requirements)
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON experts FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON peer_listeners FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON book_request FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Enable insert access for all users" ON book_request FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable update access for all users" ON book_request FOR UPDATE USING (true);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_experts_registration ON experts(registration_number);
CREATE INDEX IF NOT EXISTS idx_experts_specialization ON experts(specialization);
CREATE INDEX IF NOT EXISTS idx_peer_listeners_status ON peer_listeners(status);
CREATE INDEX IF NOT EXISTS idx_book_request_student_reg ON book_request(student_reg);
CREATE INDEX IF NOT EXISTS idx_book_request_expert_id ON book_request(expert_id);
CREATE INDEX IF NOT EXISTS idx_book_request_status ON book_request(status);

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

COMMIT;

-- Success message
SELECT 'Database setup completed successfully! All tables created and configured.' as status;