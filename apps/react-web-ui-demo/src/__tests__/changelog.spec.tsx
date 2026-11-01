import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { Changelog } from '../components/changelog'

afterEach(cleanup)

describe('更新日志页', () => {
  it('从 CHANGELOG.md 原样渲染整份文档', () => {
    const { container } = render(<Changelog />)

    expect(container.querySelector('h1')?.textContent).toBe('@greypan/web-ui')
    // 版本号来自 CHANGELOG.md，会随发版变化：这里只校验形状，不写死具体版本。
    expect(container.querySelector('h2')?.textContent).toMatch(/^\d+\.\d+\.\d+$/)
    expect(container.querySelectorAll('.mdm-heading').length).toBeGreaterThan(0)
    // 围栏代码块来自 CHANGELOG.md，渲染成 codeblock 卡片。
    expect(container.querySelectorAll('[data-codeblock]').length).toBeGreaterThan(0)
    expect(container.innerHTML).not.toContain('# @greypan/web-ui')
  })
})
