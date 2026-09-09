# @greypan/test-kit

## 0.3.1

### Patch Changes

- Updated dependencies [d0a9f32]
- Updated dependencies [d0a9f32]
  - @greypan/js-kit@3.0.0

## 0.3.0

### Minor Changes

- c310d9f: test-kit 新增 `createMswTestEnv({ handlers })` 一体化 MSW 测试环境：自动捕获请求（内置兜底 recorder，业务 handler 优先）并提供 `settle` 稳定窗口排空（保留 fake timers）。
  
  同时将 `vite-plus` 声明为 peer dependency：`settle` 在运行期从 `vite-plus/test` 导入 `vi`，属于发布表面，消费方需提供 `vite-plus >= 0.3`。这是 `contract-diff` 判定的 packaging 契约变更（breaking candidate）；因既有消费方运行时行为不变（未安装 vite-plus 时本就无法运行其测试环境），且本包处于 0.x 版本线（minor 即 breaking 通道），故决策为 minor 而非 major。

## 0.2.8

### Patch Changes

- Updated dependencies [1e52bc4]
  - @greypan/js-kit@2.0.0

## 0.2.7

### Patch Changes

- Updated dependencies [b9faa2c]
  - @greypan/js-kit@1.6.7

## 0.2.6

### Patch Changes

- 7c06580: try workflows
- Updated dependencies [7c06580]
  - @greypan/js-kit@1.6.6

## 0.2.5

### Patch Changes

- cdc5cf7: Release pipeline validation: bump all public packages for trusted publishing verification.
- Updated dependencies [cdc5cf7]
  - @greypan/js-kit@1.6.5

## 0.2.4

### Patch Changes

- 57f9984: fix mardkwon table format
- 57f9984: fix npm readme cn link
- Updated dependencies [57f9984]
- Updated dependencies [57f9984]
  - @greypan/js-kit@1.6.4

## 0.2.3

### Patch Changes

- 734dea6: fix npm readme cn link
- Updated dependencies [734dea6]
  - @greypan/js-kit@1.6.3

## 0.2.2

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

## 0.2.1

### Patch Changes

- c56dd3e: add tsconfig package
- Updated dependencies [c56dd3e]
  - @greypan/js-kit@1.6.1

## 0.2.0

### Minor Changes

- a4e7f9b: vp monorepo standardization

### Patch Changes

- Updated dependencies [a4e7f9b]
  - @greypan/js-kit@1.6.0

## 0.1.2

### Patch Changes

- 8f4643d: Audit and reorganize devDependencies/peerDependencies across all packages
- Updated dependencies [8f4643d]
  - @greypan/js-kit@1.5.1

## 0.1.1

### Patch Changes

- a06335a: upgrade agents doc
- Updated dependencies [a06335a]
- Updated dependencies [a06335a]
  - @greypan/js-kit@1.5.0

## 0.1.1

### Patch Changes

- Updated dependencies [874638d]
  - @greypan/js-kit@1.4.0
