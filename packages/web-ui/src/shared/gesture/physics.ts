/**
 * 物理运动与数学辅助函数（阻尼、钳制与半隐式欧拉弹簧轨迹生成）
 */

export interface SpringParams {
  stiffness: number
  damping: number
  maxSamples: number
}

export const SPRING_PRESETS = {
  close: { stiffness: 260, damping: 34, maxSamples: 19 },
  rebound: { stiffness: 220, damping: 22, maxSamples: 29 }
} as const satisfies Record<string, SpringParams>

/**
 * 钳制数值在 [min, max] 范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * 寻找与目标值距离最近的采样点索引。
 * @param value 目标数值
 * @param points 采样点数组
 * @returns 最近采样点的下标（空数组返回 -1）
 */
export function snapToNearest(value: number, points: number[]): number {
  if (points.length === 0) return -1
  let minDistance = Infinity
  let nearestIndex = 0
  for (let i = 0; i < points.length; i++) {
    const dist = Math.abs(value - points[i])
    if (dist < minDistance) {
      minDistance = dist
      nearestIndex = i
    }
  }
  return nearestIndex
}

/**
 * 将数值钳制并归一化到 [0, 1] 区间（0 对应 min，1 对应 max）。
 * @param value 输入值
 * @param min 最小值
 * @param max 最大值
 */
export function normalizeProgress(value: number, min: number, max: number): number {
  if (max <= min) return 0
  const clamped = clamp(value, min, max)
  return (clamped - min) / (max - min)
}

/**
 * 「不允许方向」的过冲阻尼。
 *
 * 允许方向原样 1:1 通过（由调用方保证传入的符号空间正确）；反向按平方根压缩，压缩比
 * 随位移增大而下降、天然自限幅（400px 过冲只剩 20px），因此不需要额外的位移上限。
 *
 * 它阻尼的是**本次手势自零点起的增量**，调用方再把它叠加到抓取瞬间的基准位移上
 * （`base + damp(delta)`）；直接阻尼总位移会把基准位移也一起压缩。
 * @param delta 自手势零点起、沿拖拽主轴的增量；正值 = 允许方向
 */
export function dampOverscroll(delta: number): number {
  if (delta >= 0) return delta
  return Math.sign(delta) * Math.abs(delta) ** 0.5
}

/**
 * 半隐式欧拉积分弹簧轨迹，返回均匀时间间隔的位置采样（末尾附加精确终点）。
 * @param from 起始位置
 * @param to 目标位置
 * @param velocity 初始速度（px/s）
 * @param spring 弹簧刚度与阻尼参数
 * @param sampleMs 采样时间间隔（毫秒，默认 16ms 对应 60fps）
 */
export function springOffsets(
  from: number,
  to: number,
  velocity: number,
  spring: SpringParams,
  sampleMs = 16
): number[] {
  const dt = sampleMs / 2000
  let x = from
  let v = velocity
  const samples = [x]
  for (let i = 0; i < spring.maxSamples * 2; i++) {
    const acceleration = -spring.stiffness * (x - to) - spring.damping * v
    v += acceleration * dt
    x += v * dt
    if (i % 2 === 1) samples.push(x)
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 40) break
  }
  samples.push(to)
  return samples
}
