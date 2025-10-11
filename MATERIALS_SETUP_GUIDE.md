# Materials Tracking System - Setup Guide

## Overview
The materials tracking system allows employees to report materials used during work sessions (e.g., "1500 SY of Single Net Straw") while admins maintain control over the materials list.

---

## 🚀 Setup Instructions

### Step 1: Run the Database Setup
1. Open your Supabase dashboard
2. Go to the **SQL Editor**
3. Open the file `setup-materials-tables.sql` from your project
4. Copy and paste the SQL into the editor
5. Click **Run** to execute

This will create:
- `materials` table (admin-managed list of materials)
- `session_materials` table (links materials to work sessions)
- Row Level Security policies (permissions)
- Sample materials (straw, mulch, topsoil, etc.)

### Step 2: Verify Tables Created
After running the SQL, check that both tables exist:
1. Go to **Table Editor** in Supabase
2. You should see:
   - ✅ `materials` 
   - ✅ `session_materials`

---

## 👨‍💼 Admin Features

### Managing Materials

Admins can access the **Materials** tab (appears between Projects and History).

#### Add New Material
1. Click **"+ Add Material"** button
2. Fill in:
   - **Name**: e.g., "Single Net Straw"
   - **Unit**: Choose from SY, SF, CY, LBS, TON, GAL, EA, FT, LF
   - **Description**: Optional details
   - **Status**: Active or Inactive
3. Click **"Add Material"**

#### Edit Material
1. Click the **Edit** icon (pencil) on any material card
2. Update the information
3. Click **"Save Changes"**

#### Delete Material
1. Click the **Delete** icon (trash) on any material card
2. Confirm deletion
3. Material will be removed (only if not used in sessions)

#### Active vs Inactive
- **Active materials**: Visible to employees for selection
- **Inactive materials**: Hidden from employees but preserved in database

---

## 👷 Employee Features

### Adding Materials to Sessions

Employees can add materials to their **draft sessions** from the **My Hours** tab.

#### How to Add Materials
1. Go to **My Hours** tab
2. Find the session you want to add materials to
3. Click the **"📦 Materials"** button
4. In the modal:
   - Select a material from the dropdown
   - Enter the quantity (e.g., 1500)
   - Add optional notes (e.g., "North slope area")
   - Click **"+ Add Material to Session"**
5. Click **"Done"** when finished

#### Important Notes
- ✅ Can only add materials to **draft** sessions
- ✅ Once submitted, materials are locked with the session
- ✅ Can add multiple materials per session
- ✅ Can remove materials before submitting timesheet

---

## 📊 Workflow Example

### Example: Landscaping Project

**Admin Setup:**
1. Admin adds material: "Single Net Straw" (Unit: SY)
2. Admin adds material: "Double Net Straw" (Unit: SY)
3. Admin adds material: "Seed Mix" (Unit: LBS)

**Employee Usage:**
1. Employee works on "North Ridge Project"
2. Clocks in → Works → Clocks out (session created as draft)
3. Goes to **My Hours** tab
4. Clicks **Materials** on the session
5. Adds:
   - Single Net Straw: 1500 SY, notes: "South slope"
   - Seed Mix: 50 LBS, notes: "Mixed with fertilizer"
6. Clicks **Done**
7. Reviews timesheet and submits for approval

**Admin Review:**
- Sees materials used when reviewing timesheet
- Can approve/reject session with materials
- Materials data preserved for project tracking

---

## 🗂️ Database Structure

### Materials Table
```sql
- id (UUID): Unique identifier
- name (TEXT): Material name
- unit (TEXT): Measurement unit (SY, LBS, etc.)
- description (TEXT): Optional details
- status (TEXT): 'active' or 'inactive'
- created_at (TIMESTAMP): When created
- created_by (UUID): Admin who created it
```

### Session Materials Table
```sql
- id (UUID): Unique identifier
- session_id (UUID): Links to work_sessions table
- material_id (UUID): Links to materials table
- quantity (DECIMAL): Amount used
- notes (TEXT): Optional notes
- created_at (TIMESTAMP): When added
- created_by (UUID): Employee who added it
```

---

## 🔒 Security (Row Level Security)

### Materials Table
- **Admins**: Full CRUD access
- **Employees**: Read-only access to active materials

### Session Materials Table
- **Employees**: Can add materials to their own draft sessions
- **Employees**: Can delete materials from their own draft sessions
- **Employees**: Can view materials on their own sessions
- **Admins**: Full access to all session materials

---

## ⚠️ Common Issues

### "Failed to add material"
- **Cause**: Duplicate material with same name
- **Solution**: Material names must be unique

### "This material has already been added"
- **Cause**: Trying to add same material twice to one session
- **Solution**: Edit the existing material quantity instead of adding again

### Materials button not showing
- **Cause**: Session is not in "draft" status
- **Solution**: Can only add materials to draft sessions (before submission)

### No materials showing in dropdown
- **Cause**: No active materials created by admin
- **Solution**: Admin needs to add materials first

---

## 📱 Mobile Experience

The materials system is fully responsive:
- ✅ Touch-friendly buttons
- ✅ Easy-to-use dropdowns
- ✅ Scrollable modal for small screens
- ✅ Clear visual feedback

---

## 🔮 Future Enhancements (Not Included Yet)

These features are **not built** in the current version:
- ❌ Material cost tracking
- ❌ Material usage reports by project
- ❌ Inventory management
- ❌ Material usage trends/analytics
- ❌ Export to CSV/Excel

---

## 🆘 Support

If you encounter issues:
1. Check browser console for errors (F12)
2. Verify SQL was run successfully in Supabase
3. Check that user has proper role (admin/approved)
4. Verify RLS policies are enabled

---

## ✅ Checklist

- [ ] Run `setup-materials-tables.sql` in Supabase
- [ ] Verify tables created in Supabase Table Editor
- [ ] Test admin can add/edit/delete materials
- [ ] Test employee can see Materials button on draft sessions
- [ ] Test employee can add materials with quantity
- [ ] Test employee can remove materials before submitting
- [ ] Test materials persist after timesheet submission

---

**Built with ❤️ for Pleasant Knoll Landscaping**
