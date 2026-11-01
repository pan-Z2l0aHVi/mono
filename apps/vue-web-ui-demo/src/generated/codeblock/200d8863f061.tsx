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
          `nickname=${typeof nickname === 'string' && nickname !== '' ? nickname : '(空)'} · submitter=${
            submitter === null ? 'null' : '非 null'
          }`
        )
      }}
    >
      <web-ui-input name="nickname" placeholder="昵称"></web-ui-input>
      <web-ui-button type="submit" variant="primary">
        提交
      </web-ui-button>
      <web-ui-button
        type="submit"
        variant="secondary"
        onClick={event => {
          event.preventDefault()
          setSubmitted('这次 click 被 preventDefault，没有提交')
        }}
      >
        提交但被拦下
      </web-ui-button>
      <web-ui-button type="reset" variant="ghost" onClick={() => setSubmitted('')}>
        重置
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">{submitted === '' ? '尚未提交' : submitted}</output>
    </form>
  )
}
