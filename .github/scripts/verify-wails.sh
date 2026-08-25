#!/usr/bin/env bash
# 验证 wails3 CLI 版本与 .mise.toml 的 pin 一致；CI 在构建 interweave-frontend 前调用。
# 用法: bash .github/scripts/verify-wails.sh

set -euo pipefail

TOOL='go:github.com/wailsapp/wails/v3/cmd/wails3'

# mise current 未配置/硬失败时令 EXPECTED 为空，落到下方"未配置"分支给出清晰报错
EXPECTED="$(mise current "$TOOL" | tr -d '[:space:]' | sed 's/^v//' || true)"
ACTUAL="$(wails3 version 2>&1 | tr -d '[:space:]' | sed 's/^v//')"

if [ -z "$EXPECTED" ]; then
  echo "::error::wails3 未在 .mise.toml 中配置 ($TOOL)"
  exit 1
fi

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "::error::wails3 版本不一致：.mise.toml 期望 $EXPECTED，实际 CLI $ACTUAL"
  exit 1
fi

echo "wails3 $ACTUAL ✓"
