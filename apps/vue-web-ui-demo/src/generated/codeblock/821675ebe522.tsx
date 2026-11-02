import { useState } from 'react'

export default function Demo() {
  const [submitted, setSubmitted] = useState('')

  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={event => {
        event.preventDefault()
        const nickname = new FormData(event.currentTarget).get('nickname')
        const submitter = (event.nativeEvent as SubmitEvent).submitter
        setSubmitted(
          `nickname=${typeof nickname === 'string' && nickname !== '' ? nickname : '(empty)'} · submitter=${
            submitter === null ? 'null' : 'non-null'
          }`
        )
      }}
    >
      <web-ui-input name="nickname" placeholder="Nickname"></web-ui-input>
      <web-ui-button type="submit" variant="primary">
        Submit
      </web-ui-button>
      <web-ui-button
        type="submit"
        variant="secondary"
        onClick={event => {
          event.preventDefault()
          setSubmitted('This click was preventDefault-ed; nothing was submitted')
        }}
      >
        Submit but blocked
      </web-ui-button>
      <web-ui-button type="reset" variant="ghost" onClick={() => setSubmitted('')}>
        Reset
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        {submitted === '' ? 'Not submitted yet' : submitted}
      </output>
    </form>
  )
}
