import { definePlugin } from '@greypan/js-kit'

const defineLogger = () =>
  definePlugin(() => ({
    log: (msg: string) => `[log] ${msg}`
  }))

const defineAuth = () =>
  definePlugin((ctx: { log: (msg: string) => string }) => ({
    token: 'demo-token',
    authLog: (msg: string) => `${ctx.log(msg)} (token: demo-token)`
  }))

const app = defineLogger().use(defineAuth()).make()

console.log(app.authLog('request sent'))
