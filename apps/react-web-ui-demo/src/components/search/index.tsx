import { searchNavigation } from '@greypan/doc-demo-kit'
import { navigatePopoverLinks, type WebUiInput, type WebUiPopover } from '@greypan/web-ui'
import { lucideSearch } from '@greypan/web-ui/icons'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/i18n/locale'

const ESCAPE_KEY = 'Escape'
const ARROW_DOWN_KEY = 'ArrowDown'

export function Search({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { locale } = useLocale()
  const [query, setQuery] = useState('')
  const [displayQuery, setDisplayQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const results = useRef<HTMLDivElement>(null)
  const popover = useRef<WebUiPopover>(null)
  const input = useRef<WebUiInput>(null)
  // 壳页与组件导航的搜索全集在 kit（SHELL_NAV_PAGES + NAV_SECTIONS 的 zhName）。
  const matches = searchNavigation(displayQuery)
  const hasQuery = query.trim().length > 0

  useEffect(() => {
    const element = input.current
    if (!open || !element) return
    let cancelled = false
    void element.updateComplete.then(() => {
      if (!cancelled) element.focus()
    })
    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <div
      className="relative min-w-0"
      onBlur={event => {
        if ((event.target as HTMLElement).closest('web-ui-button')) return
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onOpenChange(false)
      }}
      onKeyDown={event => {
        const target = event.target as HTMLElement
        const links = [...(results.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])]
        if (event.key === ESCAPE_KEY) {
          event.preventDefault()
          event.stopPropagation()
          if (target.closest('a[href]')) {
            setPanelOpen(false)
            input.current?.focus()
          } else {
            onOpenChange(false)
          }
        } else if (event.key === ARROW_DOWN_KEY && target === input.current && !panelOpen && hasQuery) {
          event.preventDefault()
          setPanelOpen(true)
          requestAnimationFrame(() => {
            void popover.current?.updateComplete.then(() =>
              requestAnimationFrame(() => {
                if (document.activeElement === input.current)
                  results.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus()
              })
            )
          })
        } else if (input.current) {
          navigatePopoverLinks(event.nativeEvent, input.current, links)
        }
      }}
    >
      {!open ? (
        <web-ui-tooltip content="搜索" portal>
          <web-ui-button
            icon
            variant="glass"
            aria-label="搜索"
            onClick={() => {
              setPanelOpen(true)
              onOpenChange(true)
            }}
          >
            <web-ui-icon icon={lucideSearch} />
          </web-ui-button>
        </web-ui-tooltip>
      ) : (
        <web-ui-popover
          ref={popover}
          trigger="none"
          placement="bottom-end"
          open={panelOpen && hasQuery}
          className="demo-search-popover"
        >
          <web-ui-input
            slot="trigger"
            ref={input}
            value={query}
            clearable
            autocomplete="off"
            placeholder="搜索页面和组件"
            aria-label="搜索页面和组件"
            className="w-60 min-w-0 max-w-full [--wui-input-width:100%]"
            onInput={event => {
              setQuery(event.currentTarget.value)
              if (event.currentTarget.value.trim()) setDisplayQuery(event.currentTarget.value)
              setPanelOpen(true)
            }}
          >
            <web-ui-icon slot="prefix" icon={lucideSearch} />
          </web-ui-input>
          <div ref={results} className="demo-search-results" aria-label="搜索结果" aria-live="polite">
            {matches.length ? (
              matches.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  tabIndex={-1}
                  className="demo-search-link text-sm hover:bg-black/5 focus:bg-black/5 dark:hover:bg-white/10 dark:focus:bg-white/10"
                  onClick={event => {
                    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)
                      onOpenChange(false)
                  }}
                >
                  {locale === 'zh-CN' ? item.zh : item.en}
                </Link>
              ))
            ) : (
              <div className="demo-search-empty">
                <web-ui-empty title="没有匹配结果" />
              </div>
            )}
          </div>
        </web-ui-popover>
      )}
    </div>
  )
}
