/**
 * 运行时参数规范化工具。
 *
 * 组件的属性 setter 在赋值前调用这些函数，确保非法输入回退到文档化默认值。
 * 这与 TypeScript 类型系统互补——类型保证编译期安全，运行时规范化保证 JS 调用方的健壮性。
 *
 * 使用方式：
 * ```
 * import { normalizeLiteral } from '@/shared/normalize'
 *
 * @property({ type: String, reflect: true })
 * get variant(): 'primary' | 'secondary' | 'ghost' { return this._variant }
 * set variant(v: string) {
 *   this._variant = normalizeLiteral(v, ALLOWED_VARIANTS, 'primary')
 *   this.requestUpdate('variant', old)
 * }
 * ```
 */

/** 字面量联合类型属性可接受的值 */
export type LiteralValues<T extends string> = readonly T[]

/**
 * 将输入值规范化为字面量联合类型之一。
 * 不在允许集合中的值回退到默认值。
 */
export function normalizeLiteral<T extends string>(value: unknown, allowed: LiteralValues<T>, defaultValue: T): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T
  }
  return defaultValue
}

/**
 * 将输入值规范化为指定范围内的数值。
 * NaN、Infinity 或非数值回退到默认值。
 */
export function normalizeNumber(value: unknown, min: number, max: number, defaultValue: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(max, Math.max(min, value))
  }
  return defaultValue
}
