---
'@greypan/web-ui-docs': patch
'@greypan/react-web-ui-demo': patch
'@greypan/vue-web-ui-demo': patch
---

feat(web-ui-docs): 示例文档换成 remark/shiki 引擎，带 `{#id}` 锚点的示例变成真组件

原来 `scripts/generate-web-ui-examples.mjs` 是一根 1400 行的手写 markdown 解析棍：小节按行找、表格按
`|` 切、代码着色靠自研 tokenizer（`.hl-tag` 那一套类名与取色都在脚本里）。它能把表格与组件源码
join 住，但示例只能是静态代码块——页面上写着的 React/Vue 片段与屏幕上真正跑的 demo 代码来自两套人肉
维护的源码，漂了没人报警。

现在解析走 `unified`/`remark`（frontmatter 用 `remark-frontmatter`，正文用 `remark-rehype` +
`hast-util-to-html`），着色走 `shiki` 的双主题（`github-light` / `github-dark`，`defaultColor: false`
把颜色写成 `--shiki-light` / `--shiki-dark` 落在每个 token 上，取哪一边由生成的 CSS 跟着
`web-ui-theme` 的 `resolved-appearance` 判，切外观不必重新生成）。引擎搬进私有包
`@greypan/web-ui-docs`，`scripts/generate-web-ui-examples.mjs` 只剩一个 launcher，调它构建出的
`dist/cli.mjs`；两个 demo 的运行时依赖图不变，仍然只吃 `src/generated/**` 那几份产物。

API 表随之换成了单一来源。原来表格的名称与顺序取自组件源码（`@property` / `$events` / `<slot>`），markdown 只供中文描述；现在 283 行（Props 206、Events 39、Slots 38）的名称、说明、类型、默认值全部手写在那 30 份 markdown 里，读源码的 `src/component-source.ts`（336 行）与按名字 join 的 `src/join.ts`（51 行）一起删掉。列形状由 `API_COLUMNS` 逐小节定：Props 是四列（名称 / 说明 / 类型 / 默认值），Events 与 Slots 仍是两列——类型与默认值在那两张表里没有渲染位置，写了也没有消费者。删掉 join 换来的是「组件内部怎么重构都不会让文档隐形变更」，代价有两条：组件改了 API 时这张表要人跟着手改，没有脚本来提醒；从前由 join 做的三道核对（`tag` 与源码 `@customElement` 一致、`component` 解析得到真实的组件目录、表里的名字就是源码声明的那个 attribute）没有了。作为补回来的部分，表格的形状现在是硬判据：表头字面量、每行列数、空的名称/说明/类型/默认值、同表重名、API 小节正文里出现非表格行（漏了行首 `|` 的表格就是这一型）、有 `### Props` 标题却零表格行、整篇缺 `## API`、`## API` 里三张表一行都没有——全部非零退出，不再出现「一节静默变成零行」。Events 那 39 个 `type` 字段从前生成却从未渲染，这次不再进 payload。

live 通道按示例逐个开：标题写 `### 受控值 {#controlled}`，生成器就把那一段围栏落成
`apps/{react,vue}-web-ui-demo/src/generated/demos/slider--controlled.<tsx|vue>`（落盘前 `trimEnd()` 再补
一个行尾换行，mdast 的 code 节点值不含它），`ExampleDoc` 用 `import.meta.glob` 配
`lazy` / `defineAsyncComponent` 把它挂成真组件。显示与执行同源这件事有三条机器判据，各钉在一处：引擎里
`src/highlight.ts` 对最终 HTML 的往返（剥掉标记、一趟解完实体必须逐字等于输入）、
`scripts/generate-web-ui-examples.test.mjs` 钉「落盘文件 == 围栏 + 行尾换行」与「payload 可见文本 ==
围栏」、两个 demo 的 `example-doc.browser.spec.*` 把页面 `<pre>` 的可见文本钉到那份落盘文件上。这些落盘文件不在根
`vite.config.ts` 的 `fmt.ignorePatterns` 里——它们是被真正编译执行的示例源码，格式与 lint 跟人手写代码
同一口径，围栏写得不合规会在 `check-code` 上直接红。

那个目录归生成器独占，每轮按本轮产出集合清扫：改了一个 `{#id}` 或删掉一条示例，上一轮那份文件会被删掉，
`--check` 则遇到孤儿非零退出。本轮就撞见过一次——anchor 改名后留下的 `slider--vertical.tsx` 不被任何
markdown 引用，上面那三条判据盖不到它，却被 `import.meta.glob` 收成了编进 dist 的死组件。

本轮只迁 `slider.md` 一篇作为试点：围栏改写成自带 `import { useState } from 'react'` / `import { ref }
from 'vue'` 的完整用法形态。其余 29 篇没写锚点，因此只出高亮代码、照旧通过同一套新引擎，迁移可以逐篇
推进而不断构建。`react` 侧要求 `export default function Demo()`、`vue` 侧要求含 `<template>` 的 SFC 且
模板里有事件绑定/指令/插值时必须带 `<script setup>`，这些形状由 `src/live.ts` 的 `assertSelfContained`
挡住——把片段当文件发出去，症状是 demo 页面挂一个空壳组件。

已知取舍：仓里还没授权引入 `remark-gfm`，而表格是 GFM 扩展、不在 CommonMark 里，所以 API 表目前仍按行
读原文（`src/markdown.ts` 的 `readTableLines`，与旧脚本同口径）。表格改成手写之后这条取舍更值钱：
联合类型必须写成 `'a' \| 'b'`，未转义的 `|` 会被当列边界；漏写行首 `|` 的表格会被读成零行，而零行现在
是错误、不是一张空表。拿到授权后
删掉它，改用 mdast 的 `table` 节点。改 markdown 后仍要手跑一次生成器（约 1s）：它落盘的文件都在 app 的
`src/` 里，两个 dev server 各自的 watcher 会接住。真机测过从围栏到页面这一整条路——改 `slider.md` 的
basic 围栏再跑生成器，React 与 Vue 两侧都不整页刷新，live 组件和 `<pre>` 的可见文本同时换成新内容。
把生成器塞进 dev server 需要给两个 demo 加一条 workspace 依赖，为一行命令不值。
