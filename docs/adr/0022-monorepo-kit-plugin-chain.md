# ADR-0022: monorepo-kit 判定改为嵌套 run 链

- **Date**: 2026-11-06
- **Status**: 已接受

## 背景

[ADR-0018](./0018-monorepo-kit-generic-plugins.md) 把包收成参数化能力包，但检查协议仍是「每个实例带 `name` 与 `run(ctx)`，由 `runner/check-runner.ts` 的 `runEntrypoint(list, opts)` 吃名单聚合」。三条诉求据此提出：除 `shared/` 外统一用 js-kit 插件封装 SDK；`runner` 本身也是插件，workspace、turbo、git-hook、changeset、go-check、scripts-test、md-check 全是插件；触发层是 js 脚本（`scripts/`、`.github/`、git-hook），包只交付纯 Node 插件，组合由触发层自行完成。

名单形态的失效不是假设，而是四类已经存在的形状问题：入口必须持有一份判定名单，而名单与判定所需能力之间没有任何机械联系；`run(list, opts)` 把 `mode`、`files` 这类入参逐层透传给不消费它们的判定；`runner` 既定义协议又决定并发与输出格式，是包里唯一不吃 options 却决定全部判定行为的模块；js-kit 的 `definePlugin` 在判定层被绕过——能力是插件，判定不是。

## 决策

**嵌套 `run` 是唯一的组合面。** `run` 是跨插件唯一故意重名的键：每个产 `run` 的插件把 `run` 重写为 `() => andThen(ctx.run(), 自己)`，执行顺序就是 `.use()` 的顺序，首个 `Err` 短路返回，后续判定不再运行。入口不再持有任何判定名单——链本身就是名单，装配即顺序。

**`andThen` 落在 js-kit 的范式层**（`packages/js-kit/src/paradigm/rust.ts`，经 `rust.andThen` 可见），`plugin-system/core.ts` 的 `{ use, make }` 语义不动。「js-kit 冻结」这条旧约束据此收窄为：只往范式里加函数，不动插件系统。它就是 Rust 的 `Result::and_then`：`Ok` 载荷交给下一步，`Err` 原样上浮且下一步一次都不跑。标识符写成 camelCase 的 `andThen`，与本模块把 Rust 方法名按 TS 大小写重写的既有约定平齐（同文件已有 `isOk` 对应 `is_ok`），这层对应关系写在函数注释与两份 README 的表行里。

**单基座。** 只有一个 `defineRunner()`：ctx 上有 `run` 就原样转发（链中位置），没有就返回恒等 `ok(undefined)`（链头位置），靠 `typeof ctx.run === 'function'` 判分。链头与链中是同一段代码的两个位置，不需要第二个符号。探针与包内 spec 都确认它不吞前缀：`defineRunner().use(a).use(defineRunner().use(b))` 里 a 的 `Err` 原样上浮。

**判定自带零件。** 产 `run` 的插件一律以 `defineRunner()` 起头并 `.use()` 自己需要的能力，即 `defineRunner().use(defineExec()).use(判定本体)`；触发层只排判定顺序，不给插件接线；失败语义的落地收在 `scripts/checks/run-check.mjs` 一处，不逐入口重复。能力插件不产 `run`，无需 runner 头；依赖别的能力时以被依赖者当头，即 `defineGit = defineExec().use(…)`、hook 体检同理，并把返回值标注成 `Plugin<XxxApi, KitCtx>`——`use` 会把被依赖者的产出与需求都并进结果类型，不收窄就把这条能力内部接好的 `exec` 摊给消费者，而那种失配在 `.make({ root, env })` 的调用处直接编译不过，不需要另加判据。以能力当头的插件脱离链单独 `.make()` 时 `run` 是 `undefined`，这条风险由「判定必须 runner 起头」消除，不靠调用方记得接线。包内起子进程的地方收到 `exec.ts` 一处：`git.ts` 与 `git-hooks-status.ts` 原先各自 `execFileSync`/`spawnSync`，读 workspace 清单的 `context-corpus` 原先直接 import `workspace.ts` 的叶子函数，现在三处都改吃能力面（`ctx.exec`、`ctx.patterns()`/`ctx.manifests()`）。

