import {
  akarIconsCircleCheck,
  lucideChevronDown,
  lucideChevronUp,
  lucideCircleAlert,
  lucideCopy
} from '@greypan/web-ui/icons'
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type MouseEvent } from 'react'

import { exampleDocs } from '@/generated/examples'

import { reactIcon, vueIcon } from './flavor-icons'

/**
 * 由示例文档 markdown 生成的页面主体：组件标题、简介、逐示例预览、双框架源码与 API 表。
 *
 * 数据全部来自 `packages/web-ui/docs/<name>.md`。带 `{#id}` 锚点的示例由生成器落成
 * `src/generated/demos/<component>--<id>.tsx`，预览执行的字节与代码区显示的字节同源；
 * 没有锚点的语料只展示代码。
 *
 * 预览只运行当前站点框架；代码区始终提供 Vue / React 两份完整源码。
 */
const demoModules = import.meta.glob<{ default: ComponentType }>('../../generated/demos/*.tsx')
const DEMO_PREFIX = '../../generated/demos/'

// lazy 组件在模块作用域建一次：在 render 里调 lazy() 每帧换一个组件身份，交互中途的状态会丢失。
const demoComponents = new Map(
  Object.entries(demoModules).map(([file, load]) => [file.slice(DEMO_PREFIX.length, -'.tsx'.length), lazy(load)])
)

type Flavor = 'react' | 'vue'

const FLAVOR_LABELS: Record<Flavor, string> = { vue: 'Vue', react: 'React' }
const FLAVOR_ICONS = { vue: vueIcon, react: reactIcon } as const

const ABBREVIATIONS: Record<string, string> = { api: 'API', svg: 'SVG', ui: 'UI' }

