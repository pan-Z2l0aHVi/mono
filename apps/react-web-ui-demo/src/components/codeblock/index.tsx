import appScrollbarsOptions from '@greypan/app-scrollbars'
import {
  COPY_FEEDBACK_DURATION,
  createCopyFeedback,
  createThunkCache,
  codeFrameText,
  codeScrollbarsEvents,
  FLAVORS,
  FLAVOR_ICON_CLASS,
  FLAVOR_LABELS,
  FLAVOR_ICONS,
  flavorOf,
  isCodeCollapsible,
  PEEK_HEIGHT,
  PACKAGE_MANAGER_ICONS,
  resetCodeScroll,
  type CodeblockVariant,
  type DemoThunk,
  type Flavor
} from '@greypan/doc-demo-kit'
import type { MetaNode } from '@greypan/md-to-meta'
import {
  akarIconsCircleCheck,
  lucideChevronDown,
  lucideChevronUp,
  lucideCircleAlert,
  lucideCopy
} from '@greypan/web-ui/icons'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import { Suspense, lazy, useEffect, useId, useState, useSyncExternalStore, type ComponentType } from 'react'

// 本站框架既是切换器的第一项，也是打开页面时显示的源码。
const NATIVE_FLAVOR: Flavor = 'react'

/*
 * `load` 是生成器写进 meta 的字面 thunk，同一份 meta 模块里引用同一个函数，所以按函数身份缓存
 * 就能让 React.lazy 只建一次：重渲染与再进入页面都不会换掉组件身份、重置示例自己的状态。
 */
const demoOf = createThunkCache((load: DemoThunk) => lazy(load as () => Promise<{ default: ComponentType }>))

/*
 * 预览宿主：`Demo` 以 prop 进来，它的组件身份由 kit 的 `createThunkCache` 按 `load` 身份固定，
 * 重渲染与再进页面都复用同一个组件，示例自己的状态不会被重置。
 */
function CodePreview({ Demo }: { Demo: ComponentType }) {
  return (
    <Suspense fallback={null}>
      <Demo />
    </Suspense>
  )
}

interface CodeblockProps {
  /**
   * 同一份示例的围栏：相邻的 `tsx` 与 `vue` 围栏合成一张卡，工具条切换显示哪一份；单围栏只有一项。
   */
  nodes: readonly MetaNode[]
  /** 有 `load` 且允许预览时渲染真实组件；否则只显示源码。 */
  preview: boolean
  variants?: readonly CodeblockVariant[]
  switchLabel?: string
}

/**
 * 一条围栏：命中 `exec` 的围栏带 `load`，先渲染真实组件预览，再挂源码卡；其余只显示源码。
 * 源码来自 `node.content`（生成期的高亮 HTML），与 markdown 围栏逐字相同。
 *
 * 一卡两稿时预览始终跑本站框架：带 `load` 的那份与当前选中的源码无关。
 */