**`run` 零参。** `Run` 是包内唯一签名 `() => Promise<Result<void, string>>`，链上没有入参这个东西。判定要的一切都在装配期就位：仓库事实经 `.make({ root, env })`，判据参数（changeset 的 `base`/`head`、壳文案的 `app`）经 `defineXxx(options)`。这三样都是装配时就已知的事实——`check-changeset` 在组链之前已经解析完 `--base/--head`，两端 demo 的 `app` 与它的语种、PO 目录写进同一个构造参数里。

入参归零同时收掉两件事：`C & U` 交集下「`run` 同签名」不再需要维护，因为没有入参位置可以各写一份；`andThen` 也失去了长成「两步吃同一份 opts」这种非 Rust 形状的唯一理由——那个形状存在的目的就是把入参喂给两步。漏传参数从「编译期不拦的可选键」变成装配点当场的缺失。

**归因只有前缀。** 链上没有判定名字，`Err` 文案的域名前缀是唯一抓手：`go:`、`git:`、`turbo:`、`md:`、`changeset:`、`pack:`、`script:`、`i18n:`、`port:`；异常由链尾 `defineCatch()` 收敛成 `throw: `。`defineCatch()` 包裹前面的 `run` 而不是 `andThen` 它，所以抛异常与 Promise 拒绝两类逃逸都收得到，且不让异常变成「跳过前面的判定」。

有一条边界接受下来：能力层读不到权威输入时抛（根 `turbo.json` 缺失就是 `turbo: config()` 抛出），于是那一条报成 `throw: turbo.json not found in …` 而不是 `turbo: `。它照样是 exit 1 加一行 stderr，只是前缀不指域。判据是「空扫描会不会静默通过」：会静默通过的判定自己把空面报成该域的 `Err`（`turbo-input-paths`、`docs-inputs`、`no-mutual-links`），抛出必然失败的不在每份判定里重复存在性检查。

**装配期与运行期分开兜。** js-kit 的 `.make()` 是 eager 的：插件工厂在装配期同步执行，`getWorkspaceRoot()` 也在这一步求值；`defineCatch()` 只包 `run()`，管不到这一段。触发层的 `scripts/checks/run-check.mjs` 把「装配 + 运行」包进回调：装配期抛错由它收敛成 `throw: ` 一行 stderr 加 exit 1，这是它的契约责任；`run()` 期的异常仍以链尾 `defineCatch()` 为主，只有它决定链内短路与归因，`runCheck` 的 catch 只是漏挂 `defineCatch` 时的最后一道格式兜底，不替代它。`chain.spec.ts` 钉住「工厂抛错会冒泡」，`run-check.test.mjs` 钉住「冒泡后在触发层被收住」与「漏挂兜底」，7 个真实入口的 `.use()` 清单仍由 review 逐条比对，没有端到端用例；`catch.ts` 的注释只声明 `run()` 期，不把它写成全链护罩。

**root/env 由触发层注入。** `.make({ root: getWorkspaceRoot(import.meta.dirname), env: process.env })`；插件与 `src/` 下的能力目录一律不产出 root。`shared/workspace-root.ts` 的 `getWorkspaceRoot` 是仓库根定位的唯一实现，取代原 `plugin/workspace` 的 `findRepoRoot`。

**对外形状收在 `Chain`。** js-kit 的 `use` 会把被用插件的入参需求并进结果类型，链内接线用的 `run` 与能力键于是会一路漏到 `.make()` 的调用处，要求触发层供给本该由链自己提供的东西。每个判定插件把返回值标注成 `Chain = Plugin<{ run: Run }, KitCtx>` 收窄对外面，不用类型断言：断言会把这层泄漏留成每个装配点各自要防的事。

**exec 三态保留，判定层一律转 `Err`。** `ExecResult{ok,status,stdout,stderr}` 原形不动，要能区分「跑了但失败」与「起不来」；但「起不来」不再另走一支：`staged-clean` 的 `unavailable()` 支路与 `StagedCleanOptions.installHint` 删除，工具缺失报成该域的 `Err` 而不是跳过（`git-hooks-status` 的 `installHint` 保留，那是给人看的 hook 安装文案，不是跳过用的）。exitCode、超时与中间过程记录归触发层。

