import { getRootScrollLeft, getRootScrollTop, getViewportSize } from '@greypan/browser-kit'

const viewport = getViewportSize()
const scroll = {
  top: getRootScrollTop(),
  left: getRootScrollLeft()
}

console.log({ viewport, scroll })
