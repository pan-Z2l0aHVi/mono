import { createRootRoute } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import App from '../App'

// 避免 tanstack router 代码分割报错，直接模拟路由树
vi.mock('../routeTree.gen.ts', () => {
  return {
    routeTree: createRootRoute({
      component: () => <div data-testid="mock-root">Mock Content</div>
    })
  }
})

describe('App 挂载测试', () => {
  it('组件应当成功渲染到 DOM', () => {
    render(<App />)

    expect(document.body.innerHTML).not.toBe('')
  })
})
