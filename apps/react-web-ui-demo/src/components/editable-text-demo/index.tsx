import type { WebUiEditableText } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

function EditableTextDemo() {
  const [title, setTitle] = useState('Click this line to edit in place')
  const [lastEvent, setLastEvent] = useState('(not triggered yet)')
  const [submitted, setSubmitted] = useState<[string, string][]>([])
  const titleRef = useRef<WebUiEditableText>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // cancel 不在 React 的合成事件表里（onCancel 只覆盖 dialog），原生监听是唯一路径
  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    const handleCancel = () => setLastEvent('cancel (Escape discards)')
    el.addEventListener('cancel', handleCancel)
    return () => el.removeEventListener('cancel', handleCancel)
  }, [])

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const entries: [string, string][] = []
    for (const [name, value] of data.entries()) {
      if (typeof value === 'string') entries.push([name, value])
    }
    setSubmitted(entries)
  }

  return (
    <div>
      <h1>editable text</h1>

      <h2>Edit in place</h2>
      <div className="mb-3 flex flex-col gap-3">
        <p className="text-sm leading-6 text-gray-600">
          文档标题：
          <web-ui-editable-text
            ref={titleRef}
            value={title}
            placeholder="Enter a title"
            aria-label="Document title"
            onChange={event => {
              setTitle(event.currentTarget.value)
              setLastEvent('change (Enter or blur commits)')
            }}
          />
        </p>
        <div className="text-sm text-gray-500">已提交的值：{title || '(empty)'}</div>
        <div className="text-sm text-gray-500">最近事件：{lastEvent}</div>
      </div>
      <p className="mb-3 text-xs text-gray-400">
        💡 点击文字进入编辑并落点光标，Enter 或失焦提交；仅 Escape 取消并恢复进入编辑时的值
      </p>

      <h2>Placeholder</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-editable-text
          value="Placeholder hidden while a value exists"
          placeholder="Placeholder"
          aria-label="With value"
        />
        <web-ui-editable-text placeholder="Placeholder shown while empty" aria-label="Empty" />
      </div>
      <p className="mb-3 text-xs text-gray-400">
        💡 Submitting an empty value clears it (Enter or blur); the text layer falls back to the placeholder
      </p>

      <h2>Multiline</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-editable-text
          className="w-80 rounded-sm bg-(--wui-color-surface-raised) p-2"
          value={
            'Newlines inside the value render as usual\nThe second line wraps with the box width, both states share one box'
          }
          placeholder="Multiline placeholder"
          aria-label="Multiline"
        />
      </div>
      <p className="mb-3 text-xs text-gray-400">
        💡 Enter submits instead of inserting a newline; the text layer and the editing layer share one box, so entering
        editing causes no shift
      </p>

      <h2>Disabled</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-editable-text
          value="Disabled with a value: not focusable, no editing"
          disabled
          aria-label="Disabled with value"
        />
        <web-ui-editable-text
          placeholder="Disabled and empty: shows the placeholder"
          disabled
          aria-label="Disabled empty"
        />
      </div>
      <p className="mb-3 text-xs text-gray-400">
        💡 While disabled the host leaves the tab order, and neither pointer nor keyboard enters editing
      </p>

      <h2>Form</h2>
      <form
        ref={formRef}
        className="mb-3 flex flex-col items-start gap-3"
        onSubmit={handleSubmit}
        onReset={() => setSubmitted([])}
      >
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Title</span>
          <web-ui-editable-text name="title" value="Initial title" aria-label="Form title" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Summary (optional)</span>
          <web-ui-editable-text
            className="w-80 rounded-sm bg-(--wui-color-surface-raised) p-2"
            name="bio"
            placeholder="Enter a summary"
            aria-label="Form summary"
          />
        </div>
        <div className="flex gap-3">
          {/* web-ui-button 的内部 button 位于 shadow root 内，拿不到外层 form 的 form owner；
              提交与重置由 demo 显式驱动，表单关联仍走原生 submit/reset 事件。 */}
          <web-ui-button onClick={() => formRef.current?.requestSubmit()}>Submit</web-ui-button>
          <web-ui-button variant="secondary" onClick={() => formRef.current?.reset()}>
            Reset
          </web-ui-button>
        </div>
      </form>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-500">Submitted value (FormData)</span>
        {submitted.length === 0 ? (
          <span className="text-sm text-gray-500">(not submitted yet)</span>
        ) : (
          submitted.map(([name, value]) => (
            <span key={name} className="text-sm whitespace-pre-wrap text-gray-500">
              {name} = {value || '(empty)'}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

export default EditableTextDemo
