import '@/assets/global.css'
import '@greypan/web-ui'

import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppLayout from '../AppLayout.vue'

const DummyPage = defineComponent({
  render: () => h('div', { class: 'p-4' }, [h('button', { type: 'button', 'data-testid': 'page-btn' }, '页面按钮')])
})

async function mountApp(options: { mobile?: boolean; collapsed?: boolean } = {}) {
  await page.viewport(options.mobile ? 400 : 1280, 800)
  const host = document.createElement('div')
  host.id = 'app'
  document.body.append(host)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/library' },
      { path: '/library', component: DummyPage },
      { path: '/map', component: DummyPage }
    ]
  })
  await router.push('/library')
  await router.isReady()

  const app = createApp({
    render: () => h('web-ui-theme', { appearance: 'light' }, [h(AppLayout)])
  })
  app.use(createPinia())
  app.use(router)
  app.mount(host)
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(() => resolve(null)))

  if (options.collapsed) {
    const layout = host.querySelector('web-ui-layout')
    layout?.dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed: true } }))
    await nextTick()
  }

  return {
    host,
    unmount: () => {
      app.unmount()
      host.remove()
    }
  }
}

const hosts: HTMLElement[] = []
afterEach(() => {
  for (const h of hosts.splice(0)) h.remove()
  localStorage.clear()
})

describe('AppNav：键盘 Tab 与 focus ring（浏览器实测）', () => {
  it('桌面端 Tab 依次聚焦导航按钮并显示 focus ring', async () => {
    const mounted = await mountApp()
    hosts.push(mounted.host)
    try {
      const libBtn = mounted.host.querySelector<HTMLButtonElement>('button[aria-label="资料库"]')!
      const mapBtn = mounted.host.querySelector<HTMLButtonElement>('button[aria-label="关系图谱"]')!
      const settingsBtn = mounted.host.querySelector<HTMLButtonElement>('button[aria-label="设置"]')!

      await userEvent.tab()
      expect(document.activeElement).toBe(libBtn)
      expect(libBtn.matches(':focus-visible')).toBe(true)
      expect(getComputedStyle(libBtn).outlineStyle).not.toBe('none')

      await userEvent.tab()
      expect(document.activeElement).toBe(mapBtn)
      expect(mapBtn.matches(':focus-visible')).toBe(true)
      expect(getComputedStyle(mapBtn).outlineStyle).not.toBe('none')

      await userEvent.tab()
      expect(document.activeElement).toBe(settingsBtn)
      expect(settingsBtn.matches(':focus-visible')).toBe(true)
      expect(getComputedStyle(settingsBtn).outlineStyle).not.toBe('none')
    } finally {
      mounted.unmount()
    }
  })

  it('桌面端 collapsed 态下设置按钮底部不被 overflow: hidden 裁切', async () => {
    const mounted = await mountApp({ collapsed: true })
    hosts.push(mounted.host)
    try {
      const layout = mounted.host.querySelector('web-ui-layout')!
      const viewport = layout.shadowRoot!.querySelector<HTMLElement>('.sidebar-viewport')!
      const settingsBtn = mounted.host.querySelector<HTMLButtonElement>('button[aria-label="设置"]')!

      const vpRect = viewport.getBoundingClientRect()
      const btnRect = settingsBtn.getBoundingClientRect()
      // 按钮底部到 viewport 底部的距离应 >= 5px（outline-offset: 2px + outline-width: 3px）
      expect(vpRect.bottom - btnRect.bottom).toBeGreaterThanOrEqual(5)
    } finally {
      mounted.unmount()
    }
  })

  it('移动端打开 drawer 后 Tab 可聚焦导航按钮并显示 focus ring', async () => {
    const mounted = await mountApp({ mobile: true })
    hosts.push(mounted.host)
    try {
      const layout = mounted.host.querySelector('web-ui-layout')!
      const mobileToggle = layout.shadowRoot!.querySelector<HTMLElement>('.mobile-toggle')!
      mobileToggle.click()
      await nextTick()
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))

      const libBtn = mounted.host.querySelector<HTMLButtonElement>('button[aria-label="资料库"]')!
      const mapBtn = mounted.host.querySelector<HTMLButtonElement>('button[aria-label="关系图谱"]')!
      const settingsBtn = mounted.host.querySelector<HTMLButtonElement>('button[aria-label="设置"]')!

      const visited: Element[] = []
      const focusRingVisible = new Set<Element>()
      if (document.activeElement) visited.push(document.activeElement)
      for (let i = 0; i < 5; i++) {
        if (document.activeElement === settingsBtn) break
        await userEvent.tab()
        const active = document.activeElement
        if (active) {
          visited.push(active)
          if (active.matches(':focus-visible') && getComputedStyle(active).outlineStyle !== 'none') {
            focusRingVisible.add(active)
          }
        }
      }

      expect(visited).toContain(libBtn)
      expect(visited).toContain(mapBtn)
      expect(visited).toContain(settingsBtn)
      expect(focusRingVisible.has(mapBtn)).toBe(true)
      expect(focusRingVisible.has(settingsBtn)).toBe(true)

      await userEvent.tab({ shift: true })
      await userEvent.tab({ shift: true })
      expect(document.activeElement).toBe(libBtn)
      expect(libBtn.matches(':focus-visible')).toBe(true)
      expect(getComputedStyle(libBtn).outlineStyle).not.toBe('none')
    } finally {
      mounted.unmount()
    }
  })
})
