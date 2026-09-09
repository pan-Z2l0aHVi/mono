/**
 * 将数字限制在指定的范围内
 * @param val 当前值
 * @param min 最小值
 * @param max 最大值
 */
export function clamp(val: number, min: number, max: number): number {
  if (min > max) [min, max] = [max, min]
  return Math.max(min, Math.min(val, max))
}

/**
 * 将 bytes 转换为可读的字符串，例如 '1.23 KB'。
 * @param bytes 字节数
 * @param decimals 小数点位数，默认为 2
 * @returns 字节数字符串
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes <= 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  // 超出最大单位（PB 及以上）时回退到 TB，避免 sizes[i] 越界返回 "undefined"
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  const result = parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  return result
}
