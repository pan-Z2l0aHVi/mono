#!/usr/bin/env bash
# 后处理 Wails 生成的 TypeScript bindings：
# Go slice 在 TS 中被生成为 T[] | null，但 nonNilSlice 保证运行时为空数组。
# 此脚本移除生成文件中的 "| null" 以匹配运行时行为。
set -euo pipefail

BINDINGS_DIR="frontend/bindings"
if [ ! -d "$BINDINGS_DIR" ]; then
  echo "bindings 目录不存在，跳过"
  exit 0
fi

find "$BINDINGS_DIR" -name '*.ts' -o -name '*.d.ts' | while read -r f; do
  # 移除数组类型中的 | null（保留对象类型如 Settings | null）
  # 匹配模式: T[] | null → T[], Record<string, T[]> | null 中的数组部分
  sed -i '' 's/\[\] | null/[]/g' "$f"
done

echo "✅ bindings 类型后处理完成"
