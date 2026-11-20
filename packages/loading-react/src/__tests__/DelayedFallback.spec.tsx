import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { DelayedFallback } from '../DelayedFallback'

describe('DelayedFallback', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the skeleton hidden during the delay and shows it afterward', async () => {
    vi.useFakeTimers()
    render(
      <DelayedFallback delayMs={100}>
        <span>Loading</span>
      </DelayedFallback>
    )

    expect(screen.queryByText('Loading')).toBeNull()
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByText('Loading')).toBeTruthy()
  })

  it('reserves minHeight even while the skeleton is hidden', () => {
    vi.useFakeTimers()
    const { container } = render(
      <DelayedFallback delayMs={100} minHeight={240}>
        <span>Loading</span>
      </DelayedFallback>
    )

    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.classList.contains('loading-delayed-fallback')).toBe(true)
    expect(wrapper.style.getPropertyValue('--loading-min-height')).toBe('240px')
    expect(wrapper).toBeTruthy()
    expect(screen.queryByText('Loading')).toBeNull()
  })

  it('shows immediately when delayMs is not positive', () => {
    vi.useFakeTimers()
    const { rerender } = render(<DelayedFallback delayMs={0}>Ready</DelayedFallback>)
    expect(screen.getByText('Ready')).toBeTruthy()

    rerender(<DelayedFallback delayMs={-1}>Also ready</DelayedFallback>)
    expect(screen.getByText('Also ready')).toBeTruthy()
  })

  it('clears its timer on unmount', async () => {
    vi.useFakeTimers()
    const { unmount } = render(<DelayedFallback delayMs={100}>Loading</DelayedFallback>)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.queryByText('Loading')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
})
