/**
 * tooltip / popover 共享的触发方式词表。
 *
 * `trigger` 是空格分隔的集合，不是单值枚举：「悬停和键盘聚焦都能开」是真实需求，
 * 用单值表达同样的空间要拆成十几种字面量。这里只负责把取值规范化；
 * 各手势的事件路由、计时与 outside-click 判定见 `trigger-gestures.ts`。
 */

export const OVERLAY_TRIGGER_MODES = ['click', 'hover', 'focus', 'manual'] as const

export type OverlayTriggerMode = (typeof OVERLAY_TRIGGER_MODES)[number]

/**
 * 规范化为空格分隔的规范串：未知 token 丢弃、重复去除、按声明顺序输出。
 *
 * 出现 `manual` 时整串只保留 `manual`：它的语义是「不接受任何自动开合」，
 * 与并存的手势矛盾，取严的一侧。空集合回退到 `fallback`，所以 `trigger=""`
 * 读作「没写」而不是「没有手势」——要没有手势写 `manual`。
 */
export function normalizeTriggerSet(value: unknown, fallback: readonly OverlayTriggerMode[]): string {
  const requested = new Set(readTokens(value))
  const modes: readonly OverlayTriggerMode[] = requested.has('manual')
    ? ['manual']
    : OVERLAY_TRIGGER_MODES.filter(mode => requested.has(mode))
  return (modes.length > 0 ? modes : fallback).join(' ')
}

/** 规范串里是否含某个 mode。 */
export function hasTriggerMode(trigger: string, mode: OverlayTriggerMode): boolean {
  return trigger.split(/\s+/u).includes(mode)
}

/**
 * 数组走 property 通道（`:trigger="['hover', 'focus']"`），字符串走 attribute；
 * 其余取值一律当作没写。
 */
function readTokens(value: unknown): string[] {
  if (typeof value === 'string') return value.split(/\s+/u).filter(Boolean)
  if (Array.isArray(value)) return value.flatMap(item => readTokens(item))
  return []
}
