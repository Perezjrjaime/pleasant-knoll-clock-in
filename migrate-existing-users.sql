-- Migration Script: Update Existing Users to New Role System
-- Run this AFTER running setup-role-system.sql

-- This script migrates existing user roles from the old 2-tier system to the new 3-tier system
-- Old: 'admin' | 'employee'
-- New: 'user' | 'approved' | 'admin'

-- Step 1: Update all 'employee' roles to 'approved' (they're already using the app)
UPDATE user_roles 
SET 
  role = 'approved',
  approved_at = COALESCE(approved_at, created_at, NOW()),
  updated_at = NOW()
WHERE role = 'employee';

-- Step 2: Ensure all 'admin' roles have approval timestamp
UPDATE user_roles 
SET 
  approved_at = COALESCE(approved_at, created_at, NOW()),
  updated_at = NOW()
WHERE role = 'admin' AND approved_at IS NULL;

-- Step 3: Check the migration results
SELECT 
  email,
  full_name,
  role,
  created_at,
  approved_at,
  CASE 
    WHEN role = 'admin' THEN '🔵 Admin'
    WHEN role = 'approved' THEN '🟢 Approved'
    WHEN role = 'user' THEN '🟡 Pending'
    ELSE '❓ Unknown'
  END as status
FROM user_roles 
ORDER BY created_at DESC;

-- If you see any roles that aren't 'user', 'approved', or 'admin', fix them:
-- UPDATE user_roles SET role = 'approved' WHERE role NOT IN ('user', 'approved', 'admin');
