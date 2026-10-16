#!/usr/bin/env bash
# Installs the APK on the emulator, opens the app, and records what happens.
set -x
APK="$1"
PKG=com.ash.diceroller
adb wait-for-device
adb install -r "$APK" > install.txt 2>&1; cat install.txt
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1
sleep 25
adb shell pidof "$PKG" > pid.txt 2>&1 || echo "NOT RUNNING" > pid.txt
cat pid.txt
adb exec-out screencap -p > screen.png || true
adb logcat -d -v brief > logcat.txt 2>&1
# Try a roll by tapping the bottom-centre (ROLL button) and check it survives.
SIZE=$(adb shell wm size | grep -oE '[0-9]+x[0-9]+' | tail -n1)
W=${SIZE%x*}; H=${SIZE#*x}
adb shell input tap $((W / 2)) $((H * 93 / 100)) || true
sleep 4
adb shell pidof "$PKG" > pid2.txt 2>&1 || echo "NOT RUNNING" > pid2.txt
adb logcat -d -v brief > logcat2.txt 2>&1
exit 0
