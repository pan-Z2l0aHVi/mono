import type { WebUiContextMenu } from '@greypan/web-ui'
import {
  lucideCopy,
  lucideScissors,
  lucideClipboardPaste,
  lucideTrash2,
  lucideFile,
  lucideFolder,
  lucideSettings
} from '@greypan/web-ui/icons'
import { useState } from 'react'

function ContextMenuDemo() {
  const [disabled, setDisabled] = useState(false)

  const openApiMenu = () => {
    document.querySelector<WebUiContextMenu>('#demo-api-context-menu')?.openAt(200, 200)
  }

  return (
    <div>
      <h1>context menu</h1>

      <h2>Basic usage</h2>
      <p className="mb-4 text-sm text-gray-500">Right-click in the area below to open the menu</p>
      <div className="mb-6">
        <web-ui-context-menu id="demo-context-menu">
          <div className="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-(--wui-color-text-secondary)">
            在此区域右键点击
          </div>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>Copy
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideScissors}></web-ui-icon>剪切
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideClipboardPaste}></web-ui-icon>Paste
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item disabled>
            <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>Delete
          </web-ui-dropdown-item>
        </web-ui-context-menu>
      </div>

      <h2>With icon and shortcut</h2>
      <p className="mb-4 text-sm text-gray-500">A richer menu item showcase</p>
      <div className="mb-6">
        <web-ui-context-menu>
          <div className="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-(--wui-color-text-secondary)">
            在此区域右键点击
          </div>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideFile}></web-ui-icon>新建文件
            <span className="opacity-40" slot="suffix">
              ⌘N
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideFolder}></web-ui-icon>新建文件夹
            <span className="opacity-40" slot="suffix">
              ⇧⌘N
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>Copy
            <span className="opacity-40" slot="suffix">
              ⌘C
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideScissors}></web-ui-icon>剪切
            <span className="opacity-40" slot="suffix">
              ⌘X
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideClipboardPaste}></web-ui-icon>Paste
            <span className="opacity-40" slot="suffix">
              ⌘V
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideSettings}></web-ui-icon>偏好设置
            <span className="opacity-40" slot="suffix">
              ⌘,
            </span>
          </web-ui-dropdown-item>
        </web-ui-context-menu>
      </div>

      <h2>Disabled</h2>
      <p className="mb-4 text-sm text-gray-500">While disabled, right-click does not open the menu</p>
      <div className="mb-6">
        <web-ui-context-menu disabled={disabled}>
          <div className="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-(--wui-color-text-secondary)">
            {disabled ? 'menu disabled' : 'Right-click to try'}
          </div>
          <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
        </web-ui-context-menu>
        <div className="mt-2">
          <web-ui-button variant="secondary" onClick={() => setDisabled(v => !v)}>
            {disabled ? 'Enable menu' : 'Disable menu'}
          </web-ui-button>
        </div>
      </div>

      <h2>Through the API</h2>
      <p className="mb-4 text-sm text-gray-500">Open the menu at a given position with the JavaScript API</p>
      <div className="mb-6">
        <web-ui-button onClick={openApiMenu}>Open the menu at (200, 200)</web-ui-button>
        <web-ui-context-menu id="demo-api-context-menu">
          <web-ui-dropdown-item>Action 1</web-ui-dropdown-item>
          <web-ui-dropdown-item>Action 2</web-ui-dropdown-item>
          <web-ui-dropdown-item>Action 3</web-ui-dropdown-item>
        </web-ui-context-menu>
      </div>

      <h2>No scroll lock</h2>
      <div className="mb-6">
        <web-ui-context-menu noScrollLock>
          <div className="flex h-32 w-full items-center justify-center rounded-2xl border-2 border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-(--wui-color-text-secondary)">
            右键打开时不锁定页面滚动
          </div>
          <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
        </web-ui-context-menu>
      </div>

      <h2>Nested menu</h2>
      <p className="mb-4 text-sm text-gray-500">A context menu with submenu support</p>
      <div className="mb-6">
        <web-ui-context-menu>
          <div className="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-(--wui-color-text-secondary)">
            在此区域右键点击
          </div>
          <web-ui-dropdown-item submenu>
            <web-ui-icon slot="prefix" size={14} icon={lucideFile}></web-ui-icon>导出为
            <web-ui-dropdown-item>Export as PDF</web-ui-dropdown-item>
            <web-ui-dropdown-item>Export as PNG</web-ui-dropdown-item>
            <web-ui-dropdown-item>Export as SVG</web-ui-dropdown-item>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item submenu>
            <web-ui-icon slot="prefix" size={14} icon={lucideFolder}></web-ui-icon>导入
            <web-ui-dropdown-item>Import from a file</web-ui-dropdown-item>
            <web-ui-dropdown-item>Import from the clipboard</web-ui-dropdown-item>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideSettings}></web-ui-icon>Settings
          </web-ui-dropdown-item>
        </web-ui-context-menu>
      </div>

      <h2>macOS style</h2>
      <p className="mb-4 text-sm text-gray-500">A context menu like macOS Finder</p>
      <div className="mb-6">
        <web-ui-context-menu>
          <div className="flex h-48 w-full items-center justify-center rounded-2xl border-2 border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-(--wui-color-text-secondary)">
            在此区域右键点击
          </div>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>Copy
            <span slot="suffix" className="opacity-40">
              ⌘C
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideScissors}></web-ui-icon>剪切
            <span slot="suffix" className="opacity-40">
              ⌘X
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideClipboardPaste}></web-ui-icon>Paste
            <span slot="suffix" className="opacity-40">
              ⌘V
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item disabled>
            <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>Delete
            <span slot="suffix" className="opacity-40">
              ⌫
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-header>More info</web-ui-dropdown-header>
          <web-ui-dropdown-item>Get info</web-ui-dropdown-item>
        </web-ui-context-menu>
      </div>
    </div>
  )
}
export default ContextMenuDemo
