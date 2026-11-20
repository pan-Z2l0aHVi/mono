#!/usr/bin/env bash
# 校验 `.app` 内 Mach-O 的 LC_BUILD_VERSION.sdk 不低于 16。
# macOS 26 起按这个字段决定窗口外观：sdk major < 16 的二进制走旧兼容外观，标题栏红绿灯是
# 12pt，系统基线是 14pt。macos-15 的默认 CLT 16.4 给出的正是 SDK 15.5，所以构建完在这里
# 拦截，而不是等用户看截图。
# 用法: bash .github/scripts/check-macos-sdk.sh [Mach-O 路径]
set -euo pipefail

binary="${1:-apps/interweave/bin/interweave.app/Contents/MacOS/interweave}"

if [ ! -f "$binary" ]; then
  echo "::error::Mach-O not found: $binary"
  exit 1
fi

# 工具链探测只用于日志：任何一项在非 macOS 或精简镜像上缺失都不改变判定。
sw_vers || true
xcode-select -p || true
xcrun --sdk macosx --show-sdk-version || true

if ! report="$(vtool -show-build "$binary" 2>&1)"; then
  printf '%s\n' "$report"
  echo "::error::vtool cannot read $binary"
  exit 1
fi
printf '%s\n' "$report"

# 通用二进制会有多个 slice，vtool 按架构各打一段；每一个 slice 都必须达标。
sdks="$(printf '%s\n' "$report" | awk '/^ *sdk /{print $2}')"
if [ -z "$sdks" ]; then
  echo "::error::no LC_BUILD_VERSION sdk found in $binary"
  exit 1
fi

status=0
for sdk in $sdks; do
  major="${sdk%%.*}"
  if [[ ! "$major" =~ ^[0-9]+$ ]] || (( 10#$major < 16 )); then
    echo "::error::LC_BUILD_VERSION.sdk=$sdk < 16: macOS 26+ renders 12pt traffic lights for this binary (system baseline is 14pt)"
    status=1
  fi
done
[ "$status" -eq 0 ] || exit 1

echo "LC_BUILD_VERSION.sdk=$(echo "$sdks" | tr '\n' ' ')"
