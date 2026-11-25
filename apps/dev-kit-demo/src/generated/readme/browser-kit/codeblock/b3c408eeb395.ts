import { defineLocal } from '@greypan/browser-kit'

const storage = defineLocal('my-app')

storage.set('user', { name: 'Alice' })
storage.get<{ name: string }>('user') // { name: 'Alice' }

// 一小时后过期（单位 ms）
storage.set('token', 'abc123', 3_600_000)

// 监听同源其他标签页的变更
const unwatch = storage.watch<{ name: string }>('user', (next, prev) => {
  console.log('其他标签页更新了 user', next, prev)
})
unwatch()
