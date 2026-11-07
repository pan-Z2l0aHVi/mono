// 包的入口。三类内容：
//   - 链协议：`defineRunner()` 是唯一的链基座（链头给恒等 `ok`，链中原样转发继承来的 `run`），
//     `defineCatch()` 把逃逸的异常收成 `throw: ` 前缀的 `Err`；
//   - 判定与能力插件：`defineXxx(options)` 返回插件，判定插件产 `run`，能力插件产方法；触发层
//     用 `.use()` 按想要的顺序组合，再 `.make({ root, env })` 得到实例；
//   - 叶子函数与常量：包内名字唯一、不需要上下文的部分实现，平铺后调用点最短。
//
// 每个目录的入口再导出自己的面，本文件只把它们并起来；`shared/` 不成体系，没有入口，由这里
// 直接指向具体模块。包内模块之间仍然 import 具体文件而不走目录入口：入口是再导出，跨目录经
// 入口互相 import 会把两个目录的全部模块拉进同一张模块图，`exec` 与 `git` 之间就会成环。
//
// Vite 侧的适配（取端口、dev HTTPS）不在这里，走 `@greypan/monorepo-kit/vite`：本入口的消费者是
// Node 脚本，不该为了两个配置符号把 Vite 的类型面摊给每个 import。

export * from './changesets'
export * from './exec'
export * from './git'
export * from './runner'
export * from './test-ports'
export * from './toolchain'
export * from './turbo'
export * from './workspace'

export { readJsonFile } from './shared/config'
export { byCodeUnit } from './shared/order'
export { getWorkspaceRoot } from './shared/workspace-root'
