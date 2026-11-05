/**
 * overlay 触发方式词表。
 *
 * `trigger` 是逗号或空格分隔的集合，不是单值枚举：「悬停和键盘聚焦都能开」是真实需求，
 * 用单值表达同样的空间要拆成十几种字面量。这里只负责把取值规范化；
 * 手势路由、计时与开合状态机见 `trigger-controller.ts`。
 */

export const OVERLAY_TRIGGER_GESTURES = ['click', 'hover', 'focus'] as const

export type OverlayTriggerGesture = (typeof OVERLAY_TRIGGER_GESTURES)[number]

export const OVERLAY_TRIGGER_MODES = [...OVERLAY_TRIGGER_GESTURES, 'none'] as const

export type OverlayTriggerMode = (typeof OVERLAY_TRIGGER_MODES)[number]

const warnedValues = new Set<string>()

function warn(message: string) {
  if (import.meta.env.DEV) console.warn(`[web-ui] ${message}`)
}

function isTriggerMode(value: string): value is OverlayTriggerMode {
  return (OVERLAY_TRIGGER_MODES as readonly string[]).includes(value)
}

/**
 * 规范化为逗号分隔的规范串：未知 token 丢弃、重复去除、按声明顺序输出。
 *
 * `none` 与手势互斥：它的语义是「只接受程序式开关」，与并存的手势矛盾，取严的一侧。
 * 空集合回退到 `fallback`，所以 `trigger=""` 读作「没写」而不是「没有手势」——
 * 要没有手势写 `none`。
 *
 * 只接受字符串：这是 attribute/property 的统一写法，数组与旧字面量（`manual` 等）
 * 一律当作未知 token 忽略。
 */
export function normalizeTriggerSet(value: unknown, fallback: readonly OverlayTriggerGesture[]): string {
  if (typeof value !== 'string') return fallback.join(',')
  const tokens = value
    .split(/[\s,]+/u)
    .map(token => token.trim().toLowerCase())
    .filter(Boolean)
  if (tokens.length === 0) return fallback.join(',')

  const unknown = tokens.filter(token => !isTriggerMode(token))
  if (unknown.length > 0 && !warnedValues.has(`unknown:${value}`)) {
    warnedValues.add(`unknown:${value}`)
    warn(
      `trigger 忽略未知取值 ${unknown.map(token => `"${token}"`).join(', ')}。可用取值：${OVERLAY_TRIGGER_MODES.join(', ')}。`
    )
  }

  const known = new Set(tokens.filter(isTriggerMode))
  if (known.has('none')) {
    if (known.size > 1 && !warnedValues.has(`none-conflict:${value}`)) {
      warnedValues.add(`none-conflict:${value}`)
      warn('trigger 的 "none" 与其他手势互斥，本次按 "none" 处理。')
    }
    return 'none'
  }

  const gestures = OVERLAY_TRIGGER_GESTURES.filter(gesture => known.has(gesture))
  return gestures.length > 0 ? gestures.join(',') : fallback.join(',')
}

/** 规范串里是否含某个手势。 */
export function hasTriggerGesture(trigger: string, gesture: OverlayTriggerGesture): boolean {
  return trigger.split(',').includes(gesture)
}

/** 是否处于「只接受程序式开关」模式。 */
export function isTriggerNone(trigger: string): boolean {
  return trigger === 'none'
}
