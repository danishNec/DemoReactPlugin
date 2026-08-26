# eKey 2.0 — React Native Plugin Integration Guide

This guide walks your team through adding eKey 2.0 app-to-app login to your React Native app. It's a true drop-in plugin — almost everything lives inside one folder, and Android needs no manual wiring at all. No native development experience required, just follow the steps in order.

**What you're adding:** a single JavaScript function, `initiateEkeyLogin()`, that opens the eKey 2.0 login screen, hands off to the eKey app for authentication, and returns you an authorization code your backend can exchange for tokens.

**Time to integrate:** roughly 15–20 minutes.

---

## What you need from us

One folder: **`ekey-react-native-sdk/`**

That's it. Everything — the Android module, the iOS module, the JS bridge, the build configuration — lives inside it, as plain source code (Kotlin on Android, Swift on iOS — no prebuilt `.aar`/`.framework` binaries to manage). You won't need to copy loose files into your own `android/` or `ios/` folders, and you won't need to rename any packages or classes to match your app.

---

## Step 1 — Drop the plugin into your project

Copy the `ekey-react-native-sdk` folder into the root of your React Native project, next to your `package.json`:

```
YourApp/
├── android/
├── ios/
├── ekey-react-native-sdk/   ← copy it here
├── package.json
└── ...
```

---

## Step 2 — Add it as a dependency

Open your `package.json` and add it to `dependencies`:

```json
"dependencies": {
  "ekey-react-native-sdk": "file:./ekey-react-native-sdk"
}
```

Then install:

```sh
npm install
```

(or `yarn install`, whichever your project uses.)

That single line is the only change needed in your `package.json`. No `codegenConfig` block, no extra scripts.

---

## Step 3 — Android: nothing else to do

