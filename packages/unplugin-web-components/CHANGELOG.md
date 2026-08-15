# @greypan/unplugin-web-components

## 1.4.1

### Patch Changes

- Updated dependencies [b9faa2c]
  - @greypan/js-kit@1.6.7

## 1.4.0

### Minor Changes

- 28a8dc5: Vite HTML 入口自动导入：`/vite` 入口新增 `transformIndexHtml`，为 Vite 处理的 HTML 构建入口（`index.html` 等）扫描 kebab-case 自定义元素（大小写不敏感，`<WEB-UI-BUTTON>`/`<web-ui-Button>` 归一到 `web-ui-button`），并在 `<head>` 前部注入 `type="module"` 脚本，以静态 `import` 注册发现的组件；复用 `sideEffects`/`withStyle` 导入语义并按组件去重。扫描按序剥离：先剥带引号属性值（其中的尖括号是属性文本而非标签，避免属性值里的 `<script>` 等字面量吞掉后续真实标签），再剥 RAWTEXT/RCDATA 区域（`script`、`style`、`title`、`textarea`、`iframe`、`xmp`、`noembed`、`noframes`、`noscript`），最后剥注释；未闭合区域通常延伸到文件末尾，但注释内未闭合的 `<script>`/`style` 伪标签可能吞掉其后的真实标签。HTML 中不支持驼峰/帕斯卡标签（HTML 标签名大小写不敏感，解析器统一小写化）。

  模块转换边界修复：React 只识别模块顶部完整的 directive prologue（任意字符串指令，如 `'use strict'`、`'use client'`、`'use server'`），并在其后注入导入——不再只匹配 `use client`/`use server` 两种文本，也不命中函数体内部的同名字符串。Vue 只向不含 `src` 的内联 `<script>`/`<script setup>` 注入；普通外部 `<script src>` 可以与新增的内联 `<script setup>` 共存，只有带 `src` 的 `<script setup>` 无处可注入时跳过转换。

  能力边界：HTML 注入为 Vite 专属能力，Webpack 适配器保持模块源码转换，不提供 HTML 注入。实际仅发布 `/vite` 与 `/webpack` 入口，不再笼统宣称 Rollup/esbuild 支持。

## 1.3.6

### Patch Changes

- 7c06580: try workflows
- Updated dependencies [7c06580]
  - @greypan/js-kit@1.6.6

## 1.3.5

### Patch Changes

- cdc5cf7: Release pipeline validation: bump all public packages for trusted publishing verification.
- Updated dependencies [cdc5cf7]
  - @greypan/js-kit@1.6.5

## 1.3.4

### Patch Changes

- 57f9984: fix mardkwon table format
- 57f9984: fix npm readme cn link
- Updated dependencies [57f9984]
- Updated dependencies [57f9984]
  - @greypan/js-kit@1.6.4

## 1.3.3

### Patch Changes

- 734dea6: fix npm readme cn link
- Updated dependencies [734dea6]
  - @greypan/js-kit@1.6.3

## 1.3.2

### Patch Changes

- be4008b: Standardize externalization to regex patterns for workspace deps; move msw to package-level devDependencies

  - `vite.config.ts` for `js-kit`, `browser-kit`, `web-ui`: replace hardcoded workspace dep names with `/^@greypan\//` regex; add missing external deps (`nanoid`, `msw`)
  - `browser-kit`: move `msw` from peerDependencies to devDependencies
  - `test-kit`: add `msw` to devDependencies for local type checking
  - `web-ui`: replace `react` peer dep with `@types/react`; add React/Vue usage documentation to README
  - `unplugin-web-components`: fix README import path to use `/vite` sub-path export
  - Fix documentation in READMEs and AGENTS.md to reflect current externalization rules

- Updated dependencies [be4008b]
  - @greypan/js-kit@1.6.2

## 1.3.1

### Patch Changes

- c56dd3e: add tsconfig package
- Updated dependencies [c56dd3e]
  - @greypan/js-kit@1.6.1

## 1.3.0

### Minor Changes

- a4e7f9b: vp monorepo standardization

### Patch Changes

- Updated dependencies [a4e7f9b]
  - @greypan/js-kit@1.6.0

## 1.2.4

### Patch Changes

- 8f4643d: Audit and reorganize devDependencies/peerDependencies across all packages
- Updated dependencies [8f4643d]
  - @greypan/js-kit@1.5.1

## 1.2.3

### Patch Changes

- a06335a: upgrade agents doc
- Updated dependencies [a06335a]
- Updated dependencies [a06335a]
  - @greypan/js-kit@1.5.0

## 1.2.2

### Patch Changes

- Updated dependencies [874638d]
  - @greypan/js-kit@1.4.0

## 1.2.1

### Patch Changes

- Updated dependencies [13802c0]
  - @greypan/js-kit@1.3.0

## 1.2.0

### Minor Changes

- 8944472: Improve engineering structures

### Patch Changes

- Updated dependencies [8944472]
  - @greypan/js-kit@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [ec36e92]
  - @greypan/js-kit@1.1.1

## 1.1.0

### Minor Changes

- 4dfde81: 完善子包依赖，修复依赖缺失

### Patch Changes

- Updated dependencies [4dfde81]
  - @greypan/js-kit@1.1.0
