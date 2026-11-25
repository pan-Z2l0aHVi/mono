import { defineLocal } from '@greypan/browser-kit'

const store = defineLocal('my-app')

store.set('profile', { name: 'Alice', role: 'admin' })
const profile = store.get<{ name: string; role: string }>('profile')

// 5 秒后过期
store.set('otp', '482910', 5_000)

// 仅监听跨标签页变更（浏览器原生 storage 事件不会在同一标签页触发）
const unwatch = store.watch<string>('otp', (next, prev) => {
  console.log('跨标签页 otp 变更', { next, prev })
})

unwatch()
console.log(profile)
