import { queryOptions } from '@tanstack/vue-query'

/** 模拟异步请求的可调参数：`?delay=<ms>` 拉长等待，`?fail=1` 让请求失败，供冒烟与回归使用。 */
export interface FakeFetchOptions {
  delay: number
  fail: boolean
}

function first(value: unknown): string | undefined {
  const item = Array.isArray(value) ? value[0] : value
  return typeof item === 'string' ? item : undefined
}

export function parseFakeFetchOptions(query: Record<string, unknown>): FakeFetchOptions {
  const delay = Number(first(query.delay))
  return {
    delay: Number.isFinite(delay) && delay > 0 ? Math.min(delay, 30_000) : 0,
    fail: first(query.fail) === '1'
  }
}

export interface ChangelogSummary {
  fetchedAt: number
}

async function fakeFetchSummary({ delay, fail }: FakeFetchOptions): Promise<ChangelogSummary> {
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
  if (fail) throw new Error('changelog summary request failed')
  return { fetchedAt: Date.now() }
}

export const changelogSummaryQuery = (options: FakeFetchOptions) =>
  queryOptions({
    queryKey: ['changelog', 'summary', options.delay, options.fail] as const,
    queryFn: () => fakeFetchSummary(options),
    staleTime: 30_000
  })
