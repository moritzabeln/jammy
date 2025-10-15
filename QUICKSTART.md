# Jammy - Quick Start Guide 🚀

## What You've Built

A fully functional real-time music listening app similar to Discord's Listen-along feature! Here's what's included:

### ✅ Features Implemented

1. **Authentication System**
   - Spotify OAuth 2.0 integration
   - Secure token management with refresh
   - User profile management

2. **Listening Sessions**
   - Create and host listening sessions
   - Join active sessions
   - Real-time participant tracking

3. **Playback Synchronization**
   - Host broadcasts playback every 2 seconds
   - Listeners auto-sync within 3 seconds
   - Track info, position, and play/pause state synced

4. **Beautiful UI**
   - Spotify-inspired dark theme
   - Album artwork display
   - Progress bars and track info
   - Participant avatars

5. **Cross-Platform**
   - Works on iOS, Android, and Web

## Next Steps to Run Your App

### 1. Configure Your API Credentials

You need to set up two services:

#### A. Spotify Developer Account
1. Visit: https://developer.spotify.com/dashboard
2. Create an app
3. Set redirect URI to: `jammy://spotify-callback`
4. Copy your Client ID

#### B. Firebase Project
1. Visit: https://console.firebase.google.com/
2. Create a new project
3. Enable Realtime Database (start in test mode)
4. Get your web app config from Project Settings

### 2. Update .env File

Edit `/workspaces/jammy/.env` with your credentials:

```bash
# Spotify
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here

# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3. Start the App

```bash
# In your terminal
npm start

# Then press:
# - 'w' for web
# - 'i' for iOS simulator
# - 'a' for Android emulator
```

### 4. Test the App

**Important Requirements:**
- You need **Spotify Premium** (free accounts can't control playback)
- Have Spotify open on a device (desktop/mobile/web)
- Start playing a song in Spotify first

**Testing Flow:**
1. Click "Connect with Spotify" and authorize
2. Create a listening session
3. Open Spotify and play a song
4. Watch it sync in your app!
5. Invite a friend to join your session (they need the app too)

## Project Structure

```
app/
├── _layout.tsx          # Navigation & auth setup
├── index.tsx            # Initial redirect
├── login.tsx            # Spotify OAuth
├── home.tsx             # Session list
└── session/[id].tsx     # Active session

config/
└── firebase.ts          # Firebase config

contexts/
└── AuthContext.tsx      # User authentication

services/
├── firebase.service.ts  # Database operations
└── spotify.service.ts   # Spotify API calls

types/
└── index.ts            # TypeScript definitions
```

## How the Sync Works

### Host's Device:
```
Every 2 seconds:
1. Get current Spotify playback state
2. Upload to Firebase:
   - Track info (name, artist, art)
   - Position (milliseconds)
   - Play/pause state
```

### Listener's Device:
```
Every 5 seconds:
1. Read host's state from Firebase
2. Compare with local playback
3. If difference > 3 seconds:
   - Sync to host's track
   - Jump to correct position
   - Match play/pause
```

## Common Issues & Solutions

### 🔴 "Playback not available"
**Solution:** 
- Open Spotify app on any device
- Start playing a song
- Then try controlling from Jammy

### 🔴 OAuth redirect not working
**Solution:**
- Check `app.json` has `scheme: "jammy"`
- Verify Spotify Dashboard redirect URI is exact: `jammy://spotify-callback`
- Restart Expo server

### 🔴 Firebase connection issues
**Solution:**
- Verify all Firebase env variables are set
- Check Realtime Database is enabled
- Ensure database rules allow read/write (test mode)

### 🔴 Tracks not syncing
**Solution:**
- Check both users have Spotify Premium
- Verify Firebase config is correct
- Check browser console for errors

## What to Build Next

Here are some ideas to extend your app:

1. **Friend System**
   - Add/remove friends
   - See friends' active sessions
   - Private sessions

2. **Session Features**
   - Session passwords
   - Chat messages
   - Emoji reactions to songs
   - Vote skip

3. **Queue Management**
   - Add songs to queue
   - Voting on next track
   - Collaborative playlists

4. **Enhanced UI**
   - Lyrics display
   - Visualizer
   - Custom themes
   - Gesture controls

5. **Social Features**
   - Share session links
   - Session history
   - Listening stats
   - Activity feed

## File Modifications Needed

None! The app is ready to run once you configure:
1. `.env` file with your API keys
2. Spotify Developer Dashboard
3. Firebase project

## Deployment

### Web
```bash
npm run web
# Deploy to Vercel, Netlify, etc.
```

### Mobile
```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Support & Resources

- **Expo Docs:** https://docs.expo.dev
- **Spotify API:** https://developer.spotify.com/documentation/web-api
- **Firebase Docs:** https://firebase.google.com/docs
- **SETUP.md:** Detailed setup instructions

## Tips for Success

1. **Use Expo Go** on your phone for quick testing
2. **Monitor Firebase Console** to see real-time data flow
3. **Check Spotify Dashboard** for API usage and quotas
4. **Start simple** - get one feature working before adding more
5. **Test with a friend** for the full experience!

---

**Your app is ready! Just add your API keys and start listening together! 🎵**
