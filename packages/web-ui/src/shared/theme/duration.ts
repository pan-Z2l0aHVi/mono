/**
 * 解析单个 CSS `<time>` 字面量（`160ms` / `.16s`）为毫秒；格式不符时返回 `null`。
 * 只认规范写法，不做 `parseFloat` 式的宽容解析——计算样式里的时长/延迟都带单位。
 *
 * 兜底与钳制留各调用方决定：theme 过渡兜底 500、checkbox 描边兜底 160 且负值钳到 0、
 * overlay 生命周期把逗号列表里的解析失败项当 0。
 */
export function parseDuration(value: string): number | null {
  const match = /^\s*([+-]?(?:\d+\.?\d*|\.\d+))(ms|s)\s*$/.exec(value)
  if (!match) return null
  return Number(match[1]) * (match[2] === 's' ? 1000 : 1)
}
