# 构建、打包与 Lint 边界

各包脚本、配置与导出表以对应 `package.json`、`vite.config.ts` 和 `turbo.json` 为准；本文只记无法从配置直接推导的构建与 lint 陷阱。

## 命令与上游依赖

- **走 Turbo 保证 `^build`**：构建或测试可构建包用 `pnpm exec turbo <task> --filter=@greypan/<name>`；裸 `pnpm --filter` 会绕过上游 `dist` 构建，易读到旧产物。包内非 turbo 脚本才直接用 `pnpm --filter`。
- **发布产物核验**：修改公开包的 `exports`、`files` 或构建输出后运行 `pnpm run check-pack`。

## Demo 开发与并发

- 根 `dev:*` 命令在命令行显式传 `--concurrency`；不要调高根 [`turbo.json`](../../turbo.json) 的顶层 `concurrency`，避免同时放大 `build` 与 `test` 并发。
- 只有需要前端热重载并接入 `depsReload` 的上游包定义 `dev` 脚本；纯测试基建与纯构建期 Vite 插件不设 `dev`（改动后重启宿主由 `^build` 重编）。
- **禁止改用 `turbo watch`**：它会监听 Git 控制文件，在切换分支或 agent 写工作树时误触发全量 dev 重启。
- Interweave 由 Wails host 管理嵌套前端，开发 alias 只启动 Wails host 并监听上游依赖，不另起重复前端进程。

## 打包、类型与外部化

- **`vp pack` 陷阱**：含通配子路径导出的包须保持产物与源码树一一对应、扩展名对齐 `exports`（`.js`/`.d.ts`）、CSS 入口显式列出；纯转发 barrel（`export * from`）会被拍平进叶子模块，子目录入口键必须写成 `<dir>/index`（写成 `<dir>` 会落为 `<dir>.js`）；纯类型入口逐个显式列出，不用目录 glob（会导致声明生成慢数倍）。
- **外部化**：真打包的包用正则同时外部化 `@greypan/*`（含子路径）与 Node 内置模块；按源码树产出的包加 `external` 正则无实际效果。
- **共享 `tsconfig`**：修改 [`packages/tsconfig/`](../../packages/tsconfig/) 共享 profile 后，须在仓库根跑 `pnpm run check-code` 验证所有继承方。
- **浏览器目标**：各消费方 manifest 的 `browserslist` 与 `web-ui` 的 `pack.target` 目前手工双写，改目标时同步两处（产物实际生效的是 `pack.target`）。

## 浏览器测试端口与本地 HTTPS

- 浏览器测试端口由 `@greypan/monorepo-kit/vite` 的 `testPorts()` 确定性分配（统一写 `api.host: '127.0.0.1'`、`api.strictPort: false`，多 worktree 自动隔离，可选 `GREYPAN_TEST_PORT_OFFSET` 平移），**禁止在 `vite.config.ts` 手写裸端口号**；多 project 配置必须传 `testName`。
- Dev server 不读 `testPorts()`：文档 demo 动态分配端口不写死；Interweave 固定 `9245` 带 `strictPort`，改端口用 `WAILS_VITE_PORT`。
- 本地 HTTPS 由 `devHttpsPlugin()` 读取 `~/.config/greypan/dev-certs/`（见 [`environment.md`](./environment.md)）；CI 无证书时自动退回 HTTP。

## 生成链路与缓存顺序

- **Build 前只判校验**：CI 在 Build 前运行各文档站 `check-generated` 与根 `check-generated-parity`（`//#check-generated-parity`），防止 Build 原地治愈掩盖失步。`check-generated-parity` 的 `inputs` 须与其脚本外部 import 同步。
- **语料与 `test.inputs`**：根 `turbo.json` 排除 Markdown，[`packages/web-ui/turbo.json`](../../packages/web-ui/turbo.json) 的 `test` 重新纳入语料（由 `web-ui-docs-inputs` 策略守护）；动 `web-ui/docs/` 布局须同步。
- **读写顺序与缓存防 miss**：读生成物的 `test` 必须通过 `dependsOn` 依赖对应 `build`（`inputs` 不建立先后）；同一 workspace 的 `build` 会重写 tracked 生成物时（如 `apps/interweave/frontend/bindings/**`、`auto-imports.d.ts`、`typed-router.d.ts`），必须将该产物排除出同类 `inputs`，仅保留真正上游源文件。
- **壳文案（wuchale）**：源码只写中文，PO 是入库译文源；dev/build 只编译不抽取。**增删壳文案后必须在对应应用目录运行 `pnpm exec wuchale --clean`**（严禁用 `--modify`），由各应用 `catalog.spec.ts` 校验中英同步与无废弃条目。Vue build 显式传 `--mode build`。

## Lint 与格式化盲区

- 入口为根 `check-code` 与 `fix-code`（非交互环境传 `CI=true` 关闭 vp 提示）；pre-commit 只判定不改写。
- **Vue 模板盲区**：oxlint 与 shadcn 规则不解析 `.vue` 模板（仅覆盖 `<script>` 块），模板内 class 与内联样式无 JS lint 覆盖；不要把 `.vue` 加进 `lint.ignorePatterns`（会连 `<script>` 一起丢掉）。
- `packages/web-ui` 组件样式为原生 CSS，由 LightningCSS 转译嵌套，优先写原生嵌套。
