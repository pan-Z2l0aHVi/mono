import { imagePreview } from '@greypan/web-ui'

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
  return (
    <web-ui-button
      onClick={() => imagePreview({ images: IMAGES, nav: true, toolbar: true, closable: true, indicator: true })}
    >
      打开预览（全部控件）
    </web-ui-button>
  )
}
