import type { WebUiDialog, WebUiEventName, WebUiSegmented, WebUiSwitch } from '@greypan/web-ui'
import { useRef, useState } from 'react'

// React 事件类型回归护栏：锁定「宿主化 $events + HTMLAttributes」类型契约的关键场景，
// 随每次 `vp check`（oxlint 类型感知）被检查。
// 正向断言验证精确推导；`@ts-expect-error` 负向断言验证未知属性/事件/别名被拒绝。
export function EventTypingFixture() {
  const segmentedRef = useRef<WebUiSegmented>(null)
  const switchRef = useRef<WebUiSwitch>(null)
  const dialogRef = useRef<WebUiDialog>(null)
  const [collapseOpen, setCollapseOpen] = useState(false)

  // `$events` 中声明的 kebab-case event name 可赋值；其他 string 被拒绝。
  const dialogOpenChangeEventName: WebUiEventName<WebUiDialog> = 'open-change'
  void dialogOpenChangeEventName
  // @ts-expect-error web-ui-dialog 未声明 invalid-event
  const invalidDialogEventName: WebUiEventName<WebUiDialog> = 'invalid-event'
  void invalidDialogEventName

  return (
    <>
      {/* 1a. 标准事件 currentTarget 收窄到 host，value/checked 精确推导 */}
      <web-ui-segmented
        onInput={e => {
          const value: string = e.currentTarget.value
          void value
        }}
      />
      <web-ui-switch
        onChange={e => {
          const checked: boolean = e.currentTarget.checked
          void checked
        }}
      />

      {/* 1b. React SyntheticEvent 的 target 遵循原生语义（EventTarget），不承诺为组件实例 */}
      <web-ui-segmented
        onInput={e => {
          const ct: WebUiSegmented = e.currentTarget
          void ct
          // @ts-expect-error target 是 EventTarget，不是组件实例
          const t: WebUiSegmented = e.target
          void t
        }}
      />

      {/* 1c. 无 $events 的组件仍支持原生 click/focus 绑定 */}
      <web-ui-button onClick={() => {}} onFocus={() => {}} />

      {/* 2. kebab-case 自定义事件精确 detail，target/currentTarget 收窄到 host */}
      <web-ui-dialog
        noEscapeClose
        onopen-change={e => {
          const open: boolean = e.detail.open
          const host: WebUiDialog = e.currentTarget
          void open
          void host
        }}
      />
      <web-ui-collapse open={collapseOpen} onopen-change={e => setCollapseOpen(e.detail.open)} keep-mounted>
        <button>Trigger</button>
        <div slot="content">Content</div>
      </web-ui-collapse>

      {/* 3. 具体 Custom Element ref */}
      <web-ui-segmented ref={segmentedRef} />
      <web-ui-switch ref={switchRef} />
      <web-ui-dialog ref={dialogRef} />

      {/* 4a. 未知属性被拒绝 */}
      {/* @ts-expect-error foo 不是 web-ui-button 的合法属性 */}
      <web-ui-button foo="bar">A</web-ui-button>

      {/* 4b. 未知事件名被拒绝 */}
      {/* @ts-expect-error onFoo 不是合法事件绑定 */}
      <web-ui-button onFoo={() => {}}>A</web-ui-button>

      {/* 4c. lowercase 标准事件别名已移除，oninput 被拒绝 */}
      {/* @ts-expect-error oninput 已移除，标准事件用 onInput */}
      <web-ui-input oninput={() => {}} />

      {/* 4d. 属性类型错误被拒绝 */}
      {/* @ts-expect-error value 是 string，不接受 number */}
      <web-ui-segmented value={123} />
    </>
  )
}
