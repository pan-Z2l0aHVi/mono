import appScrollbarsOptions from '@greypan/app-scrollbars'
import {
  createCodeblockController,
  createThunkCache,
  codeScrollbarsEvents,
  FLAVORS,
  FLAVOR_ICON_CLASS,
  FLAVOR_LABELS,
  FLAVOR_ICONS,
  PACKAGE_MANAGER_ICONS,
  PEEK_HEIGHT,
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

import { PressDrawIcon } from '../PressDrawIcon'

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
 * 状态机（激活节点回退链、flavor / 折叠的滚动复位不变量、复制反馈）在 kit 的
 * `createCodeblockController` 里；这里只把快照接进 React 与把事件交回控制器。
 */
function Codeblock({ nodes, preview, variants, switchLabel }: CodeblockProps) {
  const panelId = useId()
  const [controller] = useState(() =>
    createCodeblockController({
      nodes,
      variants,
      nativeFlavor: NATIVE_FLAVOR,
      getPanel: () => document.getElementById(panelId)
    })
  )
  // 文档快照换引用时同步输入；不发布，本次渲染自己会读到新快照。
  controller.setInputs({ nodes, variants })
  useEffect(() => () => controller.dispose(), [controller])
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const { flavor, expanded, active, collapsible, preview: previewNode, copy: copySnapshot } = snapshot
  const { status: copied } = copySnapshot

  const Demo = preview && previewNode?.load ? demoOf(previewNode.load) : null

  if (!active) return null

  const copyLabel = copied === 'copied' ? '已复制' : copied === 'failed' ? '复制失败' : '复制代码'
  const copyIcon = copied === 'failed' ? lucideCircleAlert : lucideCopy
  const copyAnnouncement = copied === 'idle' ? '' : copyLabel

  const codePanel = (
    <OverlayScrollbarsComponent
      slot="content"
      id={panelId}
      options={appScrollbarsOptions}
      events={codeScrollbarsEvents}
      className="overflow-x-auto rounded-b-[var(--codeblock-radius)] bg-(--wui-color-page) p-3 pt-0 font-mono text-xs leading-6"
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

          外框圆角按同心半径取：内圈小圆角（`--wui-radius-menu`）+ 卡片横向内边距
          （`--wui-space-3`），两圈曲率才贴合。
        */}
        <div className="rounded-[var(--codeblock-radius)] border border-(--wui-color-border)">
          {/*
            工具条左右两件对齐到同一条中线：切换器用组件默认高度（track 36px、内圈 28px），
            单围栏的语言标签做成同高的 36px 胶囊，两者都靠 `items-center`；横向 12px 与代码区一致。
          */}
          <div
            className={
              collapsible && expanded
                ? 'sticky top-[52px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-[var(--codeblock-radius)] p-3'
                : 'relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-[var(--codeblock-radius)] p-3'
            }
          >
            {variants && variants.length > 1 ? (
              <web-ui-segmented
                value={flavor}
                variant="inset"
                aria-label={switchLabel}
                className="[--wui-font-size:12px] [--wui-segmented-trigger-px:6px]"
                onInput={event => controller.selectFlavor(event.currentTarget.value)}
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
                onInput={event => controller.selectFlavor(event.currentTarget.value)}
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
              <span className="px-1 font-mono text-[11px] leading-none tracking-wide text-(--wui-color-text-secondary) uppercase">
                {active.lang || 'text'}
              </span>
            )}

            <div className="flex items-center">
              <span className="sr-only" aria-live="polite">
                {copyAnnouncement}
              </span>
              <web-ui-button-group>
                <web-ui-tooltip content={copyLabel}>
                  <web-ui-button
                    icon
                    variant="ghost"
                    data-copy
                    aria-label={copyLabel}
                    onClick={() => void controller.copy()}
                  >
                    <PressDrawIcon>
                      {copied === 'copied' ? (
                        <web-ui-icon
                          icon={akarIconsCircleCheck}
                          size={15}
                          className="text-(--wui-color-success)"
                        ></web-ui-icon>
                      ) : (
                        <web-ui-icon
                          icon={copyIcon}
                          size={15}
                          className={copied === 'failed' ? 'text-(--wui-color-danger)' : ''}
                        ></web-ui-icon>
                      )}
                    </PressDrawIcon>
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
                      onClick={() => controller.toggleExpanded()}
                    >
                      <web-ui-icon icon={expanded ? lucideChevronUp : lucideChevronDown} size={15}></web-ui-icon>
                    </web-ui-button>
                  </web-ui-tooltip>
                ) : null}
              </web-ui-button-group>
            </div>
          </div>

          {/*
            关闭态露出 128px：5 行 24px 加第 6 行的 8px。末端渐隐/晕染带取
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
                controller.toggleExpanded()
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