过程记录这条在包内落到位：`script-tests` 原先把每个被测脚本的 stdout/stderr 用 `process.stdout.write` 转写出去，现在删掉两行 write，失败时把证据并进那句 `Err`。`failureEvidence` 优先给被捕获的 stdout 与 stderr，两路分行拼、不首尾相连；两路都空时才退回 `exited with status …`，退出码另由 `script:` 判定写成 `(exit N)` 放进 verdict，不是每次都和两路输出并列出现。这里有一条实测事实要写清：`execFileSync` 默认就把子进程的 stderr 转发到父进程，所以 traceback 从来不是靠那两行 write 才看得见的，write 多给的只是成功路径上的 stdout——正是这条裁决要排除的过程记录。于是不写输出丢掉的是成功路径的实时进度，不是失败诊断：失败仍有 stderr（运行时转发）+ 仍进 `Err`（捕获的两路输出、verdict 里的退出码），成功一声不出。判据扫 `src/` 各能力目录里的 `process.stdout|stderr.write` 与 `console.*`，出现即红。

**分区与目录形状**：`src/` 下一个能力一个目录，`plugin/` 这一层删除——判定与它承载的那份能力本来就同住一个目录，中间再套一层不承载任何判据，只让每处跨目录引用多走一段。每个能力目录（`shared/` 除外）自带 `index.ts` 作为对外面，`src/index.ts` 只把各目录的面并起来；`shared/` 不是一套对外体系，由根入口直接指向具体模块。包内跨目录引用一律指到具体文件（`../exec/exec`），不借目录入口：入口是再导出，跨目录经入口互相 import 会把两个目录的全部模块拉进同一张模块图，`exec` 与 `git` 之间就会成环。`runner/` 只剩协议本身（`runner.ts` 与 `catch.ts`）；Vite 求值期的适配（`testPorts`、`devHttpsPlugin`）收在 `src/vite/`，走 `./vite` 子路径，主入口的消费者是 Node 脚本，不为两个配置符号把 Vite 类型面摊给每个 import；git-hook 安装路径继续不 import 本包。[ADR-0017](./0017-monorepo-tooling-package.md) 原本的「包只有一个入口」据此收窄为「一个 Node 入口加一个 Vite 适配入口」，`unbundle` 下产物落点由 `pack.entry` 的键决定，所以第二个入口的键写成 `vite/index` 才得到 `dist/vite/index.js`。

**端口分配是 Vite 插件，不是 js-kit 插件。** `defineTestPorts` 曾经以 js-kit 插件交付一个 `testApiPort(name)` 取值函数，但那次取值从来没有发生在链上：链上关于端口的判定只有 `test-port-call-sites`（扫调用点集合与分配表是否完全相等），端口号真正被消费的地方是 `vite.config.ts` 求值期。诉求 1 的「除 `shared/` 外统一用 js-kit 插件封装」据此显式收窄：js-kit 插件承载的是判定与能力，`vite.config.ts` 求值期的适配是 Vite 的扩展面，用 Vite 自己的形状交付。现在 `src/vite/ports.ts` 导出 `testPorts({ project, testName, host?, configFile? })` → 一个 Vite 插件，在 `config` 钩里把 `{ host: '127.0.0.1', port, strictPort: false }` 写进 `test.api`，消费方把它和其他 Vite 插件并列摆进 `plugins`。形状因此从「包给一个函数、每份配置各自拼 `api` 块」变成「包给一个插件、`api` 块由插件写」：`host` 与 `strictPort` 这两个曾手写在各配置里、各带一段理由注释的键从此只有一个出处。

有一条实测事实决定了插件内部怎么写：vitest 5 遇到 `test.projects` 会把配置解析多遍——根上一遍看得见 `projects` 而 `test.name` 为 `undefined`，每个要跑的 project 各一遍只看得见那个 project 自己的 `test` 块（看不见 `projects`，且只跑 browser 档时 jsdom 那一遍根本不发生）；根那一遍写进 `projects[i].test.api` 的值会被后一遍原样带进合并结果（对象被克隆，身份变、值不变）。所以插件只在看得见 `projects` 的那一遍按 `testName` 定位目标 project 并写入，不在按 project 解析的那一遍重复写——重复写撞上的是自己刚写下并被继承下来的那份 `api`，只会把它自己的上一次写入判成「配置里手写了端口」。没有 `projects` 的配置（`browser-kit`）走根那一遍直接写 `test.api`。判据与失效形态见 [`docs/agents/build.md`](../agents/build.md) 的「测试端口分配」。

**不做域聚合插件。** 曾考虑 `defineMdCheck(o)` 把 `readme-locales`、`no-mutual-links`、`context-corpus` 收成一个判定，但它们在两条链里的组合各不相同，聚合只多一层参数化却没有消费者；md 域按一对一搬迁，不重切判定边界。

