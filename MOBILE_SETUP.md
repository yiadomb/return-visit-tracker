# Return Visit Tracker - Mobile Installation Guide

Your Return Visit Tracker app is now ready for mobile use! You have two options to install it on your phone and tablet:

## Option 1: PWA Installation (Recommended - Easiest)

### For Android & iOS:
1. Open your browser (Chrome, Safari, Edge, Firefox)
2. Go to: **http://localhost:4173** (while the preview server is running)
3. Look for the **"Install"** button or **"Add to Home Screen"** option:
   - **Chrome**: Click the install icon in the address bar or use "Add to Home Screen" in the menu
   - **Safari (iOS)**: Tap the Share button → "Add to Home Screen"
   - **Edge**: Click the install icon in the address bar
4. Follow the prompts to install
5. The app will appear on your home screen like a native app!

### PWA Features:
- ✅ Works offline (once cached)
- ✅ Full-screen experience
- ✅ Home screen icon
- ✅ Push notifications
- ✅ Native-like performance
- ✅ Auto-updates when you connect to internet

## Option 2: Android APK (For Android devices only)

### Requirements:
- Android Studio installed
- Android SDK configured
- Java Development Kit (JDK)

### Steps to build APK:
1. Install Android Studio: https://developer.android.com/studio
2. Open terminal in project folder
3. Run: `npm run android:open`
4. In Android Studio: Build → Generate Signed Bundle/APK
5. Choose APK and follow the signing process
6. Transfer the APK to your phone and install

## Current Status:
✅ Web app built and optimized
✅ PWA manifest configured with icons
✅ Service worker for offline functionality
✅ Capacitor Android project synced
✅ Production build ready

## Supabase Setup (for cross‑device sync)

1. Create a new Supabase project.
2. Go to SQL Editor and run the script in `Docs/supabase_schema.sql`.
3. In the project settings, copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`
4. In this project folder, create a `.env` file (copy from `.env.example`) and fill the values:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.ref.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```
5. Build the web bundle and sync native:
   ```
   npm run build && npx cap sync
   ```
6. Install and open the app on each device, sign in with the same email/password. The first device will push its local contacts, and other devices will pull them within a few seconds.

## Testing the PWA:
1. Visit http://localhost:4173 on your phone's browser
2. Test the install prompt
3. Verify offline functionality
4. Test notifications and data persistence

## Deployment Options:
- **Local Network**: Share the preview URL with devices on same WiFi
- **Cloud Hosting**: Deploy to Vercel, Netlify, or Firebase for global access
- **APK Distribution**: Build signed APK for direct installation

## Troubleshooting:
- If install option doesn't appear, check browser compatibility
- Clear browser cache and try again
- Ensure you're using HTTPS for PWA features (production deployment)
- For Android APK: Ensure all Android development tools are installed

Your Return Visit Tracker is now mobile-ready! 🎉
