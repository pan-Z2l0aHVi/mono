import { afterEach, describe, expect, it } from 'vite-plus/test'

import { detectLocale, loadShellLocale } from '../locale'

// 语种选择的判据只有两条：用户选过的优先，没选过才按浏览器习惯推。这两条错了，整站会对着
// 用错语言首屏呈现，而 URL 不带语种、没有任何链接能把它纠回来，所以在这里钉住。
function setNavigatorLanguages(languages: string[]) {
  Object.defineProperty(navigator, 'languages', { value: languages, configurable: true })
}

describe('本机语种判定', () => {
  afterEach(() => {
    localStorage.removeItem('locale')
    setNavigatorLanguages(['en-US'])
  })

  it('选过的语种优先于浏览器习惯', () => {
    localStorage.setItem('locale', 'en')
    setNavigatorLanguages(['zh-CN'])
    expect(detectLocale()).toBe('en')
  })

  it('存着不认识的语种值时退回浏览器习惯', () => {
    localStorage.setItem('locale', 'fr')
    setNavigatorLanguages(['zh-TW'])
    expect(detectLocale()).toBe('zh-CN')
  })

  it('按顺序取第一个认识的浏览器语种，其余一律落英文', () => {
    setNavigatorLanguages(['fr-FR', 'en-GB'])
    expect(detectLocale()).toBe('en')
    setNavigatorLanguages(['zh-HK', 'en-US'])
    expect(detectLocale()).toBe('zh-CN')
    setNavigatorLanguages(['de-DE'])
    expect(detectLocale()).toBe('en')
  })

  it('localStorage 被禁用时不影响判定', () => {
    setNavigatorLanguages(['zh-CN'])
    const getItem = localStorage.getItem.bind(localStorage)
    localStorage.getItem = () => {
      throw new Error('storage blocked')
    }
    try {
      expect(detectLocale()).toBe('zh-CN')
    } finally {
      localStorage.getItem = getItem
    }
  })
})

describe('壳文案 catalog 装载', () => {
  it('同一语种的并发请求只提交一次', async () => {
    const first = loadShellLocale('en')
    expect(loadShellLocale('en')).toBe(first)
    await first
    // 已装载过的那一档不再重复提交：再调一次应立即完成，且不会换第二次语种。
    await expect(loadShellLocale('en')).resolves.toBeUndefined()
  })
})
