import { definePlugin } from '@greypan/js-kit'

const defineLogger = () =>
  definePlugin(() => ({
    log: msg => `[log] ${msg}`
  }))

const defineAuth = () =>
  definePlugin(ctx => ({
    token: 'demo-token',
    authLog: msg => `${ctx.log(msg)} (token: demo-token)`
  }))

const app = defineLogger().use(defineAuth()).make()

console.log(app.authLog('request sent'))
