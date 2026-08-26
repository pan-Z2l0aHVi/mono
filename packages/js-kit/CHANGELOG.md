# @greypan/js-kit

## 2.0.0

### Major Changes

- 1e52bc4: 修复 Tracker 待传输事件的持久化与重试：同一对象的重复上报会被独立保留，正常发送改为有序串行，失败事件会保留至 `resume()`、重连或下次初始化后重试；启动时离线不会抢先发送 localStorage 中恢复的数据。
  
  同时删除 `defineLoopQueue`，不保留兼容别名，迁移到并列的 `defineQueue`（调用 `onConsume` 后移除）和 `defineAckQueue`（`onConsume` 返回的 Promise fulfilled 后移除）。两者都使用必填的 `onConsume`，并支持可选的同步 `onPersist` 快照接缝与 `onConsumeError` 错误观察器。
  
  队列持久化采用 persist-before-commit：通用队列的持久化异常会使队列 fail-closed，避免在无法保存快照时静默丢失成员关系。Tracker 的 localStorage 适配层则是 best-effort：存储受限时只告警一次并降级为 memory-only；旧快照可能残留，因此下次初始化存在 at-least-once 重复发送风险。Tracker 的 `persistenceKey` 默认使用 URL；需要在同一页面创建多个相互独立的 Tracker 时，应提供不同的稳定 key。

## 1.6.7

### Patch Changes

- b9faa2c: enhance monorepo agent capabilities

## 1.6.6

### Patch Changes

- 7c06580: try workflows

## 1.6.5

### Patch Changes

- cdc5cf7: Release pipeline validation: bump all public packages for trusted publishing verification.

## 1.6.4

### Patch Changes

- 57f9984: fix mardkwon table format
- 57f9984: fix npm readme cn link

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
