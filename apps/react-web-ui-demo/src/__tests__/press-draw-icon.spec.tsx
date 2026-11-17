import '@greypan/web-ui/components/button'
import '@greypan/web-ui/components/icon'
import '@greypan/web-ui/components/svg-draw-lines'

import type { WebUiIcon, WebUiSvgDrawLines } from '@greypan/web-ui'
import { akarIconsCircleCheck, lucideCopy } from '@greypan/web-ui/icons'
import { render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vite-plus/test'

import { PressDrawIcon } from '@/components/PressDrawIcon'

describe('PressDrawIcon', () => {
  it('点击同步切换图标后在下一帧对新图标触发 replay，快速连点也会重播', async () => {
    function Demo() {
      const [copied, setCopied] = useState(false)
      return (
        <web-ui-button onClick={() => setCopied(true)}>
          <PressDrawIcon>
            {copied ? <web-ui-icon icon={akarIconsCircleCheck} /> : <web-ui-icon icon={lucideCopy} />}
          </PressDrawIcon>
        </web-ui-button>
      )
    }

    const view = render(<Demo />)
    const lines = view.container.querySelector<WebUiSvgDrawLines>('web-ui-svg-draw-lines')!
    const replayedIcons: unknown[] = []
    const replaySpy = vi.spyOn(lines, 'replay').mockImplementation(async () => {
      replayedIcons.push(lines.querySelector<WebUiIcon>('web-ui-icon')?.icon)
    })

    const button = view.container.querySelector<HTMLElement>('web-ui-button')!
    button.click()
    await waitFor(() => expect(replaySpy).toHaveBeenCalledTimes(1))
    expect(replayedIcons[0]).toBe(akarIconsCircleCheck)

    // 已处于对勾状态时再次快速点击，仍触发一次 replay
    button.click()
    await waitFor(() => expect(replaySpy).toHaveBeenCalledTimes(2))
    expect(replayedIcons[1]).toBe(akarIconsCircleCheck)

    view.unmount()
  })
})
