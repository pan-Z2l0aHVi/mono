# web-ui-docs

- 两份 source of truth 各管一件事，缺一份就报错而不是猜：`docs/examples/web-ui/*.md` 决定「有哪些示例、每个示例的代码是什么、每个 API 字段怎么描述」，`packages/web-ui/src/components/*/index.ts` 决定「有哪些 props / events / slots、类型与默认值是什么」。任一侧多出或少掉一个名字都以非零退出失败——静默补位只会让文档看起来对、其实是错的。
- 同一份源码在三处必须一致：markdown 围栏、落盘文件（`trimEnd()` 后补一个行尾换行）、页面 `<pre>` 的可见文本。这是本包存在的理由，也是判据：改任何一段转义或高亮路径，都要让 `scripts/generate-web-ui-examples.test.mjs` 那两条等值断言和两个 demo 的 `example-doc.browser.spec.*` 继续成立；引擎里 `src/highlight.ts` 另有一条对最终 HTML 的往返自证，审的是发出去的那份 HTML 而不是 token 流。
- `src/generated/demos/` 归生成器独占，每轮按本轮产出集合清扫：改了 `{#id}` 或删掉一条示例，上一轮那份文件跟着走，`--check` 遇到孤儿非零退出。孤儿不被任何 markdown 引用，上面那组断言盖不到它，却照样被 app 的 `import.meta.glob` 编进构建。
- 本包 `private`，只被 `scripts/generate-web-ui-examples.mjs` 这个 launcher 经 `dist/cli.mjs` 调用。不要把 `@greypan/web-ui-docs` 加进 app 的依赖：两个 demo 运行时看见的只有 `src/generated/**` 那几份产物。
- 改完 markdown 要手跑一次生成器（约 1s），不接 dev watch：产物落在 app 的 `src/` 里，跑着的 dev server 会接住——原地改一条 live 围栏这一程实测过两条通道一起热替换、不整页刷新（live 组件与 `<pre>` 的可见文本）；改 `{#id}` 或删示例走「删旧建新」，那一程是否仍算热替换没测过。把生成器塞进 Vite 等于让两个 demo 依赖一个带 shiki 的构建期引擎，为一行命令不值。引擎自己的 watch 是 `pnpm --filter @greypan/web-ui-docs dev`（脚本为 `vp pack --watch --clean=false`，`build.md` 把「watch 进程清空 d.ts」列为要体检的信号），只管 `dist` 新鲜度，与 markdown 无关。
- API 表目前按行读原文（`src/markdown.ts` 的 `readTableLines`），原因不是 remark 读不了表，而是仓里还没授权引入 `remark-gfm`。拿到授权后删掉它与 `parseApiTable` 的行切片，改成 mdast 的 `table` 节点。
- 着色由 shiki 的双主题产出，颜色写成 `--shiki-light` / `--shiki-dark` 落在每个 token 上；取哪一边由生成的 CSS 跟着 `web-ui-theme` 的 `resolved-appearance` 判，所以切外观不需要重新生成高亮 HTML。
