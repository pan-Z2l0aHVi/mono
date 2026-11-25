import { base64ToFile, fileToBase64, getImageInfo, isSameFileType, isValidBase64 } from '@greypan/browser-kit'

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const valid = isValidBase64(pngDataUrl)
const fileA = base64ToFile(pngDataUrl, 'pixel-a')
const fileB = base64ToFile(pngDataUrl, 'pixel-b')

const [dataUrl, info, sameType] = await Promise.all([
  fileToBase64(fileA),
  getImageInfo(fileA),
  isSameFileType(fileA, fileB)
])

console.log({ valid, dataUrlPrefix: dataUrl.slice(0, 22), info, sameType })
