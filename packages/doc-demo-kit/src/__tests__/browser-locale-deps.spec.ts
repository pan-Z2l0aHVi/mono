// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vite-plus/test'

import { detectLocale } from '../detect'
import { createBrowserLocaleDependencies } from '../locale'

/*
 * 两端逐字重复的浏览器默认值（偏好读写、navigator 语言、document.lang）收进 kit 后，
 * 在这里对着真实 localStorage / navigator 钉住判据；框架绑定（wuchale catalog、meta loader）
 * 由各 app 的 spec 自留。
 */
const deps = createBrowserLocaleDependencies({ storageKey: 'locale' })

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(navigator, 'languages', { value: ['en-US'], configurable: true })
})

describe('浏览器默认依赖', () => {
  it('detect 接线：偏好优先于浏览器语言，不认识的值退回浏览器语言', () => {
    localStorage.setItem('locale', 'en')
    Object.defineProperty(navigator, 'languages', { value: ['zh-CN'], configurable: true })
    expect(detectLocale(deps)).toBe('en')

    localStorage.setItem('locale', 'fr')
    Object.defineProperty(navigator, 'languages', { value: ['zh-TW'], configurable: true })
    expect(detectLocale(deps)).toBe('zh-CN')
  })

  it('languages 兜底到 navigator.language，偏好写入是裸字符串', () => {
    Object.defineProperty(navigator, 'languages', { value: [], configurable: true })
    Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true })
    expect(deps.languages()).toEqual(['zh-CN'])

    deps.writePreference('en')
    expect(localStorage.getItem('locale')).toBe('en')
  })

  it('setDocumentLanguage 同步 documentElement.lang', () => {
    deps.setDocumentLanguage('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
