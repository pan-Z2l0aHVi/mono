// Vite 配置文件的适配面：`vite.config.ts` 在求值时取本机端口段与 dev 证书，这两件事都发生在
// 构建配置里，不是提交边界上的判定，所以是叶子函数而不是插件。主入口不导出它们：入口的消费者
// 是 Node 脚本，不该为了两个符号把 Vite 的类型面摊给所有 import。

import { defineTestPorts, type TestPortsApi } from './plugin/test-ports/test-ports'
import { getWorkspaceRoot } from './shared/workspace-root'

export { devHttpsPlugin } from './plugin/dev-https/dev-https'
export type { DevHttpsOptions } from './plugin/dev-https/dev-https'

// 端口表按首次调用读取：模块顶层读文件会让每个 import 它的配置都碰一次文件系统。
const defaultPorts = defineTestPorts()
let defaultApi: TestPortsApi | undefined

function ports(): TestPortsApi {
  defaultApi ??= defaultPorts.make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })
  return defaultApi
}

/**
 * 取某个项目的基端口，偏移量读 `GREYPAN_TEST_PORT_OFFSET`。
 * 项目名在编译期只是 `string`，未知名字在这里报错并列出可选值。
 */
export function testApiPort(name: string): number {
  return ports().port(name)
}
