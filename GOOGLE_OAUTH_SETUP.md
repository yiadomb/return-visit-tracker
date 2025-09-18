# Google OAuth Setup Guide

This guide will help you set up Google OAuth for your Return Visit Tracker app and deploy it to Vercel for free hosting.

## 🚀 **Step 0: Deploy to Vercel First (Recommended)**

### **Deploy Your App:**
1. **Create Vercel Account**: Go to https://vercel.com and sign up with GitHub
2. **Connect GitHub**: Create a GitHub repository for your project
3. **Push Code to GitHub**: 
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/return-visit-tracker
   git push -u origin main
   ```
4. **Import to Vercel**: 
   - In Vercel dashboard, click "New Project"
   - Import your GitHub repository  
   - Vercel will auto-detect it's a Vue app
   - Click "Deploy"
5. **Get Your Domain**: Vercel will give you a URL like `https://return-visit-tracker-abc123.vercel.app`

### **Add Environment Variables in Vercel:**
- In Vercel project settings → Environment Variables
- Add: `VITE_SUPABASE_URL` = your Supabase project URL
- Add: `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

## 🔧 **Step 1: Configure Google Cloud Console**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select Project**: 
   - Create a new project or select an existing one
   - Project name suggestion: "Return Visit Tracker"
3. **Enable Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" 
   - Click "Enable"

## 🔑 **Step 2: Create OAuth Credentials**

1. **Go to Credentials**:
   - In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. **Create OAuth 2.0 Client ID**:
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Return Visit Tracker Web"
3. **Configure Authorized URLs**:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `http://10.177.82.4:3000` (for mobile testing)
     - `https://your-app-name.vercel.app` (replace with your actual Vercel URL)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback` (for development)
     - `http://10.177.82.4:3000/auth/callback` (for mobile testing)
     - `https://your-app-name.vercel.app/auth/callback` (replace with your actual Vercel URL)
4. **Save and Copy Credentials**:
   - Copy your **Client ID** (you'll need this)
   - Copy your **Client Secret** (you'll need this)

## 🗄️ **Step 3: Configure Supabase**

1. **Go to your Supabase project**: https://app.supabase.com
2. **Navigate to Authentication**:
   - Click "Authentication" in the sidebar
   - Go to "Providers" tab
3. **Enable Google Provider**:
   - Find "Google" in the list
   - Toggle it **ON**
   - **Client ID**: Paste your Google Client ID
   - **Client Secret**: Paste your Google Client Secret
   - **Redirect URL**: Leave as default (Supabase handles this)
4. **Save Configuration**

## 📱 **Step 4: Update Supabase Settings**

### In Supabase (Authentication → Settings):
1. **Site URL**: Set to your Vercel URL (e.g., `https://your-app.vercel.app`)
2. **Redirect URLs**: Add your Vercel callback URL (e.g., `https://your-app.vercel.app/auth/callback`)

Note: Google OAuth URLs are already configured in Step 2 above.

## 🧪 **Step 5: Test the Setup**

### **Test Locally:**
1. **Start your development server**: `npm run dev`
2. **Open the app**: http://localhost:3000 or http://10.177.82.4:3000
3. **Open Settings Menu** (hamburger menu → Get started)
4. **Click "Continue with Google"**
5. **You should be redirected to Google login**
6. **After successful login, you'll return to your app**

### **Test Production:**
1. **Open your Vercel URL**: https://your-app.vercel.app
2. **Repeat the same test steps**
3. **Your data will sync between local and production!**

## 🚨 **Troubleshooting**

### Error: "redirect_uri_mismatch"
- Check that your redirect URIs in Google Cloud Console exactly match
- Make sure you're using the correct protocol (http vs https)

### Error: "OAuth consent screen not configured"
- In Google Cloud Console, go to "OAuth consent screen"
- Configure the consent screen with your app details

### Error: "Google sign-in failed"
- Check browser console for detailed error messages
- Verify Supabase project has Google provider enabled
- Ensure Client ID and Secret are correctly copied

## 📋 **Security Notes**

- **Never commit** your Google Client Secret to version control
- **Always use HTTPS** in production
- **Keep credentials secure** and rotate them regularly
- **Configure OAuth consent screen** properly for production use

## 🎉 **You're Done!**

Your users can now sign in with their Google accounts. The app will:
- Show their real name and profile picture
- Sync data across all their devices
- Provide a secure, familiar login experience

Need help? Check the browser console for error messages or refer to the [Supabase Auth documentation](https://supabase.com/docs/guides/auth).
