import { useState } from 'react'

export default function Demo() {
  const [size, setSize] = useState('m')

  return (
    <web-ui-radio-group name="size" value={size} onInput={event => setSize(event.currentTarget.value)}>
      <web-ui-radio value="s">小</web-ui-radio>
      <web-ui-radio value="m">中</web-ui-radio>
      <web-ui-radio value="l">大</web-ui-radio>
    </web-ui-radio-group>
  )
}
