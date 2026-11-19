# ADR-0022: monorepo-kit 判定改为嵌套 run 链

- **Date**: 2026-11-06
- **Status**: 已接受

## 背景

[ADR-0018](./0018-monorepo-kit-generic-plugins.md) 把包收成参数化能力包，但检查协议仍是「每个实例带 `name` 与 `run(ctx)`，由 `runEntrypoint(list, opts)` 吃名单聚合」。名单形态有四类已经存在的形状问题：入口必须持有一份判定名单，名单与判定所需能力之间没有机械联系；`run(list, opts)` 把 `mode`、`files` 这类入参逐层透传给不消费它们的判定；`runner` 既定义协议又决定并发与输出格式；js-kit 的 `definePlugin` 在判定层被绕过——能力是插件，判定不是。

## 决策

**嵌套 `run` 是唯一的组合面。** `run` 是跨插件唯一故意重名的键：每个产 `run` 的插件把 `run` 重写为 `() => andThen(ctx.run(), 自己)`，执行顺序就是 `.use()` 的顺序，首个 `Err` 短路返回。入口不再持有判定名单——链本身就是名单，装配即顺序。

**`andThen` 落在 js-kit 的范式层**，与 Rust 的 `Result::and_then` 同义：`Ok` 载荷交给下一步，`Err` 原样上浮且下一步一次都不跑。「js-kit 冻结」据此收窄为：只往范式里加函数，不动插件系统。

**单基座。** 只有一个 `defineRunner()`：ctx 上有 `run` 就原样转发（链中），没有就返回恒等 `ok(undefined)`（链头），靠 `typeof ctx.run === 'function'` 判分。链头与链中是同一段代码的两个位置，不需要第二个符号。

**判定自带零件。** 产 `run` 的插件以 `defineRunner()` 起头并 `.use()` 自己需要的能力：`defineRunner().use(defineExec()).use(判定本体)`。触发层只排判定顺序，不给插件接线。能力插件不产 `run`，依赖别的能力时以被依赖者当头（`defineGit = defineExec().use(…)`）。两者都把返回值收窄：判定标注 `Chain`，能力标注 `Plugin<XxxApi, KitCtx>`；不收窄就会把链内已经接好的能力摊给触发层，而那种失配在 `.make({ root, env })` 处直接编译不过。包内起子进程的地方收到 `exec` 一处。

**`run` 零参。** `Run` 是包内唯一签名 `() => Promise<Result<void, string>>`。判定要的一切都在装配期就位：仓库事实经 `.make({ root, env })`，判据参数（changeset 的 `base`/`head`、壳文案的 `app`）经 `defineXxx(options)`。入参归零同时收掉两件事：`run` 同签名不再需要维护；`andThen` 也失去长成「两步吃同一份 opts」这种非 Rust 形状的理由。漏传参数从「编译期不拦的可选键」变成装配点当场的缺失。

**归因只有前缀。** 链上没有判定名字，`Err` 文案的域名前缀是唯一抓手（`go:`、`git:`、`turbo:`、`md:`、`changeset:`、`pack:`、`script:`、`i18n:`、`port:`）；异常由链尾 `defineCatch()` 收敛成 `throw: `。它包前面的 `run` 而不是 `andThen`，所以抛异常与 Promise 拒绝都收得到，也不让异常变成「跳过前面的判定」。能力层读不到权威输入时抛（如根 `turbo.json` 缺失），报成 `throw: …` 而不是域名前缀；判据是「空扫描会不会静默通过」：会静默通过的判定自己把空面报成该域的 `Err`，抛出必然失败的不在每份判定里重复存在性检查。

**装配期与运行期分开兜。** `.make()` 是 eager 的，装配期抛错不在 `defineCatch()` 射程内；触发层的 `scripts/checks/run-check.mjs` 把「装配 + 运行」包进回调，装配期错误收敛成 `throw: ` 一行 stderr 加 exit 1。`run()` 期的异常仍以链尾 `defineCatch()` 为主，`runCheck` 的 catch 只是漏挂时的格式兜底。

**root/env 由触发层注入。** `.make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })`；插件与能力目录一律不产出 root，workspace root 的解析在 `shared/` 有唯一实现。

**exec 三态保留，判定层一律转 `Err`。** `ExecResult{ok,status,stdout,stderr}` 要能区分「跑了但失败」与「起不来」；「起不来」不另走跳过支路，工具缺失报成该域的 `Err`。exitCode、超时与中间过程记录归触发层。包内不写进程输出：`execFileSync` 默认转发子进程 stderr，失败证据并进 `Err`（`failureEvidence`），成功路径一声不出；判据扫 `process.stdout|stderr.write` 与 `console.*`。

