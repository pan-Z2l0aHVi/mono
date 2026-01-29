import { createRouter, RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { routeTree } from '../routeTree.gen'

describe('App 挂载测试', () => {
  it('组件应当成功渲染到 DOM', () => {
    const router = createRouter({ routeTree })

    render(<RouterProvider router={router} />)

    expect(document.body.innerHTML).not.toBe('')
  })
})
