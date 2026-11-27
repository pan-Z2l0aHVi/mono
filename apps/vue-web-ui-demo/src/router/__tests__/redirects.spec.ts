import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vite-plus/test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

describe('file-based 路由非叶子目录契约与重定向', () => {
  it('src/pages 下除 [...all] 外的每个路由目录都提供 index.vue，避免访问非叶子路径落入 404', () => {
    const pagesDir = path.resolve(import.meta.dirname, '../../pages')
    const missing: string[] = []

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        if (entry.name.startsWith('[...')) continue
        const full = path.join(dir, entry.name)
        if (!fs.existsSync(path.join(full, 'index.vue'))) {
          missing.push(path.relative(pagesDir, full))
        }
        walk(full)
      }
    }

    expect(fs.existsSync(path.join(pagesDir, 'index.vue')), '缺少根路由 pages/index.vue').toBe(true)
    walk(pagesDir)
    expect(missing).toEqual([])
  })

  it.each([
    ['/', '/home'],
    ['/components', '/components/button'],
    ['/components/', '/components/button']
  ])('访问非叶子路径 %s 自动重定向到 %s', async (from, expected) => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes
    })

    await router.push(from)
    await router.isReady()
    expect(router.currentRoute.value.fullPath).toBe(expected)
  })
})
