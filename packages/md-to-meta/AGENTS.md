# md-to-meta

通用 markdown 结构化引擎（meta 模块 + 逐围栏 code 文件 + `theme.css` + Vite 插件 + headless CLI），设计取舍见 [ADR-0019](../../docs/adr/0019-md-to-meta.md)。

- **严守去业务契约**：包内不出现任何宿主名字、路径或业务概念（不解析 frontmatter、locale、flavor、示例小节或 API 表）；`<basename>` 仅去 `.md` 后缀，重名直接报错不猜测。
- **全围栏落盘与 `exec` 分离**：所有围栏都按内容 hash 落盘到 `codeblock/<hash>.<ext>`（拒绝含路径分隔符或空白的语言名）；`exec` 只控制是否在 meta 里注入静态字面 `load: () => import(...)`（禁止动态变量 `import(path)` 以保 Rollup 切 chunk）。
- **逐字节一致与高亮自证**：落盘代码为围栏 `trimEnd() + '\n'`，不参与 lint/format；生成期高亮自证（剥行号槽与标签后逐字等于输入）失败即 `fail`，运行时 `./runtime` 的 `highlightRuntime` 失配则回退纯文本。类名常量统一从 [`src/contract.ts`](./src/contract.ts) 导出，不抄字符串。
- **浏览器入口零 Node 依赖**：`./runtime` 模块图不得触及 `node:` 内建（由 `runtime-graph` 测试钉住）；Node 依赖全部留在 `./generate`、`./vite`、`./node-hash`。
- **防构建死循环与测试只读**：落盘必须经 `writeIfChanged`（无条件覆写会破坏 Turbo 缓存并在 dev 触发 watcher 死循环）；插件实例化时将 `VITEST` 解析为固定 `mode: 'check' | 'write'`，测试期只判不改；不要让 spec import 整个宿主 `vite.config.ts`。
- **meta 模块 lint-clean**：禁止匿名 default export（写 `const meta = [...]` + `export default meta`）。
- **深色选择器权重**：`darkSelector` 由宿主传入，深色块选择器权重更高，浅色侧需跨外观生效的属性须在深色块同值声明。
