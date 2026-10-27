import '@/locales/main.loader.js'

import { beforeEach } from 'vite-plus/test'

import { loadDemoLocale } from '@/i18n/locale'

beforeEach(async () => {
  await loadDemoLocale('en', false)
})
