import { searchNavigation } from '@greypan/doc-demo-kit'
import { navigatePopoverLinks, type WebUiInput, type WebUiPopover } from '@greypan/web-ui'
import { lucideSearch } from '@greypan/web-ui/icons'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { useExpandingField } from '@/hooks/useExpandingField'
import { useLocale } from '@/i18n/locale'

const ESCAPE_KEY = 'Escape'
const ARROW_DOWN_KEY = 'ArrowDown'

export function Search({
  open,
  onOpenChange,
  controls
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 头部里收纳搜索框与同级控件的容器；搜索上下文以它为准。 */
  controls: RefObject<HTMLElement | null>
}) {
  const { locale } = useLocale()
  const [query, setQuery] = useState('')
  const [displayQuery, setDisplayQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const results = useRef<HTMLDivElement>(null)
  const popover = useRef<WebUiPopover>(null)
  const input = useRef<WebUiInput>(null)
  /*
   * 展开/收起、焦点与 Escape 交给 useExpandingField：按在 controls 里（含主题/语言/动效
   * 选择器等同级控件）时不收起，按在容器外才收；簇内点击结束后把焦点交还输入框。
   */
  useExpandingField({ field: input, controls, active: open, close: () => onOpenChange(false) })
  // 壳页与组件导航的搜索全集在 kit（SHELL_NAV_PAGES + NAV_SECTIONS 的 zhName）。
  const matches = searchNavigation(displayQuery)
  const hasQuery = query.trim().length > 0

  useEffect(() => {
    const element = input.current
    if (!open || !element) return
    const controller = new AbortController()
    void element.updateComplete.then(() => {
      if (!controller.signal.aborted) element.focus()
    })
    return () => {
      controller.abort()
    }
  }, [open])

  return (
    <div
      className="relative min-w-0"
      onKeyDown={event => {
        const target = event.target as HTMLElement
        const links = [...(results.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])]
        if (event.key === ESCAPE_KEY) {
          // 搜索结果链接上的 Escape 只收起结果面板；输入框本体的 Escape 由 useExpandingField
          // 负责关闭整个搜索，这里不再重复处理。
          if (target.closest('a[href]')) {
            event.preventDefault()
            event.stopPropagation()
            setPanelOpen(false)
            input.current?.focus()
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
                  className="demo-search-link text-sm hover:bg-[#1b1b20]/5 focus:bg-[#1b1b20]/5 dark:hover:bg-white/10 dark:focus:bg-white/10"
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
