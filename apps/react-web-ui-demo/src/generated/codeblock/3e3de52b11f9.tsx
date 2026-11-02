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
          if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n') || '(empty)'}`)
        }
        setSubmitted(fields.join(' · ') || '(no fields)')
      }}
    >
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm text-(--wui-color-text-secondary)">Title</span>
        <web-ui-editable-text name="title" value="Initial title" aria-label="Title"></web-ui-editable-text>
      </div>
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm text-(--wui-color-text-secondary)">Summary: optional</span>
        <web-ui-editable-text
          name="bio"
          className="w-80"
          placeholder="Write a one-line summary"
          aria-label="Summary"
        ></web-ui-editable-text>
      </div>
      <div className="flex items-center gap-3">
        <web-ui-button type="submit">Submit</web-ui-button>
        <web-ui-button
          onClick={() => {
            formRef.current?.reset()
            setSubmitted('')
          }}
        >
          Reset
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          {submitted === '' ? 'Not submitted yet' : submitted}
        </output>
      </div>
    </form>
  )
}
