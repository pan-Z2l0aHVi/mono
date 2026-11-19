# monorepo-kit

本仓库门禁、策略检查与构建编排的实现包。源码是 TypeScript，`build` 跑 `vp pack` 产出 `dist/`，产物布局以 `package.json` 的 `exports` 为准；消费方一律经包名读产物，`dist/` 被 gitignore，不要手写，也不要从别的包引用 `src/`。门禁因此依赖产物新鲜度：根 `check-pre-commit` 与 CI 都在门禁步骤之前显式构建；绕开这两条直接跑 `check-policy` 之类的命令会读到旧产物。

- **入口按消费者分**：`.` 面向 Node 脚本（门禁、`scripts/`、app 测试），`./vite` 只放 Vite 配置求值期的适配（`testPorts`、`devHttpsPlugin`，都是 Vite 插件）；导出表以 `package.json` 为准。把后者留在主入口就要为这组符号把 Vite 的类型面摊给每个 import。新增公共导出先判它属于哪一侧，只给包内用的模块不进入口。
- **包内引用用相对路径**：写成 `@greypan/monorepo-kit` 会绕回入口形成环。跨目录引用指到具体文件（`../exec/exec`），不借目录的 `index.ts`：barrel 会把两侧整张图并进同一份依赖，互相依赖的能力直接成环。
- **链协议由测试与 tsc 守住**：跨插件唯一允许重名的键是 `run`，且必须同签名；判定参数经 `defineXxx(options)` 在装配期就位，仓库事实经 `.make({ root, env })` 注入。其余上下文键不得重名——`use` 合并时后来者覆盖前者且不报错。协议细节与域前缀集合以 [`src/runner/`](./src/runner/) 的协议扫描测试为准；改链形状前先读那里。
- **不写进程输出**：模块顶层只做纯计算与常量校验，不读写文件、不起子进程、不查仓库根；判定里也不转写子进程输出。失败证据走 `Err`，成功路径一声不出。入口是整包再导出，任何顶层副作用都会在每个消费者身上执行一次；该约束由扫 `src/` 的判据守护。
- **分区判据是「这段代码是否知道本仓库的名字、路径或数据」**：`src/` 下一个能力一个目录，目录的 `index.ts` 是这一分的对外面，只列有消费者的导出。链协议与仓库无关的纯工具是横切职责，不按能力分区。本仓库的策略住在根 `scripts/policies/`，编排数据放在根 `monorepo.json`；归属与接线见 [ADR-0018](../../docs/adr/0018-monorepo-kit-generic-plugins.md) 与 [ADR-0022](../../docs/adr/0022-monorepo-kit-plugin-chain.md)。
- **测试放所属能力目录的 `__tests__/`**，文件名是 `*.spec.ts`，由包自己的 `test`（`vp test run`）运行；`test-scripts` 只跑全仓 `*.test.mjs`，不要在两处登记。测试 import 源码，`test` 不依赖 `build`。
- **仓库根只有一个权威**：由 `shared/` 的单一 workspace root 解析实现负责（`getWorkspaceRoot`），不按目录深度写 `../..`。能力目录一律不产出 root，仓库根与环境变量由触发层注入。
- 本包同时被 pre-commit、PR CI 与各 workspace 构建配置消费；改动后跑根 `check-pre-commit`、`check-policy` 与本包的 `build` + `test`。
