# React Native + Expo Devcontainer Setup

This devcontainer provides a ready-to-use environment for React Native development with Expo.

## What's Included

- **Node.js 22**: Latest LTS version
- **EAS CLI**: Expo Application Services command-line tool
- **VS Code Extensions**:
  - ESLint
  - Prettier
  - React Native Tools
  - Babel Language Support
  - Auto Rename Tag
  - ES7+ React/Redux/React-Native snippets

## Getting Started

1. Open this repository in GitHub Codespaces or VS Code with Dev Containers extension
2. Wait for the container to build and the postCreateCommand to complete
3. Create a new Expo app:
   ```bash
   npx create-expo-app@latest my-app
   cd my-app
   ```
4. Start the development server:
   ```bash
   npx expo start
   ```

## Port Forwarding

The following ports are automatically forwarded:
- **8081**: Metro Bundler
- **19000**: Expo DevTools
- **19001**: Expo Dev Server
- **19002**: Expo Dev Server (Alternative)

## Using Expo

Modern Expo development uses `npx expo` instead of the deprecated `expo-cli`:

### Common Commands
- Start development server: `npx expo start`
- Start with tunnel: `npx expo start --tunnel`
- Build for Android: `npx expo build:android`
- Build for iOS: `npx expo build:ios`

### EAS Build (Cloud Builds)
For production builds, use EAS CLI:
- Login: `eas login`
- Configure: `eas build:configure`
- Build: `eas build --platform android` or `eas build --platform ios`

## Testing on Physical Devices

1. Install the Expo Go app on your mobile device
2. Scan the QR code shown in the terminal after running `npx expo start`
3. Your app will load on your device

## Environment Variables

The devcontainer sets `EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0` to ensure the development server is accessible from external devices.
