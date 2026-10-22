import { useState } from 'react'

export default function Demo() {
  const [volume, setVolume] = useState(30)

  return (
    <web-ui-slider
      value={volume}
      aria-label="受控音量"
      min={0}
      max={100}
      onInput={event => setVolume(event.currentTarget.value)}
    ></web-ui-slider>
  )
}
