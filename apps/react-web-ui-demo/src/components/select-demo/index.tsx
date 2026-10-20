import {
  lucideImage,
  lucideUser,
  lucideSettings,
  lucideGlobe,
  lucideBell,
  lucideMail,
  lucideSearch,
  lucideStar
} from '@greypan/web-ui/icons'
import { useState } from 'react'

function SelectDemo() {
  const [selected, setSelected] = useState('')
  const [framework, setFramework] = useState('vue')

  const iconOptions = [
    { value: 'notifications', icon: lucideBell, label: 'Notifications' },
    { value: 'messages', icon: lucideMail, label: 'Messages' },
    { value: 'search', icon: lucideSearch, label: 'Search' },
    { value: 'starred', icon: lucideStar, label: 'Favorites' }
  ]
  const [selectedIconValue, setSelectedIconValue] = useState('notifications')
  const getCurrentIcon = () => iconOptions.find(o => o.value === selectedIconValue)?.icon || lucideBell

  return (
    <div>
      <h1>Select</h1>
      <h2>Basic</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-select placeholder="Please select">
          <web-ui-option value="vue" label="Vue"></web-ui-option>
          <web-ui-option value="react" label="React"></web-ui-option>
          <web-ui-option value="svelte" label="Svelte"></web-ui-option>
        </web-ui-select>
      </div>
      <h2>Controlled value</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-select
          value={framework}
          placeholder="Selected framework"
          onInput={event => setFramework(event.currentTarget.value)}
        >
          <web-ui-option value="vue" label="Vue"></web-ui-option>
          <web-ui-option value="react" label="React"></web-ui-option>
          <web-ui-option value="svelte" label="Svelte"></web-ui-option>
        </web-ui-select>
        <div>选中值：{framework || 'None'}</div>
      </div>
      <h2>change event</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-select
          placeholder="change fires after the selection"
          onChange={event => setSelected(event.currentTarget.value)}
        >
          <web-ui-option value="a" label="Option A"></web-ui-option>
          <web-ui-option value="b" label="Option B"></web-ui-option>
          <web-ui-option value="c" label="Option C"></web-ui-option>
        </web-ui-select>
        <div>selected：{selected || 'None'}</div>
      </div>
      <h2>Custom trigger</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        Through<code>slot=&quot;trigger&quot;</code> 自定义触发区域内容，外壳和箭头保持默认。
      </p>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <web-ui-select>
          <web-ui-icon slot="trigger" icon={lucideImage} size={20}></web-ui-icon>
          <web-ui-option value="photo" label="Photo"></web-ui-option>
          <web-ui-option value="video" label="Video"></web-ui-option>
          <web-ui-option value="document" label="Document"></web-ui-option>
        </web-ui-select>
        <web-ui-select>
          <div slot="trigger" className="flex items-center gap-1.5">
            <web-ui-icon icon={lucideUser} size={18}></web-ui-icon>
            <span className="text-sm">User</span>
          </div>
          <web-ui-option value="admin" label="Admin"></web-ui-option>
          <web-ui-option value="editor" label="Edit"></web-ui-option>
          <web-ui-option value="viewer" label="Guest"></web-ui-option>
        </web-ui-select>
        <web-ui-select>
          <div slot="trigger" className="flex items-center gap-1.5">
            <web-ui-icon icon={lucideGlobe} size={18}></web-ui-icon>
            <span className="text-sm">Language</span>
          </div>
          <web-ui-option value="zh" label="Chinese"></web-ui-option>
          <web-ui-option value="en" label="English"></web-ui-option>
          <web-ui-option value="ja" label="Japanese"></web-ui-option>
        </web-ui-select>
        <web-ui-select>
          <web-ui-icon slot="trigger" icon={lucideSettings} size={16}></web-ui-icon>
          <web-ui-option value="theme" label="Theme settings"></web-ui-option>
          <web-ui-option value="lang" label="Language settings"></web-ui-option>
          <web-ui-option value="reset" label="Reset"></web-ui-option>
        </web-ui-select>
      </div>
      <h3>Responsive icon trigger</h3>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        trigger 为纯 icon，选中后 trigger icon 跟随 option 的 prefix icon 同步更新。
      </p>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <web-ui-select value={selectedIconValue} onChange={event => setSelectedIconValue(event.currentTarget.value)}>
          <web-ui-icon slot="trigger" icon={getCurrentIcon()} size={20}></web-ui-icon>
          {iconOptions.map(opt => (
            <web-ui-option key={opt.value} value={opt.value} label={opt.label}>
              <web-ui-icon slot="prefix" icon={opt.icon} size={16}></web-ui-icon>
            </web-ui-option>
          ))}
        </web-ui-select>
        <div className="text-sm text-(--wui-color-text-secondary)">选中值：{selectedIconValue}</div>
      </div>
      <h2>Option prefix and suffix</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        Through<code>slot=&quot;prefix&quot;</code> / <code>slot=&quot;suffix&quot;</code> 装饰 option。
      </p>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-select placeholder="Select priority">
          <web-ui-option value="high" label="High priority">
            <span slot="prefix">🔴</span>
            <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
              P0
            </span>
          </web-ui-option>
          <web-ui-option value="mid" label="Medium priority">
            <span slot="prefix">🟡</span>
            <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
              P1
            </span>
          </web-ui-option>
          <web-ui-option value="low" label="Low priority">
            <span slot="prefix">🟢</span>
            <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
              P2
            </span>
          </web-ui-option>
        </web-ui-select>
        <web-ui-select placeholder="Select country">
          <web-ui-option value="cn" label="China">
            <span slot="prefix">🇨🇳</span>
            <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
              +86
            </span>
          </web-ui-option>
          <web-ui-option value="us" label="United States">
            <span slot="prefix">🇺🇸</span>
            <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
              +1
            </span>
          </web-ui-option>
          <web-ui-option value="jp" label="Japan">
            <span slot="prefix">🇯🇵</span>
            <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
              +81
            </span>
          </web-ui-option>
        </web-ui-select>
        <web-ui-select placeholder="suffix only">
          <web-ui-option value="vue" label="Vue">
            <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
              v3.4
            </span>
          </web-ui-option>
          <web-ui-option value="react" label="React">
            <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
              v19
            </span>
          </web-ui-option>
          <web-ui-option value="svelte" label="Svelte">
            <span slot="suffix" className="text-xs text-(--wui-color-text-secondary)">
              v5
            </span>
          </web-ui-option>
        </web-ui-select>
      </div>
      <h2>Disabled option</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-select placeholder="Partially disabled">
          <web-ui-option value="a" label="Available option A"></web-ui-option>
          <web-ui-option value="b" label="Disabled option B" disabled></web-ui-option>
          <web-ui-option value="c" label="Available option C"></web-ui-option>
        </web-ui-select>
      </div>
      <h2>Portal</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-select portal placeholder="Portal select">
          <web-ui-option value="a" label="Option A"></web-ui-option>
          <web-ui-option value="b" label="Option B"></web-ui-option>
        </web-ui-select>
      </div>
      <h2>Scroll lock</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-select noScrollLock placeholder="Page scroll is not locked while open">
          <web-ui-option value="a" label="Option A"></web-ui-option>
          <web-ui-option value="b" label="Option B"></web-ui-option>
        </web-ui-select>
      </div>
      <h2>Disabled</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-select placeholder="Disabled" disabled>
          <web-ui-option value="a" label="Option A"></web-ui-option>
        </web-ui-select>
      </div>
    </div>
  )
}
export default SelectDemo
