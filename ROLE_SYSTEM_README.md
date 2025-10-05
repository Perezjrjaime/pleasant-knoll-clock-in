# 🔐 Role-Based Authentication System

A complete 3-tier role-based authentication system for the Pleasant Knoll Clock-In App.

## 🎯 Quick Start (5 Minutes)

1. **Run SQL Setup**
   ```
   Open Supabase → SQL Editor → Run setup-role-system.sql
   ```

2. **Create Admin**
   ```sql
   UPDATE user_roles 
   SET role = 'admin', approved_at = NOW()
   WHERE email = 'YOUR_EMAIL';
   ```

3. **Test It**
   - Sign in as admin → See Admin tab ✅
   - Sign in with test account → See Access Denied ✅
   - Approve test user → Full access ✅

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **ROLE_AUTH_SETUP.md** | Complete setup guide |
| **ROLE_SYSTEM_QUICK_REF.md** | Quick reference & tips |
| **IMPLEMENTATION_SUMMARY.md** | What was built |
| **VISUAL_GUIDE.md** | UI/UX screenshots |
| **helpful-queries.sql** | Admin SQL queries |

---

## 🎭 The 3 Roles

| Role | Access | Features |
|------|--------|----------|
| **user** | ❌ None | Access Denied screen |
| **approved** | ✅ App | Clock, Hours, History |
| **admin** | ✅ Full | Everything + Admin Panel |

---

## 📁 Files

### New Files
- `setup-role-system.sql` - Database schema
- `src/components/AccessDenied.tsx` - Access denied screen
- `helpful-queries.sql` - Admin helper queries
- Documentation files (5 markdown files)

### Modified Files
- `src/lib/supabase.ts` - Updated types
- `src/App.tsx` - Access control + admin panel
- `src/index.css` - New styles

---

## ✨ Features

### For Unapproved Users
- 🚫 Professional "Access Denied" screen
- 📧 Shows account details
- ⏳ "Pending Approval" status
- 🚪 Sign out option

### For Admins
- 👥 View all users
- ✅ Approve/deny pending users
- 🔄 Change user roles
- 📊 System statistics
- 🛡️ Cannot demote self

### Security
- 🔒 Database-level RLS policies
- 🔐 Route protection
- 🚨 Admin-only sections
- ✅ Secure role updates

---

## 🎨 UI Highlights

- Beautiful Access Denied screen with animated icon
- Color-coded role badges (🟡 Pending, 🟢 Approved, 🔵 Admin)
- One-click approval buttons
- Real-time updates
- Toast notifications
- Mobile responsive

---

## 🧪 Testing

```bash
# 1. Test unapproved user
Sign up with new account → See Access Denied ✅

# 2. Test admin approval
Sign in as admin → Approve user → See toast ✅

# 3. Test approved access
Sign in as approved user → Full app access ✅

# 4. Test role changes
Change user roles → Updates in real-time ✅

# 5. Test security
Try to demote yourself → Blocked ✅
```

---

## 📊 System Overview

```
New User Flow:
Sign Up → role='user' → Access Denied
              ↓
        Admin Approves
              ↓
        role='approved' → Full Access
```

---

## 🛠️ Customization

### Auto-approve certain emails
Edit the SQL trigger to auto-approve specific domains:
```sql
IF NEW.email LIKE '%@yourcompany.com' THEN
  -- Auto-approve
```

### Change default role
In `setup-role-system.sql`, change:
```sql
role TEXT NOT NULL DEFAULT 'user'
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Everyone sees Access Denied | Create an admin user |
| SQL errors | Run script sections separately |
| Users not showing | User must sign in first |
| Can't approve users | Verify admin role |

---

## 📞 Support

1. Check `ROLE_AUTH_SETUP.md` for detailed setup
2. Use `helpful-queries.sql` for database queries
3. Review browser console (F12) for errors
4. Check Supabase Dashboard → Logs

---

## ✅ Success Checklist

- [ ] SQL script executed
- [ ] Admin user created
- [ ] Tested Access Denied screen
- [ ] Tested user approval
- [ ] Tested role changes
- [ ] Mobile responsive verified
- [ ] All toast notifications work
- [ ] Cannot demote self (tested)

---

## 🎉 What You Get

✅ **3-tier role system** (user, approved, admin)  
✅ **Access control** with professional UI  
✅ **Admin dashboard** for user management  
✅ **Database security** with RLS policies  
✅ **Mobile responsive** design  
✅ **Complete documentation**  
✅ **Zero new packages** required  

---

## 📈 Stats

- **Setup time:** 5 minutes
- **Lines of code:** ~800
- **New components:** 1
- **New packages:** 0
- **Documentation files:** 5
- **SQL scripts:** 2

---

**Built with ❤️ for Pleasant Knoll Landscaping**

Ready to deploy! 🚀
