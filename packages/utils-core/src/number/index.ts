/**
 * 转换为指定精度的数字
 * @param val 需要转换的数字
 * @param precision 精度。表示小数点后位数。如果传了负数（比如 -2），则取整到百位（1234.56->1200）。
 * @returns 转换后的数字
 */
export function toPrecision(val: number, precision: number): number {
  if (Number.isNaN(val) || !Number.isFinite(val)) return val

  const factor = Math.pow(10, precision)
  return Math.round(val * factor) / factor
}

/**
 * 将数字限制在指定的范围内
 * @param val 当前值
 * @param min 最小值
 * @param max 最大值
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(val, max))
}
