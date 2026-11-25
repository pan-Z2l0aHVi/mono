import { defineLocal } from '@greypan/browser-kit'

const storage = defineLocal('my-app')

storage.set('user', { name: 'Alice' })
storage.get('user') // { name: 'Alice' }

// 一小时后过期
storage.set('token', 'abc123', 3600_000)

// 监听其他标签页的变更
const unwatch = storage.watch('user', (newValue, oldValue) => {
  console.log('user changed', newValue, oldValue)
})
