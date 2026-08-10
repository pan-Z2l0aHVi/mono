import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useState } from 'react'

function AutocompleteDemo() {
  // 受控 value：value 即输入文本，选中时回填为 option label
  const [text, setText] = useState('')
  const [changeValue, setChangeValue] = useState('')
  const [changeSelectedValue, setChangeSelectedValue] = useState('')

  function handleChange(event: React.ChangeEvent<WebUiAutocomplete>) {
    setChangeValue(event.currentTarget.value)
    setChangeSelectedValue(event.currentTarget.selectedValue)
  }

  // selected-value 由当前输入派生：文本不再精确匹配任何 option label 时自动清空
  const [liveInput, setLiveInput] = useState('')
  const [liveSelectedValue, setLiveSelectedValue] = useState('')

  function handleInput(event: React.FormEvent<WebUiAutocomplete>) {
    const host = event.currentTarget
    setLiveInput(host.value)
    // selected-value 在组件的 update cycle 中派生，延迟一拍读取最终值
    requestAnimationFrame(() => {
      setLiveSelectedValue(host.selectedValue)
    })
  }

  const [filterMode, setFilterMode] = useState<'contains' | 'prefix' | 'none'>('contains')

  const frameworks = ['Vue', 'React', 'Svelte', 'Angular', 'Solid', 'Preact', 'Lit']

  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '苏州']

  return (
    <div>
      <h1>自动补全</h1>

      <h2>基础</h2>
      <p className="mb-2 text-sm text-[var(--wui-color-text-muted)]">
        键入时按 label 过滤候选（默认 <code>contains</code>），选择后文本回填为选项 label。
      </p>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete placeholder="输入框架名">
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>受控值</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete
          value={text}
          placeholder="输入城市名"
          onInput={event => setText(event.currentTarget.value)}
        >
          {cities.map(city => (
            <web-ui-option key={city} value={city} label={city}>
              {city}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
        <div>当前输入：{text || '无'}</div>
      </div>

      <h2>filter 模式</h2>
      <p className="mb-2 text-sm text-[var(--wui-color-text-muted)]">
        <code>contains</code> 包含匹配，<code>prefix</code> 前缀匹配，<code>none</code> 关闭过滤。
      </p>
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <web-ui-select
            value={filterMode}
            aria-label="过滤模式"
            className="[--wui-input-width:140px]"
            onChange={event => setFilterMode(event.currentTarget.value as 'contains' | 'prefix' | 'none')}
          >
            <web-ui-option value="contains" label="包含"></web-ui-option>
            <web-ui-option value="prefix" label="前缀"></web-ui-option>
            <web-ui-option value="none" label="不过滤"></web-ui-option>
          </web-ui-select>
          <span className="text-sm text-[var(--wui-color-text-muted)]">当前模式：{filterMode}</span>
        </div>
        <web-ui-autocomplete filter={filterMode} placeholder="输入框架名">
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>change 事件</h2>
      <p className="mb-2 text-sm text-[var(--wui-color-text-muted)]">
        选择提交时触发 <code>change</code>；<code>selected-value</code> 由当前输入派生，输入不再精确匹配任何 option
        label 时自动清空。
      </p>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete placeholder="选择城市" onInput={handleInput} onChange={handleChange}>
          {cities.map(city => (
            <web-ui-option key={city} value={city} label={city}>
              {city}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
        <div>实时输入：{liveInput || '无'}</div>
        <div>实时 selected-value：{liveSelectedValue || '无'}</div>
        <div>最近 change 文本：{changeValue || '无'}</div>
        <div>最近 change selected-value：{changeSelectedValue || '无'}</div>
      </div>

      <h2>禁用选项</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete placeholder="部分禁用">
          <web-ui-option value="vue" label="Vue"></web-ui-option>
          <web-ui-option value="react" label="React" disabled></web-ui-option>
          <web-ui-option value="svelte" label="Svelte"></web-ui-option>
          <web-ui-option value="angular" label="Angular" disabled></web-ui-option>
        </web-ui-autocomplete>
      </div>

      <h2>Portal</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete portal placeholder="Portal 自动补全">
          {cities.map(city => (
            <web-ui-option key={city} value={city} label={city}>
              {city}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>无滚动锁定</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete noScrollLock placeholder="打开时不锁定页面滚动">
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>必填</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete required placeholder="必填，留空校验失败">
          {cities.map(city => (
            <web-ui-option key={city} value={city} label={city}>
              {city}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>禁用</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete value="Vue" placeholder="禁用状态" disabled>
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>
    </div>
  )
}
export default AutocompleteDemo