function Codeblock({ nodes, preview, variants, switchLabel }: CodeblockProps) {
  const panelId = useId()
  const [flavor, setFlavor] = useState<string>(variants?.[0]?.value ?? NATIVE_FLAVOR)
  const [expanded, setExpanded] = useState(false)
  /*
   * 复制反馈状态机在 kit（`createCopyFeedback`）：双通道剪贴板、成功/失败、定时回 idle 都在
   * 引擎里，这里只把它的 snapshot 接进 `useSyncExternalStore`。`readText` 在每次复制时按面板
   * 现取围栏原文（`useId` 的 id 对组件实例稳定，闭包捕获它不会过期）。
   */
  const [copy] = useState(() =>
    createCopyFeedback({
      readText: () => {
        const panel = document.getElementById(panelId)
        return panel ? codeFrameText(panel) : ''
      }
    })
  )
  useEffect(() => () => copy.dispose(), [copy])
  // getServerSnapshot 传同一份：初始 snapshot 是纯对象，静态渲染（更新日志页）不碰 DOM。
  const copySnapshot = useSyncExternalStore(copy.subscribe, copy.getSnapshot, copy.getSnapshot)
  const { status: copied, run: copyRun } = copySnapshot

  const active =
    variants?.find(item => item.value === flavor)?.node ??
    nodes.find(node => flavorOf(node.lang) === flavor) ??
    nodes[0]
  const loadable = nodes.find(node => node.load)

  const Demo = preview && loadable?.load ? demoOf(loadable.load) : null

  if (!active) return null

  const collapsible = isCodeCollapsible(active.content ?? '')

  function resetPanelScroll() {
    const panel = document.getElementById(panelId)
    if (panel) resetCodeScroll(panel)
  }

  // 换一份源码就回到顶部：两稿的行数不同，停在上次读到的位置会落到另一份的中段。
  function selectFlavor(value: string) {
    const next = variants ? variants.find(item => item.value === value)?.value : FLAVORS.find(item => item === value)
    if (!next || next === flavor) return
    setFlavor(next)
    resetPanelScroll()
  }

  function toggleExpanded() {
    const next = !expanded
    setExpanded(next)
    // 收起后代码区回到顶部，与从未展开时一致；否则再次展开会停在上次读到的位置。
    if (!next) resetPanelScroll()
  }

  const copyLabel = copied === 'copied' ? '已复制' : copied === 'failed' ? '复制失败' : '复制代码'
  const copyIcon = copied === 'failed' ? lucideCircleAlert : lucideCopy
  const copyAnnouncement = copied === 'idle' ? '' : copyLabel

  const codePanel = (
    <OverlayScrollbarsComponent
      slot="content"
      id={panelId}
      options={appScrollbarsOptions}
      events={codeScrollbarsEvents}
      className="max-h-[512px] overflow-auto rounded-b-[var(--codeblock-radius)] bg-(--wui-color-page) p-3 font-mono text-xs leading-6"
      data-code
    >
      {/* 生成期的高亮 HTML，不是运行时拼的用户输入。 */}
      <div dangerouslySetInnerHTML={{ __html: active.content ?? '' }} />
    </OverlayScrollbarsComponent>
  )

  return (
    <article
      className="flex flex-col gap-3 [--codeblock-radius:calc(var(--wui-radius-menu)_+_var(--wui-space-3))]"
      data-codeblock={active.lang || 'text'}
    >
      {/*
        预览区只是层级占位（`relative z-20`）：select / dropdown / autocomplete 不开 `portal` 时
        面板是宿主内的 `position: absolute`（`--wui-layer-inline-overlay` 只有 10），向下溢出预览区
        就会被工具条盖掉；抬到 20 让整块预览（含溢出的面板）画在代码卡之上。
      */}
      {Demo ? (
        <div className="relative z-20 flex flex-wrap items-center gap-3 px-4 py-8" data-codeblock-preview>
          <CodePreview Demo={Demo} />
        </div>
      ) : null}

      {/*
        `isolate` 让这张卡自己成一个 stacking context：工具条的 z-10 只在卡内比较，
        既压得住下方代码区，也不会越过页面 header（`--wui-layer-header` 也是 100，
        卡外比大小就会被后画的工具条盖住）。

        这一层**不铺底色**。`--wui-color-page` 的实色底和页面同色，肉眼看不出来，却是这一带
        唯一的一堵墙：工具条里向上溢出的东西（tooltip 气泡的投影）要跨过卡片上沿才摆得下，
        落到这块同色实底后面就被拦腰截断。
      */}
      <div className="isolate">
        {/*
          这一层只画边框和圆角，**不裁剪**：工具条里的控件才能把按压态画全。
          顶部圆角补在工具条这一层：外层不裁剪，工具条的白底会自己溢出到圆角之外。

          外框圆角按同心半径取：内圈小圆角（`--wui-radius-menu`）+ 卡片横向内边距
          （`--wui-space-3`），两圈曲率才贴合。
        */}
        <div className="rounded-[var(--codeblock-radius)] border border-(--wui-color-border)">
          {/*
            工具条左右两件对齐到同一条中线：切换器用组件默认高度（track 36px、内圈 28px），
            单围栏的语言标签做成同高的 36px 胶囊，两者都靠 `items-center`；横向 12px 与代码区一致。
          */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-[var(--codeblock-radius)] bg-(--wui-color-page) p-3 pb-0">
            {variants && variants.length > 1 ? (
              <web-ui-segmented
                value={flavor}
                variant="inset"
                aria-label={switchLabel}
                className="[--wui-font-size:12px] [--wui-segmented-trigger-px:6px]"
                onInput={event => selectFlavor(event.currentTarget.value)}
              >
                {variants.map(item => (
                  <web-ui-segmented-trigger key={item.value} value={item.value}>
                    <span className="flex items-center gap-1.5">
                      {PACKAGE_MANAGER_ICONS[item.value] && (
                        <web-ui-icon icon={PACKAGE_MANAGER_ICONS[item.value]} size={13} />
                      )}
                      {item.label}
                    </span>
                  </web-ui-segmented-trigger>
                ))}
              </web-ui-segmented>
            ) : nodes.length > 1 ? (
              <web-ui-segmented
                value={flavor}
                variant="inset"
                data-flavor-switch
                aria-label="示例代码框架"
                className="[--wui-font-size:12px] [--wui-segmented-trigger-px:10px]"
                onInput={event => selectFlavor(event.currentTarget.value)}
              >
                {FLAVORS.map(item => (
                  <web-ui-segmented-trigger key={item} value={item}>
                    <span className="flex items-center gap-1.5">
                      <web-ui-icon
                        icon={FLAVOR_ICONS[item]}
                        size={13}
                        className={FLAVOR_ICON_CLASS[item]}
                      ></web-ui-icon>
                      {FLAVOR_LABELS[item]}
                    </span>
                  </web-ui-segmented-trigger>
                ))}
              </web-ui-segmented>
            ) : (
              <span className="inline-flex h-9 min-w-[var(--wui-control-size,36px)] items-center justify-center rounded-full border border-(--wui-color-border) bg-(--wui-color-surface) px-2 font-mono text-[11px] leading-none tracking-wide text-(--wui-color-text-secondary) uppercase">
                {active.lang || 'text'}
              </span>
            )}

            <div className="flex items-center">
              <span className="sr-only" aria-live="polite">
                {copyAnnouncement}
              </span>
              <web-ui-button-group>
                <web-ui-tooltip content={copyLabel}>
                  <web-ui-button icon variant="ghost" data-copy aria-label={copyLabel} onClick={() => void copy.copy()}>
                    {/* 成功态才包进描边宿主：`web-ui-svg-draw-lines` 在 slot 内容稳定时自动播一次；
                      key 跟着每次复制递增，重复复制也会重新挂载并重播描边与 scale。 */}
                    {copied === 'copied' ? (
                      <web-ui-svg-draw-lines key={copyRun} className="demo-copy-pop" duration={COPY_FEEDBACK_DURATION}>
                        <web-ui-icon
                          icon={akarIconsCircleCheck}
                          size={15}
                          className="text-(--wui-color-success)"
                        ></web-ui-icon>
                      </web-ui-svg-draw-lines>
                    ) : (
                      <web-ui-icon
                        icon={copyIcon}
                        size={15}
                        className={copied === 'failed' ? 'text-(--wui-color-danger)' : ''}
                      ></web-ui-icon>
                    )}
                  </web-ui-button>
                </web-ui-tooltip>
                {collapsible ? (
                  <web-ui-tooltip content={expanded ? '收起代码' : '展开代码'}>
                    <web-ui-button
                      icon
                      variant="ghost"
                      data-toggle-code
                      aria-label={expanded ? '收起代码' : '展开代码'}
                      aria-expanded={expanded ? 'true' : 'false'}
                      aria-controls={panelId}
                      onClick={() => toggleExpanded()}
                    >
                      <web-ui-icon icon={expanded ? lucideChevronUp : lucideChevronDown} size={15}></web-ui-icon>
                    </web-ui-button>
                  </web-ui-tooltip>
                ) : null}
              </web-ui-button-group>
            </div>
          </div>

          {/*
            关闭态露出 128px：12px 上边距 + 4 行 24px + 第 5 行的 20px。末端渐隐/晕染带取
            peek 的 60%（76.8px），「下面还有内容」由一整段发虚说出来，而不是只把最后一行切一半。

            收起态这块露出的代码就是展开触发区（点哪一行都算），展开后它退化成一段可滚动的正文，
            点击不再改状态——否则读到一半想选中一个标识符，整块代码会当场收回去。

            只有超过 PEEK_LINES 的卡才挂折叠：更短的代码没有可裁掉的部分，渐隐只会盖住正文。
          */}
          {collapsible ? (
            <web-ui-collapse
              open={expanded}
              peek={`${PEEK_HEIGHT}px`}
              className="rounded-b-[var(--codeblock-radius)] bg-(--wui-color-page) [--wui-collapse-peek-edge-ratio:0.6]"
              onClick={() => {
                if (expanded) return
                toggleExpanded()
              }}
            >
              {codePanel}
            </web-ui-collapse>
          ) : (
            codePanel
          )}
        </div>
      </div>
    </article>
  )
}

export default Codeblock
