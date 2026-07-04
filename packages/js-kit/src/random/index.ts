/**
 * 随机整数 [min, max]
 * @param min 最小值
 * @param max 最大值
 */
export function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 随机浮点数 [min, max)
 * @param min 最小值
 * @param max 最大值
 * @param precision 保留小数位，不传则返回原始浮点数
 */
export function randomFloat(min: number, max: number): number {
  const lower = Math.min(min, max)
  const upper = Math.max(min, max)
  return lower + Math.random() * (upper - lower)
}

/**
 * 生成随机的 RGB 颜色代码
 * @returns RGB 颜色代码，例如 rgb(255, 0, 0)
 */
export function randomRgb(): string {
  return `rgb(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)})`
}

/**
 * 生成随机的十六进制颜色代码
 * @returns 十六进制颜色代码，例如 #ff0000
 */
export function randomHex(): string {
  const color = Math.floor(Math.random() * 0x1000000).toString(16)
  return '#' + color.padStart(6, '0')
}
