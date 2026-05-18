#!/bin/bash
'
https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=physical&mode=development-build&buildEnv=local
'
bun install --frozen-lockfile
npx expo-doctor
npm install -g eas-cli
brew update && brew install watchman
# to build ios
npx expo run:ios --device
#do this, and connect to local server from app
#npx expo start

cd /Users/paulocristo/workspace/mines/Daily\ Planner/DailyPlanner

# Clean Expo cache
npx expo prebuild --clean

# Clean CocoaPods
rm -rf ios/Pods ios/Podfile.lock

# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Reinstall pods
cd ios && pod install && cd ..

# Try building again
npx expo run:ios --device

#to do eas build
eas login
eas build:configure

# they use fastalane for ios builds
fastlane gym

https://github.com/expo/expo/issues/29035
<key>NSCalendarsFullAccessUsageDescription</key>
    <string>Allow $(PRODUCT_NAME) to access your calendar</string>
    <key>NSCalendarsUsageDescription</key>
    <string>Allow $(PRODUCT_NAME) to access your calendar</string>
    <key>NSRemindersFullAccessUsageDescription</key>
    <string>Allow $(PRODUCT_NAME) to access your reminders</string>
    <key>NSRemindersUsageDescription</key>
    <string>Allow $(PRODUCT_NAME) to access your reminders</string>
    <key>NSUserActivityTypes</key>