import { imagePreview } from '@greypan/web-ui'

function openPreview() {
  const preview = imagePreview({
    images: [{ src: '/a.jpg', alt: 'Image A' }, { src: '/b.jpg' }],
    nav: true,
    toolbar: true,
    closable: true,
    indicator: true
  })

  preview.next()
  preview.zoomIn()
}
