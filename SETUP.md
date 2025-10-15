# Jammy - Listen Together 🎵

A real-time music listening app similar to Discord's Listen-along feature. Connect your Spotify account, create listening sessions, and enjoy music together with friends in perfect sync.

## Features

- 🎵 **Real-time Playback Sync**: Host controls playback, listeners stay perfectly synced
- 🔐 **Spotify OAuth**: Secure authentication with Spotify accounts
- 👥 **Multi-user Sessions**: Create and join listening sessions with friends
- 🔄 **Live Updates**: Firebase Realtime Database for instant synchronization
- 📱 **Cross-platform**: Works on iOS, Android, and Web via Expo
- 🎨 **Beautiful UI**: Spotify-inspired dark theme interface

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Authentication**: Spotify OAuth 2.0 via Expo Auth Session
- **Real-time Database**: Firebase Realtime Database
- **Music API**: Spotify Web API
- **Storage**: AsyncStorage for token persistence

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- Expo CLI (`npm install -g expo-cli`)
- A Spotify Premium account (required for playback control)
- A Firebase project
- A Spotify Developer account

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd jammy
npm install
```

### 2. Configure Spotify API

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an App"
3. Fill in the app details:
   - App Name: Jammy
   - App Description: Listen together app
   - Redirect URI: `jammy://spotify-callback`
   - For web testing also add: `http://localhost:8081`
4. Copy your **Client ID**
5. In your app settings, add these scopes:
   - `user-read-email`
   - `user-read-private`
   - `user-read-playback-state`
   - `user-modify-playback-state`
   - `user-read-currently-playing`
   - `streaming`

### 3. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Realtime Database**:
   - Go to Realtime Database in the sidebar
   - Click "Create Database"
   - Start in **test mode** (you can update rules later)
4. Get your Firebase config:
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy the configuration values

### 4. Set Up Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   # Spotify Configuration
   EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   EXPO_PUBLIC_SPOTIFY_REDIRECT_URI=jammy://spotify-callback

   # Firebase Configuration
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

### 5. Firebase Security Rules (Production)

For production, update your Firebase Realtime Database rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid"
      }
    },
    "sessions": {
      "$sessionId": {
        ".read": true,
        ".write": "data.child('hostId').val() === auth.uid || !data.exists()"
      }
    }
  }
}
```

## Running the App

### Development

```bash
# Start the Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web browser
npm run web
```

### Testing with Spotify

**Important**: For Spotify playback to work:

1. **You need Spotify Premium** - Free accounts cannot control playback via API
2. **Have Spotify open** on at least one device:
   - Desktop app (recommended)
   - Mobile app
   - Web player (spotify.com)
3. **Start playing something** in Spotify first
4. The app will then be able to control that playback session

### Using the App

1. **Login**: Click "Connect with Spotify" and authorize the app
2. **Create Session**: On the home screen, click "Create Listening Session"
3. **Play Music**: As the host, control playback in your Spotify app
4. **Invite Friends**: Share your session (friends need the app too!)
5. **Join Session**: Friends can see and join your active session
6. **Listen Together**: Everyone hears the same track at the same time!

## Project Structure

```
jammy/
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Root layout with auth provider
│   ├── index.tsx                # Initial redirect screen
│   ├── login.tsx                # Spotify OAuth login
│   ├── home.tsx                 # Sessions list screen
│   └── session/
│       └── [id].tsx             # Active listening session
├── config/
│   └── firebase.ts              # Firebase initialization
├── contexts/
│   └── AuthContext.tsx          # Authentication context
├── services/
│   ├── firebase.service.ts      # Firebase database operations
│   └── spotify.service.ts       # Spotify API integration
├── types/
│   └── index.ts                 # TypeScript interfaces
├── .env                         # Environment variables (not committed)
├── .env.example                 # Environment template
└── package.json
```

## How It Works

### Authentication Flow

1. User clicks "Connect with Spotify"
2. OAuth flow redirects to Spotify for authorization
3. Spotify returns auth code via deep link
4. Exchange code for access/refresh tokens
5. Store tokens securely in AsyncStorage
6. Fetch user profile and create/update in Firebase

### Listening Session Flow

#### Host Side:
1. Host creates a session in Firebase
2. Every 2 seconds, host broadcasts current playback state:
   - Track info (name, artist, album art)
   - Playback position
   - Play/pause state
3. Host can control playback (play, pause, skip)

#### Listener Side:
1. Listener joins session from home screen
2. Subscribes to Firebase session updates
3. Every 5 seconds, checks sync status:
   - Compare current track with host's track
   - Check playback position difference
   - If drift > 3 seconds, resync
4. Automatically plays/pauses to match host

### Real-time Sync

Firebase Realtime Database structure:
```
{
  "users": {
    "user_id": {
      "displayName": "John Doe",
      "profileImage": "url",
      "currentSessionId": "session_123",
      "isOnline": true
    }
  },
  "sessions": {
    "session_123": {
      "hostId": "user_id",
      "hostName": "John Doe",
      "isActive": true,
      "participants": ["user_id", "user_id_2"],
      "currentTrack": {
        "name": "Song Name",
        "artist": "Artist Name",
        "albumArt": "url",
        "uri": "spotify:track:xxx"
      },
      "playbackState": {
        "isPlaying": true,
        "progressMs": 45000,
        "timestamp": 1697123456789
      }
    }
  }
}
```

## Troubleshooting

### "Playback not available"
- Ensure you have Spotify Premium
- Open Spotify on a device and start playing
- Check that API scopes include playback control

### "Auth code expired"
- OAuth codes expire quickly
- If you see this, try logging in again

### "Session not syncing"
- Check Firebase Realtime Database rules
- Ensure Firebase config is correct in `.env`
- Check network connectivity

### Deep linking not working
- Verify `scheme: "jammy"` in `app.json`
- Check Spotify redirect URI matches exactly
- For iOS, you may need to rebuild the app

## Development Tips

- Use Expo Go app for quick testing on mobile
- Use React Native Debugger for debugging
- Monitor Firebase console for real-time data
- Check Spotify API console for token/request issues

## API Limitations

- **Spotify Web API**: Rate limited to ~180 requests/minute
- **Firebase Free Tier**: 
  - 100 simultaneous connections
  - 1GB data transfer/month
  - Unlimited operations

## Future Enhancements

- [ ] Friend system with friend requests
- [ ] Session invites via deep links
- [ ] Chat within sessions
- [ ] Playlist queue management
- [ ] Session history
- [ ] Emoji reactions to songs
- [ ] User presence indicators
- [ ] Custom session themes
- [ ] In-app Spotify player (Web Playback SDK)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for learning or building your own version!

## Credits

Built with ❤️ using:
- [Expo](https://expo.dev)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Firebase](https://firebase.google.com)

---

**Note**: This app requires Spotify Premium and is intended for educational purposes. Make sure to comply with Spotify's API terms of service.
