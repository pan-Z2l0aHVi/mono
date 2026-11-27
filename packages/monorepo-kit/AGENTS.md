# monorepo-kit

仓库门禁与构建编排实现包；消费方经包名读 `dist/`，不跨包引用 `src/`。绕过 `check-pre-commit` 直接跑 `check-policy` 会读到旧 `dist`，改本包后须跑本包 `build` + `test` 及根 `check-pre-commit`、`check-policy`。

- **入口分流**：`.` 给 Node 脚本，`./vite` 给 Vite 配置求值期插件；包内引用用相对路径指到具体文件（写成包名会绕回入口成环，也不用目录 barrel）。
- **链协议**：跨插件仅 `run` 可重名且同签名，其余上下文键不得重名（`use` 合并会静默覆盖）；装配期参数走 `defineXxx(options)`，仓库事实经 `.make({ root, env })` 注入（见 [ADR-0018](../../docs/adr/0018-monorepo-kit-generic-plugins.md)、[ADR-0022](../../docs/adr/0022-monorepo-kit-plugin-chain.md)）。
- **模块顶层纯净**：顶层只做纯计算与常量校验，不写进程输出、不读写文件、不起子进程；失败走 `Err`（由 `src/runner/` 协议扫描测试守护）。
- **分区判据**：不知道本仓名字/路径的通用能力放 `src/<capability>/`；本仓具体策略放根 `scripts/policies/`；仓库根统一经 `shared/` 的 `getWorkspaceRoot` 解析。
- **测试**：放能力目录下 `__tests__/*.spec.ts`，由本包 `vp test run` 运行，不在根 `test-scripts` 重复登记。
