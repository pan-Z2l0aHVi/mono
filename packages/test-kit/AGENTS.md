# test-kit 包指令

- 这是供其他包复用的 Vitest browser mode + MSW 基础设施；修改 MSW 生命周期或 browser-mode 配置前先读 [`docs/agents/testing.md`](../../docs/agents/testing.md)。
- tracker spec 共享浏览器全局变量和一个 service worker，因此保持文件串行；除非移除共享状态，不要重新启用文件并行。
- 公共行为通过公共 API 添加聚焦测试；不要把测试基础设施约束复制到消费包的指令中。
