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
 * 阻尼橡皮筋函数：超出边界部分施加衰减阻尼
 * @param offset 当前位移（正数正常，负数为拉伸超出边界）
 * @param maxDistance 最大拉伸上限（绝对值）
 * @param factor 线性衰减因子，默认 0.15
 */
export function rubberband(offset: number, maxDistance: number, factor = 0.15): number {
  if (offset >= 0) return offset
  const resisted = offset * factor
  return Math.max(resisted, -maxDistance)
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
