# BetterFocus Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com)
- Supabase project already set up

## Step 1: Set up GitHub Repository

1. Go to GitHub.com and create a new repository named "BetterFocus"
2. Keep it private for now
3. Do NOT initialize with README, .gitignore, or license (we already have these)

## Step 2: Push Code to GitHub

Run these commands in your terminal:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - BetterFocus app"

# Add your GitHub repository as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/BetterFocus.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Enable Supabase Authentication

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Providers
3. Enable "Email" provider
4. Configure email templates (optional but recommended):
   - Go to Authentication > Email Templates
   - Customize the confirmation email template

## Step 4: Deploy to Vercel

1. Go to https://vercel.com and sign in
2. Click "Add New Project"
3. Import your GitHub repository (BetterFocus)
4. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: (leave default)
   - Output Directory: (leave default)

## Step 5: Add Environment Variables in Vercel

In the Vercel project settings, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://eqzfbenldmgvppbmdmja.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_NiDoSE_TW8W53svawhHXOw_p4pbj78l
```

IMPORTANT: These are the same values from your `.env.local` file.

## Step 6: Deploy

1. Click "Deploy"
2. Wait for the build to complete (usually 2-3 minutes)
3. Once deployed, you'll get a URL like: https://better-focus-xyz.vercel.app

## Step 7: Test Your Deployment

1. Visit your Vercel URL
2. You should be redirected to the login page
3. Create an account with your email
4. Check your email for the confirmation link
5. After confirming, you can sign in

## Step 8: Configure Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Follow the DNS configuration instructions

## Supabase Row Level Security (RLS)

Make sure you have RLS policies set up in Supabase for all your tables:

- habits
- tasks
- projects
- notes

Example RLS policy (run in Supabase SQL Editor):

```sql
-- Enable RLS on all tables
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- For habits table
CREATE POLICY "Users can view their own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
  ON habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON habits FOR DELETE
  USING (auth.uid() = user_id);

-- Repeat similar policies for tasks, projects, and notes tables
```

## Troubleshooting

### Build fails in Vercel
- Check the build logs for errors
- Ensure all dependencies are in package.json
- Check for TypeScript errors

### Authentication not working
- Verify environment variables are set correctly in Vercel
- Check Supabase authentication settings
- Ensure email provider is enabled in Supabase

### Database access issues
- Verify RLS policies are set up correctly
- Check that user_id columns exist in all tables
- Ensure Supabase connection is working

## Next Steps

1. Add user_id column to all tables if not already present
2. Set up RLS policies
3. Test all features in production
4. Monitor Vercel logs for any errors
