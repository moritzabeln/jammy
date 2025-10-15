# Build Android APK Workflow

This GitHub Action workflow automatically builds an Android APK from the Expo project.

## Overview

The workflow is triggered on:
- Push to the `main` branch
- Pull requests to the `main` branch
- Manual workflow dispatch (can be triggered manually from the Actions tab)

## What it does

1. **Checkout repository** - Gets the latest code
2. **Set up Node.js 22** - Installs Node.js matching the devcontainer version
3. **Set up JDK 17** - Installs Java Development Kit for Android builds
4. **Setup Android SDK** - Configures the Android SDK and build tools
5. **Install dependencies** - Runs `npm install` to get project dependencies
6. **Install Expo CLI** - Installs the Expo command-line interface globally
7. **Run Expo Prebuild** - Generates native Android project files with `npx expo prebuild --platform android`
8. **Make gradlew executable** - Ensures the Gradle wrapper has execute permissions
9. **Build APK with Gradle** - Builds the release APK using `./gradlew assembleRelease`
10. **Upload APK** - Uploads the built APK as a workflow artifact

## Artifacts

The workflow uploads the built APK as an artifact named `app-release`. You can download it from:
- The workflow run summary page
- The Actions tab in your repository

## Usage

### Automatic Trigger
The workflow runs automatically when you push to `main` or open a pull request.

### Manual Trigger
1. Go to the "Actions" tab in your repository
2. Select "Build Android APK" from the workflows list
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

## Requirements

Your Expo project must have:
- A valid `package.json` with dependencies
- An `app.json` or `app.config.js` configuration file
- All necessary Expo dependencies installed

## Output

The APK will be located at: `android/app/build/outputs/apk/release/app-release.apk`

## Notes

- This workflow builds an unsigned release APK
- For production releases, you'll need to configure signing with a keystore
- The build uses the release variant which may require additional configuration in your project
