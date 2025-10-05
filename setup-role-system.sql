-- Role-Based Authentication System Setup
-- Run this in your Supabase SQL Editor

-- First, update the user_roles table to support the new 3-tier role system
-- Drop existing table if you want to start fresh (CAREFUL - this deletes data!)
-- DROP TABLE IF EXISTS user_roles CASCADE;

-- Create or replace user_roles table with new role types
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'approved', 'admin')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role on first login" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;

-- RLS Policy 1: Users can always view their own role
CREATE POLICY "Users can view own role" 
  ON user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- RLS Policy 2: Admins can view all user roles
CREATE POLICY "Admins can view all roles" 
  ON user_roles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policy 3: New users can insert their own role (defaults to 'user')
CREATE POLICY "Users can insert own role on first login" 
  ON user_roles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id AND role = 'user');

-- RLS Policy 4: Only admins can update roles
CREATE POLICY "Admins can update roles" 
  ON user_roles 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create a function to automatically create user_role entry on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user' -- All new users default to 'user' (unapproved)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to auto-create user_role on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_roles TO authenticated;

-- Optional: Create your first admin user
-- IMPORTANT: Replace 'your-email@example.com' with your actual email
-- Run this AFTER you've signed up at least once
-- UPDATE user_roles 
-- SET role = 'admin', approved_at = NOW()
-- WHERE email = 'your-email@example.com';

-- To check all users and their roles:
-- SELECT email, full_name, role, created_at, approved_at FROM user_roles ORDER BY created_at DESC;
