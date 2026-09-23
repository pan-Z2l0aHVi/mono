import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import type { WebUiContextMenu } from '@/components/context-menu'
import { toast } from '@/components/toast'

import { WebUiTheme } from '..'
import '@/components/context-menu'
import '@/components/toast'

function createTheme(appearance?: 'light' | 'dark' | 'system'): WebUiTheme {
  const theme = document.createElement('web-ui-theme')
  if (appearance) theme.appearance = appearance
  document.body.appendChild(theme)
  return theme
}

beforeEach(() => {
  document.body.innerHTML = ''
  toast._reset()
})

afterEach(() => {
  toast._reset()
  document.body.innerHTML = ''
})

describe('WebUiTheme 组件', () => {
  describe('主题过渡开关：motion', () => {
    /*
     * `transition` 布尔 prop 已移除（breaking）：主题切换是否播放 View Transition 揭示
     * 改由 motion 三档统一控制 —— full 播放、reduced 直接落地、system 跟随
     * prefers-reduced-motion。jsdom 不解析主题内部 CSS，duration 回退 500ms，
     * 因此这里的判定面是 isReducedMotion() 与 startViewTransition 接线本身。
     */
    function stubStartViewTransition() {
      const startDescriptor = Object.getOwnPropertyDescriptor(document, 'startViewTransition')
      const adoptedDescriptor = Object.getOwnPropertyDescriptor(document, 'adoptedStyleSheets')
      let last: ViewTransition | undefined
      const startViewTransition = vi.fn<typeof document.startViewTransition>(() => {
        last = {
          ready: Promise.resolve(),
          finished: Promise.resolve(),
          updateCallbackDone: Promise.resolve()
        } as unknown as ViewTransition
        return last
      })
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: startViewTransition
      })
      document.adoptedStyleSheets = []
      return {
        startViewTransition,
        // 供调用方 await 掉本次 flight：模块级 flight token 未释放时，同文件后续用例的
        // appearance 赋值会走「飞行中直接落地」分支，从而绕过 startViewTransition。
        get lastTransition() {
          return last
        },
        restore() {
          if (startDescriptor) Object.defineProperty(document, 'startViewTransition', startDescriptor)
          else Reflect.deleteProperty(document, 'startViewTransition')
          if (adoptedDescriptor) Object.defineProperty(document, 'adoptedStyleSheets', adoptedDescriptor)
          else Reflect.deleteProperty(document, 'adoptedStyleSheets')
        }
      }
    }

    function stubPrefersReducedMotion(reduce: boolean) {
      // 本 jsdom 环境没有 matchMedia，只能整体装上再按原描述符还原。
      const descriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: (query: string) =>
          ({
            matches: reduce && query.includes('prefers-reduced-motion'),
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false
          }) as unknown as MediaQueryList
      })
      return () => {
        if (descriptor) Object.defineProperty(window, 'matchMedia', descriptor)
        else Reflect.deleteProperty(window, 'matchMedia')
      }
    }

    it('motion=full 时 appearance 变化启动 View Transition', async () => {
      const stub = stubStartViewTransition()
      const theme = createTheme('light')
      theme.motion = 'full'
      await theme.updateComplete

      theme.appearance = 'dark'
      await theme.updateComplete
      expect(stub.startViewTransition).toHaveBeenCalledTimes(1)

      theme.remove()
      stub.restore()
    })

    it('motion=reduced 时不启动 View Transition，直接落地 appearance', async () => {
      const stub = stubStartViewTransition()
      const theme = createTheme('light')
      theme.motion = 'reduced'
      await theme.updateComplete

      theme.appearance = 'dark'
      await theme.updateComplete
      expect(stub.startViewTransition).not.toHaveBeenCalled()
      expect(theme.appearance).toBe('dark')
      expect(theme.getAttribute('appearance')).toBe('dark')

      theme.remove()
      stub.restore()
    })

    it('motion=system 默认档：无系统 reduce 偏好时启动 View Transition', async () => {
      const stub = stubStartViewTransition()
      const theme = createTheme('light')
      await theme.updateComplete
      expect(theme.motion).toBe('system')

      theme.appearance = 'dark'
      await theme.updateComplete
      expect(stub.startViewTransition).toHaveBeenCalledTimes(1)

      theme.remove()
      stub.restore()
    })

    it('motion=system 跟随系统 reduce 偏好：不启动 View Transition', async () => {
      const stub = stubStartViewTransition()
      const restore = stubPrefersReducedMotion(true)
      const theme = createTheme('light')
      await theme.updateComplete

      theme.appearance = 'dark'
      await theme.updateComplete
      expect(stub.startViewTransition).not.toHaveBeenCalled()
      expect(theme.appearance).toBe('dark')

      theme.remove()
      restore()
      stub.restore()
    })

    it('motion=full 覆盖系统 reduce 偏好（上一条的对照组）', async () => {
      const stub = stubStartViewTransition()
      const restore = stubPrefersReducedMotion(true)
      const theme = createTheme('light')
      theme.motion = 'full'
      await theme.updateComplete

      theme.appearance = 'dark'
      await theme.updateComplete
      expect(stub.startViewTransition).toHaveBeenCalledTimes(1)

      theme.remove()
      restore()
      stub.restore()
    })

    /*
     * 「prop 不再被读取」必须由一对反向证据共同归因，单取任何一半都没有区分力：
     * 上半（motion=full 且不写 transition）—— 旧实现没有 transition 就不会启动，
     *   现在仍然启动，说明揭示不再需要该 prop 授权；
     * 下半（motion=reduced 且写了 transition）—— reduced 档本身就会短路
     *   _shouldAnimateAppearance，单独看这一条即使 prop 仍在被读取也会绿，
     *   只有和上半配对才能证明「写了也开不了」。
     */
    it('已移除的 transition prop 是惰性 no-op：motion=full 不写也启动，motion=reduced 写了也不启动', async () => {
      const stub = stubStartViewTransition()
      const enabled = createTheme('light')
      enabled.motion = 'full'
      await enabled.updateComplete

      enabled.appearance = 'dark'
      await enabled.updateComplete
      expect(stub.startViewTransition).toHaveBeenCalledTimes(1)
      await stub.lastTransition!.finished
      await Promise.resolve()
      enabled.remove()

      const disabled = createTheme('light')
      disabled.motion = 'reduced'
      disabled.setAttribute('transition', '')
      // prop 已从类型面移除，这里走 unknown 赋值模拟未迁移的 JS 消费者。
      ;(disabled as unknown as Record<string, unknown>).transition = true
      await disabled.updateComplete

      disabled.appearance = 'dark'
      await disabled.updateComplete
      // 计数停在 1：reduced 档下写 property 与 attribute 都没有再拉起一次过渡。
      expect(stub.startViewTransition).toHaveBeenCalledTimes(1)
      expect(disabled.appearance).toBe('dark')
      expect(disabled.hasAttribute('transition')).toBe(true)

      disabled.remove()
      stub.restore()
    })

    it('连接期间只登记一次圆心来源监听，断开时完整清理', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const theme = createTheme('light')

      try {
        // Upgrade 顺序可能是 attributeChangedCallback 先于 connectedCallback；手动再同步一次连接回调。
        theme.connectedCallback()
        await theme.updateComplete

        const countEvents = (spy: typeof addSpy, event: string) =>
          spy.mock.calls.filter(([eventName]) => eventName === event).length
        expect(countEvents(addSpy, 'pointerdown')).toBe(1)
        expect(countEvents(addSpy, 'keydown')).toBe(1)

        theme.remove()
        expect(countEvents(removeSpy, 'pointerdown')).toBe(1)
        expect(countEvents(removeSpy, 'keydown')).toBe(1)
      } finally {
        addSpy.mockRestore()
        removeSpy.mockRestore()
        theme.remove()
      }
    })

    it('浏览器不支持 View Transitions 时立即提交 appearance', async () => {
      const startDescriptor = Object.getOwnPropertyDescriptor(document, 'startViewTransition')
      Reflect.deleteProperty(document, 'startViewTransition')
      const theme = createTheme('light')
      theme.motion = 'full'
      await theme.updateComplete

      theme.appearance = 'dark'
      await theme.updateComplete
      expect(theme.appearance).toBe('dark')
      expect(theme.getAttribute('appearance')).toBe('dark')
      theme.remove()
      if (startDescriptor) Object.defineProperty(document, 'startViewTransition', startDescriptor)
    })

    it('同一次 View Transition 内的新请求直接落地为最终 appearance', async () => {
      const original = document.startViewTransition
      const originalAdoptedStyleSheets = document.adoptedStyleSheets
      let updateCallback: (() => Promise<void>) | undefined
      let resolveFinished: (() => void) | undefined
      let resolveUpdate: (() => void) | undefined
      const finish = new Promise<void>(resolve => {
        resolveFinished = resolve
      })
      const updateCallbackDone = new Promise<void>(resolve => {
        resolveUpdate = resolve
      })
      const startViewTransition = vi.fn<(update?: () => Promise<void>) => ViewTransition>(
        (update?: () => Promise<void>) => {
          updateCallback = update
          return {
            updateCallbackDone,
            ready: Promise.resolve(),
            finished: finish
          } as unknown as ViewTransition
        }
      )
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: startViewTransition
      })
      document.adoptedStyleSheets = []
      const theme = createTheme('light')
      theme.motion = 'full'
      await theme.updateComplete

      theme.appearance = 'dark'
      theme.appearance = 'light'
      await theme.updateComplete
      expect(theme.appearance).toBe('light')
      expect(startViewTransition).toHaveBeenCalledTimes(1)
      expect(updateCallback).toBeDefined()
      resolveUpdate?.()
      await Promise.resolve()
      resolveFinished?.()
      await Promise.resolve()
      theme.remove()
      vi.mocked(startViewTransition).mockRestore()
      document.startViewTransition = original
      document.adoptedStyleSheets = originalAdoptedStyleSheets
    })
  })

  describe('View Transition capture 清理', () => {
    /*
     * issue #146：_startThemeTransition 先给 host 写内联 display:block 与 view-transition-name，
     * 再执行 document.adoptedStyleSheets = …。cleanup 必须在该写入之前登记，否则写入同步抛错时
     * setter 的 .catch 拿到的是 undefined 的 cleanup，capture name 会残留在 host 上，污染之后每一次
     * view transition。嵌套主题才有 capture name（root 主题 transitionName 为 undefined），故用 outer/inner。
     */
    it('adoptedStyleSheets setter 抛错时：host 不残留 view-transition-name', async () => {
      const outer = createTheme('light')
      const inner = document.createElement('web-ui-theme')
      inner.appearance = 'light'
      inner.motion = 'full'
      outer.appendChild(inner)
      await outer.updateComplete
      await inner.updateComplete

      const startDesc = Object.getOwnPropertyDescriptor(document, 'startViewTransition')
      const adoptedDesc = Object.getOwnPropertyDescriptor(document, 'adoptedStyleSheets')
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: () => ({
          ready: Promise.resolve(),
          finished: Promise.resolve(),
          updateCallbackDone: Promise.resolve()
        })
      })
      // jsdom 无 adoptedStyleSheets，先建出数组 own-property，再覆写为「getter 返回数组 +
      // setter 同步抛错」：既让 _shouldAnimateAppearance 的 Array.isArray 检查通过，又让写入抛错。
      document.adoptedStyleSheets = []
      const adoptedArray = document.adoptedStyleSheets
      let setterCalled = false
      Object.defineProperty(document, 'adoptedStyleSheets', {
        configurable: true,
        get: () => adoptedArray,
        set: () => {
          setterCalled = true
          throw new Error('adoptedStyleSheets setter blocked (test)')
        }
      })

      try {
        inner.appearance = 'dark'
        // setter 同步抛错 → async fn reject → .catch 微任务；flush 之。
        await new Promise(resolve => setTimeout(resolve, 0))
        await inner.updateComplete

        // 守卫：确认过渡确已发起并走到 adoptedStyleSheets 写入（否则内联写入从未发生，下面会假绿）。
        expect(setterCalled).toBe(true)
        expect(inner.style.getPropertyValue('view-transition-name')).toBe('')
        // .catch 仍应提交最终 appearance。
        expect(inner.appearance).toBe('dark')
      } finally {
        if (startDesc) Object.defineProperty(document, 'startViewTransition', startDesc)
        else Reflect.deleteProperty(document, 'startViewTransition')
        if (adoptedDesc) Object.defineProperty(document, 'adoptedStyleSheets', adoptedDesc)
        else Reflect.deleteProperty(document, 'adoptedStyleSheets')
        inner.remove()
        outer.remove()
      }
    })
  })

  describe('属性：motion', () => {
    it('默认使用 system 并反射到 host', async () => {
      const theme = createTheme('light')
      await theme.updateComplete
      expect(theme.motion).toBe('system')
      expect(theme.getAttribute('motion')).toBe('system')
      theme.remove()
    })

    it('motion 反射到 host', async () => {
      const theme = createTheme('light')
      theme.motion = 'reduced'
      await theme.updateComplete
      expect(theme.getAttribute('motion')).toBe('reduced')
      theme.remove()
    })

    it('非法的 motion 值回退到 system', async () => {
      const theme = createTheme('light')
      ;(theme as unknown as Record<string, unknown>).motion = 'invalid'
      await theme.updateComplete
      expect(theme.motion).toBe('system')
      expect(theme.getAttribute('motion')).toBe('system')
      theme.remove()
    })

    it('嵌套范围可独立设置 motion', async () => {
      const outer = createTheme('light')
      outer.motion = 'reduced'
      const inner = document.createElement('web-ui-theme')
      inner.appearance = 'dark'
      inner.motion = 'full'
      outer.appendChild(inner)

      await outer.updateComplete
      await inner.updateComplete

      expect(outer.motion).toBe('reduced')
      expect(inner.motion).toBe('full')
      expect(outer.getAttribute('motion')).toBe('reduced')
      expect(inner.getAttribute('motion')).toBe('full')
      inner.remove()
      outer.remove()
    })
  })

  describe('属性：appearance', () => {
    it('appearance 反射到 host', async () => {
      const theme = createTheme('dark')
      await theme.updateComplete
      expect(theme.getAttribute('appearance')).toBe('dark')
      theme.remove()
    })

    it('非法的 appearance 值回退到 light', async () => {
      const theme = createTheme()
      ;(theme as unknown as Record<string, unknown>).appearance = 'invalid'
      await theme.updateComplete
      expect(theme.appearance).toBe('light')
      expect(theme.getAttribute('appearance')).toBe('light')
      theme.remove()
    })

    it('设置 appearance 时创建 theme-owned overlay root', async () => {
      const theme = createTheme('light')
      await theme.updateComplete
      expect(theme.getOverlayRoot()).toBeTruthy()
      theme.remove()
    })

    it('缺少 appearance 时 getOverlayRoot 返回 undefined', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const theme = createTheme()
      await theme.updateComplete
      expect(theme.getOverlayRoot()).toBeUndefined()
      expect(warn).toHaveBeenCalledTimes(1)
      warn.mockRestore()
      theme.remove()
    })
  })

  describe('嵌套主题', () => {
    it('内层主题保持独立 theme-owned overlay root', async () => {
      const outer = createTheme('light')
      const inner = document.createElement('web-ui-theme')
      inner.appearance = 'dark'
      outer.appendChild(inner)

      await outer.updateComplete
      await inner.updateComplete

      expect(outer.getOverlayRoot()).toBeTruthy()
      expect(inner.getOverlayRoot()).toBeTruthy()
      expect(inner.getAttribute('appearance')).toBe('dark')
      inner.remove()
      outer.remove()
    })
  })

  describe('Toast 集成', () => {
    it('Toast target 使用最近主题的 theme-owned overlay root', async () => {
      const theme = createTheme('dark')
      const trigger = document.createElement('button')
      theme.appendChild(trigger)
      await theme.updateComplete

      toast.info('scoped', { target: trigger, duration: 0 })
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(theme.getOverlayRoot()?.querySelector('web-ui-toast')).toBeTruthy()
      theme.remove()
    })

    it('Toast container 显式覆盖主题 scope', async () => {
      const theme = createTheme('dark')
      const trigger = document.createElement('button')
      const container = document.createElement('div')
      theme.append(trigger, container)
      await theme.updateComplete

      toast.info('custom', { target: trigger, container, duration: 0 })
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(container.querySelector('web-ui-toast')).toBeTruthy()
      expect(theme.getOverlayRoot()?.querySelector('web-ui-toast')).toBeNull()
      theme.remove()
    })
  })

  describe('Context Menu 集成', () => {
    it('使用最近主题的 theme-owned overlay root', async () => {
      const theme = createTheme('dark')
      const menu = document.createElement('web-ui-context-menu')
      menu.innerHTML = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>'
      theme.appendChild(menu)
      await theme.updateComplete
      await menu.updateComplete

      menu.openAt(80, 80)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(theme.getOverlayRoot()?.querySelector('[role="menu"]')).toBeTruthy()
      theme.remove()
    })
  })

  describe('无主题 fallback', () => {
    it('Toast 在不设置主题时使用 fallback overlay root 渲染', async () => {
      toast.info('fallback', { duration: 0 })
      await new Promise(resolve => requestAnimationFrame(resolve))

      // 外在表现：toast 渲染进 fallback overlay root，而不是注入 document head 样式。
      // 计数断言走公开面保留：本批主题恰是「消除同 id 重复挂载」，只留存在性断言会让同类缺陷漏网。
      const fallbackRoot = document.querySelector('[data-wui-overlay-root]')?.shadowRoot
      expect(fallbackRoot?.querySelectorAll('web-ui-toast')).toHaveLength(1)
      toast._reset()
    })
  })
})
