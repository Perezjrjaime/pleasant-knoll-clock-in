-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Allow insert for new users" ON public.user_roles;

-- Create a more permissive INSERT policy that allows authenticated users to insert their own record
CREATE POLICY "Allow authenticated users to insert their own role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Also add a policy for service role to insert (for initial setup)
CREATE POLICY "Allow service role to insert"
  ON public.user_roles
  FOR INSERT
  TO service_role
  WITH CHECK (true);
