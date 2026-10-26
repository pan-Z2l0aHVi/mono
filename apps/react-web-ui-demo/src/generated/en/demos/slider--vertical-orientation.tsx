import { useState } from 'react'

export default function Demo() {
  const [brightness, setBrightness] = useState(60)
  const [volume, setVolume] = useState(30)

  return (
    <div className="flex items-start gap-10">
      <div className="flex flex-col items-center gap-3">
        <web-ui-slider
          aria-label="Vertical brightness"
          vertical
          value={brightness}
          onInput={event => setBrightness(event.currentTarget.value)}
        ></web-ui-slider>
        <span className="text-xs text-(--wui-color-text-secondary)">{brightness}</span>
      </div>

      <div className="flex flex-col items-center gap-3">
        <web-ui-slider
          aria-label="Vertical volume"
          vertical
          marks
          step={10}
          value={volume}
          onInput={event => setVolume(event.currentTarget.value)}
        ></web-ui-slider>
        <span className="text-xs text-(--wui-color-text-secondary)">{volume}</span>
      </div>
    </div>
  )
}
