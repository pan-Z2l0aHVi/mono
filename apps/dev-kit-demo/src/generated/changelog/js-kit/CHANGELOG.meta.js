// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/js-kit" },
  { label: 'h2', id: 'section-2', content: "3.2.0" },
  { label: 'h3', id: 'section-3', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "7eefb10: Add <code>rust.andThen(result, next)</code>: Rust's <code>Result::and_then</code>. On <code>Ok</code> it hands the payload to <code>next</code> and takes\nthat call's result as its own; on <code>Err</code> it returns the error untouched and never runs <code>next</code>. It accepts a\n<code>Result</code> or a promise of one, so an async step chains without an <code>await</code> at every link. The name stays\ncamelCase like the rest of the paradigm module (<code>isOk</code>, not <code>is_ok</code>) — the deviation from Rust is spelling,\nnot semantics." }
    ]
  },
  { label: 'h2', id: 'section-4', content: "3.1.0" },
  { label: 'h3', id: 'section-5', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "9787a15: 移除各包 <code>exports</code> 里的 <code>\"./package.json\"</code>。仓库内没有任何消费方；这一项只为按包名读元数据重新放开入口，留着会让后来者把它当成必需项。唯一需要读 manifest 的 <code>check-md-to-comp-artifacts</code> 改为按仓库路径读取。已发布包按 minor 处理：升级后经包名解析元数据会报 <code>ERR_PACKAGE_PATH_NOT_EXPORTED</code>，目前没有已知的外部消费者。" }
    ]
  },
  { label: 'h2', id: 'section-6', content: "3.0.1" },
  { label: 'h3', id: 'section-7', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Fix <code>defineControllableInterval</code> so <code>stop()</code> called from inside the timer callback actually stops the timer." },
      { label: 'p', content: "The recursive <code>setTimeout</code> chain ran the user callback first and only then decided whether to schedule the next period, and that decision looked at <code>isPaused</code> alone. Because <code>stop()</code> resets <code>isPaused</code> to <code>false</code>, a <code>stop()</code> issued from within the callback was undone before the chain could observe it: the timer read the freshly reset <code>isPaused</code>, rescheduled, and kept firing every <code>interval</code> indefinitely. Calling <code>stop()</code> from the callback was therefore the one way to make the timer impossible to stop." },
      { label: 'p', content: "The chain now tracks its own liveness in a separate flag that <code>stop()</code> clears and that only the public <code>tick()</code> re-arms. Rescheduling re-reads that flag after the callback returns, so a <code>stop()</code> from inside the callback ends the chain for good." },
      { label: 'p', content: "Behaviour that did not change: <code>stop()</code> while paused still leaves the timer restartable via <code>start()</code>, an explicit <code>tick()</code> after <code>stop()</code> still schedules a callback and continues on the normal cycle, and <code>pause()</code>, <code>resume()</code> and manual <code>tick()</code> — including the guarantee that a manual tick during a pause leaves no leftover handle for <code>resume()</code> to double-schedule — keep their existing semantics." }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-8', content: "3.0.0" },
  { label: 'h3', id: 'section-9', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "d0a9f32: Remove dead public surface and collapse the asynchronous call helper." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Remove <code>asyncCompose</code>, the event-emitter plugin, the Go paradigm helper, the random utilities and the <code>nanoid</code> dependency." },
        { label: 'li', content: "Change <code>safeCall(fn, options?)</code> from spreading arguments to calling a thunk and add an optional <code>onError</code> escape hatch so failures are no longer silently swallowed." },
        { label: 'li', content: "Remove the dedicated <code>./go</code> subpath export." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-10', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "d0a9f32: Add string and number utilities for extension detection and human-readable file sizes, and expose an <code>onError</code> option for <code>safeCall</code>." }
    ]
  },
  { label: 'h2', id: 'section-11', content: "2.0.0" },
  { label: 'h3', id: 'section-12', content: "Major Changes" },
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
  { label: 'h2', id: 'section-13', content: "1.6.7" },
  { label: 'h3', id: 'section-14', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "b9faa2c: enhance monorepo agent capabilities" }
    ]
  },
  { label: 'h2', id: 'section-15', content: "1.6.6" },
  { label: 'h3', id: 'section-16', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "7c06580: try workflows" }
    ]
  },
  { label: 'h2', id: 'section-17', content: "1.6.5" },
  { label: 'h3', id: 'section-18', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "cdc5cf7: Release pipeline validation: bump all public packages for trusted publishing verification." }
    ]
  },
  { label: 'h2', id: 'section-19', content: "1.6.4" },
  { label: 'h3', id: 'section-20', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "57f9984: fix mardkwon table format" },
    { label: 'li', content: "57f9984: fix npm readme cn link" }
    ]
  },
  { label: 'h2', id: 'section-21', content: "1.6.3" },
  { label: 'h3', id: 'section-22', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "734dea6: fix npm readme cn link" }
    ]
  },
  { label: 'h2', id: 'section-23', content: "1.6.2" },
  { label: 'h3', id: 'section-24', content: "Patch Changes" },
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
    }
    ]
  },
  { label: 'h2', id: 'section-25', content: "1.6.1" },
  { label: 'h3', id: 'section-26', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c56dd3e: add tsconfig package" }
    ]
  },
  { label: 'h2', id: 'section-27', content: "1.6.0" },
  { label: 'h3', id: 'section-28', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a4e7f9b: vp monorepo standardization" }
    ]
  },
  { label: 'h2', id: 'section-29', content: "1.5.1" },
  { label: 'h3', id: 'section-30', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8f4643d: Audit and reorganize devDependencies/peerDependencies across all packages" }
    ]
  },
  { label: 'h2', id: 'section-31', content: "1.5.0" },
  { label: 'h3', id: 'section-32', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a06335a: refactor tracker and storage" }
    ]
  },
  { label: 'h3', id: 'section-33', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a06335a: upgrade agents doc" }
    ]
  },
  { label: 'h2', id: 'section-34', content: "1.4.0" },
  { label: 'h3', id: 'section-35', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "874638d: refactor tracker and storage" }
    ]
  },
  { label: 'h2', id: 'section-36', content: "1.3.0" },
  { label: 'h3', id: 'section-37', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "13802c0: bug fix, type fix, spec fix" }
    ]
  },
  { label: 'h2', id: 'section-38', content: "1.2.0" },
  { label: 'h3', id: 'section-39', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8944472: Improve engineering structures" }
    ]
  },
  { label: 'h2', id: 'section-40', content: "1.1.1" },
  { label: 'h3', id: 'section-41', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "ec36e92: Test release workflow validation" }
    ]
  },
  { label: 'h2', id: 'section-42', content: "1.1.0" },
  { label: 'h3', id: 'section-43', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "4dfde81: 完善子包依赖，修复依赖缺失" }
    ]
  }
]

export default meta
