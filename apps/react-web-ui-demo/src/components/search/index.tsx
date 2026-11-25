import { createSearchController } from '@greypan/doc-demo-kit'
import { navigatePopoverLinks, type WebUiInput, type WebUiPopover } from '@greypan/web-ui'
import { lucideSearch } from '@greypan/web-ui/icons'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

import { useLocale } from '@/i18n/locale'

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
  const results = useRef<HTMLDivElement>(null)
  const popover = useRef<WebUiPopover>(null)
  const input = useRef<WebUiInput>(null)

  const [controller] = useState(() =>
    createSearchController({
      onOpenChange: () => {},
      navigateLinks: navigatePopoverLinks
    })
  )

  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)

  useEffect(() => {
    controller.setOnOpenChange(onOpenChange)
  }, [controller, onOpenChange])

  useEffect(() => {
    controller.syncElements({
      controls: controls.current,
      input: open ? input.current : null,
      popover: open ? popover.current : null,
      results: open ? results.current : null
    })
    controller.syncOpen(open)
  }, [controller, controls, open])

  useEffect(() => () => controller.dispose(), [controller])

  return (
    <div className="relative min-w-0" onKeyDown={event => controller.handleKeydown(event.nativeEvent)}>
      {!open ? (
        <web-ui-tooltip content="搜索" portal>
          <web-ui-button icon variant="glass" aria-label="搜索" onClick={() => controller.openSearch()}>
            <web-ui-icon icon={lucideSearch} />
          </web-ui-button>
        </web-ui-tooltip>
      ) : (
        <web-ui-popover
          ref={popover}
          trigger="none"
          placement="bottom-end"
          open={snapshot.popoverOpen}
          className="demo-search-popover"
        >
          <web-ui-input
            slot="trigger"
            ref={input}
            value={snapshot.query}
            clearable
            autocomplete="off"
            placeholder="搜索页面和组件"
            aria-label="搜索页面和组件"
            className="w-60 min-w-0 max-w-full [--wui-input-width:100%]"
            onInput={event => controller.setQuery(event.currentTarget.value)}
          >
            <web-ui-icon slot="prefix" icon={lucideSearch} />
          </web-ui-input>
          <div ref={results} className="demo-search-results" aria-label="搜索结果" aria-live="polite">
            {snapshot.matches.length ? (
              snapshot.matches.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  tabIndex={-1}
                  className="demo-search-link text-sm hover:bg-[#1b1b20]/5 focus:bg-[#1b1b20]/5 dark:hover:bg-white/10 dark:focus:bg-white/10"
                  onClick={event => controller.handleResultClick(event.nativeEvent)}
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
