-- Pleasant Knoll Landscaping Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create Users table (for Google OAuth integration)
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    google_id TEXT UNIQUE,
    email TEXT UNIQUE,
    name TEXT NOT NULL,
    employee_id TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'worker',
    is_supervisor BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Projects table
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Work Sessions table
CREATE TABLE work_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project TEXT NOT NULL,
    location TEXT NOT NULL,
    role TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_work_sessions_user_id ON work_sessions(user_id);
CREATE INDEX idx_work_sessions_start_time ON work_sessions(start_time);
CREATE INDEX idx_work_sessions_user_date ON work_sessions(user_id, start_time);

-- Insert sample projects only
INSERT INTO projects (name, type, status, location) VALUES
('Johnson Residence', 'Landscape Installation', 'active', 'Johnson Residence'),
('City Park', 'Weekly Maintenance', 'active', 'City Park'),
('Shopping Mall Landscaping', 'Commercial Maintenance', 'active', 'Shopping Mall'),
('Office Complex', 'Grounds Keeping', 'active', 'Office Complex'),
('Elementary School', 'Seasonal Cleanup', 'active', 'Elementary School'),
('Riverside Apartments', 'Monthly Service', 'active', 'Riverside Apartments'),
('St. Mary''s Church', 'Landscape Design', 'active', 'St. Mary''s Church');

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (simplified for Google OAuth)

-- Users: Users can see their own profile, supervisors can see all
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id OR is_supervisor = TRUE);

-- Users: Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Projects: Everyone can read active projects
CREATE POLICY "Everyone can view active projects" ON projects
    FOR SELECT USING (status = 'active');

-- Work Sessions: Users can only manage their own sessions, supervisors can see all
CREATE POLICY "Users can manage own sessions" ON work_sessions
    FOR ALL USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_supervisor = TRUE
        )
    );

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON work_sessions TO authenticated;