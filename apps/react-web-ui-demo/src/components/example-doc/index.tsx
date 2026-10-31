import appScrollbarsOptions from '@greypan/app-scrollbars'
import {
  akarIconsCircleCheck,
  lucideChevronDown,
  lucideChevronUp,
  lucideCircleAlert,
  lucideCopy
} from '@greypan/web-ui/icons'
import { OverlayScrollbars } from 'overlayscrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import { Suspense, useEffect, useRef, useState, type MouseEvent, type ComponentType } from 'react'

import { getDemo } from '@/i18n/examples'
import { useExampleDoc, useLocale } from '@/i18n/locale'

import { reactIcon, vueIcon } from './flavor-icons'

/**
 * 由示例文档 markdown 生成的页面主体：组件标题、简介、逐示例预览、双框架源码与 API 表。
 *
 * 数据全部来自 `packages/web-ui/docs/<name><suffix>.md`，按当前语种取生成产物：中文源在
 * `src/generated/zh-CN/`、英文译文在 `src/generated/en/`。每条示例按标题派生的 id 由生成器落成
 * `src/generated/<locale>/demos/<component>--<id>.tsx`，预览执行的字节与代码区显示的字节同源；
 * 标题两侧同文（英文专业术语），页面显示的也是它。
 *
 * 预览只运行当前站点框架；代码区始终提供 Vue / React 两份完整源码。
 */
type Flavor = 'react' | 'vue'

const FLAVOR_LABELS: Record<Flavor, string> = { vue: 'Vue', react: 'React' }
const FLAVOR_ICONS = { vue: vueIcon, react: reactIcon } as const
// 只有凹进来的 React 标要走宿主取色（形状画成 currentColor，见 flavor-icons.ts）；Vue 的官方双色
// 写在 body 的字面量里，缺省即可。类名放这里而不是 flavor-icons.ts，是让 Tailwind 在组件源文件里扫到。
const FLAVOR_ICON_CLASS: Partial<Record<Flavor, string>> = { react: 'text-[#087eae] dark:text-[#61dafb]' }

// 复制成功的描边与 scale 反馈共用同一时长；CSS 里的 `demo-copy-pop` 要同步。
const COPY_FEEDBACK_DURATION = 500

const ABBREVIATIONS: Record<string, string> = { api: 'API', svg: 'SVG', ui: 'UI' }

// API 是接口术语，中英两版都保留英文。
const API_HEADING = 'API'

// 「没有默认值」在语料里落成 em dash 占位符，它是散文不是字面量，所以即便落在值列也不实行内代码。
const NO_DEFAULT_VALUE = '—'

