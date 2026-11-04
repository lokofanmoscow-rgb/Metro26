#!/usr/bin/env bash
# Сборка APK без Gradle — только инструментами Android SDK (build-tools 34, platform android-34).
# Использование: ANDROID_HOME=/путь/к/sdk ./build-apk.sh   (предварительно: npm run build в корне)
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/android-sdk}}"
BT="$SDK/build-tools/34.0.0"
PLAT="$SDK/platforms/android-34/android.jar"
OUT=build/manual
VERSION_CODE=2
VERSION_NAME=0.2
rm -rf "$OUT"; mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/dex" "$OUT/assets"
cp ../dist/index.html "$OUT/assets/index.html"
# манифест с атрибутом package (в Gradle-проекте он задаётся через namespace)
sed 's|<manifest xmlns:android="http://schemas.android.com/apk/res/android">|<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="ru.metro26.game">|' \
  app/src/main/AndroidManifest.xml > "$OUT/AndroidManifest.xml"
"$BT/aapt2" compile --dir app/src/main/res -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$PLAT" --manifest "$OUT/AndroidManifest.xml" \
  -A "$OUT/assets" --java "$OUT/gen" --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" "$OUT/res.zip"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath "$PLAT" -d "$OUT/classes" \
  app/src/main/java/ru/metro26/game/*.java "$OUT/gen/ru/metro26/game/R.java"
(cd "$OUT/classes" && jar cf ../classes.jar .)
# D8 из build-tools 34 падает на классах, собранных JDK 21, поэтому используем R8/D8 8.5 из maven.google.com:
#   curl -L -o "$SDK/r8.jar" https://dl.google.com/dl/android/maven2/com/android/tools/r8/8.5.35/r8-8.5.35.jar
R8_JAR="${R8_JAR:-$SDK/r8.jar}"
if [ -f "$R8_JAR" ]; then
  java -cp "$R8_JAR" com.android.tools.r8.D8 --lib "$PLAT" --min-api 24 --release --output "$OUT/dex" "$OUT/classes.jar"
else
  "$BT/d8" --lib "$PLAT" --min-api 24 --release --output "$OUT/dex" "$OUT/classes.jar"
fi
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q -X ../unsigned.apk classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
"$BT/apksigner" sign --ks metro26.jks --ks-pass pass:metro26 --key-pass pass:metro26 --ks-key-alias metro26 \
  --out "$OUT/Metro26.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify --print-certs "$OUT/Metro26.apk" | head -3
mkdir -p ../dist && cp "$OUT/Metro26.apk" ../dist/Metro26.apk
echo "Готово: dist/Metro26.apk ($(du -h ../dist/Metro26.apk | cut -f1))"
