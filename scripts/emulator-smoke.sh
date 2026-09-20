#!/usr/bin/env bash
# Runs INSIDE the emulator job (see .github/workflows/test-apk-emulator.yml).
# Installs the debug APK, launches it, screenshots the result, taps the Google
# sign-in button, and probes the native Capacitor plugins through the WebView's
# Chrome DevTools socket. Never aborts early: every artifact is best-effort so
# a failure in one step still leaves the others' evidence behind.
PKG=com.aiappbuilder.kasirrakyat
OUT=emulator-out
mkdir -p "$OUT"

shot() { adb exec-out screencap -p > "$OUT/$1.png" 2>/dev/null; }
dump_ui() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/$1.xml" >/dev/null 2>&1; }

adb wait-for-device
adb shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done'
adb shell getprop ro.build.version.release > "$OUT/android-version.txt"
adb logcat -c

echo "== install"; adb install -r app-debug.apk 2>&1 | tee "$OUT/install.txt"
adb shell dumpsys package "$PKG" | grep -E "versionName|versionCode" | head -3 | tee "$OUT/version.txt"

echo "== launch"; adb shell am start -n "$PKG/.MainActivity" 2>&1 | tee "$OUT/launch.txt"
sleep 30
shot 01-launch
dump_ui 01-launch
adb shell pidof "$PKG" > "$OUT/pid.txt" || echo "PROCESS NOT RUNNING" > "$OUT/pid.txt"

echo "== webview probe"
node scripts/cdp-probe.mjs "$PKG" 2>&1 | tee "$OUT/probe.txt"

echo "== tap Google sign-in"
XY=$(node scripts/find-button.mjs "$OUT/01-launch.xml" "Masuk dengan Google" 2>/dev/null)
echo "button at: ${XY:-not found}" | tee "$OUT/tap.txt"
if [ -n "$XY" ]; then
  adb shell input tap $XY
  sleep 12
  shot 02-after-signin-tap
  dump_ui 02-after-signin-tap
fi

adb logcat -d > "$OUT/logcat-full.txt" 2>/dev/null
grep -E "FATAL|AndroidRuntime|Capacitor|FirebaseAuth|chromium.*(ERR|Uncaught)|GoogleSignIn|Credential" "$OUT/logcat-full.txt" | head -150 > "$OUT/logcat-filtered.txt"
echo "== done"