function displayNameOf(component: string) {
  return component
    .split('-')
    .map(part => ABBREVIATIONS[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/*
 * 代码区由 OverlayScrollbars 接管后，`[data-code]` 这一层成了 `overflow: hidden` 的 host，
 * 真正滚动的是实例的 viewport 元素，所以滚动复位必须打在它上面。
 * 实例还没建好（首帧、jsdom）时退回 host 本身，此时 host 上的 `overflow-auto` 就是它自身的原生滚动。
 */
function resetCodeScroll(panel: HTMLElement) {
  const scroller = OverlayScrollbars(panel)?.elements().viewport ?? panel
  scroller.scrollTop = 0
  scroller.scrollLeft = 0
}

/*
 * 同一个理由也管焦点：库把 target 变成 `overflow: hidden` 的 host 之后，target 上的 tabindex 不再
 * 带来键盘滚动。textarea 场景库自己会把 tabindex 从 target 搬到 viewport，div 场景不会，所以在这里
 * 补上同一步——焦点和方向键都落在真正的滚动元素上。
 */
const codeScrollbarsEvents = {
  initialized: (instance: OverlayScrollbars) => {
    instance.elements().viewport.tabIndex = 0
  }
}

interface TableScrollbarEvents {
  initialized: (instance: OverlayScrollbars) => void
  updated: (instance: OverlayScrollbars) => void
}

const tableScrollbarsEventCache = new Map<string, TableScrollbarEvents>()

function decorateTableScrollViewport(instance: OverlayScrollbars, headingId: string) {
  const viewport = instance.elements().viewport
  viewport.tabIndex = 0
  viewport.setAttribute('role', 'region')
  viewport.setAttribute('aria-labelledby', headingId)
}

function tableScrollbarsEvents(headingId: string): TableScrollbarEvents {
  const cached = tableScrollbarsEventCache.get(headingId)
  if (cached) return cached
  const events = {
    initialized: (instance: OverlayScrollbars) => decorateTableScrollViewport(instance, headingId),
    updated: (instance: OverlayScrollbars) => decorateTableScrollViewport(instance, headingId)
  }
  tableScrollbarsEventCache.set(headingId, events)
  return events
}

function apiHeadingId(component: string, key: string) {
  return `${component}-api-${key}`
}

interface ExampleDocProps {
  component: string
  /** 预览与默认代码 tab 使用的框架；默认 React 站。 */
  nativeFlavor?: Flavor
  /** 锚点映射测试只检查预览容器时，跳过文档主体与演示组件。 */
  previewAnchorsOnly?: boolean
  /** 主文档用 primary，多文档页的后续文档用 secondary；不传时不渲染组件标题。 */
  level?: 'primary' | 'secondary'
}

function ExamplePreview({
  Demo,
  demoKey,
  renderDemoComponent = true
}: {
  Demo: ComponentType | undefined
  demoKey: string | null | undefined
  renderDemoComponent?: boolean
}) {
  if (!Demo || !demoKey) return null

  return (
    <div className="relative z-20 flex flex-wrap items-center gap-3 px-4 py-8" data-sample-preview={demoKey}>
      {renderDemoComponent ? (
        <Suspense fallback={null}>
          <Demo />
        </Suspense>
      ) : null}
    </div>
  )
}

function ExampleDoc({ component, nativeFlavor = 'react', previewAnchorsOnly = false, level }: ExampleDocProps) {
  const doc = useExampleDoc(component)
  const { locale } = useLocale()
  const [activeFlavors, setActiveFlavors] = useState<Record<string, Flavor>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<{ key: string; ok: boolean } | null>(null)
  // 每次复制都换 key，让成功态的描边与 scale 动画重新挂载、各播一次。
  const [copyRun, setCopyRun] = useState(0)
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

  if (previewAnchorsOnly) {
    return (
      <section data-example-doc={doc.component}>
        {doc.samples.map((sample, index) => {
          const Demo = sample.demoKey ? getDemo(locale, component, sample.demoKey) : undefined
          return (
            <ExamplePreview
              key={sampleKey(sample, index)}
              Demo={Demo}
              demoKey={sample.demoKey}
              renderDemoComponent={false}
            />
          )
        })}
      </section>
    )
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
    if (panel) resetCodeScroll(panel)
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
    const pre = event.currentTarget.closest('[data-sample]')?.querySelector<HTMLElement>('[data-code] pre')
    // 行号槽是生成器往每行前面塞的文本，剪贴板要的是围栏原文，所以克隆一份摘掉它再取文本。
    const frame = pre?.cloneNode(true) as HTMLElement | undefined
    frame?.querySelectorAll('.line-number').forEach(node => node.remove())
    const text = frame?.textContent ?? ''
    setCopied({ key, ok: text !== '' && (await writeClipboard(text)) })
    setCopyRun(run => run + 1)
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
    // 根节点这条字面量 aria-label 同时是 wuchale 的锚点：组件作用域里没有其它文案时，它才会在
    // 组件顶部生成运行时初始化；否则嵌套标题会引用到回调作用域里那个未定义的 `_w_runtime_`。
    <section className="mt-10 flex flex-col gap-8" aria-label="示例文档" data-example-doc={doc.component}>
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

        {doc.samples.map(sample => {
          const key = sample.id
          const flavor = activeFlavor(key)
          const Demo = getDemo(locale, component, sample.demoKey)
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

                预览区只是个层级占位（`relative z-20`）：select / dropdown / autocomplete 不开
                `portal` 时面板是宿主内的 `position: absolute`（`--wui-layer-inline-overlay` 只有 1），
                向下溢出预览区就会被工具条盖掉；抬到 20 让整块预览（含溢出的面板）画在代码卡之上。
                边框与圆角只包住下方「工具条 + 代码区」。

                这一层**不铺底色**。`--wui-color-page` 的实色底和页面同色，肉眼看不出来，却是这一带
                唯一的一堵墙：工具条里向上溢出的东西（tooltip 气泡、segmented 按压态的上方投影）
                要跨过卡片上沿 17px 才摆得下，落到这块同色实底后面就被拦腰截断——看着像被裁剪，
                实际整条祖先链上连一个 `overflow: hidden` 都没有。
              */}
              <div className="isolate" data-current-flavor={flavor}>
                <ExamplePreview Demo={Demo} demoKey={sample.demoKey} />

                {/*
                  这一层只画边框和圆角，**不裁剪**：工具条里的 segmented 才能把按压态画全。
                  按压/拖拽态的 indicator 会 scale(1.5) 并带一枚 `0 2px 20px` 的柔投影，
                  横向需要约 16px（放大外扩）+ 22px（投影可见半径）的余量，而工具条只留了
                  `px-4`；在这里裁就会把药丸的左半圆和左侧投影一起切平，看着像「长按时阴影
                  被吃掉一截」。
                */}
                <div className="rounded-4xl border border-(--wui-color-border)">
                  {/* 工具条只摆控件，不接管开合：展开由右侧 chevron 按钮和收起态那块代码预览负责。 */}
                  {/* `relative z-10` 把工具条抬到下方代码区之上：segmented 的投影朝下溢出（凹变种是
                      track 的常驻外投影，凸变种是 indicator 的柔投影），否则后绘制的折叠区会把阴影盖掉
                      一截。这一层只在卡内比较，见上方 `isolate`。
                      顶部圆角补在这一层：外层不裁剪，工具条的白底会自己溢出到圆角之外。 */}
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-4xl bg-(--wui-color-page) px-4 pt-4 pb-2">
                    <web-ui-segmented
                      value={flavor}
                      variant="inset"
                      data-flavor-switch
                      aria-label="示例代码框架"
                      onInput={event => selectFlavor(key, event.currentTarget.value)}
                    >
                      {flavors.map(item => (
                        <web-ui-segmented-trigger key={item} value={item}>
                          <span className="flex items-center gap-1.5">
                            <web-ui-icon
                              icon={FLAVOR_ICONS[item]}
                              size={14}
                              className={FLAVOR_ICON_CLASS[item]}
                            ></web-ui-icon>
                            {FLAVOR_LABELS[item]}
                          </span>
                        </web-ui-segmented-trigger>
                      ))}
                    </web-ui-segmented>

                    <div className="flex items-center">
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
                            {/* 成功态才包进描边宿主：`web-ui-svg-draw-lines` 在 slot 内容稳定时自动播一次；
                              key 跟着每次复制递增，重复复制也会重新挂载并重播描边与 scale。 */}
                            {copyState(key) === 'copied' ? (
                              <web-ui-svg-draw-lines
                                key={copyRun}
                                className="demo-copy-pop"
                                duration={COPY_FEEDBACK_DURATION}
                              >
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

                    收起态这块露出的代码就是展开触发区（点哪一行都算），展开后它退化成一段可滚动的正文，
                    点击不再改状态——否则读到一半想选中一个标识符，整块代码会当场收回去。
                  */}
                  {/*
                    底部圆角不另起一层裁剪，而是骑在**本来就会裁自己内容**的两层上：
                    collapse 宿主（画白底那层）和滚动容器（OverlayScrollbars 会把 host 改成
                    `overflow: hidden`，圆角随之成为它自己的裁剪形状）。再套一层 `overflow: hidden`
                    只为圆角，等于给以后所有浮层/阴影埋一颗雷——被裁的人永远找不到是哪一层干的。

                    收起态的底线不是圆角所在的那条边：那里是 peek 的直切，由 collapse 的渐隐带
                    收尾（末端 alpha 归零），落不到圆角上。
                  */}
                  <web-ui-collapse
                    open={isExpanded}
                    peek="128px"
                    className="rounded-b-4xl bg-(--wui-color-page) [--wui-collapse-peek-edge-ratio:0.6]"
                    onClick={event => {
                      if (isExpanded) return
                      toggleExpanded(event, key)
                    }}
                  >
                    <div slot="content">
                      <OverlayScrollbarsComponent
                        id={panelId(key)}
                        options={appScrollbarsOptions}
                        events={codeScrollbarsEvents}
                        className="max-h-[32rem] overflow-auto rounded-b-4xl bg-(--wui-color-page) px-4 pt-3 pb-4 font-mono text-xs leading-6"
                        data-code
                      >
                        <div dangerouslySetInnerHTML={{ __html: sample.html[flavor] }} />
                      </OverlayScrollbarsComponent>
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
          <SectionHeading className="mdc-heading">{API_HEADING}</SectionHeading>

          {/* API 小节有两型：登记过表头的是表，列形状完全由生成的 columns 决定；其余是散文。
              `.mdc-markdown` 也挂在这一层：散文与表格共用同一套 Notion 标签样式。 */}
          {doc.api.map(section => (
            <div className="mdc-markdown flex flex-col gap-3" data-example-api={section.key} key={section.key}>
              <SampleHeading id={apiHeadingId(component, section.key)} className="mdc-heading">
                {section.title}
              </SampleHeading>
              {section.kind === 'prose' ? (
                // 散文正文是生成器渲染好的 HTML 片段，不是运行时拼的用户输入。
                <div dangerouslySetInnerHTML={{ __html: section.html }} />
              ) : (
                <OverlayScrollbarsComponent
                  options={appScrollbarsOptions}
                  events={tableScrollbarsEvents(apiHeadingId(component, section.key))}
                  className="overflow-x-auto"
                  data-api-table-scroll
                >
                  <table className="min-w-[36rem]">
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
                            ) : column.kind === 'code' && row[index] !== NO_DEFAULT_VALUE ? (
                              // 值列（类型 / 默认值）由生成器标成 'code'：它们是字面量，不是散文。
                              <td key={column.title}>
                                <code>{row[index]}</code>
                              </td>
                            ) : (
                              <td key={column.title}>{row[index]}</td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </OverlayScrollbarsComponent>
              )}
            </div>
          ))}
        </section>
      ) : null}
    </section>
  )
}

export default ExampleDoc
