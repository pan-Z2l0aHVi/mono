// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/js-kit" },
  { label: 'h2', id: 'section-2', content: "3.3.0" },
  { label: 'h3', id: 'section-3', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c1bd2ea: Add a bilingual (<code>zh-CN</code> / <code>en</code>) 12-hour relative time formatter (<code>formatRelativeTime</code>) supporting today, yesterday, two days ago, and absolute date fallbacks." }
    ]
  },
  { label: 'h2', id: 'section-4', content: "3.2.0" },
  { label: 'h3', id: 'section-5', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "7eefb10: Add <code>rust.andThen(result, next)</code> for chaining <code>Result</code> and <code>Promise&lt;Result></code> values without manual <code>await</code> boilerplate at each step." }
    ]
  },
  { label: 'h2', id: 'section-6', content: "3.1.0" },
  { label: 'h3', id: 'section-7', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "9787a15: Remove <code>\"./package.json\"</code> from the package <code>exports</code> map." }
    ]
  },
  { label: 'h2', id: 'section-8', content: "3.0.1" },
  { label: 'h3', id: 'section-9', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "3c81816: Fix <code>defineControllableInterval</code> so calling <code>stop()</code> from inside the timer callback permanently stops rescheduling." }
    ]
  },
  { label: 'h2', id: 'section-10', content: "3.0.0" },
  { label: 'h3', id: 'section-11', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "d0a9f32: Remove unused public APIs and simplify <code>safeCall</code>:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Remove <code>asyncCompose</code>, the event-emitter plugin, the Go paradigm helper, random utilities, the <code>./go</code> subpath export, and the <code>nanoid</code> dependency." },
        { label: 'li', content: "Change <code>safeCall(fn, options?)</code> to accept a zero-argument thunk with an optional <code>onError</code> handler." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-12', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "d0a9f32: Add string and number utilities for file extension detection and human-readable file size formatting." }
    ]
  },
  { label: 'h2', id: 'section-13', content: "2.0.0" },
  { label: 'h3', id: 'section-14', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "1e52bc4: Replace <code>defineLoopQueue</code> (removed without an alias) with <code>defineQueue</code> (removes items after <code>onConsume</code>) and <code>defineAckQueue</code> (removes items after the <code>onConsume</code> Promise fulfills). Both require <code>onConsume</code> and support optional synchronous <code>onPersist</code> snapshots (persist-before-commit, fail-closed on persistence errors) and <code>onConsumeError</code> observers." }
    ]
  },
  { label: 'h2', id: 'section-15', content: "1.6.2" },
  { label: 'h3', id: 'section-16', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "be4008b: Standardize workspace dependency externalization patterns in the package build configuration." }
    ]
  },
  { label: 'h2', id: 'section-17', content: "1.5.1" },
  { label: 'h3', id: 'section-18', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8f4643d: Audit and reorganize package dependencies." }
    ]
  },
  { label: 'h2', id: 'section-19', content: "1.3.0" },
  { label: 'h3', id: 'section-20', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "13802c0: Fix runtime bugs and TypeScript type definitions." }
    ]
  },
  { label: 'h2', id: 'section-21', content: "1.1.0" },
  { label: 'h3', id: 'section-22', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "4dfde81: Complete package dependency declarations and fix missing dependencies." }
    ]
  }
]

export default meta
