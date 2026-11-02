import { useState } from 'react'

export default function Demo() {
  const [picked, setPicked] = useState(['banana'])

  return (
    <web-ui-checkbox-group name="fruit" value={picked} onInput={event => setPicked(event.currentTarget.value)}>
      <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
      <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
    </web-ui-checkbox-group>
  )
}
