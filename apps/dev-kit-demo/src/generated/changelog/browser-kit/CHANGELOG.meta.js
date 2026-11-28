// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/browser-kit" },
  { label: 'h2', id: 'section-2', content: "3.1.3" },
  { label: 'h3', id: 'section-3', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [c1bd2ea]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.3.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-4', content: "3.1.2" },
  { label: 'h3', id: 'section-5', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "f966cdc: Remove the unused <code>remeda</code> dependency." }
    ]
  },
  { label: 'h2', id: 'section-6', content: "3.1.1" },
  { label: 'h3', id: 'section-7', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
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
  { label: 'h2', id: 'section-8', content: "3.1.0" },
  { label: 'h3', id: 'section-9', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "9787a15: Remove <code>\"./package.json\"</code> from the package <code>exports</code> map." }
    ]
  },
  { label: 'h3', id: 'section-10', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8cb3f56: Release offline, page-exit, and page-error listeners through a composable, idempotent tracker <code>stop()</code> method." },
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
  { label: 'h2', id: 'section-11', content: "3.0.1" },
  { label: 'h3', id: 'section-12', content: "Patch Changes" },
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
  { label: 'h2', id: 'section-13', content: "3.0.0" },
  { label: 'h3', id: 'section-14', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "d0a9f32: Clean up duplicated and transport-specific public utilities:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Rename <code>maxBeaconSize</code> to <code>maxBatchKB</code>." },
        { label: 'li', content: "Remove <code>sleep</code>, <code>sleepSync</code>, and <code>defer</code>." },
        { label: 'li', content: "Move <code>getFileExtension</code> and <code>formatFileSize</code> to <code>@greypan/js-kit</code>." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-15', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "d0a9f32: Expose narrow tracker capability interfaces (<code>TrackCapability</code>, <code>FlushCapability</code>, and <code>PauseCapability</code>) so plugins depend only on the tracker methods they use." },
    { label: 'li', content: "d0a9f32: Add a <code>definePageErrors()</code> plugin to the Tracker that collects uncaught errors and unhandled promise rejections with error-count limits, signature deduplication, and message/stack truncation." }
    ]
  },
  { label: 'h3', id: 'section-16', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
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
  { label: 'h2', id: 'section-17', content: "2.2.0" },
  { label: 'h3', id: 'section-18', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c310d9f: Add the <code>transport</code> option to <code>defineTracker</code> for custom single-entry delivery functions <code>(item: object) => Promise&lt;void> | void</code> replacing the default <code>sendBeacon()</code> / <code>fetch(keepalive)</code> adapter." }
    ]
  },
  { label: 'h2', id: 'section-19', content: "2.1.0" },
  { label: 'h3', id: 'section-20', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "ab8dfb7: Add the <code>history-nav</code> module (<code>defineHistoryNav</code>) to track real browser history navigation (<code>canGoBack</code>, <code>canGoForward</code>, <code>currentEntry</code>, <code>entries()</code>, <code>currententrychange</code>) with <code>sessionStorage</code> persistence and an idempotent <code>dispose()</code> hook." }
    ]
  },
  { label: 'h2', id: 'section-21', content: "2.0.0" },
  { label: 'h3', id: 'section-22', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "1e52bc4: Overhaul Tracker persistence and retry behavior: preserve duplicate event payloads independently, serialize normal delivery, retain failed events until <code>resume()</code>, reconnect, or next initialization, and avoid flushing restored <code>localStorage</code> entries while offline on startup. The <code>localStorage</code> persistence adapter degrades best-effort to memory-only when storage is unavailable, and <code>persistenceKey</code> defaults to the current URL." }
    ]
  },
  { label: 'h3', id: 'section-23', content: "Patch Changes" },
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
  { label: 'h2', id: 'section-24', content: "1.7.6" },
  { label: 'h3', id: 'section-25', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "32d3366: Stabilize browser tracker tests under MSW request interception." }
    ]
  },
  { label: 'h2', id: 'section-26', content: "1.7.2" },
  { label: 'h3', id: 'section-27', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "be4008b: Move <code>msw</code> from <code>peerDependencies</code> to <code>devDependencies</code> and standardize workspace dependency externalization." },
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
  { label: 'h2', id: 'section-28', content: "1.6.1" },
  { label: 'h3', id: 'section-29', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8f4643d: Audit and reorganize package dependencies." },
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
  { label: 'h2', id: 'section-30', content: "1.5.0" },
  { label: 'h3', id: 'section-31', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "874638d: Refactor the tracker and storage modules." }
    ]
  },
  { label: 'h2', id: 'section-32', content: "1.4.0" },
  { label: 'h3', id: 'section-33', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "13802c0: Fix runtime bugs and TypeScript type definitions." },
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
  { label: 'h2', id: 'section-34', content: "1.2.0" },
  { label: 'h3', id: 'section-35', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "4dfde81: Complete package dependency declarations and fix missing dependencies." }
    ]
  },
  { label: 'h3', id: 'section-36', content: "Patch Changes" },
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
  { label: 'h2', id: 'section-37', content: "1.1.0" },
  { label: 'h3', id: 'section-38', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "Add <code>getViewportSize</code> to read the current viewport dimensions." }
    ]
  }
]

export default meta
