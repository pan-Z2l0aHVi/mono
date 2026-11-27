import fs from 'node:fs'
import path from 'node:path'

import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vite-plus/test'

import { routeTree } from '@/routeTree.gen.ts'

describe('file-based 路由非叶子目录契约与重定向', () => {
  it('src/routes 下每个路由目录都提供 index.tsx，避免访问非叶子路径落入 404', () => {
    const routesDir = path.resolve(import.meta.dirname, '../../routes')
    const missing: string[] = []

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        if (entry.name.startsWith('-')) continue
        const full = path.join(dir, entry.name)
        if (!fs.existsSync(path.join(full, 'index.tsx'))) {
          missing.push(path.relative(routesDir, full))
        }
        walk(full)
      }
    }

    expect(fs.existsSync(path.join(routesDir, 'index.tsx')), '缺少根路由 routes/index.tsx').toBe(true)
    walk(routesDir)
    expect(missing).toEqual([])
  })

  it.each([
    ['/', '/home'],
    ['/components', '/components/button'],
    ['/components/', '/components/button']
  ])('访问非叶子路径 %s 自动重定向到 %s', async (from, expected) => {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: [from] })
    })

    await router.load()
    expect(router.state.location.pathname).toBe(expected)
  })
})
