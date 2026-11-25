import { definePlugin } from '@greypan/js-kit'

const defineLogger = () => definePlugin(() => ({ log: (message: string) => console.log(message) }))
const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

const app = defineLogger().use(defineAuth()).make()

app.log('hello')
console.log(app.token)
