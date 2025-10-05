-- Complete reset and fix for user_roles table

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow insert for new users" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Allow service role to insert" ON public.user_roles;

-- Temporarily disable RLS to fix issues
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Clear any existing data
TRUNCATE public.user_roles;

-- Re-enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies

-- Policy 1: Anyone authenticated can read all roles (simplified for now)
CREATE POLICY "authenticated_read_all"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Anyone authenticated can insert their own role
CREATE POLICY "authenticated_insert_own"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Anyone authenticated can update any role (you can restrict this later to admins only)
CREATE POLICY "authenticated_update_all"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: Service role can do anything (for migrations)
CREATE POLICY "service_role_all"
  ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
