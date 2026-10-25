import { imagePreview } from '@greypan/web-ui'
import { useState } from 'react'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('第一张', '#0a84ff', '#5e5ce6'), alt: '蓝色渐变的示例图' },
  { src: gradientImage('第二张', '#ff375f', '#ff9f0a'), alt: '橙红渐变的示例图' },
  { src: gradientImage('第三张', '#30d158', '#0a84ff'), alt: '青绿渐变的示例图' }
]

export default function Demo() {
  const [status, setStatus] = useState('尚未打开')

  function open() {
    const preview = imagePreview({ images: IMAGES, toolbar: true })
    // 切图会把缩放复位到 1x，所以先 goTo 再 zoomIn。
    preview.goTo(1)
    preview.zoomIn()
    setStatus(`第 ${preview.index + 1} 张 · 缩放 ${Math.round(preview.scale * 100)}%`)
    void preview.closed.then(() => setStatus('预览已关闭'))
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button onClick={open}>打开并跳到第 2 张</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">{status}</output>
    </div>
  )
}
