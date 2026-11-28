import { describe, expect, it } from 'vite-plus/test'

import { extractImportLinks, normalizeImportURL, scanTextLinks } from '../linkImport'

function urlsOf(text: string) {
  return extractImportLinks({ text }).candidates.map(candidate => candidate.url)
}

describe('link import extraction', () => {
  it('从多行、正文混排与 markdown 里提取多个链接', () => {
    const text = [
      'https://a.com/1',
      '看这个 https://b.com/2 和 example.com/3',
      '[标题](https://c.com/4)',
      '中文紧贴https://d.com/5和example.com/6'
    ].join('\n')

    expect(urlsOf(text)).toEqual([
      'https://a.com/1',
      'https://b.com/2',
      'https://example.com/3',
      'https://c.com/4',
      'https://d.com/5',
      'https://example.com/6'
    ])
  })

  it('剥掉句末与包裹标点，但保留配对括号', () => {
    expect(scanTextLinks('https://a.com/x.').map(normalizeImportURL)).toEqual(['https://a.com/x'])
    expect(scanTextLinks('https://a.com/y，').map(normalizeImportURL)).toEqual(['https://a.com/y'])
    expect(scanTextLinks('（https://a.com/p）').map(normalizeImportURL)).toEqual(['https://a.com/p'])
    expect(scanTextLinks('https://a.com/z_(w)').map(normalizeImportURL)).toEqual(['https://a.com/z_(w)'])
  })

  it('裸域名支持端口、路径、query 与 hash', () => {
    expect(normalizeImportURL('example.com:8080/a?b=1#c')).toBe('https://example.com:8080/a?b=1#c')
    expect(normalizeImportURL(' EXAMPLE.com/A ')).toBe('https://example.com/A')
    expect(normalizeImportURL('https://example.com:443/x')).toBe('https://example.com/x')
  })

  it('按规范化结果去重并保留首次出现的顺序', () => {
    const result = extractImportLinks({
      text: 'https://A.com/x\nhttps://a.com/x\nhttps://example.com\nhttps://example.com/'
    })

    expect(result.candidates.map(candidate => candidate.url)).toEqual(['https://a.com/x', 'https://example.com/'])
    expect(result.duplicates).toBe(2)
  })

  it('忽略非 http(s) 与长得像文件名的裸域名', () => {
    const result = extractImportLinks({
      text: 'file:///tmp/a\njavascript:alert(1)\nREADME.md\nphoto.png\n不是链接'
    })

    expect(result.candidates).toEqual([])
  })

  it('从 HTML 锚点提取并解析相对链接，无法解析的记为 invalid', () => {
    const result = extractImportLinks({
      html: [
        '<a href="/docs/a">A</a>',
        '<a href="https://b.com/x">B</a>',
        '<a href="#top">top</a>',
        '<a href="javascript:void(0)">js</a>',
        '<a href="mailto:a@b.com">mail</a>'
      ].join(''),
      baseUrl: 'https://example.com/base/'
    })

    expect(result.candidates).toEqual([
      { raw: '/docs/a', url: 'https://example.com/docs/a', source: 'html' },
      { raw: 'https://b.com/x', url: 'https://b.com/x', source: 'html' }
    ])
    expect(result.invalid).toEqual(['javascript:void(0)', 'mailto:a@b.com'])
  })

  it('HTML 与文本合并后去重', () => {
    const result = extractImportLinks({
      html: '<a href="https://a.com/x">a</a>',
      text: 'https://a.com/x https://b.com/y'
    })

    expect(result.candidates.map(candidate => candidate.url)).toEqual(['https://a.com/x', 'https://b.com/y'])
    expect(result.duplicates).toBe(1)
  })

  it('没有协议的相对锚点在缺少 base 时判为 invalid', () => {
    const result = extractImportLinks({ html: '<a href="/only-path">x</a>' })
    expect(result.candidates).toEqual([])
    expect(result.invalid).toEqual(['/only-path'])
  })
})
