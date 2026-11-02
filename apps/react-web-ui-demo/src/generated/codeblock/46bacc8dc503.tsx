import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      ref={formRef}
      className="flex w-full flex-col items-start gap-3"
      onSubmit={event => {
        event.preventDefault()
        const fields: string[] = []
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n') || '(空)'}`)
        }
        setSubmitted(fields.join(' · ') || '(没有字段)')
      }}
    >
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm text-(--wui-color-text-secondary)">标题</span>
        <web-ui-editable-text name="title" value="初始标题" aria-label="标题"></web-ui-editable-text>
      </div>
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm text-(--wui-color-text-secondary)">摘要：可留空</span>
        <web-ui-editable-text
          name="bio"
          className="w-80"
          placeholder="写一句摘要"
          aria-label="摘要"
        ></web-ui-editable-text>
      </div>
      <div className="flex items-center gap-3">
        <web-ui-button type="submit">提交</web-ui-button>
        <web-ui-button
          onClick={() => {
            formRef.current?.reset()
            setSubmitted('')
          }}
        >
          重置
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          {submitted === '' ? '尚未提交' : submitted}
        </output>
      </div>
    </form>
  )
}
