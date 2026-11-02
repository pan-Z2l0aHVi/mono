import { useState } from 'react'

export default function Demo() {
  const [size, setSize] = useState('m')

  return (
    <web-ui-radio-group name="size" value={size} onInput={event => setSize(event.currentTarget.value)}>
      <web-ui-radio value="s">Small</web-ui-radio>
      <web-ui-radio value="m">Medium</web-ui-radio>
      <web-ui-radio value="l">Large</web-ui-radio>
    </web-ui-radio-group>
  )
}
