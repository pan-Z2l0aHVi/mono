---
'@greypan/unplugin-web-components': minor
---

Vite HTML 入口自动导入：`/vite` 入口新增 `transformIndexHtml`，为 Vite 处理的 HTML 构建入口（`index.html` 等）扫描 kebab-case 自定义元素（大小写不敏感，`<WEB-UI-BUTTON>`/`<web-ui-Button>` 归一到 `web-ui-button`），并在 `<head>` 前部注入 `type="module"` 脚本，以静态 `import` 注册发现的组件；复用 `sideEffects`/`withStyle` 导入语义并按组件去重。扫描按序剥离：先剥带引号属性值（其中的尖括号是属性文本而非标签，避免属性值里的 `<script>` 等字面量吞掉后续真实标签），再剥 RAWTEXT/RCDATA 区域（`script`、`style`、`title`、`textarea`、`iframe`、`xmp`、`noembed`、`noframes`、`noscript`），最后剥注释；未闭合区域通常延伸到文件末尾，但注释内未闭合的 `<script>`/`style` 伪标签可能吞掉其后的真实标签。HTML 中不支持驼峰/帕斯卡标签（HTML 标签名大小写不敏感，解析器统一小写化）。

模块转换边界修复：React 只识别模块顶部完整的 directive prologue（任意字符串指令，如 `'use strict'`、`'use client'`、`'use server'`），并在其后注入导入——不再只匹配 `use client`/`use server` 两种文本，也不命中函数体内部的同名字符串。Vue 只向不含 `src` 的内联 `<script>`/`<script setup>` 注入；普通外部 `<script src>` 可以与新增的内联 `<script setup>` 共存，只有带 `src` 的 `<script setup>` 无处可注入时跳过转换。

能力边界：HTML 注入为 Vite 专属能力，Webpack 适配器保持模块源码转换，不提供 HTML 注入。实际仅发布 `/vite` 与 `/webpack` 入口，不再笼统宣称 Rollup/esbuild 支持。
