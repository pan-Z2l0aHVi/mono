import { copyToClipboard } from '@greypan/browser-kit'

await copyToClipboard('Hello from @greypan/browser-kit')
await copyToClipboard(new Blob(['<b>Hi</b>'], { type: 'text/html' }))