function displayNameOf(component: string) {
  return component
    .split('-')
    .map(part => ABBREVIATIONS[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

interface ExampleDocProps {
  component: string
  /** 预览与默认代码 tab 使用的框架；默认 React 站。 */
  nativeFlavor?: Flavor
  /** 主文档用 primary，多文档页的后续文档用 secondary；不传时不渲染组件标题。 */
  level?: 'primary' | 'secondary'
}

function ExampleDoc({ component, nativeFlavor = 'react', level }: ExampleDocProps) {
  const doc = exampleDocs.find(candidate => candidate.component === component)
  const [activeFlavors, setActiveFlavors] = useState<Record<string, Flavor>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<{ key: string; ok: boolean } | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  if (!doc) return null

  // 本站框架在前：segmented 的第一项就是这份代码默认展示的运行时。
  const flavors: Flavor[] = nativeFlavor === 'vue' ? ['vue', 'react'] : ['react', 'vue']

  const sectionHeading = (level === 'secondary' ? 'h3' : 'h2') as 'h2' | 'h3'
  const sampleHeading = (level === 'secondary' ? 'h4' : 'h3') as 'h3' | 'h4'
  const SectionHeading = sectionHeading
  const SampleHeading = sampleHeading

  function sampleKey(sample: { id: string | null }, index: number) {
    return sample.id ?? `sample-${index}`
  }

  function activeFlavor(key: string): Flavor {
    return activeFlavors[key] ?? nativeFlavor
  }

  function panelId(key: string) {
    return `${component}-${key}-panel`
  }

  function selectFlavor(key: string, value: string) {
    if (value === 'vue' || value === 'react') {
      setActiveFlavors(current => ({ ...current, [key]: value }))
    }
  }

  function toggleExpanded(event: MouseEvent<HTMLElement>, key: string) {
    const next = !(expanded[key] ?? false)
    setExpanded(current => ({ ...current, [key]: next }))
    if (next) return

    // 收起后代码区回到顶部，与从未展开时一致；否则再次展开会停在上次读到的位置。
    const panel = event.currentTarget.closest('[data-sample]')?.querySelector<HTMLElement>('[data-code]')
    if (panel) {
      panel.scrollTop = 0
      panel.scrollLeft = 0
    }
  }

  /*
   * 剪贴板是双通道的：安全上下文且有焦点时走 Async Clipboard API；非安全上下文、
   * 文档失焦或权限被拒时它会直接抛，落到 textarea + execCommand 的同步通道。
   */
  async function writeClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      // 继续走兜底通道。
    }

    const active = document.activeElement
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '-9999px'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()

    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }

    textarea.remove()
    if (active instanceof HTMLElement) active.focus()
    return ok
  }

  async function copyCode(event: MouseEvent<HTMLElement>, key: string) {
    const text = event.currentTarget.closest('[data-sample]')?.querySelector('[data-code] pre')?.textContent ?? ''
    setCopied({ key, ok: text !== '' && (await writeClipboard(text)) })
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(null), 1600)
  }

  function copyState(key: string): 'idle' | 'copied' | 'failed' {
    if (copied?.key !== key) return 'idle'
    return copied.ok ? 'copied' : 'failed'
  }

  function copyLabel(key: string) {
    const state = copyState(key)
    return state === 'copied' ? '已复制' : state === 'failed' ? '复制失败' : '复制代码'
  }

  function copyIcon(key: string) {
    return copyState(key) === 'failed' ? lucideCircleAlert : lucideCopy
  }

  function copyAnnouncement(key: string) {
    return copyState(key) === 'idle' ? '' : copyLabel(key)
  }

  return (
    <section className="mt-10 flex flex-col gap-8" data-example-doc={doc.component}>
      <header className="flex flex-col gap-2">
        {level === 'primary' ? (
          <h1 className="mdc-heading">{displayNameOf(component)}</h1>
        ) : level === 'secondary' ? (
          <h2 className="mdc-heading">{displayNameOf(component)}</h2>
        ) : null}
        {/* intro 是生成器把 markdown 渲染成的 HTML 片段，不是运行时拼的用户输入。 */}
        <div className="mdc-markdown" data-example-intro dangerouslySetInnerHTML={{ __html: doc.introHtml }} />
      </header>

      <section className="flex flex-col gap-6">
        <SectionHeading className="mdc-heading">示例</SectionHeading>

        {doc.samples.map((sample, index) => {
          const key = sampleKey(sample, index)
          const flavor = activeFlavor(key)
          const Demo = sample.demoKey ? demoComponents.get(`${component}--${sample.demoKey}`) : undefined
          const isExpanded = expanded[key] ?? false
          return (
            <article className="flex flex-col gap-3" data-sample={sample.title} key={key}>
              <SampleHeading className="mdc-heading">{sample.title}</SampleHeading>
              {/* 说明也是生成器渲染好的 HTML 片段，不是运行时拼的用户输入。 */}
              <div
                className="mdc-markdown mdc-markdown-secondary"
                dangerouslySetInnerHTML={{ __html: sample.descriptionHtml }}
              />

              {/*
                `isolate` 让这张卡自己成一个 stacking context：工具条的 z-10 只在卡内比较，
                既压得住下方代码区，也不会越过页面 header（`--wui-layer-header` 也是 10，
                卡外比大小就会被后画的工具条盖住）。
                预览区 z-20 压过工具条：select / dropdown / autocomplete 不开 `portal` 时面板是
                宿主内的 `position: absolute`（`--wui-layer-inline-overlay` 只有 1），向下溢出预览区
                就会被工具条盖掉；抬到 20 让整块预览（含溢出的面板）画在代码卡之上。
                预览区不画边框、直接铺在页面上；边框与圆角只包住下方「工具条 + 代码区」。
              */}
              <div className="isolate" data-current-flavor={flavor}>
                {Demo ? (
                  <div
                    className="relative z-20 flex flex-wrap items-center gap-3 bg-(--wui-color-page) px-4 py-8"
                    data-sample-preview={sample.demoKey ?? undefined}
                  >
                    <Suspense fallback={null}>
                      <Demo />
                    </Suspense>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-4xl border border-(--wui-color-border)">
                  {/* 整条工具条都是展开触发区；内部控件各自 stop，点它们不会顺带开合代码。 */}
                  {/* `relative z-10` 把工具条抬到下方代码区之上：segmented 长按时投影会向下溢出，
                      否则后绘制的折叠区会把阴影盖掉一截。这一层只在卡内比较，见上方 `isolate`。 */}
                  <div
                    className="relative z-10 flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-(--wui-color-page) px-4 pt-4 pb-2"
                    onClick={event => toggleExpanded(event, key)}
                  >
                    <web-ui-segmented
                      value={flavor}
                      variant="raised"
                      data-flavor-switch
                      aria-label="示例代码框架"
                      onClick={event => event.stopPropagation()}
                      onInput={event => selectFlavor(key, event.currentTarget.value)}
                    >
                      {flavors.map(item => (
                        <web-ui-segmented-trigger key={item} value={item}>
                          <span className="flex items-center gap-1.5">
                            <web-ui-icon icon={FLAVOR_ICONS[item]} size={14}></web-ui-icon>
                            {FLAVOR_LABELS[item]}
                          </span>
                        </web-ui-segmented-trigger>
                      ))}
                    </web-ui-segmented>

                    <div className="flex items-center" onClick={event => event.stopPropagation()}>
                      <span className="sr-only" aria-live="polite">
                        {copyAnnouncement(key)}
                      </span>
                      <web-ui-button-group>
                        <web-ui-tooltip content={copyLabel(key)}>
                          <web-ui-button
                            icon
                            variant="ghost"
                            data-copy
                            aria-label={copyLabel(key)}
                            onClick={event => void copyCode(event, key)}
                          >
                            {/* 成功态才包进描边宿主：`web-ui-svg-draw-lines` 在 slot 内容稳定时自动播一次，
                              所以每次复制都会重新画出勾与圆，而不是淡入一张现成的图。 */}
                            {copyState(key) === 'copied' ? (
                              <web-ui-svg-draw-lines duration={300}>
                                <web-ui-icon
                                  icon={akarIconsCircleCheck}
                                  size={15}
                                  className="text-(--wui-color-success)"
                                ></web-ui-icon>
                              </web-ui-svg-draw-lines>
                            ) : (
                              <web-ui-icon
                                icon={copyIcon(key)}
                                size={15}
                                className={copyState(key) === 'failed' ? 'text-(--wui-color-danger)' : ''}
                              ></web-ui-icon>
                            )}
                          </web-ui-button>
                        </web-ui-tooltip>
                        <web-ui-tooltip content={isExpanded ? '收起代码' : '展开代码'}>
                          <web-ui-button
                            icon
                            variant="ghost"
                            data-toggle-code
                            aria-label={isExpanded ? '收起代码' : '展开代码'}
                            aria-expanded={isExpanded ? 'true' : 'false'}
                            aria-controls={panelId(key)}
                            onClick={event => toggleExpanded(event, key)}
                          >
                            <web-ui-icon
                              icon={isExpanded ? lucideChevronUp : lucideChevronDown}
                              size={15}
                            ></web-ui-icon>
                          </web-ui-button>
                        </web-ui-tooltip>
                      </web-ui-button-group>
                    </div>
                  </div>

                  {/*
                  关闭态露出 128px：12px 上边距 + 4 行 24px + 第 5 行的 20px。末端渐隐/晕染带取
                  peek 的 60%（76.8px），「下面还有内容」由一整段发虚说出来，而不是只把最后一行切一半。
                  这个比例的前提是 128px 还没顶到晕染带上限 `--wui-collapse-peek-edge-max`（112px）：
                  peek 抬高到 187px 以上，带子会被上限掐住、遮挡比例跌破 60%。
                */}
                  <web-ui-collapse
                    open={isExpanded}
                    peek="128px"
                    className="bg-(--wui-color-page) [--wui-collapse-peek-edge-ratio:0.6]"
                  >
                    <div slot="content">
                      <div
                        id={panelId(key)}
                        className="max-h-[32rem] overflow-auto bg-(--wui-color-page) px-4 pt-3 pb-4 font-mono text-xs leading-6"
                        data-code
                        tabIndex={0}
                        dangerouslySetInnerHTML={{ __html: sample.html[flavor] }}
                      />
                    </div>
                  </web-ui-collapse>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      {doc.api.length > 0 ? (
        <section className="flex flex-col gap-6">
          <SectionHeading className="mdc-heading">API</SectionHeading>

          {/* API 小节有两型：登记过表头的是表，列形状完全由生成的 columns 决定；其余是散文。
              `.mdc-markdown` 也挂在这一层：散文与表格共用同一套 Notion 标签样式。 */}
          {doc.api.map(section => (
            <div className="mdc-markdown flex flex-col gap-3" data-example-api={section.key} key={section.key}>
              <SampleHeading className="mdc-heading">{section.title}</SampleHeading>
              {section.kind === 'prose' ? (
                // 散文正文是生成器渲染好的 HTML 片段，不是运行时拼的用户输入。
                <div dangerouslySetInnerHTML={{ __html: section.html }} />
              ) : (
                <table>
                  <thead>
                    <tr>
                      {section.columns.map(column => (
                        <th key={column.title}>{column.title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map(row => (
                      <tr key={row[0]}>
                        {section.columns.map((column, index) =>
                          column.kind === 'html' ? (
                            <td key={column.title} dangerouslySetInnerHTML={{ __html: row[index] ?? '' }} />
                          ) : (
                            <td key={column.title}>{row[index]}</td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>
      ) : null}
    </section>
  )
}

export default ExampleDoc
