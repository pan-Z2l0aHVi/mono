---
'@greypan/interweave-frontend': patch
---

fix(interweave-frontend): browser project 的测试服务器不再继承 dev server 的 strictPort

机制是继承而不是撞号：vitest browser 插件的 `vitest:browser:config` 钩子构造测试服务器时写的是
`viteConfig.server = { ...viteConfig.server, port: defaultPort, ...api, middlewareMode: false, open: false }`，
把顶层 `server` 整块铺开、只覆盖 `port`，于是顶层那个给 Wails 用的 `strictPort: true` 被测试服务器一并继承。

dev server 需要 strictPort：端口被占就硬失败，否则 Wails 的 webview 指向空气。测试服务器不需要——vitest 自己起它，
再按服务器实际监听的地址（`resolvedUrls?.local[0] ?? resolvedUrls?.network[0]`）把浏览器指过去，端口漂移零代价，
被继承的 strictPort 却会让整包 browser 用例在开跑之前直接判红。

这条线最初由 CI 上一次 `@greypan/interweave-frontend#test` 失败暴露：报错是 `Error: Port 63315 is already in use`，
而同一轮那个包的 205 条 jsdom 用例全过。那次红时 browser project 还没有固定端口（`api` 是后来 PR #243 才加的），
所以残留到今天的是同一机制在已固定端口上的形态——63413 自己被占时硬失败，而不是向上探测。

修法是在 browser project 的 `browser.api` 里显式写 `strictPort: false`，把这条失败模式留在 dev server 一侧。
占住 63413 跑该 project：改前硬抛 `Port 63413 is already in use`（`Test Files no tests` / `Errors 1 error`），
改后 Vite 向上探测换到 63414 并 13 条用例全过；顶层 `strictPort: true` 未动，占住 9245 起 dev server 仍照旧硬失败。
