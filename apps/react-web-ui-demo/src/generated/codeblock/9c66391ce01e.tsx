import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-center gap-4"
      onSubmit={event => {
        event.preventDefault()
        const fields: string[] = []
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === 'string') fields.push(`${name}=${value}`)
        }
        setSubmitted(fields.join(' · ') || '(没有字段)')
      }}
    >
      <web-ui-switch name="newsletter" value="yes" required></web-ui-switch>
      <span className="text-sm text-(--wui-color-text-secondary)">订阅邮件：必填</span>
      <web-ui-button type="submit">提交</web-ui-button>
      <web-ui-button
        onClick={() => {
          formRef.current?.reset()
          setSubmitted('')
        }}
      >
        重置
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">{submitted === '' ? '尚未提交' : submitted}</output>
    </form>
  )
}
