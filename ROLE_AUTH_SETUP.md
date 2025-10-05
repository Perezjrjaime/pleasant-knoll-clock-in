# 🔐 Role-Based Authentication Setup Guide

This guide will help you set up a **3-tier role-based authentication system** for your Clock-In App.

## 📋 Overview

### The 3 Roles:
1. **`user`** (Unapproved) - Default for new sign-ups, sees "Access Denied" screen
2. **`approved`** - Can access and use the full app  
3. **`admin`** - Full access + can approve/manage users

---

## 🚀 Step-by-Step Setup

### **Step 1: Run the SQL Setup Script**

1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Open the file `setup-role-system.sql` from your project
5. Copy and paste the entire contents into the SQL Editor
6. Click **"Run"** to execute

✅ **What this does:**
- Creates the `user_roles` table with the 3 roles
- Sets up Row Level Security (RLS) policies
- Creates a trigger to auto-create user roles on signup
- All new users will default to `user` (unapproved)

---

### **Step 2: Create Your First Admin User**

After running the SQL script, you need to make yourself an admin:

1. **Sign up in your app** using Google OAuth (if you haven't already)
2. Go back to Supabase **SQL Editor**
3. Run this command (**replace with your email**):

```sql
UPDATE user_roles 
SET role = 'admin', approved_at = NOW()
WHERE email = 'your-email@example.com';
```

4. **Refresh your app** - you should now have admin access!

✅ **You can now:**
- Access the Admin Panel
- Approve new users
- Manage user roles

---

### **Step 3: Test the System**

1. **Test as Unapproved User:**
   - Sign out
   - Create a test Google account (or use a different email)
   - Sign in with that account
   - You should see the **"Access Pending Approval"** screen ✅

2. **Test Admin Approval:**
   - Sign out and sign back in as admin
   - Go to the **Admin** tab (bottom navigation)
   - You should see the test user in **"Pending Approvals"**
   - Click **"Approve"** to grant them access

3. **Verify Approval:**
   - Sign out and sign in as the test user
   - They should now have full access to the app! ✅

---

## 🎯 How It Works

### **New User Flow:**
1. User signs up with Google → Automatically gets `user` role
2. User sees "Access Denied" screen
3. Admin approves them → Role changes to `approved`
4. User can now use the app

### **Admin Features:**
- View all users (pending, approved, admins)
- Approve pending users with one click
- Change user roles (user → approved → admin)
- See system statistics
- Cannot demote themselves (safety feature)

---

## 🔒 Security Features

### **Database-Level Security (RLS):**
- Users can only see their own role
- Admins can see all roles
- Only admins can change roles
- New users can only create `user` role (prevents self-promotion)

### **App-Level Checks:**
- Unapproved users cannot access main app
- Only admins can access Admin Panel
- Admins cannot demote themselves

---

## 📱 User Experience

### **For Unapproved Users (`user` role):**
- See clean "Access Pending" screen
- Shows their account info
- Can sign out
- Cannot access main app

### **For Approved Users (`approved` role):**
- Full access to Clock In/Out
- Can view Hours and History
- Can see Projects (if admin-created)
- Cannot access Admin Panel

### **For Admins (`admin` role):**
- Everything approved users can do
- **Plus:** Admin Panel access
- Can manage all users
- Can create/edit projects
- See system statistics

---

## 🛠️ Customization

### **Want to auto-approve certain email domains?**

Edit the `handle_new_user()` function in the SQL script:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-approve users from your company domain
  IF NEW.email LIKE '%@yourcompany.com' THEN
    INSERT INTO public.user_roles (user_id, email, full_name, role, approved_at)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'approved', NOW());
  ELSE
    INSERT INTO public.user_roles (user_id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'user');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🐛 Troubleshooting

### **Problem: "Access Denied" for everyone**
- **Solution:** Make sure you ran Step 2 to create your first admin

### **Problem: SQL script errors**
- **Solution:** Make sure you're using the latest Supabase version
- Try running each section separately

### **Problem: Users not appearing in Admin Panel**
- **Solution:** Make sure the user has signed in at least once
- Check your browser console for errors

### **Problem: Can't approve users**
- **Solution:** Make sure RLS policies are enabled
- Verify you're signed in as an admin

---

## 📞 Need Help?

- Check Supabase logs in Dashboard → Logs
- Open browser console (F12) to see errors
- Verify user roles in SQL Editor:
  ```sql
  SELECT email, full_name, role, created_at, approved_at 
  FROM user_roles 
  ORDER BY created_at DESC;
  ```

---

## ✅ You're All Set!

Your role-based authentication system is now fully functional:
- ✅ New users get "Access Denied" until approved
- ✅ Admins can approve/manage users
- ✅ Database-level security with RLS
- ✅ Clean, professional UI for all states

**Happy coding!** 🎉
