import { copyToClipboard } from '@greypan/browser-kit/copy'
import { defineHistoryNav } from '@greypan/browser-kit/history-nav'

await copyToClipboard('https://example.com/share')
await copyToClipboard(new Blob(['<b>Copied</b>'], { type: 'text/html' }))

const nav = defineHistoryNav({ namespace: 'my-app' })
const stop = nav.onCurrentEntryChange(({ from, navigationType }) => {
  console.log(navigationType, from?.url, '->', nav.currentEntry?.url)
})

if (nav.canGoBack) {
  history.back()
}

stop()
