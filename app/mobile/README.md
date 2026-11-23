# PastPost phone apps

Capacitor wrapper around the web map: same code as the website, packaged as iOS and Android apps.

1. `npm install`
2. `npm run sync` copies the built site from ../.. into www/ and syncs both platforms.
3. Android: `cd android && ./gradlew assembleDebug` (needs the Android SDK and ANDROID_HOME).
4. iOS: on a Mac with Xcode, `npx cap open ios`, pick your Team under Signing, then Run or Archive.

App id: com.petesamuel.pastpost. Sign in comes back to the app through
com.petesamuel.pastpost://auth, which must be listed in Supabase under
Authentication > URL Configuration > Redirect URLs.
