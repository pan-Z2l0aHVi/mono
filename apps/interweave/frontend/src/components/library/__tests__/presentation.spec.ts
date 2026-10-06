import { describe, expect, it } from 'vite-plus/test'

import {
  ResourceKind,
  TagColor
} from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import { DEFAULT_TAG_CLASS, formatSize, resourceIcon, resourceKindLabel, tagClass } from '../presentation'

describe('library presentation', () => {
  it('size_bytes 按 KB/MB 格式化并保留一位小数', () => {
    expect(formatSize(18 * 1024)).toBe('18 KB')
    expect(formatSize(2_500_000)).toBe('2.4 MB')
    expect(formatSize(163_577_856)).toBe('156 MB')
  })

  it('缺失、负数或非有限 size 不生成展示文本', () => {
    expect(formatSize(null)).toBeNull()
    expect(formatSize(-1)).toBeNull()
    expect(formatSize(Number.NaN)).toBeNull()
    expect(formatSize(Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('生成 kind 使用对应图标与标签，旧 DTO 的 unknown 使用稳定 fallback', () => {
    expect(resourceKindLabel(ResourceKind.ResourceKindImage)).toBe('图片')
    expect(resourceKindLabel(ResourceKind.ResourceKindVideo)).toBe('视频')
    expect(resourceKindLabel('unknown')).toBe('其他')
    expect(resourceIcon('unknown')).toBe(resourceIcon(ResourceKind.ResourceKindFile))
  })

  it('闭集内每个颜色都映射到非空中性档的 chip', () => {
    // 具体色值属于视觉回归（浏览器取证），这里只守住「每个已登记颜色都有 chip、
    // 且都不会静默退到中性档」——退档意味着两种颜色看起来一样，用户无从分辨。
    const real = Object.values(TagColor).filter(value => value !== TagColor.$zero)
    expect(real.length).toBeGreaterThan(0)
    for (const color of real) {
      expect(tagClass(color), `${color} 应有自己的 chip，且不退到中性档`).not.toBe(DEFAULT_TAG_CLASS)
    }
  })

  it('缺色与闭集外的意外值都退到中性档，而不是留下无色 chip', () => {
    expect(tagClass(TagColor.$zero)).toBe(DEFAULT_TAG_CLASS)
    expect(tagClass('')).toBe(DEFAULT_TAG_CLASS)
    expect(tagClass(null)).toBe(DEFAULT_TAG_CLASS)
    expect(tagClass(undefined)).toBe(DEFAULT_TAG_CLASS)
    expect(tagClass('chartreuse')).toBe(DEFAULT_TAG_CLASS)
  })

  it('Object.prototype 上的键不被当成已登记的颜色', () => {
    // TAG_COLOR_CLASSES 继承着 Object.prototype，这些键取出来是真值（函数/对象），
    // 「取到 falsy 才兜底」的实现会把它们原样返回，函数泄漏进 :class 绑定。
    // 所以除了比值，还要断言返回的确实是字符串。
    const prototypeKeys = [
      'constructor',
      'toString',
      'valueOf',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
      '__proto__',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__'
    ]
    for (const key of prototypeKeys) {
      const className = tagClass(key)
      expect(className, `${key} 应退到中性档`).toBe(DEFAULT_TAG_CLASS)
      expect(typeof className, `${key} 不应泄漏非字符串`).toBe('string')
    }
  })

  it('不同颜色 key 映射到不同 chip，不会因复制粘贴塌成同一个颜色', () => {
    const real = Object.values(TagColor).filter(color => color !== TagColor.$zero)
    const classes = real.map(color => tagClass(color))
    expect(new Set(classes).size).toBe(real.length)
  })
})
