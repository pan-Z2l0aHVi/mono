import { useRef, useState } from 'react'

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitted, setSubmitted] = useState('')
  const [size, setSize] = useState('m')

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
      <web-ui-radio name="size" value="s" checked={size === 's'} onChange={() => setSize('s')}>
        Small
      </web-ui-radio>
      <web-ui-radio name="size" value="m" checked={size === 'm'} onChange={() => setSize('m')}>
        Medium
      </web-ui-radio>
      <web-ui-radio name="size" value="l" checked={size === 'l'} onChange={() => setSize('l')}>
        Large
      </web-ui-radio>
      <div className="flex items-center gap-3">
        <web-ui-button type="submit">Submit</web-ui-button>
        <web-ui-button
          onClick={() => {
            formRef.current?.reset()
            setSubmitted('')
            setSize('m')
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
