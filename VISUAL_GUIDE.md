# 📸 Role-Based Authentication - Visual Guide

## 🎨 What Your Users Will See

---

## Screen 1: Login (Everyone)

```
┌─────────────────────────────────────────┐
│                                         │
│          [Pleasant Knoll Logo]          │
│                                         │
│     Employee Clock-In System            │
│                                         │
│   Sign in with your Google account      │
│           to continue                   │
│                                         │
│   ┌───────────────────────────────┐   │
│   │  [G] Continue with Google      │   │
│   └───────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Who sees this:** Everyone before signing in

---

## Screen 2: Access Denied (Unapproved Users)

```
┌─────────────────────────────────────────┐
│                                         │
│            ⚠️                           │
│         (Pulsing Icon)                  │
│                                         │
│    Access Pending Approval              │
│                                         │
│  Your account is waiting to be          │
│  approved by an administrator.          │
│                                         │
│  You'll receive access once an admin    │
│  approves your account. Please check    │
│  back later.                            │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │      Your Account                │  │
│  ├─────────────────────────────────┤  │
│  │ Email:  john.doe@email.com      │  │
│  │ Name:   John Doe                │  │
│  │ Status: 🟡 Pending Approval    │  │
│  └─────────────────────────────────┘  │
│                                         │
│       ┌─────────────────┐              │
│       │  🚪 Sign Out    │              │
│       └─────────────────┘              │
│                                         │
│  Need help? Contact your supervisor     │
│  or administrator.                      │
│                                         │
└─────────────────────────────────────────┘
```

**Who sees this:** Users with `role = 'user'` (unapproved)

**Features:**
- ⚠️ Animated pulsing icon
- 📧 Shows user's email and name
- 🟡 "Pending Approval" badge
- 🚪 Sign out button
- 💬 Help text

---

## Screen 3: Main App (Approved Users)

```
┌─────────────────────────────────────────┐
│ [Logo]              John Doe  [Logout]  │
├─────────────────────────────────────────┤
│                                         │
│         3:45 PM                         │
│    Saturday, October 4, 2025            │
│                                         │
│  Select Project: [The Shop        ▼]   │
│  Your Role/Task: [General Labor   ▼]   │
│                                         │
│     Ready to clock in at The Shop       │
│         As: General Labor               │
│                                         │
│       ┌─────────────────┐              │
│       │   Clock In      │              │
│       └─────────────────┘              │
│                                         │
├─────────────────────────────────────────┤
│ [Clock] [Hours] [History]               │
└─────────────────────────────────────────┘
```

**Who sees this:** Users with `role = 'approved'`

**Available tabs:**
- ✅ Clock (Clock in/out)
- ✅ Hours (View time)
- ✅ History (Past sessions)
- ❌ Admin (Hidden)

---

## Screen 4: Admin Panel (Admins Only)

### 4a. Pending Approvals Section

```
┌─────────────────────────────────────────────┐
│              Admin Panel                    │
├─────────────────────────────────────────────┤
│                                             │
│  ⚠️ Pending Approvals (2)                  │
│  ┌─────────────────────────────────────┐  │
│  │ John Doe                             │  │
│  │ john.doe@email.com                   │  │
│  │ Signed up: Oct 3, 2025              │  │
│  │                                      │  │
│  │   [✅ Approve]    [❌ Deny]         │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ Jane Smith                           │  │
│  │ jane.smith@email.com                 │  │
│  │ Signed up: Oct 2, 2025              │  │
│  │                                      │  │
│  │   [✅ Approve]    [❌ Deny]         │  │
│  └─────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

**Features:**
- 📋 Yellow-highlighted section
- 👤 User details (name, email, signup date)
- ✅ Green "Approve" button
- ❌ Red "Deny" button
- 🔔 Toast notification on action

### 4b. Approved Users Section

```
┌─────────────────────────────────────────────┐
│  Approved Users (5)                         │
│  ┌─────────────────────────────────────┐  │
│  │ Admin User                           │  │
│  │ admin@example.com                    │  │
│  │ Approved: Jan 15, 2025              │  │
│  │                     [🔵 Admin    ▼] │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ John Doe                             │  │
│  │ john.doe@email.com                   │  │
│  │ Approved: Oct 3, 2025               │  │
│  │                     [🟢 Approved ▼] │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ Jane Smith                           │  │
│  │ jane.smith@email.com                 │  │
│  │ Approved: Oct 2, 2025               │  │
│  │                     [🟢 Approved ▼] │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Features:**
- 👥 List of all approved users and admins
- 🔄 Role dropdown for each user
- 🔵 Blue badge = Admin
- 🟢 Green badge = Approved
- 📅 Shows approval date
- 🛡️ Cannot demote yourself

### 4c. System Statistics

```
┌─────────────────────────────────────────────┐
│  System Statistics                          │
│  ┌──────────┬──────────┬──────────┬───────┐│
│  │    15    │    2     │    11    │   2   ││
│  │  Total   │ Pending  │ Approved │ Admin ││
│  │  Users   │          │  Users   │       ││
│  └──────────┴──────────┴──────────┴───────┘│
└─────────────────────────────────────────────┘
```

**Shows:**
- 📊 Total users
- ⏳ Pending approvals
- ✅ Approved users
- 👑 Admin count

---

## 🎨 Color Scheme

### Role Colors
```
🟡 Yellow  = user (Unapproved)
           - Background: #fff3cd
           - Border: #ffc107
           - Text: #856404

🟢 Green   = approved
           - Background: #d4edda
           - Border: #28a745
           - Text: #155724

