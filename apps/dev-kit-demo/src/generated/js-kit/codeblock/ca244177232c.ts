import { clamp, formatFileSize } from '@greypan/js-kit'

const clamped: number = clamp(120, 0, 100) // 100
const reversed: number = clamp(50, 100, 0) // 50
const size: string = formatFileSize(1_572_864, 2) // '1.5 MB'

console.log(clamped, reversed, size)
