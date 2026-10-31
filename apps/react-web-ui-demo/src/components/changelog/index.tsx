import { markdownToHtml } from '@greypan/md-to-comp/markdown'
import { useEffect, useRef, useState } from 'react'

import changelogSource from '../../../../../packages/web-ui/CHANGELOG.md?raw'

const VERSION_PAGE_SIZE = 8

interface ChangelogVersion {
  version: string
  html: string
}

function renderMarkdown(markdown: string): string {
  return markdownToHtml(markdown).replace(/<(h[1-6])>/g, '<$1 class="mdc-heading">')
}

function splitVersions(source: string): ChangelogVersion[] {
  return source
    .replace(/^# [^\n]*\n+/, '')
    .split(/\n(?=## )/)
    .filter(block => block.trim())
    .map(block => ({
      version: block.match(/^##\s+([^\n]+)/)?.[1] ?? '',
      html: renderMarkdown(block)
    }))
}

const versions = splitVersions(changelogSource)

export function Changelog() {
  const [visibleCount, setVisibleCount] = useState(VERSION_PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const visibleVersions = versions.slice(0, visibleCount)

  useEffect(() => {
    if (visibleCount >= versions.length) return
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        setVisibleCount(count => Math.min(count + VERSION_PAGE_SIZE, versions.length))
      },
      { rootMargin: '0px 0px 400px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount])

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-10">
      <header>
        <h1 className="m-0 text-2xl font-semibold">更新日志</h1>
        <p className="mt-2 text-sm text-(--wui-color-text-secondary)">组件库各版本的变更记录。</p>
      </header>
      {visibleVersions.map(entry => (
        <section
          key={entry.version}
          className="mdc-markdown flex flex-col gap-4 [&>*]:my-0 [contain-intrinsic-size:auto_600px] [content-visibility:auto]"
          data-changelog-version={entry.version}
          dangerouslySetInnerHTML={{ __html: entry.html }}
        />
      ))}
      {visibleCount < versions.length ? <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" /> : null}
    </article>
  )
}