**分区与目录形状**：`src/` 下一个能力一个目录，`plugin/` 这一层删除；每个能力目录自带 `index.ts` 作为对外面，`src/index.ts` 只把各面并起来；`shared/` 不成体系，由根入口直接指向具体模块。包内跨目录引用一律指到具体文件（`../exec/exec`），不借目录入口——经入口互相 import 会让两个目录成环。`runner/` 只剩协议本身；Vite 求值期适配收在 `src/vite/`，走 `./vite` 子路径。[ADR-0017](./0017-monorepo-tooling-package.md) 的「包只有一个入口」据此收窄为「一个 Node 入口加一个 Vite 适配入口」。

**端口分配是 Vite 插件，不是 js-kit 插件。** 端口号真正被消费的地方是 `vite.config.ts` 求值期，链上只有 `test-port-call-sites` 这条判定。`src/vite/ports.ts` 导出 `testPorts(...)` → 一个 Vite 插件，在 `config` 钩里把 `host` 与 `strictPort` 写进 `test.api`，这两个键从此只有一个出处；配置解析多遍时只在看得见 `test.projects` 的那一遍按 `testName` 写入。用法与偏移见 `build-browser.md`「测试端口分配」。

**不做域聚合插件。** 曾考虑用 `defineMdCheck(o)` 把三个 md 判定收成一个，但它们在两条链里的组合各不相同，聚合只多一层参数化却没有消费者。

## 后果

- 顺序执行让整链时长成为各判定之和；相对并发下界多出的量在百毫秒级，接受。
- 漏 `.use()` 仍然静默：签名不拦「少排一个判定」，包内 spec 也看不到入口装配；迁移期用新旧输出对照补过，此后由 review 比对入口的 `.use()` 清单。
- 成功不产出证据：静默通过时没有输出证明门禁跑过，`check-context --report` 那类只读报表与语料内容指纹一并删除。这收窄 [ADR-0013](./0013-context-authority.md) 的「语料指纹」一条：非权威标记仍是判据，内容集合指纹不再是判据也没有观测出口；「门禁跑过吗」由 CI 退出码回答。
- 形状由机器判据兜住：`run` 的零参签名由 tsc 判；链行为与协议扫描由两份 spec 覆盖（顺序与短路、前缀不被改写、链头恒等、抛出收敛、能力键不冲突、字面量 `Err` 带前缀、`Chain` 标注、不写进程输出）。扫描面按 `src/` 目录现取，新增能力目录自动进射程。四类文本写法在射程外（`export function defineXxx`、带前缀的转发文案、接口继承、无显式泛型），由 review 承担；失效形态是门禁静默空转，不是判错。
- 判据参数进构造参数后，`changeset-*` 策略从导出实例改成导出工厂，`check-changeset` 解析完区间再组链；缺 `--base` 由入口用 exit 2 报出。`shell-i18n-catalog` 的 `app` 与语种、PO 目录回到同一份声明。
- 不加 per-check 超时：整链时长由 CI 的 job 上限兜住。
- 域名前缀比最初裁决多 `i18n:` 与 `port:`，因为这两域真实存在且并入其他前缀会让前缀不再指向判据权威。
- 公开面收窄：`./vite` 只导出 `testPorts`、`devHttpsPlugin` 及类型；`testApiPort`、`defineTestPorts` 等删除；`run` 没有入参类型，`mode`/`node` 两个从未有消费者的键一并消失。
- `stagedClean` 排到 `check-pre-commit` 链尾：它按暂存文件起整条工具链，是这条链上最贵的一条，便宜的判定先拦住；它只判不改写，所以是成本排序而不是防自扰。

## 替代方案

- **保留 `runEntrypoint` 名单聚合，只把检查改成插件**：迁移成本最小，但 `runner` 仍是第二套协议，入口仍要持名单。
- **给 `run` 一份扁平 `RunOpts`**：这是迁移的中途形态，把入参从 `runner` 挪到链上而不是消掉，还多带「漏传可选键编译期不拦」与「`andThen` 必须偏离 Rust」两个代价。
- **组合函数放 `monorepo-kit/shared/`**：`andThen` 是链协议唯一的组合子、不含 monorepo 知识，放在消费方一侧等于每个包重造一遍。
- **给 `run` 按插件建模入参类型**：编译通过、调用点是幻影签名，代价落在最难发现的一类错误上。
- **两个基座 `defineRunner` + `defineChain`**：多一个公共符号去表达位置差别，而 `typeof ctx.run` 已能判分。
- **改 js-kit 的 `use` 签名让需求不累积**：动已发布 SDK 的语义，牵动包外消费者；泄漏在一个边界类型上就能收住。
- **端口分配继续做 js-kit 插件**：链上没有判定消费它，`api` 块与 `host`/`strictPort` 的理由仍要每份配置各自手写。
- **判定声明所需能力、组合点按需注入**：本轮采纳其目标但换机制——能力由判定插件在装配期 `.use()` 自带，不建注册表。
