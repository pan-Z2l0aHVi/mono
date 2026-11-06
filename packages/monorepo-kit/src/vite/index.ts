// Vite 配置文件的适配面：dev 证书与浏览器测试的 API 端口都在 `vite.config.ts` 求值时生效，不是
// 提交边界上的判定，所以是 Vite 插件而不是 js-kit 插件。主入口不导出它们：入口的消费者是 Node
// 脚本，不该为了两个配置符号把 Vite 的类型面摊给每个 import。

export { devHttpsPlugin, type DevHttpsOptions } from './dev-https'
export { testPorts, type TestPortsPluginOptions } from './ports'
