import { off, on } from '@greypan/browser-kit'

const handleKeydown = event => {
  console.log('key pressed:', event.key)
}

on(window, 'keydown', handleKeydown)

// Detach when no longer needed
off(window, 'keydown', handleKeydown)
