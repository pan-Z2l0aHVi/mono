# 浏览器目标与本地服务

本文件承接 [`build.md`](./build.md) 的浏览器切面：消费方的目标声明、构建期 CSS 与 engines、本地 HTTPS 安全上下文，以及浏览器测试的端口分配。测试该跑哪里见 [`verification.md`](./verification.md)，浏览器进程归属见 [`browser-resources.md`](./browser-resources.md)。

## 浏览器目标与应用构建

消费方在各自的 package manifest 中声明同一份 browserslist 目标，根 [`package.json`](../../package.json) 没有目标值；改目标时同步所有声明处，也就是各 manifest 的 browserslist 与 `web-ui` 的 `pack.target`——产物实际用的是 `pack.target`，manifest 里的 browserslist 只作文档性声明，两者目前手工双写。`web-ui` 是唯一在构建时输出 CSS 的包；静态 `color-mix()` 由 lightningcss 求值，含 `var()` 的 `color-mix()` 保留为运行时 CSS。纯 JavaScript 库包统一声明 `engines`，具体值以各包 manifest 为准。

## 本地 HTTPS

各文档 demo 通过 `@greypan/monorepo-kit/vite` 的 `devHttpsPlugin()` 为 dev/preview 提供安全上下文：Service Worker 与 `navigator.clipboard` 只在安全上下文可用，而 demo 设了 `server.host: true`。证书由本机 mkcert 生成，放在 `~/.config/greypan/dev-certs/`，同一台机器的所有 worktree 共用；准备步骤见 [`worktree.md`](./worktree.md#本地-https-证书)。插件只在 `serve` 档生效，生产构建不读证书。测试档在证书存在时沿用同一份 HTTPS，CI 没有本机证书时保持 HTTP（Playwright 自身忽略证书错误），不按 `VITEST` 分叉。各 demo 的插件、测试面与构建差异以各应用 `vite.config.ts` 与 [`verification.md`](./verification.md) 为准。`depsReload` 监听库的 `dist/` 目录，本地依赖变化时触发整页刷新。嵌套 WebView 前端遵循对应框架 demo 的 Vite 插件与本地包约定。

## 测试端口分配

浏览器测试的 API 端口从根 [`monorepo.json`](../../monorepo.json) 的 `testPorts` 取，不要在 `vite.config.ts` 里写裸数字。每个 project 占一个 `bandWidth` 宽的段，留出 Vite 在端口被占时 +1 重试的空间；登记了哪些 project、各自占哪一段，以该文件为准。

新增 browser project 时在 `monorepo.json` 里占一个空闲段，并在它的 `vite.config.ts` 顶层 `plugins` 里挂上 `@greypan/monorepo-kit/vite` 的 `testPorts({ project: '<project>', testName: '<vitest project 名>' })`——用法和其他 Vite 插件一样，端口由插件在配置求值时写进那个 project 的 `test.api`。配置里有多个 project 时必须给 `testName`：测试运行器会为根配置求值一遍、再为每个跑到的 project 各求值一遍，插件只在能看见全部 project 的那一遍按名字认领要写的块，所以同一份配置里的 jsdom project 不会被抢走端口；写错的名字在那里直接报错，而不是悄悄落回默认端口。分配与调用点的一致性由 `pnpm run check-policy` 中的 `test-port-call-sites` 检查守护：它扫描全仓 `vite.config.ts` 里 `testPorts()` 的 `project:` 字面量实参，集合必须与配置完全相等，且每个段位只被一个 project 引用。同一台机器上并行多个 worktree 时，给每个 worktree 导出不同的 `GREYPAN_TEST_PORT_OFFSET`（`offsetStride` 的整数倍）整体错开；不设时为 0，端口就是固定值，不随 worktree 变化。

偏移是整表平移，所以同一 worktree 内的相对间隔不受影响；要守的是**不同 worktree 的两组端口不重叠**，因此偏移步长 `offsetStride` 不得小于全表跨度。读取配置时校验「段间不重叠」与「跨度不超过步长」两条，任一条不成立直接抛错，而不是悄悄和其他 worktree 抢端口。

`api.host` 由插件统一写成 `127.0.0.1`。测试运行器的端口可用性探测只绑通配地址，看不见只占 `127.0.0.1` 的进程——macOS 上通配绑定与具体地址上的监听可以共存；真正把关的是随后的那次绑定。文档 demo 与 Interweave 的顶层 `server.host` 是 `true`，不写 `api.host` 时测试服务器会继承成通配绑定：别的进程占着 `127.0.0.1` 上的同号端口不会让它失败，两个服务器同号并行，页面可能落到别人的服务器上，症状是 `ERR_SSL_PROTOCOL_ERROR` / `ERR_EMPTY_RESPONSE` / browser runtime 永不连回。钉成 `127.0.0.1` 后绑定目标与占用者同址，才出 EADDRINUSE，非 strict 分支才会 +1 前进，测试运行器再按实际监听地址把浏览器指过去。`web-ui` 与 `browser-kit` 没有顶层 `server`，默认本来就是 `localhost`；插件对所有 project 走同一条路径，行为不因顶层配置的增删而改变。

`api.strictPort: false` 同样由插件一起写。测试运行器会把顶层 `server` 的 `strictPort: true` 一并带进测试服务器，而 Interweave 的 dev server 正需要它（端口被占就硬失败，否则 webview 指向空气），测试服务器不需要——端口被占时它会直接 `Startup Error`，而不是按实际监听地址漂移。写进 `api` 的那一份压过顶层继承来的值，所以每个包都拿得到漂移空间，不必各自在配置里再写一遍。实测判据：占住某个 project 的基端口再跑它的 browser 档，服务器前进到段内下一个端口并且全绿。

`monorepo.json` 记在根 [`turbo.json`](../../turbo.json) 的 `globalDependencies` 里：各 browser project 所在的 `test` 任务都经自己包的 `vite.config.ts` 读它，而 turbo 只对包目录内的文件做哈希，不列出来就会在改配置之后重放上一份缓存的绿色结果。放在根而不是各消费包自己的 `test.inputs`：新增 browser project 时不会漏登记，代价是改这份配置会让全部缓存失效，而它很少改。读取它的插件实现在 `@greypan/monorepo-kit` 包目录内，`monorepo-kit#build` 的哈希与 `dist/` 经 `^build` 的传播已经覆盖它，不必在根登记。两者失效的路径不同——表变而代码不变时构建哈希不动，只有这份根登记能失效消费者的 `test`。

dev server 不读这份分配：文档 demo 不写端口，Vite 从默认端口起、被占则 +1，实际 URL 会变，脚本与文档不要写死；Interweave 的 9245 带 `strictPort`，端口被占直接失败（Wails 需要确定的前端 URL，静默漂移会让 webview 指向空气），改端口用 `WAILS_VITE_PORT`——Taskfile 与 `vite.config.ts` 读同一个变量。反向也一样：测试端口不能当作 dev server URL 使用。
