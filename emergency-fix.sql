-- Emergency Fix: Temporarily disable RLS to debug
-- Run this in Supabase SQL Editor

-- Step 1: Check if you have any user_roles records
SELECT COUNT(*) as total_records FROM user_roles;

-- Step 2: Check what's in the table
SELECT 
  user_id,
  email, 
  full_name, 
  role,
  created_at
FROM user_roles;

-- Step 3: If you see records but they have old roles (like 'employee'), fix them:
UPDATE user_roles 
SET role = 'approved' 
WHERE role NOT IN ('user', 'approved', 'admin');

-- Step 4: Temporarily disable RLS to see if that's the issue
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- After this, refresh your app - it should work now
-- Once it works, come back and re-enable RLS:
-- ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
