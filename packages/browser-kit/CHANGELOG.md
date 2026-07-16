# @greypan/browser-kit

## 1.7.4

### Patch Changes

- 57f9984: fix mardkwon table format
- 57f9984: fix npm readme cn link
- Updated dependencies [57f9984]
- Updated dependencies [57f9984]
  - @greypan/js-kit@1.6.4

## 1.7.3

### Patch Changes

- 734dea6: fix npm readme cn link
- Updated dependencies [734dea6]
  - @greypan/js-kit@1.6.3

## 1.7.2

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

## 1.7.1

### Patch Changes

- c56dd3e: add tsconfig package
- Updated dependencies [c56dd3e]
  - @greypan/js-kit@1.6.1

## 1.7.0

### Minor Changes

- a4e7f9b: vp monorepo standardization

### Patch Changes

- Updated dependencies [a4e7f9b]
  - @greypan/js-kit@1.6.0

## 1.6.1

### Patch Changes

- 8f4643d: Audit and reorganize devDependencies/peerDependencies across all packages
- Updated dependencies [8f4643d]
  - @greypan/js-kit@1.5.1

## 1.6.0

### Minor Changes

- a06335a: refactor tracker and storage

### Patch Changes

- a06335a: upgrade agents doc
- Updated dependencies [a06335a]
- Updated dependencies [a06335a]
  - @greypan/js-kit@1.5.0

## 1.5.0

### Minor Changes

- 874638d: refactor tracker and storage

### Patch Changes

- Updated dependencies [874638d]
  - @greypan/js-kit@1.4.0

## 1.4.0

### Minor Changes

- 13802c0: bug fix, type fix, spec fix

### Patch Changes

- Updated dependencies [13802c0]
  - @greypan/js-kit@1.3.0

## 1.3.0

### Minor Changes

- 8944472: Improve engineering structures

### Patch Changes

- Updated dependencies [8944472]
  - @greypan/js-kit@1.2.0

## 1.2.1

### Patch Changes

- Updated dependencies [ec36e92]
  - @greypan/js-kit@1.1.1

## 1.2.0

### Minor Changes

- 4dfde81: 完善子包依赖，修复依赖缺失

### Patch Changes

- Updated dependencies [4dfde81]
  - @greypan/js-kit@1.1.0

## 1.1.0

### Minor Changes

- 添加 getViewportSize 方法，获取当前视口尺寸
