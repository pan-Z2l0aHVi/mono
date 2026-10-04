import { describe, expect, it } from 'vite-plus/test'

import { parseUrl, stringifyUrl } from '..'

describe('parseUrl 测试', () => {
  it('拆出 base / query / hash 三段，hash 保留原始前缀', () => {
    expect(parseUrl('https://example.com/docs/URL/URL#specifications')).toEqual({
      base: 'https://example.com/docs/URL/URL',
      query: {},
      hash: '#specifications'
    })
    // hash 内的斜杠不是分隔符，不能被当作 base 的一部分
    expect(parseUrl('https://example.com/en/translator#en/zh/placeholder')).toEqual({
      base: 'https://example.com/en/translator',
      query: {},
      hash: '#en/zh/placeholder'
    })
  })

  it('query 参数按 & 与 = 拆分，空值取空串', () => {
    expect(parseUrl('https://example.com/search?q=xyz&w=123')).toEqual({
      base: 'https://example.com/search',
      query: { q: 'xyz', w: '123' },
      hash: ''
    })
    // 只有键没有值：debug 不应变成 undefined 字符串
    expect(parseUrl('https://example.com?debug&source=web').query).toEqual({ debug: '', source: 'web' })
  })

  it('query 的键与值都做 decode，中文等非 ASCII 正确还原', () => {
    const res = parseUrl('https://example.com/p?%E9%94%AE1=%E5%80%BC1&%E9%94%AE2=%E5%80%BC2')
    expect(res.query).toEqual({ 键1: '值1', 键2: '值2' })
  })

  it('相对路径与协议相对 URL 都能解析，且保持原有形态', () => {
    expect(parseUrl('/search?q=xyz#heading-1')).toEqual({
      base: '/search',
      query: { q: 'xyz' },
      hash: '#heading-1'
    })
    // 协议相对形式不能被补成 https://，否则回写时会把调用方的 URL 形态改掉
    expect(parseUrl('//example.com/api/list?page=2#top')).toEqual({
      base: '//example.com/api/list',
      query: { page: '2' },
      hash: '#top'
    })
  })

  it('按 URL 标准规范化：补全根斜杠，重复键保留最后一个', () => {
    expect(parseUrl('https://example.com').base).toBe('https://example.com/')
    expect(parseUrl('https://example.com?id=1&id=2&id=3').query).toEqual({ id: '3' })
  })

  it('无法解析的输入报可读的 Invalid URL，而不是 URL 构造器的原始异常', () => {
    // 调用方靠这条消息区分「URL 不合法」，原始 TypeError 的措辞不是契约
    expect(() => parseUrl('http://')).toThrow('Invalid URL.')
  })
})

describe('stringifyUrl 测试', () => {
  it('可选成员缺失时不产出多余的 ? 或 #', () => {
    expect(stringifyUrl({ base: 'https://example.com/docs' })).toBe('https://example.com/docs')
    expect(stringifyUrl({ base: 'https://example.com/docs', query: { q: 'xyz' } })).toBe(
      'https://example.com/docs?q=xyz'
    )
    expect(stringifyUrl({ base: 'https://example.com/en/translator', hash: '#en/zh' })).toBe(
      'https://example.com/en/translator#en/zh'
    )
  })

  it('query 与 hash 同时存在时按 base?query#hash 顺序拼接', () => {
    expect(
      stringifyUrl({
        base: 'https://example.com/docs',
        query: { q: 'xyz', w: '123' },
        hash: '#specifications'
      })
    ).toBe('https://example.com/docs?q=xyz&w=123#specifications')
  })

  it('query 的键与值都做 encode', () => {
    expect(stringifyUrl({ base: 'https://example.com/p', query: { 键1: '值1', 键2: '值2' } })).toBe(
      'https://example.com/p?%E9%94%AE1=%E5%80%BC1&%E9%94%AE2=%E5%80%BC2'
    )
  })

  it('hash 不带 # 前缀时自动补全', () => {
    expect(stringifyUrl({ base: 'https://example.com/', hash: 'section1' })).toBe('https://example.com/#section1')
  })

  it('base 末尾的孤立 ? 不会被拼成 ?&a=1', () => {
    expect(stringifyUrl({ base: 'https://example.com/?', query: { a: 1 } })).toBe('https://example.com/?a=1')
  })

  it('base 已带 query 时用 & 续接，而不是再插一个 ?', () => {
    expect(stringifyUrl({ base: 'https://example.com/?x=1', query: { a: 2 } })).toBe('https://example.com/?x=1&a=2')
  })

  it('nullish 参数默认被剔除，omitNil=false 时按字面输出', () => {
    // 调用方常用 undefined 表示「这一轮不要带这个参数」；默认剔除是它的依据
    expect(stringifyUrl({ base: 'https://example.com/', query: { a: 1, b: undefined, c: null } })).toBe(
      'https://example.com/?a=1'
    )
    // 显式关闭剔除时 null 会变成字面量 "null"，这是可观察的差异
    expect(stringifyUrl({ base: 'https://example.com/', query: { a: 1, c: null } }, false)).toBe(
      'https://example.com/?a=1&c=null'
    )
  })
})

describe('parseUrl|stringifyUrl 往返测试', () => {
  it('带 query 与 hash 的 URL 往返后逐段还原', () => {
    // 往返是这两个函数最主要的用途；任一侧破坏任一段都会静默改写用户链接
    const url = 'https://example.com/search?q=xyz&w=123#heading-1'
    expect(stringifyUrl(parseUrl(url))).toBe(url)
  })

  it('含非 ASCII 参数与相对路径的 URL 往返后还原', () => {
    expect(stringifyUrl(parseUrl('/search?键=值#节'))).toBe('/search?%E9%94%AE=%E5%80%BC#%E8%8A%82')
  })
})
