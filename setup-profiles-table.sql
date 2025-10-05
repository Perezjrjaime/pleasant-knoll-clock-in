-- Drop the broken user_roles table
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Create role enum
CREATE TYPE user_role AS ENUM ('user', 'approved', 'admin');

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow profile creation" ON profiles
  FOR INSERT WITH CHECK (true);

-- Helper functions (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result FROM profiles WHERE id = user_id;
  RETURN COALESCE(user_role_result, 'user');
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Protect projects table
CREATE POLICY "Approved users can read projects" ON projects
  FOR SELECT USING (public.get_user_role() IN ('approved', 'admin'));

CREATE POLICY "Admins can insert projects" ON projects
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Admins can update projects" ON projects
  FOR UPDATE USING (public.get_user_role() = 'admin');

CREATE POLICY "Admins can delete projects" ON projects
  FOR DELETE USING (public.get_user_role() = 'admin');

-- Protect work_sessions table
CREATE POLICY "Approved users can read work_sessions" ON work_sessions
  FOR SELECT USING (public.get_user_role() IN ('approved', 'admin'));

CREATE POLICY "Approved users can insert work_sessions" ON work_sessions
  FOR INSERT WITH CHECK (public.get_user_role() IN ('approved', 'admin'));

CREATE POLICY "Approved users can update work_sessions" ON work_sessions
  FOR UPDATE USING (public.get_user_role() IN ('approved', 'admin'));