🔵 Blue    = admin
           - Background: #d1ecf1
           - Border: #17a2b8
           - Text: #004085
```

### Button Colors
```
✅ Approve = Green (#28a745)
❌ Deny    = Red (#dc3545)
🚪 Sign Out = Black (#000000)
```

---

## 📱 Mobile Views

### Access Denied (Mobile)

```
┌───────────────────┐
│                   │
│       ⚠️         │
│                   │
│  Access Pending   │
│     Approval      │
│                   │
│ Your account is   │
│ waiting to be     │
│ approved by an    │
│ administrator.    │
│                   │
│ ┌───────────────┐│
│ │ Your Account  ││
│ ├───────────────┤│
│ │ Email:        ││
│ │ john@email.com││
│ │               ││
│ │ Name: John    ││
│ │               ││
│ │ Status:       ││
│ │ 🟡 Pending   ││
│ └───────────────┘│
│                   │
│  ┌────────────┐  │
│  │ 🚪 Sign Out│  │
│  └────────────┘  │
│                   │
│ Need help?        │
│ Contact your      │
│ administrator.    │
│                   │
└───────────────────┘
```

### Admin Panel (Mobile)

```
┌───────────────────┐
│  Admin Panel      │
├───────────────────┤
│ ⚠️ Pending (2)   │
│                   │
│ ┌───────────────┐│
│ │ John Doe      ││
│ │ john@email.com││
│ │ 2 days ago    ││
│ │               ││
│ │ [✅ Approve] ││
│ │ [❌ Deny]    ││
│ └───────────────┘│
│                   │
│ ┌───────────────┐│
│ │ Jane Smith    ││
│ │ jane@email.com││
│ │ 1 day ago     ││
│ │               ││
│ │ [✅ Approve] ││
│ │ [❌ Deny]    ││
│ └───────────────┘│
├───────────────────┤
│ Stats             │
│ ┌───┐ ┌───┐     │
│ │15 │ │ 2 │     │
│ │Tot│ │Pnd│     │
│ └───┘ └───┘     │
│ ┌───┐ ┌───┐     │
│ │11 │ │ 2 │     │
│ │App│ │Adm│     │
│ └───┘ └───┘     │
└───────────────────┘
```

---

## 🎭 State Transitions

### Visual State Flow

```
┌─────────────┐
│   Sign Up   │
│             │
│ [G] Google  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Auto-assign │
│ role='user' │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  🟡 Access  │
│   Denied    │
│   Screen    │
└──────┬──────┘
       │
     Waits
       │
       ▼
┌─────────────┐
│   Admin     │
│  Approves   │
│ role='appr' │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  🟢 Full    │
│  App Access │
│             │
└─────────────┘
```

---

## 🔔 Toast Notifications

### Success Toast
```
┌────────────────────────────────┐
│ ✅ Approved John Doe           │
└────────────────────────────────┘
(Green background, auto-dismiss 4s)
```

### Error Toast
```
┌────────────────────────────────┐
│ ❌ Failed to update role       │
└────────────────────────────────┘
(Red background, auto-dismiss 4s)
```

### Warning Toast
```
┌────────────────────────────────┐
│ ⚠️  Cannot demote yourself!    │
└────────────────────────────────┘
(Yellow background, auto-dismiss 4s)
```

---

## 🎯 Navigation

### Bottom Nav (Approved Users)
```
┌─────┬─────┬─────┐
│Clock│Hours│Hist │
└─────┴─────┴─────┘
```

### Bottom Nav (Admins)
```
┌─────┬──────┬─────┬─────┬──────┐
│Clock│Projct│Hours│Hist │Admin │
└─────┴──────┴─────┴─────┴──────┘
```

**Note:** 
- Projects tab only shows for admins
- Admin tab only shows for admins

---

## 📊 Comparison Table

| Feature | Unapproved | Approved | Admin |
|---------|-----------|----------|-------|
| **Login** | ✅ | ✅ | ✅ |
| **Access Denied Screen** | ✅ | ❌ | ❌ |
| **Clock In/Out** | ❌ | ✅ | ✅ |
| **View Hours** | ❌ | ✅ | ✅ |
| **View History** | ❌ | ✅ | ✅ |
| **Manage Projects** | ❌ | ❌ | ✅ |
| **Admin Panel** | ❌ | ❌ | ✅ |
| **Approve Users** | ❌ | ❌ | ✅ |
| **Change Roles** | ❌ | ❌ | ✅ |

---

## 🎨 Animation Details

### 1. Access Denied Icon
```css
Pulse Animation:
0%   → scale(1), opacity(1)
50%  → scale(1.05), opacity(0.8)
100% → scale(1), opacity(1)
Duration: 2s
Repeat: infinite
```

### 2. Button Hover Effects
```css
On hover:
- Translate up 2px
- Add shadow
- Change background
Duration: 0.2s
```

### 3. Toast Slide In
```css
Appear from top
Fade in over 0.3s
Auto-dismiss after 4s
Fade out over 0.3s
```

---

## ✅ Visual Checklist

When testing, verify these visual elements:

- [ ] Access Denied screen has pulsing icon
- [ ] Status badges show correct colors
- [ ] Approve/Deny buttons are green/red
- [ ] Role dropdowns are color-coded
- [ ] Toast notifications appear/disappear
- [ ] Mobile layout stacks correctly
- [ ] Buttons have hover effects
- [ ] All icons render properly
- [ ] Logo displays correctly
- [ ] Statistics grid aligns nicely

---

**🎨 Your app now has a beautiful, professional authentication UI!**
