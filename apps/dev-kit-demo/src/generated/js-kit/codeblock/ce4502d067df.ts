import { definePlugin } from '@greypan/js-kit'

const defineLogger = () =>
  definePlugin(() => ({
    log: (message: string) => `[log] ${message}`
  }))

const defineAuth = () =>
  definePlugin(() => ({
    token: 'demo-token'
  }))

const app = defineLogger().use(defineAuth()).make()
console.log(app.log(app.token))
