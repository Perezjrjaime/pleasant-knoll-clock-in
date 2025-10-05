# 🎯 Role-Based Authentication - Quick Reference

## 🔑 The 3 Roles

| Role | Access Level | What They See |
|------|-------------|---------------|
| **user** (unapproved) | ❌ No Access | "Access Pending Approval" screen |
| **approved** | ✅ App Access | Clock, Hours, History tabs |
| **admin** | ✅ Full Access | Everything + Admin Panel |

---

## 👤 User Journey

### **New User Signs Up:**
```
Sign Up with Google
       ↓
Assigned "user" role
       ↓
Sees "Access Denied" screen
       ↓
Waits for approval
```

### **Admin Approves User:**
```
Admin logs in
       ↓
Goes to Admin tab
       ↓
Sees user in "Pending Approvals"
       ↓
Clicks "Approve" button
       ↓
User gets "approved" role
```

### **Approved User Can Now:**
```
✅ Clock in/out
✅ View hours
✅ See work history
✅ Use all main features
```

---

## 🎨 What Was Built

### **New Files Created:**
1. ✅ `setup-role-system.sql` - Database setup script
2. ✅ `src/components/AccessDenied.tsx` - Access denied screen
3. ✅ `ROLE_AUTH_SETUP.md` - Complete setup guide
4. ✅ `ROLE_SYSTEM_QUICK_REF.md` - This file!

### **Files Modified:**
1. ✅ `src/lib/supabase.ts` - Updated types for 3 roles
2. ✅ `src/App.tsx` - Added access control & admin features
3. ✅ `src/index.css` - New styles for all components

---

## 🚀 Quick Start (5 Minutes)

1. **Run SQL Script** → Supabase SQL Editor
2. **Make yourself admin:**
   ```sql
   UPDATE user_roles SET role = 'admin' WHERE email = 'YOUR_EMAIL';
   ```
3. **Refresh app** → You're now admin!
4. **Test:** Sign in with different account → See "Access Denied"
5. **Approve:** Go to Admin tab → Approve the user

---

## 🎭 Features Overview

### **Access Denied Screen:**
- 🚫 Shows for unapproved users
- 📧 Displays user's email and name
- ⚠️ "Pending Approval" status badge
- 🚪 Sign out button
- 💬 Help text

### **Admin Panel - Pending Section:**
- ⏳ Lists all unapproved users
- 📅 Shows signup date
- ✅ "Approve" button (green)
- ❌ "Deny" button (red)
- 🔔 Toast notifications on approval

### **Admin Panel - User Management:**
- 👥 View all approved users & admins
- 🔄 Change roles with dropdown
- 📊 System statistics dashboard
- 🛡️ Cannot demote yourself
- 🎨 Color-coded role badges

---

## 🔒 Security Highlights

### **Database Level (RLS):**
```sql
✅ Users can only see their own role
✅ Only admins can view all roles  
✅ Only admins can update roles
✅ New users can only create "user" role
✅ Automatic role creation on signup
```

### **App Level:**
```typescript
✅ Route protection for unapproved users
✅ Admin-only sections
✅ Self-demotion prevention
✅ Real-time role updates
✅ Toast notifications for actions
```

---

## 📊 Admin Panel Sections

### **1. Pending Approvals** (if any)
Shows users waiting for approval with action buttons

### **2. Approved Users**
Shows all approved users and admins with role management

### **3. System Statistics**
- Total Users
- Pending Approval
- Approved Users  
- Admins

---

## 🎨 UI/UX Features

### **Color Coding:**
- 🟡 Yellow = Pending/Unapproved
- 🟢 Green = Approved
- 🔵 Blue = Admin
- 🔴 Red = Deny/Revoke

### **Responsive Design:**
- 📱 Mobile-first approach
- 💻 Works on all screen sizes
- 🎯 Touch-friendly buttons
- ✨ Smooth animations

---

## 🧪 Testing Checklist

- [ ] Run SQL setup script
- [ ] Make yourself admin
- [ ] Sign in as admin - see Admin tab
- [ ] Sign out, create test account
- [ ] Verify "Access Denied" screen shows
- [ ] Sign in as admin again
- [ ] See test user in "Pending Approvals"
- [ ] Approve test user
- [ ] Sign in as test user
- [ ] Verify full app access
- [ ] Test role changes in Admin panel
- [ ] Verify cannot demote yourself

---

## 💡 Pro Tips

1. **Auto-approve your team:**
   - Edit SQL trigger to auto-approve `@yourcompany.com` emails

2. **Monitor user requests:**
   - Check Admin panel regularly for pending users

3. **Role management:**
   - `user` → `approved` (for regular access)
   - `approved` → `admin` (for full control)
   - `admin` → `user` (to revoke access)

4. **Security:**
   - Always have at least 2 admins
   - Don't demote the last admin!

---

## 📝 Database Queries (Useful)

### **Check all users:**
```sql
SELECT email, full_name, role, created_at, approved_at 
FROM user_roles 
ORDER BY created_at DESC;
```

### **Make someone admin:**
```sql
UPDATE user_roles 
SET role = 'admin', approved_at = NOW()
WHERE email = 'user@example.com';
```

### **See pending users:**
```sql
SELECT * FROM user_roles WHERE role = 'user';
```

### **See all admins:**
```sql
SELECT * FROM user_roles WHERE role = 'admin';
```

---

## ✅ Success Indicators

You know it's working when:
- ✅ New users see "Access Denied"
- ✅ Admin tab only shows for admins
- ✅ Approval button works instantly
- ✅ Toast messages appear on actions
- ✅ Role changes update in real-time
- ✅ Cannot demote yourself as admin

---

**🎉 Your role-based auth system is ready!**
