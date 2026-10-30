# web-ui

修改组件、主题 token、overlay、表单行为或框架类型封装前，先确认受影响的契约面。只改局部 UI 时不必读完整组件语义。ADR 路由与权威来源索引见 [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md)。

- [`src/components/theme/style.css`](./src/components/theme/style.css) 是 token 值的权威来源。复用共享 overlay 生命周期和 semantic token，不要把组件样式注入 `document.head`。
- 不承担框架运行时 wrapper 与全局应用样式。
- 共享状态和行为使用 `defineXxx(...).make(...)` 的 `definePlugin` factory。Lit、Shadow DOM、属性绑定和框架事件类型沿用既有模式。
- browser-mode 测试覆盖无法由 jsdom 证明的原生行为。UI、UX 和交互改动还必须在真实浏览器验证。
- 受管组合的成员追踪、下行广播与上行写回统一走 `GroupController`，不要绕开它手搓成员管理。`select` 与 `autocomplete` 的 option 成员走 [`src/shared/option-portal`](./src/shared/option-portal/)，不要把两者的成员管理混写。
- slot-trigger 组件（popover/dropdown/collapse）的 ARIA 状态（如 `aria-expanded`）不挂在 trigger 包装结构上，按 [ADR-0005](../../docs/adr/0005-web-ui-components.md) 回写。
- 框架动态绑定布尔属性必须用 camelCase Property；组件内不加 attribute 字符串解析兜底，保持原生 HTML 布尔存在语义。

## 组件组合词汇

**语义色源 token（semantic hue token）**:
表示 accent、success、warning、danger、info 等模式适配后的基础含义色；它不是某个组件的 button 背景或 hover/active 状态色。
_Avoid_: primary 背景、variant 背景、状态色

**Variant 状态色（variant state color）**:
组件基于自身 variant surface 或语义色源派生的 hover/active 展示色；filled/neutral 状态向黑色加深，tonal variant 可保留自己的语义色状态比例。
_Avoid_: 直接改写语义色源 token、用主题文本作为按压加深锚点

**覆盖层 slot 组合（overlay slot composition）**:
trigger 经命名 slot 提供、内容/panel 由组件托管的组合模式；panel 常脱离文档流（portal）。组件把 trigger 状态 ARIA（aria-expanded 等）回写到 trigger slot 的首个 assigned element，交互语义由 slot 内的可交互元素原生提供。
_Avoid_: trigger/content 拆分为独立公开元素（React 式三元素）、在 trigger 包装结构上承载 ARIA

**开启态 overlay（open overlay）**:
「哪一层 overlay 正开着」的唯一拥有者，也是 Escape 归属的唯一仲裁者。组件用 `claim(panel)` 声明一次开启并取得会话 handle，`release()` 幂等撤销；开启状态是声明而非询问，仲裁只读声明状态，不回调组件查 `isOpen()`。会话作用域（一次开启）与实例作用域（跨开合与断连的帧事务）分离；「暂时不可关闭」经 `setInert(boolean)` 表达，与静态策略共用同一通道；撤销跟随退场动画。`close()` 先把会话切到「可见但暂缓仲裁」（仍是候选，但只在没有别的开启层时兜底接住 Escape），动画播完或被重新 `open()` 以新会话取代才撤销。登记表另有惰性兜底回收：panel 与宿主同时失联的层在遍历入口被摘掉（claim 路径的回收跑在建层之前，「先 claim 再挂载」的新层不会被误判成死层），漏 `release()` 不会再永久拖住注册表与 document 监听。
_Avoid_: 各组件自持 Escape 监听、以 panel 元素而非 handle 为身份、第三个仲裁枚举值、把帧事务压进会话 handle、撤销提前到退场动画之前（panel 还在场上却已不在登记表里）

**受管子元素组合（managed child composition）**:
子项是公开 custom element 的组合模式。成员追踪与点击归因由 GroupController 直驱，禁用/展示态经 @lit/context 下行广播（只下行），选中态由根直写子项（上行）；子项被移出组后恢复独立控件语义。带 portal 的 option 组合走 `option-portal`，不属于这一模式。
_Avoid_: 用 context 承载成员追踪或上行写回、在子项上用公开属性表达组状态