If your app already has React Native's New Architecture enabled (`newArchEnabled=true` in `android/gradle.properties`), you're done. `npm install` was enough — the plugin registers itself automatically the same way any other React Native library does (like `react-native-safe-area-context`, if you're using it). The login screen's `Activity` and its `necekey://callback` handling are already declared inside the plugin's own manifest and merge into your app automatically.

No edits to `settings.gradle`, `build.gradle`, or `MainApplication.kt` are required.

---

## Step 4 — iOS: a few unavoidable steps

Apple doesn't allow this part to be fully automated — your app's own `AppDelegate` has to be told how to hand a returning eKey link back to the SDK. It's three short edits.

**4a. Install the pod**

```sh
cd ios && bundle exec pod install
```

**4b. Register the return URL scheme**

Open `ios/YourApp/Info.plist` and add:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.yourapp.ekey</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>necekey</string>
        </array>
    </dict>
</array>
```

**4c. Forward the return URL to the SDK**

The plugin's login SDK is written in Swift, but it works from either a Swift or an Objective-C `AppDelegate` — use whichever matches your project. In both cases you're calling the same thing, `EkeySdkImpl.shared.handleOpenURL(...)`; only the syntax differs.

**If your `AppDelegate` is Swift** (`AppDelegate.swift`), add the import at the top:

```swift
import ekey_react_native_sdk
```

...and add this method inside your `AppDelegate` class:

```swift
func application(
  _ app: UIApplication,
  open url: URL,
  options: [UIApplication.OpenURLOptionsKey: Any] = [:]
) -> Bool {
  EkeySdkImpl.shared.handleOpenURL(url)
  return true
}
```

**If your `AppDelegate` is Objective-C** (`AppDelegate.m` — this must be a plain `.m` file, not `.mm`), add the import at the top:

```objc
@import ekey_react_native_sdk;
```

...and add this method inside your `AppDelegate` implementation:

```objc
- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options
{
  [[EkeySdkImpl shared] handleOpenURL:url];
  return YES;
}
```

> Why `import`/`@import` and not a header `#import`? The SDK's Swift code doesn't publish a separate header file — `import`/`@import` pulls in the whole module (including the auto-generated Objective-C interface for `EkeySdkImpl`) in one step, for either language. If your `AppDelegate` is Objective-C++ (`.mm`) because of unrelated code elsewhere in your app, either split the eKey handling into its own plain `.m` file, or enable C++ module support for that file — `@import` doesn't work in `.mm` files with C++ modules off, which is Xcode's default.

That's the full iOS setup — no manual Xcode project wiring, no dragging files into your target, no Swift Package configuration. CocoaPods handles linking automatically.

---

## Step 5 — Use it in your app

From here it's plain JavaScript. Import the function and call it from a button:

```tsx
import { initiateEkeyLogin } from 'ekey-react-native-sdk';

const onPress = async () => {
  const result = await initiateEkeyLogin();

  switch (result.status) {
    case 'completed':
      // result.redirectUri contains the authorization code — send it to
      // your backend to exchange for tokens. Never do the token exchange
      // inside the app itself.
      console.log('Success:', result.redirectUri);
      break;
    case 'cancelled':
      // user closed the login screen
      break;
    case 'failed':
      // e.g. a security check failed — do not treat as success
      console.log('Failed:', result.error);
      break;
  }
};
```

---

## Step 6 — Test it

1. Start the Metro bundler in your project root (`npx react-native start`, or just use `npx react-native run-ios` / `run-android`, which starts it for you). If you skip this for a Debug build, the app opens to a red "No script URL provided" screen instead of your JS.
2. Run your app on both Android and iOS.
3. Tap your button — the real eKey 2.0 login screen should open.
4. Complete a login (or use the test/UAT tooling eKey provides) and confirm you get back a `completed` result with a URL containing a `code`.

---

## Before going live

- **Swap in your production credentials.** The plugin ships pointing at eKey's test/UAT environment. Since the SDK is plain source now (not a prebuilt binary), your team — or ours — can update the `client_id`/`redirect_uri`/endpoint values directly in the plugin's source (`ekey-react-native-sdk/ios/EkeySDK/EkeyLoginConfig.swift` for iOS, `ekey-react-native-sdk/android/src/main/java/com/example/ekeysdk/EkeyLoginConfig.kt` for Android) rather than needing a whole new binary build from us.
- **The SDK never sees your final tokens.** It only gets you as far as the authorization code. Exchanging that code for real access/ID tokens must happen on your backend, since it requires a client secret that must never ship inside a mobile app.
- **Threading is already handled.** The plugin runs the login flow on the main thread internally — just call `initiateEkeyLogin()` from your normal UI code.

---

## Troubleshooting

**`pod install` fails with `find: No such file or directory`, referencing part of your folder path**
This is a bug in React Native 0.86.x's own codegen scripts — they don't handle spaces in the project's folder path (e.g. a folder named `My Project`). Two options:
- Move your project to a path with no spaces, or
- Patch `node_modules/react-native/scripts/codegen/generate-artifacts-executor/generateReactCodegenPodspec.js`: wrap the two `${resolvedAppPath}`/`${path.join(...)}` variables used inside `find` commands in quotes. This fix lives in `node_modules`, so you'll need to reapply it after every fresh `npm install`.

**Android build fails with a CMake/native-build error mentioning "SDK XML versions"**
Your Gradle daemon is running on too new a JDK (22+) for your installed Android Gradle Plugin version. Pin `android/gradle/gradle-daemon-jvm.properties` to `toolchainVersion=17`, and make sure a JDK 17 is installed (e.g. Temurin 17) somewhere Gradle can auto-detect it, such as `~/Library/Java/JavaVirtualMachines/` on macOS.

**iOS build error: "No such module 'ekey_react_native_sdk'"**
`pod install` hasn't run yet (or failed) against the plugin. Re-run step 4a and check the CocoaPods output for errors before rebuilding.

**iOS build error: "use of '@import' when C++ modules are disabled"**
Your `AppDelegate` is an Objective-C++ file (`.mm`) rather than plain Objective-C (`.m`). See the note at the end of step 4c.

**iOS red screen: "No script URL provided... unsanitizedScriptURLString = (null)"**
Metro isn't running. Start it with `npx react-native start` in your project root, then reload the app (⌘R on the red screen).

**iOS crashes on tap with "UI API called on a background thread"**
The plugin already guards against this internally. If you see it, make sure you copied the current version of the `ekey-react-native-sdk` folder rather than an older one.

---

Questions? Reach out to the NEC integration team with your build logs and we'll help you get unblocked quickly.
