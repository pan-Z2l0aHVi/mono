// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/browser-kit" },
  { label: 'h2', id: 'section-2', content: "3.1.2" },
  { label: 'h3', id: 'section-3', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "f966cdc: Move <code>@iconify/types</code> to <code>dependencies</code> in <code>@greypan/web-ui</code>: <code>WebUiIcon</code> exposes <code>IconifyIcon</code> in the published type declarations, so consumers must be able to resolve the type package. Remove the unused <code>remeda</code> dependency from <code>@greypan/browser-kit</code>." }
    ]
  },
  { label: 'h2', id: 'section-4', content: "3.1.1" },
  { label: 'h3', id: 'section-5', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "f4e47c9: Rewrite change-narration comments as current-state statements per the code-style rules. Comment-only change: no behavior, API, or shipped-CSS value changes." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [7eefb10]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.2.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-6', content: "3.1.0" },
  { label: 'h3', id: 'section-7', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "9787a15: 移除各包 <code>exports</code> 里的 <code>\"./package.json\"</code>。仓库内没有任何消费方；这一项只为按包名读元数据重新放开入口，留着会让后来者把它当成必需项。唯一需要读 manifest 的 <code>check-md-to-comp-artifacts</code> 改为按仓库路径读取。已发布包按 minor 处理：升级后经包名解析元数据会报 <code>ERR_PACKAGE_PATH_NOT_EXPORTED</code>，目前没有已知的外部消费者。" }
    ]
  },
  { label: 'h3', id: 'section-8', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "8cb3f56: Release offline, page-exit, and page-error listeners through a composable, idempotent tracker stop method." },
      { label: 'p', content: "Complete toast dismissal once from its panel transition or fallback, and cancel pending dismissal when disconnected or shown again." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [9787a15]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.1.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-9', content: "3.0.1" },
  { label: 'h3', id: 'section-10', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [3c81816]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.0.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-11', content: "3.0.0" },
  { label: 'h3', id: 'section-12', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "d0a9f32: Clean up duplicated and transport-specific public utilities." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Rename <code>maxBeaconSize</code> to <code>maxBatchKB</code>." },
        { label: 'li', content: "Remove <code>sleep</code>, <code>sleepSync</code> and <code>defer</code>." },
        { label: 'li', content: "Move <code>getFileExtension</code> and <code>formatFileSize</code> to <code>@greypan/js-kit</code>." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-13', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "d0a9f32: Expose narrow tracker capability interfaces (<code>TrackCapability</code>, <code>FlushCapability</code> and <code>PauseCapability</code>) so plugins depend only on the tracker methods they use." },
    { label: 'li', content: "d0a9f32: Add a <code>definePageErrors()</code> plugin to the Tracker that collects uncaught errors and unhandled promise rejections through the existing transport pipeline. Includes error-count limits, a signature dedupe window, and message/stack truncation protection by default." }
    ]
  },
  { label: 'h3', id: 'section-14', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "Updated dependencies [d0a9f32]" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [d0a9f32]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.0.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-15', content: "2.2.0" },
  { label: 'h3', id: 'section-16', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c310d9f: Add the <code>transport</code> option to <code>defineTracker</code>: a custom single-entry delivery function <code>(item: object) => Promise&lt;void> | void</code> that replaces the default <code>sendBeacon()</code> → <code>fetch(keepalive)</code> adapter. The transformed payload is passed to custom transports, and an entry is removed only after the returned Promise fulfills. A single oversized event is still sent as one item." }
    ]
  },
  { label: 'h2', id: 'section-17', content: "2.1.0" },
  { label: 'h3', id: 'section-18', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: Add <code>history-nav</code> module: track whether the user can go back/forward in real browser history, exposing a read-only subset of the Navigation API." },
      { label: 'p', content: "<strong><code>defineHistoryNav(options?)</code>:</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Read-only subset: <code>canGoBack</code> / <code>canGoForward</code> / <code>currentEntry</code> / <code>entries()</code> / <code>currententrychange</code>" },
        { label: 'li', content: "Tracks <code>history.pushState</code> / <code>replaceState</code> via side-table patch (no state injection) and <code>popstate</code> traversals with an entry id/key stack" },
        { label: 'li', content: "Persists through <code>sessionStorage</code> (reuses the <code>storage</code> module) with <code>namespace</code> isolation; degrades to in-memory when storage is blocked" },
        { label: 'li', content: "Idempotent singleton with <code>dispose()</code> to restore the patched <code>history</code> methods" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-19', content: "2.0.0" },
  { label: 'h3', id: 'section-20', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "1e52bc4: 修复 Tracker 待传输事件的持久化与重试：同一对象的重复上报会被独立保留，正常发送改为有序串行，失败事件会保留至 <code>resume()</code>、重连或下次初始化后重试；启动时离线不会抢先发送 localStorage 中恢复的数据。" },
      { label: 'p', content: "同时删除 <code>defineLoopQueue</code>，不保留兼容别名，迁移到并列的 <code>defineQueue</code>（调用 <code>onConsume</code> 后移除）和 <code>defineAckQueue</code>（<code>onConsume</code> 返回的 Promise fulfilled 后移除）。两者都使用必填的 <code>onConsume</code>，并支持可选的同步 <code>onPersist</code> 快照接缝与 <code>onConsumeError</code> 错误观察器。" },
      { label: 'p', content: "队列持久化采用 persist-before-commit：通用队列的持久化异常会使队列 fail-closed，避免在无法保存快照时静默丢失成员关系。Tracker 的 localStorage 适配层则是 best-effort：存储受限时只告警一次并降级为 memory-only；旧快照可能残留，因此下次初始化存在 at-least-once 重复发送风险。Tracker 的 <code>persistenceKey</code> 默认使用 URL；需要在同一页面创建多个相互独立的 Tracker 时，应提供不同的稳定 key。" }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-21', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [1e52bc4]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@2.0.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-22', content: "1.7.8" },
  { label: 'h3', id: 'section-23', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "b9faa2c: enhance monorepo agent capabilities" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [b9faa2c]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.7" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-24', content: "1.7.7" },
  { label: 'h3', id: 'section-25', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "7c06580: try workflows" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [7c06580]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.6" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-26', content: "1.7.6" },
  { label: 'h3', id: 'section-27', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "32d3366: Stabilize browser tracker tests while waiting for requests intercepted by MSW." }
    ]
  },
  { label: 'h2', id: 'section-28', content: "1.7.5" },
  { label: 'h3', id: 'section-29', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "cdc5cf7: Release pipeline validation: bump all public packages for trusted publishing verification." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [cdc5cf7]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.5" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-30', content: "1.7.4" },
  { label: 'h3', id: 'section-31', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "57f9984: fix mardkwon table format" },
    { label: 'li', content: "57f9984: fix npm readme cn link" },
    { label: 'li', content: "Updated dependencies [57f9984]" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [57f9984]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.4" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-32', content: "1.7.3" },
  { label: 'h3', id: 'section-33', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "734dea6: fix npm readme cn link" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [734dea6]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.3" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-34', content: "1.7.2" },
  { label: 'h3', id: 'section-35', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "be4008b: Standardize externalization to regex patterns for workspace deps; move msw to package-level devDependencies" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>vite.config.ts</code> for <code>js-kit</code>, <code>browser-kit</code>, <code>web-ui</code>: replace hardcoded workspace dep names with <code>/^@greypan\\//</code> regex; add missing external deps (<code>nanoid</code>, <code>msw</code>)" },
        { label: 'li', content: "<code>browser-kit</code>: move <code>msw</code> from peerDependencies to devDependencies" },
        { label: 'li', content: "<code>test-kit</code>: add <code>msw</code> to devDependencies for local type checking" },
        { label: 'li', content: "<code>web-ui</code>: replace <code>react</code> peer dep with <code>@types/react</code>; add React/Vue usage documentation to README" },
        { label: 'li', content: "<code>unplugin-web-components</code>: fix README import path to use <code>/vite</code> sub-path export" },
        { label: 'li', content: "Fix documentation in READMEs and AGENTS.md to reflect current externalization rules" }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [be4008b]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.2" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-36', content: "1.7.1" },
  { label: 'h3', id: 'section-37', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c56dd3e: add tsconfig package" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [c56dd3e]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-38', content: "1.7.0" },
  { label: 'h3', id: 'section-39', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a4e7f9b: vp monorepo standardization" }
    ]
  },
  { label: 'h3', id: 'section-40', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [a4e7f9b]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-41', content: "1.6.1" },
  { label: 'h3', id: 'section-42', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8f4643d: Audit and reorganize devDependencies/peerDependencies across all packages" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [8f4643d]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.5.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-43', content: "1.6.0" },
  { label: 'h3', id: 'section-44', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a06335a: refactor tracker and storage" }
    ]
  },
  { label: 'h3', id: 'section-45', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a06335a: upgrade agents doc" },
    { label: 'li', content: "Updated dependencies [a06335a]" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [a06335a]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.5.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-46', content: "1.5.0" },
  { label: 'h3', id: 'section-47', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "874638d: refactor tracker and storage" }
    ]
  },
  { label: 'h3', id: 'section-48', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [874638d]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.4.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-49', content: "1.4.0" },
  { label: 'h3', id: 'section-50', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "13802c0: bug fix, type fix, spec fix" }
    ]
  },
  { label: 'h3', id: 'section-51', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [13802c0]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.3.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-52', content: "1.3.0" },
  { label: 'h3', id: 'section-53', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8944472: Improve engineering structures" }
    ]
  },
  { label: 'h3', id: 'section-54', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [8944472]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.2.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-55', content: "1.2.1" },
  { label: 'h3', id: 'section-56', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [ec36e92]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.1.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-57', content: "1.2.0" },
  { label: 'h3', id: 'section-58', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "4dfde81: 完善子包依赖，修复依赖缺失" }
    ]
  },
  { label: 'h3', id: 'section-59', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [4dfde81]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.1.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-60', content: "1.1.0" },
  { label: 'h3', id: 'section-61', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "添加 getViewportSize 方法，获取当前视口尺寸" }
    ]
  }
]

export default meta
