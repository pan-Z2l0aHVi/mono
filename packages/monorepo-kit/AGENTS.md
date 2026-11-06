# monorepo-kit

本仓库门禁、策略检查与构建编排的实现包。源码是 TypeScript，`build` 跑 `vp pack` 产出 `dist/`（两个入口 `index.js` 与 `vite.js`，外加按源码树对应的分块与 sourcemap），消费方一律经包名读产物，`dist/` 被 gitignore，不要手写，也不要从别的包引用 `src/`。门禁因此依赖产物新鲜度：根 `check-pre-commit` 先跑 `turbo run build --filter=@greypan/monorepo-kit`，CI 在门禁步骤之前显式构建；绕开这两条直接跑 `check-policy` 之类的命令会读到旧产物。

- **两个入口，按消费者分**：`exports` 只有 `.` 与 `./vite`。`.` 面向 Node 脚本（门禁、`scripts/`、app 测试），`./vite` 只放 Vite 配置求值期的适配（`testApiPort`、`devHttpsPlugin`）；把后者留在主入口就要为两个符号把 Vite 的类型面摊给每个 import。新增公共导出先判它属于哪一侧，只给包内用的模块不进入口。
- **包内引用用相对路径**：写成 `@greypan/monorepo-kit` 会绕回入口形成环。
- **跨插件唯一允许重名的键是 `run`，且必须同签名**：所有 `run` 都是 `() => Promise<Result<void, string>>`，不吃入参。判定要的仓库事实经 `.make({ root, env })` 注入，判据参数（changeset 的 `base`/`head`、壳文案的 `app`）经 `defineXxx(options)` 在装配期就位，链上没有入参这一层要建模。签名只有一份由 tsc 判：给 `Run` 多写一个入参就不再是可赋值的形状，不需要扫描。其余键（context 的 `root`、`env` 与各 `*Api` 成员）不得重名：`use` 合并时后来者覆盖前者且不报错。判据由 `src/runner/__tests__/protocol-scan.spec.ts` 扫源码，链的行为由同目录 `chain.spec.ts` 兜。
- **产 `run` 的插件以 `defineRunner()` 起头并自带所需能力**：形状是 `defineRunner().use(defineExec()).use(判定本体)`，判定本体写成 `run: () => andThen(ctx.run(), 自己)`，返回值标注成 `Chain`——js-kit 的 `use` 会把被用插件的上下文需求并进结果类型，不在这层收窄就会要求触发层供给链自己该提供的东西。能力插件不产 `run`，无需 runner 头；依赖别的能力时以被依赖者当头，并把返回值标注成 `Plugin<XxxApi, KitCtx>`（`defineGit`、`defineChangesets` 都是这形状），同样的收窄，收窄漏掉时 `.make({ root, env })` 直接编译不过。触发层只排 `.use()` 顺序，不给插件接线。
- **失败归因只有域名前缀**：链上不导出判定名字，`Err` 文案以 `<域>: ` 起头（`go:`、`git:`、`turbo:`、`md:`、`changeset:`、`pack:`、`script:`、`i18n:`、`port:`），逃逸的异常由链尾 `defineCatch()` 收敛成 `throw: `。判定一律平铺导出（`defineXxx`），没有需要靠命名空间避开的重名。
- **不写进程输出**：模块顶层只做纯计算与常量校验，不读写文件、不起子进程、不查仓库根；判定里也不转写子进程的输出去「记录过程」。`execFileSync` 默认就把子进程 stderr 转发到父进程，traceback 不需要包内代劳；失败证据走 `Err`（`failureEvidence` 带出捕获的 stdout 与退出码），成功路径一声不出。判据扫 `src/plugin/**/*.ts` 里的 `process.stdout|stderr.write` 与 `console.*`。入口是整包再导出，任何顶层副作用都会在每个消费者身上执行一次。
- **分区判据是「这段代码是否知道本仓库的名字、路径或数据」**：包只有 `plugin/`、`runner/`、`shared/` 三个分区。`plugin/<能力>/` 是内聚竖切——一个能力一个目录，能力插件与它承载的参数化判定（`defineXxx(options)` → 一条链）住在一起；一份判定归谁，看它的权威输入由哪个能力拥有，不看它 import 了几个能力。`runner/` 是链协议本身（`defineRunner()` 与 `defineCatch()`），`shared/` 是与仓库无关的纯工具；本仓库的策略住在根 `scripts/policies/`，由组合点传参（见 ADR-0018 与 ADR-0022）。本仓库的编排数据放在根 `monorepo.json`（目前是端口分配）。
- **测试放所属能力目录的 `__tests__/`**，文件名是 `*.spec.ts`，由包自己的 `test`（`vp test run`）运行；`test-scripts` 只跑全仓 `*.test.mjs`，不要在两处登记。测试 import 源码，`test` 不依赖 `build`，因此不需要先构建产物。
- **仓库根只有一个权威**：`shared/workspace-root.ts` 的 `getWorkspaceRoot`，不按目录深度写 `../..`。插件与 `plugin/**` 一律不产出 root，仓库根与环境变量由触发层 `.make({ root, env })` 注入。
- 本包同时被 pre-commit、PR CI 与各 workspace 构建配置消费；改动后跑根 `check-pre-commit`、`check-policy` 与本包的 `build` + `test`。
