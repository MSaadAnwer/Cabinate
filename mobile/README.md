# Cabinate Mobile

Cabinate Mobile is the iOS-first client for the Cabinate pantry, recipe, receipt capture, and grocery list workflows. It is built with React Native, Expo, and TypeScript.

## Development On Windows

1. Start the Spring Boot API from `../api`.
2. Set `EXPO_PUBLIC_API_URL` to the API URL reachable by your device.
3. Start Expo from this folder.

For an iPhone on the same Wi-Fi network, use your Windows machine's LAN IP instead of `localhost`:

```powershell
$env:EXPO_PUBLIC_API_URL="http://YOUR_WINDOWS_LAN_IP:8080/api/v1"
npm.cmd start
```

Early UI work can run through Expo Go. When camera workflows, native dependencies, or production-like behavior are needed, use an Expo development build through EAS.

## Build Strategy

- Use EAS cloud builds for iOS from Windows.
- Use a physical iPhone for testing from Windows.
- Use macOS/Xcode only when local iOS Simulator testing or deep native debugging is required.
- Apple Developer Program membership is required for TestFlight and App Store distribution.

## Current Mobile Slice

- Inventory tab loads pantry items from the existing API.
- Recipes tab loads recipes from the existing API.
- Grocery List tab builds a draft missing-ingredient list from the selected recipe and current pantry names.
- Capture tab submits raw social links, receipt text, or recipe notes to the existing ingest API.
