# Pleasant Knoll Landscaping - Clock-In App Deployment Guide

This guide will help you deploy your clock-in app to Azure Static Web Apps, GitHub Pages, and set up proper CI/CD.

## Prerequisites

1. **GitHub Account** - Your code will be stored here
2. **Azure Account** - For Azure Static Web Apps (free tier available)
3. **Supabase Account** - Your database is already set up

## Step 1: Push to GitHub

1. Initialize git repository (if not already done):
```bash
git init
git add .
git commit -m "Initial commit - Pleasant Knoll Clock-In App"
```

2. Create a new repository on GitHub:
   - Go to github.com
   - Click "New repository"
   - Name it: `pleasant-knoll-clock-in`
   - Make it public (for GitHub Pages free hosting)

3. Push your code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/pleasant-knoll-clock-in.git
git branch -M main
git push -u origin main
```

## Step 2: Set up Environment Variables

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Step 3: Deploy to Azure Static Web Apps

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Static Web Apps"
4. Click "Create"
5. Fill in the details:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing
   - **Name**: `pleasant-knoll-clock-in`
   - **Plan**: Free
   - **Region**: Choose closest to you
   - **Source**: GitHub
   - **Organization**: Your GitHub username
   - **Repository**: `pleasant-knoll-clock-in`
   - **Branch**: `main`
   - **Build Presets**: React
   - **App location**: `/`
   - **Output location**: `dist`

6. Click "Review + create" then "Create"
7. Azure will automatically add the deployment token to your GitHub secrets

## Step 4: Deploy to GitHub Pages

1. In your GitHub repository, go to **Settings > Pages**
2. Under "Source", select "GitHub Actions"
3. The workflow file we created will automatically deploy to GitHub Pages

## Step 5: Install PWA Support

Add to your dependencies:
```bash
npm install --save-dev gh-pages
```

## URLs After Deployment

- **Azure Static Web Apps**: `https://pleasant-knoll-clock-in.azurestaticapps.net`
- **GitHub Pages**: `https://YOUR_USERNAME.github.io/pleasant-knoll-clock-in`

## PWA Features

Your app includes:
- ✅ Offline capability
- ✅ Install to home screen
- ✅ Service worker for caching
- ✅ Responsive design for mobile

## Supabase Configuration

Make sure your Supabase RLS (Row Level Security) policies allow:
- Users to read projects
- Users to insert/update their own work sessions
- Proper authentication flows

## Troubleshooting

1. **Build fails**: Check that environment variables are set correctly
2. **App doesn't load**: Verify Supabase URL and keys
3. **Database errors**: Check RLS policies in Supabase

## Next Steps

1. Set up custom domain (optional)
2. Configure SSL certificates (automatic with Azure SWA)
3. Set up monitoring and analytics
4. Add user authentication with Google OAuth

Your app will automatically redeploy whenever you push changes to the main branch!