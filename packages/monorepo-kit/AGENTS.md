# monorepo-kit

本仓库门禁、策略检查与构建编排的实现包。源码为 TypeScript，构建产物与导出布局以 `package.json` 为准；消费方经包名读 `dist/`，不手写产物、不跨包引用 `src/`。门禁依赖产物新鲜度：根 `check-pre-commit` 与 CI 会先构建；绕过它们直接跑 `check-policy` 会读到旧产物。

- **入口按消费者分**：`.` 面向 Node 脚本，`./vite` 只放 Vite 配置求值期插件；导出表以 `package.json` 为准，包内专用模块不进公共入口。
- **包内引用用相对路径指到具体文件**：写成包名会绕回入口成环，也不借目录 barrel。
- **链协议由测试与 tsc 守住**：跨插件仅 `run` 可重名且须同签名，其余上下文键不得重名（`use` 合并时静默覆盖）；装配期参数走 `defineXxx(options)`，仓库事实经 `.make({ root, env })` 注入。协议与分区细节见 [`README.md`](./README.md)、[ADR-0018](../../docs/adr/0018-monorepo-kit-generic-plugins.md) 与 [ADR-0022](../../docs/adr/0022-monorepo-kit-plugin-chain.md)，判据以 `src/runner/` 的协议扫描测试为准。
- **模块顶层不写进程输出**：只做纯计算与常量校验，不读写文件、不起子进程、不查仓库根；失败证据走 `Err`。该约束由扫 `src/` 的判据守护。
- **分区判据是「这段代码是否知道本仓库的名字、路径或数据」**：`src/` 一个能力一个目录，目录 `index.ts` 是该分对外面；本仓库策略在根 `scripts/policies/`。
- **测试放所属能力目录的 `__tests__/`**，文件名 `*.spec.ts`，由包自己的 `test`（`vp test run`）运行；`test-scripts` 只跑全仓 `*.test.mjs`，不要在两处登记。测试 import 源码，`test` 不依赖 `build`。
- **仓库根只有一个权威**：由 `shared/` 的 `getWorkspaceRoot` 解析，不按目录深度写 `../..`；能力目录不产出 root，仓库根与环境变量由触发层注入。
- 本包同时被 pre-commit、PR CI 与各 workspace 构建配置消费；改动后跑根 `check-pre-commit`、`check-policy` 与本包 `build` + `test`。
