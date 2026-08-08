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
