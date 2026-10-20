import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useRef, useState } from 'react'

function AutocompleteDemo() {
  // 受控 value：value 即输入文本，选中时回填为 option label
  const [text, setText] = useState('')
  const [changeValue, setChangeValue] = useState('')
  const [changeSelectedValue, setChangeSelectedValue] = useState('')
  const [customValue, setCustomValue] = useState('')
  const [customSelectedValue, setCustomSelectedValue] = useState('')

  function handleChange(event: React.ChangeEvent<WebUiAutocomplete>) {
    setChangeValue(event.currentTarget.value)
    setChangeSelectedValue(event.currentTarget.selectedValue)
  }

  function handleCustomChange(event: React.ChangeEvent<WebUiAutocomplete>) {
    setCustomValue(event.currentTarget.value)
    setCustomSelectedValue(event.currentTarget.selectedValue)
  }

  // 自定义 trigger slot：多行 textarea trigger 保留 Enter 换行，Escape/blur 关闭 panel
  const [multilineText, setMultilineText] = useState('')
  const [multilineCommit, setMultilineCommit] = useState({ value: '', selectedValue: '' })
  const multilineTriggerRef = useRef<WebUiAutocomplete>(null)

  function handleMultilineInput(event: React.InputEvent<WebUiAutocomplete>) {
    setMultilineText(event.currentTarget.value)
  }

  function handleMultilineChange(event: React.ChangeEvent<WebUiAutocomplete>) {
    setMultilineCommit({
      value: event.currentTarget.value,
      selectedValue: event.currentTarget.selectedValue
    })
  }

  // 公共 focus() 委托给当前生效 trigger：这里是 light DOM 的 web-ui-textarea
  function focusMultilineTrigger() {
    multilineTriggerRef.current?.focus()
  }

  // 单行自定义 trigger 保持默认 Enter 语义：panel 打开时 Enter 选择高亮项
  const [singleLineText, setSingleLineText] = useState('')

  function handleSingleLineInput(event: React.InputEvent<WebUiAutocomplete>) {
    setSingleLineText(event.currentTarget.value)
  }

  // selected-value 由当前输入派生：文本不再精确匹配任何 option label 时自动清空
  const [liveInput, setLiveInput] = useState('')
  const [liveSelectedValue, setLiveSelectedValue] = useState('')

  function handleInput(event: React.InputEvent<WebUiAutocomplete>) {
    const host = event.currentTarget
    setLiveInput(host.value)
    // selected-value 在组件的 update cycle 中派生，延迟一拍读取最终值
    requestAnimationFrame(() => {
      setLiveSelectedValue(host.selectedValue)
    })
  }

  const [filterMode, setFilterMode] = useState<'contains' | 'prefix' | 'none'>('contains')

  const frameworks = ['Vue', 'React', 'Svelte', 'Angular', 'Solid', 'Preact', 'Lit']

  const cities = [
    'Beijing',
    'Shanghai',
    'Guangzhou',
    'Qingdao',
    'Hangzhou',
    'Chengdu',
    'Wuhan',
    'Xian',
    'Nanjing',
    'Suzhou'
  ]

  return (
    <div>
      <h1>Autocomplete</h1>

      <h2>Basic</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        键入时按 label 过滤候选（默认 <code>contains</code>），选择后文本回填为 option label。
      </p>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete placeholder="input name">
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>Borderless</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete borderless placeholder="Borderless autocomplete">
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
        <web-ui-autocomplete borderless value="Vue" placeholder="Borderless with value">
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>Controlled value</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete
          value={text}
          placeholder="Enter a city name"
          onInput={event => setText(event.currentTarget.value)}
        >
          {cities.map(city => (
            <web-ui-option key={city} value={city} label={city}>
              {city}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
        <div>当前输入：{text || 'None'}</div>
      </div>

      <h2>filter mode</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        <code>contains</code>Contains match,<code>prefix</code>Prefix match,<code>none</code> 关闭过滤。
      </p>
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <web-ui-select
            value={filterMode}
            aria-label="Filter mode"
            className="[--wui-input-width:140px]"
            onChange={event => setFilterMode(event.currentTarget.value as 'contains' | 'prefix' | 'none')}
          >
            <web-ui-option value="contains" label="Contains"></web-ui-option>
            <web-ui-option value="prefix" label="Prefix"></web-ui-option>
            <web-ui-option value="none" label="No filter"></web-ui-option>
          </web-ui-select>
          <span className="text-sm text-(--wui-color-text-secondary)">当前模式：{filterMode}</span>
        </div>
        <web-ui-autocomplete filter={filterMode} placeholder="input name">
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>change event</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        选择提交时触发 <code>change</code>；<code>selected-value</code> 由当前输入派生，输入不再精确匹配任何 option
        label 时自动清空。
      </p>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete placeholder="Select a city" onInput={handleInput} onChange={handleChange}>
          {cities.map(city => (
            <web-ui-option key={city} value={city} label={city}>
              {city}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
        <div>实时输入：{liveInput || 'None'}</div>
        <div>实时 selected-value：{liveSelectedValue || 'None'}</div>
        <div>最近 change 文本：{changeValue || 'None'}</div>
        <div>最近 change selected-value：{changeSelectedValue || 'None'}</div>
      </div>

      <h2>Disabled option</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete placeholder="Partially disabled">
          <web-ui-option value="vue" label="Vue"></web-ui-option>
          <web-ui-option value="react" label="React" disabled></web-ui-option>
          <web-ui-option value="svelte" label="Svelte"></web-ui-option>
          <web-ui-option value="angular" label="Angular" disabled></web-ui-option>
        </web-ui-autocomplete>
      </div>

      <h2>Portal</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete portal placeholder="Portal autocomplete">
          {cities.map(city => (
            <web-ui-option key={city} value={city} label={city}>
              {city}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>custom value</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        On
        <code>allow-custom-value</code> and type text that matches no option, then press Enter to submit it; then{' '}
        <code>selected-value</code> 为空。零匹配时 panel 保持关闭，按 Enter 仍会提交该文本。
      </p>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete allowCustomValue placeholder="Existing input or new label" onChange={handleCustomChange}>
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
        <div>最近提交 value：{customValue || 'None'}</div>
        <div>最近提交 selected-value：{customSelectedValue || 'None'}</div>
      </div>

      <h2>Custom trigger</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        Through<code>slot=&quot;trigger&quot;</code>Replace the default input with an editable component. A multiline
        trigger (<code>web-ui-textarea</code>
        ）保留 Enter 换行：Enter 不选择高亮项，panel 用 Escape 或 blur 关闭；panel 打开时 ArrowUp/ArrowDown
        移动文本光标。选中候选仍会把 label 回填到 trigger。
      </p>
      <h3>Multiline text trigger</h3>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete
          ref={multilineTriggerRef}
          placeholder="input name"
          onInput={handleMultilineInput}
          onChange={handleMultilineChange}
        >
          <web-ui-textarea
            slot="trigger"
            rows={3}
            className="[--wui-textarea-width:20rem]"
            placeholder="Multiline input: type to filter the options, Enter inserts a newline"
          />
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
        <div className="flex flex-wrap items-center gap-3">
          <web-ui-button variant="secondary" size="28" onClick={focusMultilineTrigger}>
            Focus the trigger
          </web-ui-button>
          <span className="text-sm text-(--wui-color-text-secondary)">
            The public focus() delegates to the current trigger
          </span>
        </div>
        <div>Current text (newlines render as typed):</div>
        <div className="whitespace-pre-wrap text-sm">{multilineText || 'None'}</div>
        <div>最近 change 文本：{multilineCommit.value || 'None'}</div>
        <div>最近 change selected-value：{multilineCommit.selectedValue || 'None'}</div>
      </div>
      <h3>Single-line input trigger</h3>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        单行自定义 trigger 保持默认 Enter 行为：panel 打开时 Enter 选择高亮项。
      </p>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete placeholder="input name" onInput={handleSingleLineInput}>
          <web-ui-input slot="trigger" placeholder="Single-line input: Enter selects the highlighted option" />
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
        <div>当前文本：{singleLineText || 'None'}</div>
      </div>

      <h2>No scroll lock</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete noScrollLock placeholder="Page scroll is not locked while open">
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>Required</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete required placeholder="Required, validation fails when empty">
          {cities.map(city => (
            <web-ui-option key={city} value={city} label={city}>
              {city}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>Disabled</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete value="Vue" placeholder="Disabled" disabled>
          {frameworks.map(name => (
            <web-ui-option key={name} value={name} label={name}>
              {name}
            </web-ui-option>
          ))}
        </web-ui-autocomplete>
      </div>

      <h2>Read only</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-autocomplete value="Vue" placeholder="Read only" readonly>
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
