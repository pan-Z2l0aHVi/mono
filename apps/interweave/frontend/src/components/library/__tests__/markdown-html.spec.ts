import { describe, expect, it } from 'vite-plus/test'

import { allowedLinkTarget, SANITIZED_LINK_ATTRIBUTE, sanitizeInlineHtml } from '../markdown-html'

describe('sanitizeInlineHtml', () => {
  it('剔除 script 与事件属性，保留白名单标签的样式语义', () => {
    const { html } = sanitizeInlineHtml('<strong>ok</strong><script>alert(1)</script><em onclick="x()">hi</em>')
    expect(html).toContain('<strong>ok</strong>')
    expect(html).toContain('<em>hi</em>')
    expect(html).not.toContain('script')
    expect(html).not.toContain('onclick')
  })

  it('https 链接改写为受控属性，点击不再交给 WebView 导航', () => {
    const { html, links } = sanitizeInlineHtml('<a href="https://example.com/a">link</a>')
    const anchor = document.createElement('div')
    anchor.innerHTML = html
    const element = anchor.querySelector('a')!
    // href 已剥掉：WebView 不会因点击导航；目标改写到受控属性，由预览层拦截后交系统浏览器。
    expect(element.hasAttribute('href')).toBe(false)
    expect(element.getAttribute(SANITIZED_LINK_ATTRIBUTE)).toBe('https://example.com/a')
    expect(links).toEqual(['https://example.com/a'])
  })

  it('javascript: 与相对地址链接都判死', () => {
    const { html, links } = sanitizeInlineHtml(
      '<a href="javascript:alert(1)">bad</a><a href="/relative">rel</a><a href="mailto:a@b.c">mail</a>'
    )
    expect(links).toEqual(['mailto:a@b.c'])
    expect(html).toContain('data-md-link-dead')
    expect(html).not.toContain('javascript')
    // 相对地址会按应用 origin 解析（可能打到本地媒体端点），同样不放行。
    expect(html).not.toContain('href="/relative"')
  })

  it('行内图片只放行 http(s) 绝对地址，相对 src 被剔除', () => {
    const { html } = sanitizeInlineHtml(
      '<img src="https://example.com/pic.png" alt="a"><img src="/local/secret.png" alt="b">'
    )
    expect(html).toContain('src="https://example.com/pic.png"')
    expect(html).toContain('loading="lazy"')
    expect(html).not.toContain('/local/secret.png')
  })

  it('输入自带的 data-md-href 一律剥除：raw HTML 不能绕过 scheme 白名单', () => {
    const { html, links } = sanitizeInlineHtml(
      '<a data-md-href="file:///etc/passwd">点我</a><a href="https://example.com/ok" data-md-href="https://example.com/ok">好链</a>'
    )
    // 输入自带的受控属性是攻击面：清洗器无条件剥除，只在 href 通过 allowedLinkTarget 后重写。
    expect(links).toEqual(['https://example.com/ok'])
    const container = document.createElement('div')
    container.innerHTML = html
    const anchors = [...container.querySelectorAll('a')]
    expect(anchors[0]!.hasAttribute('data-md-href')).toBe(false)
    expect(anchors[0]!.hasAttribute('data-md-link-dead')).toBe(true)
    expect(anchors[1]!.getAttribute('data-md-href')).toBe('https://example.com/ok')
  })

  it('白名单外标签降级为文本内容', () => {
    const { html } = sanitizeInlineHtml('<iframe src="https://evil.example"></iframe>text')
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('evil.example')
  })
})

describe('allowedLinkTarget', () => {
  it.each([
    ['https://example.com/a', 'https://example.com/a'],
    ['http://example.com', 'http://example.com'],
    ['mailto:a@b.c', 'mailto:a@b.c']
  ])('放行 %j', (input, expected) => {
    expect(allowedLinkTarget(input)).toBe(expected)
  })

  it.each([
    ['/relative'],
    ['../up'],
    ['javascript:alert(1)'],
    ['data:text/html,x'],
    ['file:///etc/passwd'],
    ['wails://x'],
    ['   ']
  ])('拒绝 %j', input => {
    expect(allowedLinkTarget(input)).toBeNull()
  })
})
