import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { Suspense } from 'react'

import changelogMeta from '@/generated/CHANGELOG.meta'
import { changelogReleaseChannelQuery, changelogSummaryQuery, parseFakeFetchOptions } from '@/queries/changelog'

import { MetaComp } from '../meta'

function ReleaseChannelBadge() {
  const { data } = useSuspenseQuery(changelogReleaseChannelQuery())
  return <span data-testid="changelog-channel">{data.channel}</span>
}

export function Changelog() {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const { data: summary, isPending } = useQuery(changelogSummaryQuery(parseFakeFetchOptions(search)))
  const syncedAt = summary ? new Date(summary.fetchedAt).toLocaleTimeString() : ''

  return (
    <section className="mdm-markdown mx-auto flex max-w-4xl flex-col gap-4 [&>*]:my-0">
      <p className="text-sm text-(--wui-color-text-secondary)" data-testid="changelog-sync" aria-live="polite">
        {isPending ? '正在同步更新状态…' : `已同步于 ${syncedAt}`}
        {' · '}
        <Suspense fallback={<span>…</span>}>
          <ReleaseChannelBadge />
        </Suspense>
      </p>
      <MetaComp nodes={changelogMeta} preview={false} />
    </section>
  )
}
