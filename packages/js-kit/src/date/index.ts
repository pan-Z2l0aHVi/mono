export type RelativeTimeLocale = 'zh' | 'en'

export interface FormatRelativeTimeOptions {
  /** 语言标识；支持 `'zh'` / `'en'` 及常见 BCP-47 前缀（如 `'zh-CN'`、`'en-US'`），默认 `'zh'`。 */
  locale?: RelativeTimeLocale | (string & {})
  /** 基准当前时间（支持 Date、Unix 秒或毫秒），默认取系统当前时间。 */
  now?: Date | number
}

const MS_PER_DAY = 86_400_000

/** 接受 Unix 秒或毫秒，统一归一为毫秒时间戳。 */
export function timestampMilliseconds(timestamp: number): number {
  return Math.abs(timestamp) < 100_000_000_000 ? timestamp * 1000 : timestamp
}

function resolveLocale(locale?: string): RelativeTimeLocale {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'zh'
}

function resolveNowDate(now?: Date | number): Date {
  if (now instanceof Date) return now
  if (typeof now === 'number' && Number.isFinite(now)) return new Date(timestampMilliseconds(now))
  return new Date()
}

function startOfLocalDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/**
 * 将时间戳格式化为 12 小时制相对时间（支持中英文）：
 * - 中文：今天/昨天/前天 上午/下午 + 英文空格 + `h:mm`（如 `今天下午 3:31`）
 * - 英文：Today / Yesterday / Two days ago + ` at h:mm AM/PM`（如 `Two days ago at 3:31 PM`）
 * - 更早或未来日期统一格式化为 `YYYY-MM-DD`。
 */
export function formatRelativeTime(timestamp: number, options: FormatRelativeTimeOptions = {}): string {
  const locale = resolveLocale(options.locale)
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return locale === 'en' ? 'Unknown time' : '未知时间'
  }

  const date = new Date(timestampMilliseconds(timestamp))
  if (Number.isNaN(date.getTime())) {
    return locale === 'en' ? 'Unknown time' : '未知时间'
  }

  const nowDate = resolveNowDate(options.now)
  const dayDiff = Math.round((startOfLocalDayMs(nowDate) - startOfLocalDayMs(date)) / MS_PER_DAY)

  if (dayDiff === 0 || dayDiff === 1 || dayDiff === 2) {
    const hour24 = date.getHours()
    const hour12 = hour24 % 12 || 12
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const isAM = hour24 < 12

    if (locale === 'en') {
      const dayLabel = dayDiff === 0 ? 'Today' : dayDiff === 1 ? 'Yesterday' : 'Two days ago'
      return `${dayLabel} at ${hour12}:${minutes} ${isAM ? 'AM' : 'PM'}`
    }

    const dayLabel = dayDiff === 0 ? '今天' : dayDiff === 1 ? '昨天' : '前天'
    return `${dayLabel}${isAM ? '上午' : '下午'} ${hour12}:${minutes}`
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
