import { off, on } from '@greypan/browser-kit'

const handleKeydown = event => {
  console.log('按下按键:', event.key)
}

on(window, 'keydown', handleKeydown)

// 不再需要时移除监听
off(window, 'keydown', handleKeydown)
