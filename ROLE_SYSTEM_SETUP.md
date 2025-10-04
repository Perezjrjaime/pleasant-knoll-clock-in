# User Role System Setup Guide

## Overview
The app now has a two-tier role system:
- **Admin**: Full access to all features, can manage projects, view all data, and manage user roles
- **Employee**: Can clock in/out and view their own hours only

## Step 1: Create the Database Table

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-user-roles-table.sql`
5. Click **Run** to execute the SQL

This will create:
- `user_roles` table to store user permissions
- Row Level Security policies to protect data
- Automatic triggers to manage timestamps

## Step 2: Set Your Account as Admin

After you've created the table and signed in to the app at least once:

1. Go to **Table Editor** in Supabase
2. Open the `user_roles` table
3. Find your account (search by your email)
4. Click the `role` field for your user
5. Change it from `employee` to `admin`
6. Save the change

## Step 3: Test the Role System

### As Admin (you):
- ✅ See all 5 tabs: Clock, Projects, Hours, History, Admin
- ✅ Can add/edit/delete projects
- ✅ Can view the Admin tab
- ✅ Can change other users' roles

### As Employee:
- ✅ See only 3 tabs: Clock, Hours, History  
- ✅ Projects tab is hidden
- ✅ Admin tab is hidden
- ✅ Can clock in/out and view their own hours

## How It Works

1. **First Sign-In**: When a user signs in for the first time, they are automatically created in the `user_roles` table with the default `employee` role

2. **Role Loading**: On every login, the app loads the user's role from the database

3. **UI Adaptation**: The app shows/hides tabs and features based on the user's role

4. **Admin Panel**: Only admins can access the Admin tab where they can:
   - View all users who have signed in
   - Change any user's role between Admin and Employee
   - See upcoming features (timecard approval, reports, etc.)

## Future Features (Coming Soon)

The admin panel is ready for these features:
- ✓ Timecard Approval System (approve/reject weekly hours)
- ✓ Employee Reports (view hours by employee)
- ✓ Project Analytics (time spent per project)

## Troubleshooting

**Problem**: I don't see the Admin tab  
**Solution**: Make sure you've changed your role to `admin` in the Supabase `user_roles` table

**Problem**: Other users show as `employee` even after I change them to `admin`  
**Solution**: They need to sign out and sign back in for the role change to take effect

**Problem**: New users aren't appearing in the Admin panel  
**Solution**: Users only appear after they've signed in for the first time

## Security Notes

- Row Level Security (RLS) is enabled on the `user_roles` table
- Employees can only see their own role
- Only admins can view and modify all user roles
- All database operations are protected by Supabase auth
