import '@/assets/global.css'
import '@/generated/examples.css'

import { createRoot } from 'react-dom/client'

import App from '@/app'
import { loadShellLocale } from '@/i18n/locale'

// 中文是源语种，它的 catalog 就是首帧的壳文案。先装好再挂载，避免渲染期拿到空运行时；
// 目标语种由 LocaleProvider 在挂载后异步换入。
await loadShellLocale('zh-CN')

createRoot(document.getElementById('root')!).render(<App />)
