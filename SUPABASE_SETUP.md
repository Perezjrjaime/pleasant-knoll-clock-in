# Supabase Setup Guide for Pleasant Knoll Landscaping

## Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and click "New Project"
3. Choose organization and enter:
   - **Name**: Pleasant Knoll Landscaping
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your location
4. Click "Create new project" and wait for setup

## Step 2: Get Your API Keys
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with https://...)
   - **anon public key** (long string starting with eyJ...)

## Step 3: Configure Environment Variables
1. Open `.env` file in your project root
2. Replace the placeholder values:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   ```

## Step 4: Set Up Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Open the file `database-schema.sql` in your project
3. Copy all the SQL code and paste it into the SQL Editor
4. Click **Run** to create tables and sample data

# Supabase Setup Guide for Pleasant Knoll Landscaping

## Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and click "New Project"
3. Choose organization and enter:
   - **Name**: Pleasant Knoll Landscaping
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your location
4. Click "Create new project" and wait for setup

## Step 2: Get Your API Keys
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with https://...)
   - **anon public key** (long string starting with eyJ...)

## Step 3: Configure Environment Variables
1. Open `.env` file in your project root
2. Replace the placeholder values:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   ```

## Step 4: Set Up Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Open the file `database-schema.sql` in your project
3. Copy all the SQL code and paste it into the SQL Editor
4. Click **Run** to create tables and sample data

## Step 5: Configure Google OAuth (Later)
When you're ready to set up Google OAuth:
1. Go to **Authentication** → **Providers** in Supabase
2. Enable Google provider
3. Add your Google OAuth credentials
4. Configure redirect URLs

For now, the app will work with the basic structure.

## Step 6: Test Connection
1. Restart your development server: `npm run dev`
2. Check browser console for any Supabase connection errors
3. If successful, the app will connect to your cloud database

## What This Sets Up

### Database Tables:
- **users**: Ready for Google OAuth integration
- **projects**: All your landscaping projects
- **work_sessions**: Time tracking data

### Sample Data Included:
- 7 active landscaping projects
- Proper permissions and security structure

### Features Enabled:
- ✅ Real-time data sync
- ✅ Multi-user support (with Google OAuth)
- ✅ Data backup and recovery
- ✅ Scalable cloud storage
- ✅ Row-level security
- ✅ Supervisor dashboard capabilities

## Security Features:
- Row-level security policies ready for authentication
- Secure API keys and database access
- Data encrypted in transit and at rest
- Ready for Google OAuth integration

## Next Steps:
After setup, the app will:
1. Store all clock-in/out data in the cloud
2. Support multiple workers with Google OAuth
3. Enable supervisor overview capabilities
4. Provide real-time data sync across devices
5. Backup all data automatically

Need help? Check the Supabase documentation or reach out!