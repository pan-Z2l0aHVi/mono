import { describe, expect, it } from 'vite-plus/test'

import { formatRelativeTime, timestampMilliseconds } from '../index'

describe('date/formatRelativeTime', () => {
  const now = new Date(2026, 10, 28, 16, 0, 0)

  it('timestampMilliseconds 兼容 Unix 秒与毫秒', () => {
    const ms = new Date(2026, 10, 28, 15, 31, 0).getTime()
    expect(timestampMilliseconds(ms)).toBe(ms)
    expect(timestampMilliseconds(Math.floor(ms / 1000))).toBe(Math.floor(ms / 1000) * 1000)
  })

  it('中文模式：今天、昨天、前天使用 12 小时制与英文空格，更早日期输出 YYYY-MM-DD', () => {
    const todayAM = new Date(2026, 10, 28, 10, 5, 0).getTime()
    const todayPM = new Date(2026, 10, 28, 15, 31, 0).getTime()
    const todayNoon = new Date(2026, 10, 28, 12, 0, 0).getTime()
    const todayMidnight = new Date(2026, 10, 28, 0, 8, 0).getTime()
    const yesterday = new Date(2026, 10, 27, 23, 5, 0).getTime()
    const twoDaysAgo = new Date(2026, 10, 26, 15, 31, 0).getTime()
    const threeDaysAgo = new Date(2026, 10, 25, 9, 0, 0).getTime()

    expect(formatRelativeTime(todayAM, { now })).toBe('今天上午 10:05')
    expect(formatRelativeTime(todayPM, { now, locale: 'zh-CN' })).toBe('今天下午 3:31')
    expect(formatRelativeTime(Math.floor(todayPM / 1000), { now })).toBe('今天下午 3:31')
    expect(formatRelativeTime(todayNoon, { now })).toBe('今天下午 12:00')
    expect(formatRelativeTime(todayMidnight, { now })).toBe('今天上午 12:08')
    expect(formatRelativeTime(yesterday, { now })).toBe('昨天下午 11:05')
    expect(formatRelativeTime(twoDaysAgo, { now })).toBe('前天下午 3:31')
    expect(formatRelativeTime(threeDaysAgo, { now })).toBe('2026-11-25')
  })

  it('英文模式：支持 Today / Yesterday / Two days ago 的 12 小时制格式', () => {
    const todayAM = new Date(2026, 10, 28, 9, 5, 0).getTime()
    const todayPM = new Date(2026, 10, 28, 15, 31, 0).getTime()
    const yesterday = new Date(2026, 10, 27, 15, 31, 0).getTime()
    const twoDaysAgo = new Date(2026, 10, 26, 15, 31, 0).getTime()
    const older = new Date(2026, 9, 30, 8, 0, 0).getTime()

    expect(formatRelativeTime(todayAM, { now, locale: 'en' })).toBe('Today at 9:05 AM')
    expect(formatRelativeTime(todayPM, { now, locale: 'en-US' })).toBe('Today at 3:31 PM')
    expect(formatRelativeTime(yesterday, { now, locale: 'en' })).toBe('Yesterday at 3:31 PM')
    expect(formatRelativeTime(twoDaysAgo, { now, locale: 'en' })).toBe('Two days ago at 3:31 PM')
    expect(formatRelativeTime(older, { now, locale: 'en' })).toBe('2026-10-30')
  })

  it('非法或非正时间戳按语言返回兜底文案', () => {
    expect(formatRelativeTime(0, { now })).toBe('未知时间')
    expect(formatRelativeTime(Number.NaN, { now })).toBe('未知时间')
    expect(formatRelativeTime(0, { now, locale: 'en' })).toBe('Unknown time')
    expect(formatRelativeTime(-1, { now, locale: 'en-US' })).toBe('Unknown time')
  })
})
