import { QueryClient, QueryClientProvider, useSuspenseQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { ContentBoundary } from '../ContentBoundary'

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 }
    }
  })
}

function QueryContent({ queryFn }: { queryFn: () => Promise<string> }) {
  const { data } = useSuspenseQuery({ queryKey: ['content'], queryFn })
  return <div>{data}</div>
}

describe('ContentBoundary', () => {
  afterEach(() => vi.useRealTimers())

  it('applies the configured height to the error card', async () => {
    const queryFn = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('failure'))
    render(
      <QueryClientProvider client={createClient()}>
        <ContentBoundary minHeight={400} skeleton={null}>
          <QueryContent queryFn={queryFn} />
        </ContentBoundary>
      </QueryClientProvider>
    )
    expect((await screen.findByRole('alert')).style.getPropertyValue('--loading-min-height')).toBe('400px')
  })
  it('delays the skeleton for a slow request', async () => {
    vi.useFakeTimers()
    const queryFn = vi.fn<() => Promise<string>>(() => new Promise<string>(() => {}))
    render(
      <QueryClientProvider client={createClient()}>
        <ContentBoundary delayMs={30} skeleton={<span>Skeleton</span>}>
          <QueryContent queryFn={queryFn} />
        </ContentBoundary>
      </QueryClientProvider>
    )

    expect(screen.queryByText('Skeleton')).toBeNull()
    await act(async () => {
      vi.advanceTimersByTime(30)
    })
    expect(screen.getByText('Skeleton')).toBeTruthy()
  })

  it('shows the default error card when the request rejects', async () => {
    const queryFn = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('request failed'))
    render(
      <QueryClientProvider client={createClient()}>
        <ContentBoundary skeleton={<span>Skeleton</span>}>
          <QueryContent queryFn={queryFn} />
        </ContentBoundary>
      </QueryClientProvider>
    )

    expect((await screen.findByRole('alert')).style.getPropertyValue('--loading-min-height')).toBe('160px')
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('retries the query successfully after the error boundary resets query errors', async () => {
    const queryFn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('first attempt failed'))
      .mockResolvedValueOnce('Loaded after retry')
    render(
      <QueryClientProvider client={createClient()}>
        <ContentBoundary skeleton={<span>Skeleton</span>}>
          <QueryContent queryFn={queryFn} />
        </ContentBoundary>
      </QueryClientProvider>
    )

    fireEvent.click(await screen.findByRole('button', { name: '重新加载' }))
    expect(await screen.findByText('Loaded after retry')).toBeTruthy()
    expect(queryFn).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
