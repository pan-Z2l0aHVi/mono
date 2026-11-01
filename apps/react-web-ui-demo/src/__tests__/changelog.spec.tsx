import { cleanup, render } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { Changelog } from '../components/changelog'

let intersect: ((entries: IntersectionObserverEntry[]) => void) | undefined

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  intersect = undefined
})

describe('更新日志页', () => {
  it('从 CHANGELOG.md 分页渲染版本，并在底部自动加载下一批', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        root = null
        rootMargin = ''
        thresholds = []
        constructor(callback: IntersectionObserverCallback) {
          intersect = entries => callback(entries, this as unknown as IntersectionObserver)
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return []
        }
      }
    )

    const { container } = render(<Changelog />)
    const html = container.innerHTML

    expect(container.querySelector('h1')).toBeTruthy()
    expect(container.querySelector('.wui-glass')).toBeNull()
    expect(html).toContain('12.0.1')
    expect(html).toContain('mdc-heading')
    expect(html).not.toContain('# @greypan/web-ui')
    expect(container.querySelectorAll('[data-changelog-version]')).toHaveLength(8)

    act(() => intersect?.([{ isIntersecting: true } as IntersectionObserverEntry]))

    expect(container.querySelectorAll('[data-changelog-version]')).toHaveLength(16)
  })
})
