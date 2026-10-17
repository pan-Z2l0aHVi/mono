---
'@greypan/md-to-comp': patch
---

feat(md-to-comp): 示例文档换成 remark/shiki 引擎，带 `{#id}` 锚点的示例变成真组件

原来 `scripts/generate-web-ui-examples.mjs` 是一根 1400 行的手写 markdown 解析棍：小节按行找、表格按
`|` 切、代码着色靠自研 tokenizer（`.hl-tag` 那一套类名与取色都在脚本里）。它能把表格与组件源码
join 住，但示例只能是静态代码块——页面上写着的 React/Vue 片段与屏幕上真正跑的 demo 代码来自两套人肉
维护的源码，漂了没人报警。

现在解析走 `unified`/`remark`（frontmatter 用 `remark-frontmatter`，正文用 `remark-rehype` +
`hast-util-to-html`），着色走 `shiki` 的双主题（`github-light` / `github-dark`，`defaultColor: false`
把颜色写成 `--shiki-light` / `--shiki-dark` 落在每个 token 上，取哪一边由生成的 CSS 跟着
`web-ui-theme` 的 `resolved-appearance` 判，切外观不必重新生成）。引擎独立成私有包
`@greypan/md-to-comp`：包内不出现任何宿主概念——围栏语言、API 表的表头与列数、锚点写法、产物目录、
深色外观的祖先选择器全部由配置传入，内置 `react` / `vue` 两个 flavor（入口分别是
`@greypan/md-to-comp/react` 与 `/vue`；再加一个要同时改 `FLAVORS` 表、生成模块里的 `html` 类型与
`assertSelfContained` 的分支）。两个 demo 的 `vite.config.ts` 里挂上对应 flavor
的 Vite 插件，dev 与 build 都按 markdown 重新生成，「改完文档要记得手跑一行命令」从开发循环里消失。
仓库入口 `scripts/generate-web-ui-examples.mjs`（连同它的 `--check` 与给 fixture 用的 `--docs-dir` /
`--out-dir`）一并删掉：它 `import` 的是已构建的 `dist`，`dist` 过期就静默跑旧引擎；新鲜度判据本来
就已经在 app 的 `turbo test` 里（插件在 `VITEST` 下只判不改），篡改 fixture 搬进
`@greypan/md-to-comp` 自己的单测（`generate()` 端到端跑；表格形状在 `markdown.spec.ts` 里对着
`parseMarkdown()`），不再经 CLI。两个 demo 的运行时依赖图不变，
仍然只吃 `src/generated/**` 那几份产物。

API 表随之换成了单一来源。原来表格的名称与顺序取自组件源码（`@property` / `$events` / `<slot>`），markdown 只供中文描述；现在 316 行（Props 225、Events 43、Slots 48）的名称、说明、类型、默认值全部手写在那 37 份 markdown 里，读源码的 `src/component-source.ts`（336 行）与按名字 join 的 `src/join.ts`（51 行）一起删掉。列形状由 `API_COLUMNS` 逐小节定：Props 是四列（名称 / 说明 / 类型 / 默认值），Events 与 Slots 仍是两列——类型与默认值在那两张表里没有渲染位置，写了也没有消费者。删掉 join 换来的是「组件内部怎么重构都不会让文档隐形变更」，代价有两条：组件改了 API 时这张表要人跟着手改，没有脚本来提醒；从前由 join 做的三道核对（`tag` 与源码 `@customElement` 一致、`component` 解析得到真实的组件目录、表里的名字就是源码声明的那个 attribute）没有了。作为补回来的部分，表格的形状现在是硬判据：表头字面量、每行列数、空的名称/说明/类型/默认值、同表重名、API 小节正文里出现非表格行（漏了行首 `|` 的表格就是这一型）、有 `### Props` 标题却零表格行、`## API` 里三张表一行都没有——全部非零退出，不再出现「一节静默变成零行」。Events 那 39 个 `type` 字段从前生成却从未渲染，这次不再进 payload。

live 通道按示例逐个开：标题写 `### 受控值 {#controlled}`，生成器就把那一段围栏落成
`apps/{react,vue}-web-ui-demo/src/generated/demos/slider--controlled.<tsx|vue>`（落盘前 `trimEnd()` 再补
一个行尾换行，mdast 的 code 节点值不含它），`ExampleDoc` 用 `import.meta.glob` 配
`lazy` / `defineAsyncComponent` 把它挂成真组件。显示与执行同源这件事的机器判据钉在三处，各负责一段：引擎里
`src/highlight.ts` 对最终 HTML 的往返（剥掉标记、一趟解完实体必须逐字等于输入）、
`scripts/example-docs.test.mjs` 钉「落盘文件 == 围栏 + 行尾换行」与「payload 可见文本 ==
围栏」、两个 demo 的 `example-doc.browser.spec.*` 把页面 `<pre>` 的可见文本逐条钉到那份落盘文件上（不是只钉其中一条）。这些落盘文件不在根
`vite.config.ts` 的 `fmt.ignorePatterns` 里——它们是被真正编译执行的示例源码，格式与 lint 跟人手写代码
同一口径，围栏写得不合规会在 `check-code` 上直接红。

那个目录归生成器独占，每轮按本轮产出集合清扫：改了一个 `{#id}` 或删掉一条示例，上一轮那份文件会被删掉，
测试期的 `checkArtifacts` 判到孤儿则让那次 `turbo test` 非零退出。本轮就撞见过一次——anchor 改名后留下的 `slider--vertical.tsx` 不被任何
markdown 引用，上面那三条判据盖不到它，却被 `import.meta.glob` 收成了编进 dist 的死组件。

插件在测试期只判不改：按 `process.env.VITEST` 分叉成 `checkArtifacts`，于是两个 demo 的 test 各多一道
「产物 == markdown」的门，且与 dev / build 共用同一份写在 `vite.config.ts` 里的配置——不另立配置文件，
也不让 spec 去 import 整个 vite config（整文件求值会把插件工厂无谓地跑一遍）。dev 与 build 走写盘那一支，
但只有内容真变了才落盘（`writeIfChanged`），否则这次构建会改掉自己的输入哈希、从此拿不到 turbo 缓存，
dev 下还会让宿主 watcher 绕回生成形成死循环。

本轮只迁 `slider.md` 一篇作为试点：围栏改写成自带 `import { useState } from 'react'` / `import { ref }
from 'vue'` 的完整用法形态。其余 29 篇没写锚点，因此只出高亮代码、照旧通过同一套新引擎，迁移可以逐篇
推进而不断构建。`react` 侧要求 `export default function Demo()`、`vue` 侧要求含 `<template>` 的 SFC 且
模板里有事件绑定/指令/插值时必须带 `<script setup>`，这些形状由 `src/sample.ts` 的 `assertSelfContained`
挡住——把片段当文件发出去，症状是 demo 页面挂一个空壳组件。

已知取舍：仓里还没授权引入 `remark-gfm`，而表格是 GFM 扩展、不在 CommonMark 里，所以 API 表目前仍按行
读原文（`src/markdown.ts` 的 `readTableLines`，与旧脚本同口径）。表格改成手写之后这条取舍更值钱：
联合类型必须写成 `'a' \| 'b'`，未转义的 `|` 会被当列边界；漏写行首 `|` 的表格会被读成零行，而零行现在
是错误、不是一张空表。拿到授权后
删掉它，改用 mdast 的 `table` 节点。真机测过从围栏到页面这一整条路——改 `slider.md` 的围栏后不动任何
命令，React 与 Vue 两侧都不整页刷新，组件示例和 `<pre>` 的可见文本同时换成新内容。
