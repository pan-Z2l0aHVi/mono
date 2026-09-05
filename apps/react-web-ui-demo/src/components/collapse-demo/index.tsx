import { lucideChevronDown, radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'

function CollapseDemo() {
  return (
    <div>
      <h1>Collapse 折叠面板</h1>

      <h2>基础用法</h2>
      <div className="mb-3">
        <web-ui-collapse>
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left"
          >
            点击展开
          </button>
          <div slot="content">
            <div className="p-3">
              <p>这是折叠内容。</p>
              <p>支持任意内容：文本、表单、图片等。</p>
            </div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>trigger 类型</h2>
      <div className="mb-3 flex flex-col gap-2">
        <p className="text-sm text-gray-500">
          trigger 是 default slot，可放入任意可交互元素（原生 button、web-ui 组件等）。
        </p>
        <web-ui-collapse>
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left"
          >
            原生 button
          </button>
          <div slot="content">
            <div className="p-3">原生 {'<button>'} 作为 trigger，原生提供 Enter/Space 激活与焦点。</div>
          </div>
        </web-ui-collapse>
        <web-ui-collapse>
          <web-ui-button variant="secondary" full>
            web-ui-button 触发器
          </web-ui-button>
          <div slot="content">
            <div className="p-3">web-ui 组件同样可以作为 trigger，点击切换开合。</div>
          </div>
        </web-ui-collapse>
        <web-ui-collapse>
          <web-ui-button variant="secondary" full>
            <web-ui-icon slot="prefix" icon={lucideChevronDown} size={14}></web-ui-icon>
            带图标的触发器
          </web-ui-button>
          <div slot="content">
            <div className="p-3">trigger 内容任意组合：图标、文本、快捷键标识等。</div>
          </div>
        </web-ui-collapse>
        <web-ui-collapse>
          纯文本 trigger（无键盘语义）
          <div slot="content">
            <div className="p-3">纯文本可点击但不可聚焦，无 Enter/Space 激活——仅用于演示非交互元素。</div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>keep-mounted（保留滚动位置）</h2>
      <div className="mb-3">
        <web-ui-collapse keep-mounted>
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left"
          >
            展开长列表
          </button>
          <div slot="content">
            <div className="max-h-40 overflow-y-auto p-3">
              {Array.from({ length: 20 }, (_, i) => (
                <p key={i}>列表项 {i + 1}</p>
              ))}
            </div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>水平方向（trigger 与内容同行）</h2>
      <div className="mb-3">
        <web-ui-collapse horizontal className="flex items-center gap-2">
          <button
            type="button"
            className="flex-none cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2"
          >
            <web-ui-icon className="align-[-2px]" icon={radixIconsPanelLeftMinimized} size={14}></web-ui-icon>
            展开侧栏
          </button>
          <div slot="content">
            <div className="w-64 whitespace-nowrap p-3">水平展开的内容区，宽度过渡，trigger 与内容保持同行。</div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>嵌套</h2>
      <div className="mb-3">
        <web-ui-collapse>
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left"
          >
            外层折叠
          </button>
          <div slot="content">
            <div className="p-3">
              <p>外层内容，内部再嵌一层：</p>
              <web-ui-collapse>
                <button
                  type="button"
                  className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-raised)] px-3 py-2 text-left"
                >
                  内层折叠
                </button>
                <div slot="content">
                  <div className="p-3">内层内容：外层高度会跟随内层展开自动增长。</div>
                </div>
              </web-ui-collapse>
            </div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>禁用</h2>
      <div className="mb-3">
        <web-ui-collapse disabled>
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left"
          >
            禁用状态触发器
          </button>
          <div slot="content">
            <div className="p-3">禁用时不可展开。</div>
          </div>
        </web-ui-collapse>
      </div>
    </div>
  )
}

export default CollapseDemo