## 后果

- 顺序执行让整链时长成为各判定之和而不是最长一项。本机实测（同一进程内逐条计时，turbo dry-run 走缓存）：`check-policy` 的 9 条合计 1203ms，最长一条 `interweave-turbo-inputs` 1085ms，即在并发下界之上多 118ms；提交路径的 `check-pre-commit` 7 条合计 96ms，最长 28ms，多 68ms；`check-context` 合计 195ms，最长 183ms。
- 漏 `.use()` 仍然静默：`use` 与 `make` 的签名都不拦「少排一个判定」，包内 spec 也看不到入口的装配。迁移期对 6 个无需入参的入口逐个做过新旧输出对照，并把每条链的 `.use()` 清单与基线的逐判定输出比对（基线打印判定名字，新链静默通过，不比对清单就会把「少跑一项」读成「都过了」）；`check-changeset` 需要 `--base/--head`，另按带参运行核对。此后新增判定改的是入口文件里的一行，review 面比名单形态更窄。
- 成功不产出证据：静默通过时没有任何输出证明门禁跑过，`check-context --report` 那类只读报表与语料内容指纹一并删除。这收窄 [ADR-0013](./0013-context-authority.md) 的「语料指纹反映内容集合及变化」一条：非权威标记仍是判据，内容集合指纹不再是判据也没有观测出口。「门禁跑过吗」不再由输出回答，而由 CI 的退出码回答。
- 形状由机器判据兜住，不靠运行期校验：`run` 的零参签名由 tsc 直接判——多写一个入参就不再是可赋值的形状，不需要扫描；其余形状靠两份 spec，链行为 spec（`src/runner/__tests__/chain.spec.ts` 6 例：顺序与短路、前缀不被改写、链头恒等、抛出收敛成 `throw:`、构造期抛错不在 `defineCatch` 射程内、先到的 `Err` 不被后面的抛出覆盖）与协议扫描 spec（`src/runner/__tests__/protocol-scan.spec.ts` 6 例：能力键互不相交且不占用 `run`/`root`/`env`、`definePlugin` 首参只能是 `{ run: Run }` 或一个具名 `Api`、字面量 `Err` 一律带前缀、`Run`/`Chain` 只由基座声明一处、产 `run` 的导出必须标注 `Chain`、判定不写 `process.stdout`/`process.stderr`/`console.*`）。扫描面按 `src/` 下的目录现取：除 `runner/`、`shared/`、`vite/` 之外的每个目录都进射程，新增能力目录自动被扫到，不必在 spec 里再登记一次；那三个排除项由 spec 反向核对其存在，目录被改名会让扫描直接红，而不是悄悄少扫一片。这 6 条扫描判据逐条做过变异验证，判据失效即红。
- 扫描判据的覆盖边界（接受下来，不另加判据）：这 6 条扫的是源码文本，四种写法走得出它们的射程——`export function defineXxx` 不匹配产 `run` 导出与 `Chain` 标注的形状匹配；`err(变量)` 与以插值起头的 `err(\`${…}\`)` 被有意放过（那是能力层已带前缀、调用处转发的文案），于是一句现拼而无前缀的模板也扫不到；`export interface XxxApi extends BaseApi {`不再被能力键扫描展开，继承来的成员看不见；不写显式泛型的`definePlugin(ctx => …)`逃出键面匹配。取舍是：包内现在没有一处用这些写法（17 条判定与 18 个`Chain`出口逐个核过），把它们堵掉要么换成 AST 扫描、要么给能力目录加一层形状注册表，两者都超出这次重构的射程，而 review 看得到「新增判定没进扫描」。真被绕过去时失效形态是这条门禁静默空转，不是判错——与漏`.use()` 那一条同风险等级，一并由 review 承担。
- 判据参数进构造参数后，`scripts/policies/changeset-*.mjs` 从导出实例改成导出接参的工厂，`check-changeset.mjs` 解析完区间再组链。代价是这两个策略文件只剩装配点的作用（本仓对 Changesets 目录没有覆写）；换来的是「缺 `--base`」不再是链上的一种判定失败——入口早于组链就用 exit 2 报出来，那是要修 workflow 的失效，不是要补 changeset 的失效。`shell-i18n-catalog` 的 `app` 从 `run` 的入参（那份类型写在解构上，链上没人核对）挪进构造参数，与语种、PO 目录回到同一份声明里，配错应用不再有路径。
- 不加 per-check 超时：整链时长由 CI 的 job 上限兜住，包内不持定时器。
- 本节与决策段里的毫秒数、spec 例数、判定/`Chain` 出口计数、文件切分条数，以及 [ADR-0012](./0012-pr-review.md)、[ADR-0021](./0021-codex-review-gate.md) 里同类的时点事实，都是 2026-11-07 复核时点「逐个核过」的快照，不是会随改动自动更新的判据，也不作门禁断言。增删判定或改动判据后应同步复核这些数字，读的时候按当时的实测记录看，不要当成长期不变的形状约束。
- 域名前缀比裁决的 8 个多两个：`i18n:` 与 `port:`。这两域真实存在（壳文案语料由两端 demo app 消费，端口调用点扫 `scripts/` 与 app 配置），并进 `md:` 或 `script:` 会让前缀不再指向判据权威。
- 公开面收窄：`./vite` 导出 `testPorts()`、`devHttpsPlugin()` 及类型 `DevHttpsOptions`、`TestPortsPluginOptions`；`testApiPort`、`testApiPortNames`、`defineTestPorts` 与 `TestPortsApi` 全部删除——端口取值不再是 js-kit 插件的面，`test.api` 由 `testPorts()` 写，读表与偏移（`readTestPorts`）留在包内给 `test-port-call-sites` 与 Vite 插件共用，不对外；`check-pack` 的 `--quiet`/`--root` 删除；`run` 没有入参类型（中途形态的 `RunOpts` 不成立，`CheckContext`/`CheckUnit`/`CheckResult` 随名单一起删除），`mode` 与 `node` 两个从未有消费者的键一并消失（`script-tests` 直接用 `process.execPath`）。
- `stagedClean` 排到 `check-pre-commit` 链尾：它按暂存文件起整条工具链（`vp check`、stylelint），是这条链上最贵的一条，便宜的判定先拦住。它只判不改写——跑的是 `vp check`，不带 `--fix`，所以这个位置是成本排序，不是防自扰。

