# Update Supabase Site URL for Production

## IMPORTANT: Fix Email Verification Links

Currently, when users sign up, the verification email links point to localhost instead of your production URL. Here's how to fix it:

## Steps:

### 1. Go to Supabase Dashboard
Visit https://supabase.com/dashboard and select your BetterFocus project

### 2. Navigate to Authentication Settings
- Click on "Authentication" in the left sidebar
- Click on "URL Configuration"

### 3. Update Site URL
Find the "Site URL" field and update it to:
```
https://betterfocus.ozbizbox.com.au
```

### 4. Update Redirect URLs (if needed)
Add your production URL to the "Redirect URLs" list:
```
https://betterfocus.ozbizbox.com.au/**
```

This allows any path under your domain to be used as a redirect URL.

### 5. Save Changes
Click "Save" to apply the changes

## What This Fixes:

- ✅ Email verification links will now point to `https://betterfocus.ozbizbox.com.au` instead of `localhost:3000`
- ✅ Password reset emails will use the correct URL
- ✅ Magic link authentication will work correctly

## Testing:

1. Sign up with a new email address
2. Check the verification email
3. The link should now point to `https://betterfocus.ozbizbox.com.au` instead of localhost
4. Click the link to verify it works

## Note:

You can keep localhost URLs in the Redirect URLs list for local development. The Site URL determines which URL is used in emails.
