import { clamp, formatFileSize } from '@greypan/js-kit'

const clamped = clamp(120, 0, 100) // 100
const reversed = clamp(50, 100, 0) // 50
const size = formatFileSize(1_572_864, 2) // '1.5 MB'

console.log(clamped, reversed, size)
