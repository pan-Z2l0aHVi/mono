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
          if (typeof value === 'string') fields.push(`${name}=${value.replace(/\n/g, '\\n')}`)
        }
        setSubmitted(fields.join(' · ') || '(no fields)')
      }}
    >
      <web-ui-textarea
        name="notes"
        rows={3}
        required
        minlength={10}
        placeholder="Notes: required, at least 10 characters"
      ></web-ui-textarea>
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
