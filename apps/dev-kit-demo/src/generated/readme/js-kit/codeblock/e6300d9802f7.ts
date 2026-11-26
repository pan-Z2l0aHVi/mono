import { definePlugin } from '@greypan/js-kit/plugin-system'

const defineLogger = () =>
  definePlugin(() => ({
    log: (message: string) => console.log(`[app] ${message}`)
  }))

const definePrefix = (prefix: string) =>
  definePlugin((ctx: { log: (message: string) => void }) => ({
    log: (message: string) => ctx.log(`${prefix}: ${message}`)
  }))

const app = defineLogger().use(definePrefix('auth')).make()
app.log('token refreshed') // [app] auth: token refreshed
