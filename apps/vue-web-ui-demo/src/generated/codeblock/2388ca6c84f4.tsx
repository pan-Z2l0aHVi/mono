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
        const volume = new FormData(event.currentTarget).get('volume')
        setSubmitted(typeof volume === 'string' ? volume : '')
      }}
    >
      <web-ui-slider aria-label="Form volume" name="volume" step={5} value={40}></web-ui-slider>
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
        {submitted === '' ? 'Not submitted yet' : `volume=${submitted}`}
      </output>
    </form>
  )
}
