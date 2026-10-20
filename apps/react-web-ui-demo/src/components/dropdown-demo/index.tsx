import type { WebUiDropdownItem } from '@greypan/web-ui'
import {
  lucideFile,
  lucideCopy,
  lucideClipboardPaste,
  lucideTrash2,
  lucidePrinter,
  lucideSettings,
  lucideDownload,
  lucideUndo2,
  lucideRedo2,
  lucideSearch
} from '@greypan/web-ui/icons'
import { useEffect, useRef, useState } from 'react'

function DropdownDemo() {
  const [controlledOpen, setControlledOpen] = useState(false)
  const controlledItemRef = useRef<WebUiDropdownItem>(null)

  useEffect(() => {
    const item = controlledItemRef.current
    if (!item) return

    const close = () => setControlledOpen(false)
    item.addEventListener('click', close)
    return () => item.removeEventListener('click', close)
  }, [])

  return (
    <div>
      <h1>dropdown menu</h1>
      <h2>Basic</h2>
      <div className="mb-6">
        <web-ui-dropdown>
          <web-ui-button slot="trigger">Action</web-ui-button>
          <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
          <web-ui-dropdown-item>Paste</web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item disabled>Delete</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <h2>With icon and shortcut</h2>
      <div className="mb-6">
        <web-ui-dropdown>
          <web-ui-button slot="trigger">File</web-ui-button>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideFile}></web-ui-icon>新建
            <span className="opacity-40" slot="suffix">
              ⌘N
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>Copy
            <span className="opacity-40" slot="suffix">
              ⌘C
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideClipboardPaste}></web-ui-icon>Paste
            <span className="opacity-40" slot="suffix">
              ⌘V
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item disabled>
            <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>Delete
            <span className="opacity-40" slot="suffix">
              ⌘⌫
            </span>
          </web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <h2>Nested menu</h2>
      <div className="mb-6">
        <web-ui-dropdown>
          <web-ui-button slot="trigger">More</web-ui-button>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideUndo2}></web-ui-icon>撤销
            <span className="opacity-40" slot="suffix">
              ⌘Z
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideRedo2}></web-ui-icon>重做
            <span className="opacity-40" slot="suffix">
              ⇧⌘Z
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item submenu>
            <web-ui-icon slot="prefix" size={14} icon={lucidePrinter}></web-ui-icon>导出为
            <web-ui-dropdown-item>Export as PDF</web-ui-dropdown-item>
            <web-ui-dropdown-item>Export as PNG</web-ui-dropdown-item>
            <web-ui-dropdown-item>Export as SVG</web-ui-dropdown-item>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item submenu>
            <web-ui-icon slot="prefix" size={14} icon={lucideDownload}></web-ui-icon>导入
            <web-ui-dropdown-item>Import from a file</web-ui-dropdown-item>
            <web-ui-dropdown-item>Import from the clipboard</web-ui-dropdown-item>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideSettings}></web-ui-icon>偏好设置
            <span className="opacity-40" slot="suffix">
              ⌘,
            </span>
          </web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <h2>Deep nesting (4 levels)</h2>
      <div className="mb-6">
        <web-ui-dropdown>
          <web-ui-button slot="trigger">Deep navigation</web-ui-button>
          <web-ui-dropdown-item submenu>
            <web-ui-icon slot="prefix" size={14} icon={lucideFile}></web-ui-icon>File
            <web-ui-dropdown-item submenu>
              <web-ui-icon slot="prefix" size={14} icon={lucideFile}></web-ui-icon>新建
              <web-ui-dropdown-item submenu>
                办公文档<web-ui-dropdown-item>Word document</web-ui-dropdown-item>
                <web-ui-dropdown-item>Excel sheet</web-ui-dropdown-item>
              </web-ui-dropdown-item>
              <web-ui-dropdown-item submenu>
                代码文件<web-ui-dropdown-item>TypeScript</web-ui-dropdown-item>
                <web-ui-dropdown-item>Python</web-ui-dropdown-item>
              </web-ui-dropdown-item>
            </web-ui-dropdown-item>
            <web-ui-dropdown-item>
              <web-ui-icon slot="prefix" size={14} icon={lucideDownload}></web-ui-icon>导出
            </web-ui-dropdown-item>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item submenu>
            <web-ui-icon slot="prefix" size={14} icon={lucideSettings}></web-ui-icon>Edit
            <web-ui-dropdown-item>
              <web-ui-icon slot="prefix" size={14} icon={lucideUndo2}></web-ui-icon>撤销
              <span className="opacity-40" slot="suffix">
                ⌘Z
              </span>
            </web-ui-dropdown-item>
            <web-ui-dropdown-item>
              <web-ui-icon slot="prefix" size={14} icon={lucideRedo2}></web-ui-icon>重做
              <span className="opacity-40" slot="suffix">
                ⇧⌘Z
              </span>
            </web-ui-dropdown-item>
          </web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <h2>macOS-style menu</h2>
      <div className="mb-6">
        <web-ui-dropdown>
          <web-ui-button slot="trigger">Menu</web-ui-button>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideUndo2}></web-ui-icon>撤销
            <span slot="suffix" className="opacity-40">
              ⌘Z
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideRedo2}></web-ui-icon>重做
            <span slot="suffix" className="opacity-40">
              ⇧⌘Z
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideClipboardPaste}></web-ui-icon>Paste
            <span slot="suffix" className="opacity-40">
              ⌘V
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideClipboardPaste}></web-ui-icon>粘贴并匹配样式
            <span slot="suffix" className="opacity-40">
              ⌥⇧⌘V
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>Delete
            <span slot="suffix" className="opacity-40">
              ⌫
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item pl="30px">
            Select all
            <span slot="suffix" className="opacity-40">
              ⌘A
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item pl="30px">
            Paste as a reference
            <span slot="suffix" className="opacity-40">
              ⇧⌘V
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item pl="30px" disabled>
            Add a link
            <span slot="suffix" className="opacity-40">
              ⌘K
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item submenu>
            <web-ui-icon slot="prefix" size={14} icon={lucideSearch}></web-ui-icon>查找
            <web-ui-dropdown-item>Find next</web-ui-dropdown-item>
            <web-ui-dropdown-item>Find previous</web-ui-dropdown-item>
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-header>More options</web-ui-dropdown-header>
          <web-ui-dropdown-item pl="30px">
            Dictation
            <span slot="suffix" className="opacity-40">
              D
            </span>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" size={14} icon={lucideSettings}></web-ui-icon>表情
            <span slot="suffix" className="opacity-40">
              E
            </span>
          </web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <h2>Different positions</h2>
      <div className="mb-6 flex gap-2">
        <web-ui-dropdown placement="bottom-end">
          <web-ui-button slot="trigger">Bottom right</web-ui-button>
          <web-ui-dropdown-item>Item 1</web-ui-dropdown-item>
          <web-ui-dropdown-item>Item 2</web-ui-dropdown-item>
        </web-ui-dropdown>
        <web-ui-dropdown placement="top-start">
          <web-ui-button slot="trigger">Top</web-ui-button>
          <web-ui-dropdown-item>Item 1</web-ui-dropdown-item>
          <web-ui-dropdown-item>Item 2</web-ui-dropdown-item>
        </web-ui-dropdown>
        <web-ui-dropdown placement="top-end">
          <web-ui-button slot="trigger">Top right</web-ui-button>
          <web-ui-dropdown-item>Item 1</web-ui-dropdown-item>
          <web-ui-dropdown-item>Item 2</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <h2>Disabled</h2>
      <div className="mb-6">
        <web-ui-dropdown disabled>
          <web-ui-button slot="trigger">Disable menu</web-ui-button>
          <web-ui-dropdown-item>Item 1</web-ui-dropdown-item>
          <web-ui-dropdown-item>Item 2</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <h2>Scroll lock</h2>
      <div className="mb-6">
        <web-ui-dropdown noScrollLock>
          <web-ui-button slot="trigger">No scroll lock</web-ui-button>
          <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
      <h2>Controlled component</h2>
      <div className="mb-6">
        <div className="mb-2 flex gap-2">
          <web-ui-button variant="secondary" onClick={() => setControlledOpen(v => !v)}>
            {controlledOpen ? 'Close menu externally' : 'Open menu externally'}
          </web-ui-button>
          <span className="text-sm leading-10 text-gray-500">状态：{controlledOpen ? 'Open' : 'Close'}</span>
        </div>
        <web-ui-dropdown open={controlledOpen} onopen-change={event => setControlledOpen(event.detail.open)}>
          <web-ui-button variant="ghost" slot="trigger">
            Controlled menu
          </web-ui-button>
          <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
          <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
          <web-ui-dropdown-item ref={controlledItemRef}>Paste and close</web-ui-dropdown-item>
        </web-ui-dropdown>
      </div>
    </div>
  )
}
export default DropdownDemo
