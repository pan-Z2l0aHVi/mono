---
'@greypan/monorepo-kit': patch
---

包内目录改为按能力竖切：`plugins/` 与 `checks/` 合并成 `plugin/<能力>/`，一个能力一个目录，能力插件与它承载的参数化判定同住（`changesets`、`exec`、`git`、`test-ports`、`toolchain`、`turbo`、`workspace`），分区从四个减为三个。一份判定归谁看它的权威输入由哪个能力拥有，不看它 import 了几个能力；测试跟着进各能力目录的 `__tests__/`。模块文件名、`defineXxx` 导出面与检查协议都不变，`exports` 仍只有 `"."`；引用包内文件路径的外部配置需改路径，本仓已同步 `apps/*-web-ui-demo/turbo.json` 的 `test.inputs` 与 `skills/monorepo-change-impact/repo-query.mjs` 的前缀判定。
