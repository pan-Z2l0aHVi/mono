import type { WebUiEditableText } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

function EditableTextDemo() {
  const [title, setTitle] = useState('点击这行文字即可就地编辑')
  const [lastEvent, setLastEvent] = useState('（尚未触发）')
  const [submitted, setSubmitted] = useState<[string, string][]>([])
  const titleRef = useRef<WebUiEditableText>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // cancel 不在 React 的合成事件表里（onCancel 只覆盖 dialog），原生监听是唯一路径
  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    const handleCancel = () => setLastEvent('cancel（Escape 取消）')
    el.addEventListener('cancel', handleCancel)
    return () => el.removeEventListener('cancel', handleCancel)
  }, [])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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
      <h1>可编辑文本</h1>

      <h2>就地编辑</h2>
      <div className="mb-3 flex flex-col gap-3">
        <p className="text-sm leading-6 text-gray-600">
          文档标题：
          <web-ui-editable-text
            ref={titleRef}
            value={title}
            placeholder="请输入标题"
            aria-label="文档标题"
            onChange={event => {
              setTitle(event.currentTarget.value)
              setLastEvent('change（失焦提交）')
            }}
          />
        </p>
        <div className="text-sm text-gray-500">已提交的值：{title || '(空)'}</div>
        <div className="text-sm text-gray-500">最近事件：{lastEvent}</div>
      </div>
      <p className="mb-3 text-xs text-gray-400">
        💡 点击文字进入编辑并落点光标，失焦提交；Escape 取消并恢复进入编辑时的值
      </p>

      <h2>占位文本</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-editable-text value="有值时不显示占位文本" placeholder="占位文本" aria-label="有值示例" />
        <web-ui-editable-text placeholder="空值时显示占位文本" aria-label="空值示例" />
      </div>
      <p className="mb-3 text-xs text-gray-400">💡 提交空值即清空，文本层回退显示 placeholder</p>

      <h2>多行</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-editable-text
          className="w-80 rounded-sm bg-(--wui-color-surface-raised) p-2"
          value={'Enter 换行且保持编辑态\n第二行随盒宽自动折行，两态同盒'}
          placeholder="支持多行的占位文本"
          aria-label="多行示例"
        />
      </div>
      <p className="mb-3 text-xs text-gray-400">💡 Enter 插入换行；文本层与编辑层同盒同排版，进入编辑不产生位移</p>

      <h2>禁用</h2>
      <div className="mb-3 flex flex-col gap-3">
        <web-ui-editable-text value="禁用且有值：不聚焦、不进入编辑" disabled aria-label="禁用有值" />
        <web-ui-editable-text placeholder="禁用且空：显示占位文本" disabled aria-label="禁用空值" />
      </div>
      <p className="mb-3 text-xs text-gray-400">💡 禁用时宿主移出 tab 序列，指针与键盘都不进入编辑</p>

      <h2>表单</h2>
      <form
        ref={formRef}
        className="mb-3 flex flex-col items-start gap-3"
        onSubmit={handleSubmit}
        onReset={() => setSubmitted([])}
      >
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">标题</span>
          <web-ui-editable-text name="title" value="初始标题" aria-label="表单标题" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">简介（可留空）</span>
          <web-ui-editable-text
            className="w-80 rounded-sm bg-(--wui-color-surface-raised) p-2"
            name="bio"
            placeholder="请输入简介"
            aria-label="表单简介"
          />
        </div>
        <div className="flex gap-3">
          {/* web-ui-button 的内部 button 位于 shadow root 内，拿不到外层 form 的 form owner；
              提交与重置由 demo 显式驱动，表单关联仍走原生 submit/reset 事件。 */}
          <web-ui-button onClick={() => formRef.current?.requestSubmit()}>提交</web-ui-button>
          <web-ui-button variant="secondary" onClick={() => formRef.current?.reset()}>
            重置
          </web-ui-button>
        </div>
      </form>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-500">提交结果（FormData）</span>
        {submitted.length === 0 ? (
          <span className="text-sm text-gray-500">（尚未提交）</span>
        ) : (
          submitted.map(([name, value]) => (
            <span key={name} className="text-sm whitespace-pre-wrap text-gray-500">
              {name} = {value || '(空)'}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

export default EditableTextDemo