## 替代方案

- **保留 `runEntrypoint` 名单聚合，只把检查改成插件**：迁移成本最小，但 `runner` 仍是包内第二套协议，诉求 1 与 2 都不成立，入口仍要持名单。
- **给 `run` 一份扁平 `RunOpts`，`andThen` 写成「两步吃同一份入参」**：这是本次迁移的中途形态，它把入参透传从 `runner` 挪到链上而不是消掉，还多带两个代价——漏传可选键编译期不拦，以及 `andThen` 必须偏离 Rust 才能把入参喂给两步。判定所需的东西既然都在装配期就位，就没有入参这一层要建模。
- **组合函数放 `monorepo-kit/shared/`**：`andThen` 现在与 Rust 的 `Result::and_then` 逐字同义，不含任何 monorepo 知识，放在消费方的一侧等于每个包各自重造一遍同一个范式函数；`shared/` 的准入判据（与领域无关的纯函数）容纳得了它，但归属判据是「谁需要它」——它是链协议唯一的组合子，也是 js-kit 范式层缺的那一个。
- **给 `run` 按插件建模入参类型**：编译通过、调用点是幻影签名，代价直接落在最难发现的一类错误上。
- **两个基座 `defineRunner` + `defineChain`**：多一个公共符号去表达「链头/链中」的位置差别；`typeof ctx.run` 已能在同一入口判分，纯类型约束另一侧照收。
- **改 js-kit 的 `use` 签名让需求不累积**：动已发布 SDK 的语义，牵动包外消费者，而泄漏在一个边界类型上就能收住。
- **`defineMdCheck` 域聚合**：见决策段，无消费者。
- **端口分配继续做 js-kit 插件**：迁移中途的形状就是它——`defineTestPorts` 产一个 `testApiPort(name)` 取值函数。链上没有一条判定消费它，那份 `Api` 只为一个在 `vite.config.ts` 求值期调用的函数存在，代价是每份配置仍要自己手写 `api` 块并自己记住 `host` 与 `strictPort` 的理由；换成 Vite 插件后这两样由插件给出。
- **判定声明所需能力、组合点按需注入**（[ADR-0018](./0018-monorepo-kit-generic-plugins.md) 曾否决）：本轮采纳其目标但换机制——能力由判定插件在装配期 `.use()` 自带，不建注册表，也不引入运行时求值约定。
