-- ============================================
-- Role-Based Authentication - Helpful Queries
-- Run these in Supabase SQL Editor as needed
-- ============================================

-- 📊 VIEW ALL USERS AND THEIR ROLES
-- Shows everyone who has signed up
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
  END as status
FROM user_roles 
ORDER BY created_at DESC;

-- ============================================

-- 👤 MAKE A USER AN ADMIN
-- Replace 'user@example.com' with the actual email
UPDATE user_roles 
SET 
  role = 'admin', 
  approved_at = NOW(),
  updated_at = NOW()
WHERE email = 'user@example.com';

-- ============================================

-- ✅ APPROVE A PENDING USER
-- Replace 'user@example.com' with the actual email
UPDATE user_roles 
SET 
  role = 'approved', 
  approved_at = NOW(),
  updated_at = NOW()
WHERE email = 'user@example.com';

-- ============================================

-- 🟡 SEE ALL PENDING USERS (Waiting for approval)
SELECT 
  email,
  full_name,
  created_at,
  DATE_PART('day', NOW() - created_at) as days_waiting
FROM user_roles 
WHERE role = 'user'
ORDER BY created_at ASC;

-- ============================================

-- 🟢 SEE ALL APPROVED USERS
SELECT 
  email,
  full_name,
  approved_at,
  DATE_PART('day', NOW() - approved_at) as days_since_approval
FROM user_roles 
WHERE role = 'approved'
ORDER BY approved_at DESC;

-- ============================================

-- 🔵 SEE ALL ADMINS
SELECT 
  email,
  full_name,
  created_at,
  approved_at
FROM user_roles 
WHERE role = 'admin'
ORDER BY created_at ASC;

-- ============================================

-- 📊 SYSTEM STATISTICS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE role = 'user') as pending_users,
  COUNT(*) FILTER (WHERE role = 'approved') as approved_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admins
FROM user_roles;

-- ============================================

-- 🔄 BULK APPROVE MULTIPLE USERS
-- Approve all users from a specific domain
-- CAREFUL: Test with WHERE clause first!
UPDATE user_roles 
SET 
  role = 'approved', 
  approved_at = NOW(),
  updated_at = NOW()
WHERE 
  email LIKE '%@yourcompany.com' 
  AND role = 'user';

-- ============================================

-- 🚫 REVOKE ACCESS (Set back to unapproved)
-- Replace 'user@example.com' with the actual email
UPDATE user_roles 
SET 
  role = 'user', 
  approved_at = NULL,
  updated_at = NOW()
WHERE email = 'user@example.com';

-- ============================================

-- 🧹 DELETE A USER (USE WITH CAUTION!)
-- This completely removes the user from user_roles table
-- Replace 'user@example.com' with the actual email
DELETE FROM user_roles 
WHERE email = 'user@example.com';

-- ============================================

-- 📅 USERS WHO SIGNED UP TODAY
SELECT 
  email,
  full_name,
  role,
  created_at
FROM user_roles 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- ============================================

-- 📅 USERS WHO SIGNED UP THIS WEEK
SELECT 
  email,
  full_name,
  role,
  created_at
FROM user_roles 
WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
ORDER BY created_at DESC;

-- ============================================

-- 🔍 FIND A SPECIFIC USER
-- Replace 'searchterm' with name or email fragment
SELECT 
  email,
  full_name,
  role,
  created_at,
  approved_at
FROM user_roles 
WHERE 
  email ILIKE '%searchterm%' 
  OR full_name ILIKE '%searchterm%'
ORDER BY created_at DESC;

-- ============================================

-- 📊 APPROVAL RATE
SELECT 
  ROUND(
    (COUNT(*) FILTER (WHERE role IN ('approved', 'admin')) * 100.0) / 
    NULLIF(COUNT(*), 0), 
    2
  ) as approval_percentage,
  COUNT(*) FILTER (WHERE role = 'user') as still_pending,
  COUNT(*) FILTER (WHERE role IN ('approved', 'admin')) as total_approved
FROM user_roles;

-- ============================================

-- ⚠️ SAFETY CHECK - Ensure you have at least one admin
-- Run this before demoting any admins!
SELECT 
  COUNT(*) as admin_count,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ Safe to demote'
    WHEN COUNT(*) = 1 THEN '⚠️  WARNING: Only 1 admin!'
    ELSE '🚨 CRITICAL: No admins!'
  END as safety_status
FROM user_roles 
WHERE role = 'admin';

-- ============================================

-- 🔄 RESET A USER'S ROLE TO DEFAULT (Unapproved)
-- Useful for testing
UPDATE user_roles 
SET 
  role = 'user',
  approved_at = NULL,
  approved_by = NULL,
  updated_at = NOW()
WHERE email = 'test@example.com';

-- ============================================
-- ℹ️ TIPS:
-- 
-- 1. Always test queries with SELECT before UPDATE/DELETE
-- 2. Keep at least 2 admins for safety
-- 3. Check pending users regularly
-- 4. Use ILIKE for case-insensitive searches
-- 5. Use transactions for bulk operations
-- ============================================