## 示例文档

示例文档（[`docs/*.md`](./docs/)）的 source of truth 只有那一份 markdown：有哪些示例、每个示例的代码、`## API` 下的每张表（字段的名称 / 类型 / 默认值 / 说明）与每段散文（行为说明这类）都手写在里面，组件源码不参与生成。中文是源语种，文件名是 `<name>.CN.md`；英文译文是默认后缀的 `<name>.md`，与 README 的命名方向一致。换来的是组件内部怎么重构都不会让文档隐形变更；代价是组件改了 API 时那张表要人手动跟着改，机器不提醒——`frontmatter` 与源码的对应关系、表里的属性名与源码声明的一致性都没有机器核对，只剩人工 review。

- 生成与判据由 [`@greypan/md-to-comp`](../md-to-comp/AGENTS.md) 提供，产物落在消费它们的 demo 应用 `src/generated/`，受版本控制、进 git。demo 的 Vite 配置里挂着该包对应 flavor 的插件，dev 与 build 都会按 markdown 重新生成，改完 markdown 不用手跑生成器；测试期插件只判不改。
- 语料住在被发布的包里，所以本包自带 [`turbo.json`](./turbo.json) 覆写 `build` 与 `test` 的 `inputs`：根 `turbo.json` 的 `!**/*.md` 把它们排除在哈希外，而排除项是绝对的，只能在这里反过来「语料进、散文 md 按名字排」。动 `docs/` 的布局或往包根加 md 要同步那份名单——新放的 md 会默认变成 build 输入，名单由仓库守卫 [`scripts/lib/web-ui-docs-inputs.mjs`](../../scripts/lib/web-ui-docs-inputs.mjs) 守。
- 同一份源码在三处必须一致：markdown 围栏、消费方 demo 的 `src/generated/**/demos/` 落盘文件、页面 `<pre>` 的可见文本。落盘文件比围栏多一个行尾换行（落盘前 `trimEnd()` 再补一个，见 `demoFileContent`），除此之外三处逐字相同。改任何一段转义、高亮或落盘路径，都要让这三处一起继续成立。
- 围栏语言写 `tsx` / `vue`，不写 `react`：写 `react` 的块不被格式化器认，落盘的 `.tsx` 却归它管，三处一致与「产物已格式化」会从此互相打架，只能靠人手对齐。
- 示例标题（`## Samples` 下的 `###`）是专业术语，两侧同文、写成英文（`### Basic`）；它就是身份——派生成 kebab-case 后是 demo 文件名与 `demoKey`。跟着语种翻译的是正文说明与 `## API` 的列名，不是标题。
- 消费方 demo 的 `src/generated/**` 不手改：那几份产物是生成函数的输出，要改就改 `docs/*.md`。
- `docs/*.md` 的散文只陈述当前行为、契约与设计意图，不写迁移说明或旧 API 对照：属性改名或移除时改写对应段落，不留「以前叫什么」的历史；兼容性承诺按当前契约写。

## 公共契约变更清单

涉及属性、slot、event、form、导出、框架类型、token 或组件可见行为时，按实际影响检查：

- [`src/components/`](./src/components/) 或 [`src/types/`](./src/types/) 的实现与出口
- 包 README（[`README.md`](./README.md) 与 [`README.CN.md`](./README.CN.md)）：组件章节已搬进 `docs/*.md`，README 只留一张指向它们的索引表
- 受影响的 ADR
- 聚焦测试和 browser-mode 测试
- React/Vue demo 的 type fixtures 与集成表面
- [`apps/interweave/frontend`](../../apps/interweave/frontend)（若被公共组件消费）
- package `exports`、Changeset 和 monorepo-change-impact skill 的契约报告

不要机械同步全部项目，以 monorepo-change-impact skill 的 `verify` 输出、manifest、源码引用和测试确定实际影响。
