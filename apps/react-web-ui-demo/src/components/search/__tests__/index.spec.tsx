import { cleanup, render } from '@testing-library/react'
import { StrictMode, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { LocaleProvider } from '@/i18n/locale'

import { Search } from '../index'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: { children?: React.ReactNode; to: string; [key: string]: unknown }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  )
}))

function Host({ open, onOpenChange }: { open: boolean; onOpenChange: (next: boolean) => void }) {
  const controls = useRef<HTMLDivElement>(null)
  return (
    <LocaleProvider>
      <div ref={controls}>
        <Search open={open} onOpenChange={onOpenChange} controls={controls} />
      </div>
    </LocaleProvider>
  )
}

describe('React Search 组件', () => {
  afterEach(() => {
    cleanup()
  })

  it('StrictMode 重挂载后回调 ref 重新绑定 input，可聚焦并响应 Escape 收起', async () => {
    const onOpenChange = vi.fn<(next: boolean) => void>()
    const { container } = render(
      <StrictMode>
        <Host open={true} onOpenChange={onOpenChange} />
      </StrictMode>
    )

    const input = container.querySelector('web-ui-input') as HTMLElement | null
    expect(input).not.toBeNull()
    const focusSpy = vi.spyOn(input!, 'focus')

    await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(focusSpy).toHaveBeenCalled()

    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
