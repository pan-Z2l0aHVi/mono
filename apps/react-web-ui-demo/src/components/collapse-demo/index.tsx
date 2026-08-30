import { useState } from 'react'

function CollapseDemo() {
  const [controlledOpen, setControlledOpen] = useState(false)
  const [nestedOpen, setNestedOpen] = useState(false)

  return (
    <div>
      <h1>Collapse 折叠面板</h1>

      <h2>基础用法</h2>
      <div className="mb-3">
        <web-ui-collapse>
          <web-ui-collapse-trigger className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left">
            点击展开
          </web-ui-collapse-trigger>
          <web-ui-collapse-content>
            <div className="p-3">
              <p>这是折叠内容。</p>
              <p>支持任意内容：文本、表单、图片等。</p>
            </div>
          </web-ui-collapse-content>
        </web-ui-collapse>
      </div>

      <h2>受控模式</h2>
      <div className="mb-3 flex flex-col gap-2">
        <web-ui-button variant="secondary" onClick={() => setControlledOpen(v => !v)}>
          {controlledOpen ? '收起' : '展开'}
        </web-ui-button>
        <web-ui-collapse open={controlledOpen} onopen-change={event => setControlledOpen(event.detail.open)}>
          <web-ui-collapse-trigger className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left">
            受控触发器（当前 {controlledOpen ? '展开' : '收起'}）
          </web-ui-collapse-trigger>
          <web-ui-collapse-content>
            <div className="p-3">受控模式：open 由外部状态驱动，open-change 仅在用户交互时派发。</div>
          </web-ui-collapse-content>
        </web-ui-collapse>
      </div>

      <h2>keep-mounted（保留滚动位置）</h2>
      <div className="mb-3">
        <web-ui-collapse>
          <web-ui-collapse-trigger className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left">
            展开长列表
          </web-ui-collapse-trigger>
          <web-ui-collapse-content keep-mounted>
            <div className="max-h-40 overflow-y-auto p-3">
              {Array.from({ length: 20 }, (_, i) => (
                <p key={i}>列表项 {i + 1}</p>
              ))}
            </div>
          </web-ui-collapse-content>
        </web-ui-collapse>
      </div>

      <h2>水平方向</h2>
      <div className="mb-3">
        <web-ui-collapse horizontal>
          <web-ui-collapse-trigger className="inline-block cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2">
            展开侧栏
          </web-ui-collapse-trigger>
          <web-ui-collapse-content>
            <div className="w-64 whitespace-nowrap p-3">水平展开的内容区，宽度过渡。</div>
          </web-ui-collapse-content>
        </web-ui-collapse>
      </div>

      <h2>嵌套</h2>
      <div className="mb-3">
        <web-ui-collapse open={nestedOpen} onopen-change={event => setNestedOpen(event.detail.open)}>
          <web-ui-collapse-trigger className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left">
            外层折叠
          </web-ui-collapse-trigger>
          <web-ui-collapse-content>
            <div className="p-3">
              <p>外层内容，内部再嵌一层：</p>
              <web-ui-collapse>
                <web-ui-collapse-trigger className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-raised)] px-3 py-2 text-left">
                  内层折叠
                </web-ui-collapse-trigger>
                <web-ui-collapse-content>
                  <div className="p-3">内层内容：外层高度会跟随内层展开自动增长。</div>
                </web-ui-collapse-content>
              </web-ui-collapse>
            </div>
          </web-ui-collapse-content>
        </web-ui-collapse>
      </div>

      <h2>禁用</h2>
      <div className="mb-3">
        <web-ui-collapse disabled>
          <web-ui-collapse-trigger className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left">
            禁用状态触发器
          </web-ui-collapse-trigger>
          <web-ui-collapse-content>
            <div className="p-3">禁用时不可展开。</div>
          </web-ui-collapse-content>
        </web-ui-collapse>
      </div>
    </div>
  )
}

export default CollapseDemo
