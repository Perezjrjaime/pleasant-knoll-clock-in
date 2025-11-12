# Roles Management System - Setup Instructions

## Overview
The roles management system allows admins to dynamically manage job roles (like Laborer, Foreman, etc.) that appear in the clock-in dropdown. This prepares the app for future cost code tracking.

## Database Setup (Required - Do This First!)

1. **Open Supabase Dashboard**
   - Go to your project at supabase.com
   - Navigate to SQL Editor (in the left sidebar)

2. **Run the Roles Table Setup**
   - Click "New Query"
   - Open the file `setup-roles-table.sql` from your project
   - Copy and paste the entire contents into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

3. **Verify Success**
   - You should see a success message
   - Navigate to Table Editor → roles table
   - You should see 6 default roles already inserted:
     - Laborer
     - Foreman
     - Equipment Operator
     - Irrigation Specialist
     - Crew Leader
     - Landscape Designer

## What the SQL File Does

1. **Creates the `roles` table** with fields:
   - `id` - Unique identifier (UUID)
   - `role_name` - The role name (UNIQUE, required)
   - `cost_code` - Optional accounting code (placeholder for future)
   - `hourly_rate` - Optional rate (placeholder for future)
   - `status` - Active or inactive (default: active)
   - `created_at` / `updated_at` - Timestamps

2. **Sets up security (RLS policies)**:
   - All authenticated users can VIEW roles
   - Only admins can ADD, EDIT, or DELETE roles

3. **Inserts default roles** that match your current hardcoded roles

## Features

### For Admins
- **Navigate to the Roles tab** in the admin panel
- **Add new roles** with the "+ Add Role" button
- **Edit existing roles** (click the edit icon on any role card)
- **Delete roles** (click the trash icon - you'll get a confirmation)
- **Toggle status** between active/inactive
- **Add optional cost codes and hourly rates** (visible but not functional yet)

### For Employees
- **See dynamic roles** in the clock-in dropdown
- Only active roles appear in the dropdown
- Roles update automatically when admins make changes

## Key Changes Made

1. ✅ Removed hardcoded `commonRoles` array
2. ✅ Created `roles` database table with security
3. ✅ Added Roles management tab for admins
4. ✅ Built complete CRUD operations (Create, Read, Update, Delete)
5. ✅ Updated all role dropdowns to use database roles
6. ✅ Added separate display for active vs inactive roles
7. ✅ Roles load for all users (needed for clock-in dropdown)

## Migration Notes

**Your existing work sessions will NOT be affected.** Historical role data in the `work_sessions` table is stored as text, so even if you rename or delete a role, past sessions will still show the role name that was used at the time.

## Next Steps (Future Enhancements)

1. **Cost Code Integration**: Link roles to accounting/billing systems
2. **Hourly Rate Calculations**: Automatically calculate labor costs
3. **Role Permissions**: Different access levels for different roles
4. **Role Analytics**: Reports showing hours by role, costs by role, etc.

## Troubleshooting

**Q: The Roles tab is empty**
- A: Make sure you ran the SQL file in Supabase first!

**Q: I can't add roles (permission denied)**
- A: Check that your user has `role = 'admin'` in the user_roles table

**Q: Employees can't see roles in dropdown**
- A: Verify the roles have `status = 'active'`
- Check browser console for errors

**Q: I see duplicate roles after migration**
- A: The SQL file uses `ON CONFLICT DO NOTHING` so it's safe to run multiple times

## Security Notes

- Employees can only VIEW roles (read-only access)
- Only admins can create, edit, or delete roles
- RLS (Row Level Security) is enforced at the database level
- All role changes are logged with timestamps
