import { lucideChevronDown, radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'
import { webUiScrollbarsOptions } from '@greypan/web-ui/scrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'

function CollapseDemo() {
  return (
    <div>
      <h1>Collapse collapse panel</h1>

      <h2>Basic usage</h2>
      <div className="mb-3">
        <web-ui-collapse>
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            点击展开
          </button>
          <div slot="content">
            <div className="p-3">
              <p>This is the collapse content.</p>
              <p>Any content works: text, forms, images.</p>
            </div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>trigger types</h2>
      <div className="mb-3 flex flex-col gap-2">
        <p className="text-sm text-gray-500">
          The trigger is the default slot; put any interactive element in it (a native button, a web-ui component, …).
        </p>
        <web-ui-collapse>
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            原生 button
          </button>
          <div slot="content">
            <div className="p-3">原生 {'<button>'} 作为 trigger，原生提供 Enter/Space 激活与焦点。</div>
          </div>
        </web-ui-collapse>
        <web-ui-collapse>
          <web-ui-button variant="secondary" full>
            web-ui-button trigger
          </web-ui-button>
          <div slot="content">
            <div className="p-3">A web-ui component works as a trigger too; clicking it toggles the panel.</div>
          </div>
        </web-ui-collapse>
        <web-ui-collapse>
          <web-ui-button variant="secondary" full>
            <web-ui-icon slot="prefix" icon={lucideChevronDown} size={14}></web-ui-icon>
            带 icon 的 trigger
          </web-ui-button>
          <div slot="content">
            <div className="p-3">The trigger can combine anything: icons, text, keyboard hints.</div>
          </div>
        </web-ui-collapse>
        <web-ui-collapse>
          纯文本 trigger（无键盘语义）
          <div slot="content">
            <div className="p-3">
              Plain text is clickable but not focusable and has no Enter/Space activation — it only demonstrates a
              non-interactive element.
            </div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>keep-mounted (keeps the scroll position)</h2>
      <div className="mb-3">
        <web-ui-collapse keep-mounted>
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            展开长列表
          </button>
          <div slot="content">
            <OverlayScrollbarsComponent options={webUiScrollbarsOptions} className="max-h-40 overflow-y-auto p-3">
              {Array.from({ length: 20 }, (_, i) => (
                <p key={i}>列表项 {i + 1}</p>
              ))}
            </OverlayScrollbarsComponent>
          </div>
        </web-ui-collapse>
      </div>

      <h2>peek (reveals part of it)</h2>
      <div className="mb-3">
        <web-ui-collapse peek="80px">
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            展开长文本
          </button>
          <div slot="content">
            <div className="p-3">
              {Array.from({ length: 8 }, (_, i) => (
                <p key={i}>段落 {i + 1}：关闭时只露出前 80px，其余被裁剪且不可交互。</p>
              ))}
            </div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>peek fades the edge (the length follows peek)</h2>
      <div className="mb-3">
        <web-ui-collapse peek="200px">
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            展开长文本（大 peek）
          </button>
          <div slot="content">
            <div className="p-3">
              {Array.from({ length: 8 }, (_, i) => (
                <p key={i}>段落 {i + 1}：渐隐长度取 peek 的 40%（200px → 80px），无需单独指定。</p>
              ))}
            </div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>Horizontal (trigger and content share a row)</h2>
      <div className="mb-3">
        <web-ui-collapse horizontal className="flex items-center gap-2">
          <button
            type="button"
            className="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2"
          >
            <web-ui-icon className="align-[-2px]" icon={radixIconsPanelLeftMinimized} size={14}></web-ui-icon>
            展开侧栏
          </button>
          <div slot="content">
            <div className="w-64 whitespace-nowrap p-3">
              The content area expands horizontally with a width transition; the trigger stays on the same row.
            </div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>Nested</h2>
      <div className="mb-3">
        <web-ui-collapse>
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            外层 collapse
          </button>
          <div slot="content">
            <div className="p-3">
              <p>Outer content with another layer nested inside:</p>
              <web-ui-collapse>
                <button
                  type="button"
                  className="block w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
                >
                  内层 collapse
                </button>
                <div slot="content">
                  <div className="p-3">Inner content: the outer height grows as the inner panel expands.</div>
                </div>
              </web-ui-collapse>
            </div>
          </div>
        </web-ui-collapse>
      </div>

      <h2>Disabled</h2>
      <div className="mb-3">
        <web-ui-collapse disabled>
          <button
            type="button"
            className="block w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
          >
            禁用状态 trigger
          </button>
          <div slot="content">
            <div className="p-3">Disabled means it cannot expand.</div>
          </div>
        </web-ui-collapse>
      </div>
    </div>
  )
}

export default CollapseDemo
