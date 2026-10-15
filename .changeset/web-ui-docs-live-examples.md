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
读原文（`src/markdown.ts` 的 `readTableLines`，与旧脚本同口径、不改变现有 30 篇的解析结果）。拿到授权后
删掉它，改用 mdast 的 `table` 节点。改 markdown 后仍要手跑一次生成器（约 1s）：它落盘的文件都在 app 的
`src/` 里，两个 dev server 各自的 watcher 会接住。真机测过从围栏到页面这一整条路——改 `slider.md` 的
basic 围栏再跑生成器，React 与 Vue 两侧都不整页刷新，live 组件和 `<pre>` 的可见文本同时换成新内容。
把生成器塞进 dev server 需要给两个 demo 加一条 workspace 依赖，为一行命令不值。
