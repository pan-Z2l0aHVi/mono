---
'@greypan/monorepo-kit': patch
---

新增 `defineTestPortCallSites(options)` 检查：端口分配与各 `vite.config.ts` 调用点的一致性判据收进包里，扫描 glob 与调用名由消费仓库传入，项目名取自同一份分配。`test-ports` 的包内测试改为夹具驱动、不再读包外文件，包级 `turbo.json` 随之删除；本仓端口表的文档副本移除，唯一事实是根 `monorepo.json`。
