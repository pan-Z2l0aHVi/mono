# @greypan/js-kit

## 1.6.3

### Patch Changes

- 734dea6: fix npm readme cn link

## 1.6.2

### Patch Changes

- be4008b: Standardize externalization to regex patterns for workspace deps; move msw to package-level devDependencies

  - `vite.config.ts` for `js-kit`, `browser-kit`, `web-ui`: replace hardcoded workspace dep names with `/^@greypan\//` regex; add missing external deps (`nanoid`, `msw`)
  - `browser-kit`: move `msw` from peerDependencies to devDependencies
  - `test-kit`: add `msw` to devDependencies for local type checking
  - `web-ui`: replace `react` peer dep with `@types/react`; add React/Vue usage documentation to README
  - `unplugin-web-components`: fix README import path to use `/vite` sub-path export
  - Fix documentation in READMEs and AGENTS.md to reflect current externalization rules

## 1.6.1

### Patch Changes

- c56dd3e: add tsconfig package

## 1.6.0

### Minor Changes

- a4e7f9b: vp monorepo standardization

## 1.5.1

### Patch Changes

- 8f4643d: Audit and reorganize devDependencies/peerDependencies across all packages

## 1.5.0

### Minor Changes

- a06335a: refactor tracker and storage

### Patch Changes

- a06335a: upgrade agents doc

## 1.4.0

### Minor Changes

- 874638d: refactor tracker and storage

## 1.3.0

### Minor Changes

- 13802c0: bug fix, type fix, spec fix

## 1.2.0

### Minor Changes

- 8944472: Improve engineering structures

## 1.1.1

### Patch Changes

- ec36e92: Test release workflow validation

## 1.1.0

### Minor Changes

- 4dfde81: 完善子包依赖，修复依赖缺失
