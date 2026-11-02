import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')
  const [day, setDay] = useState('wed')

  return (
    <form
      ref={formRef}
      className="flex flex-col items-start gap-3"
      onSubmit={event => {
        event.preventDefault()
        const fields: string[] = []
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === 'string') fields.push(`${name}=${value}`)
        }
        setSubmitted(fields.join(' · '))
      }}
    >
      <web-ui-segmented name="day" value={day} onInput={event => setDay(event.currentTarget.value)}>
        <web-ui-segmented-trigger value="mon">周一</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="tue">周二</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="wed">周三</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="thu">周四</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="fri">周五</web-ui-segmented-trigger>
      </web-ui-segmented>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button type="submit">提交</web-ui-button>
        <web-ui-button
          onClick={() => {
            formRef.current?.reset()
            setSubmitted('')
            setDay('wed')
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
