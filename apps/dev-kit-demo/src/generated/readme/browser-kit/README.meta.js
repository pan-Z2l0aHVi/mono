// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/browser-kit" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/v/@greypan/browser-kit\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/dm/@greypan/browser-kit\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/node/v/@greypan/browser-kit\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/l/@greypan/browser-kit\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "Browser APIs for storage, tracking, environment detection, DOM, files, clipboard, events, and history." }
    ]
  },
  { label: 'p', content: "English | <a href=\"./README.CN.md\">简体中文</a> | <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/browser-kit/getting-started\">Live demo</a>" },
  { label: 'h2', id: 'section-2', content: "Install" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># npm</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># pnpm</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># yarn</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># bun</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span></code></pre>", lang: "bash", path: './codeblock/70b3193684a2.bash' },
  { label: 'h2', id: 'section-3', content: "Quick start" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { defineLocal } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> storage</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLocal</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-app'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Alice'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">get</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// { name: 'Alice' }</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Expire after one hour</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'token'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'abc123'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">3600_000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Listen for changes from other tabs</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> unwatch</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">watch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">newValue</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">oldValue</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user changed'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, newValue, oldValue)</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span></code></pre>", lang: "ts", path: './codeblock/3cca4ef12e14.ts' },
  { label: 'h2', id: 'section-4', content: "Modules" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Module" },
      { label: 'th', content: "Summary" },
      { label: 'th', content: "Docs" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "Storage" },
      { label: 'td', content: "Namespaced <code>localStorage</code> / <code>sessionStorage</code> with TTL, quota cleanup, and cross-tab <code>watch</code>" },
      { label: 'td', content: "<a href=\"./docs/storage.md\"><code>docs/storage.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "Tracker" },
      { label: 'td', content: "Composable telemetry outbox (<code>defineTracker</code>, <code>defineBatchTrack</code>, <code>defineOfflineRestore</code>, <code>defineLastWords</code>, <code>definePageErrors</code>)" },
      { label: 'td', content: "<a href=\"./docs/tracker.md\"><code>docs/tracker.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "Environment" },
      { label: 'td', content: "SSR-safe browser, OS, container, and input detection (<code>env</code>)" },
      { label: 'td', content: "<a href=\"./docs/env.md\"><code>docs/env.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "DOM" },
      { label: 'td', content: "Viewport size and root scroll helpers (<code>getViewportSize</code>, <code>getRootScrollTop</code>, <code>getRootScrollLeft</code>)" },
      { label: 'td', content: "<a href=\"./docs/dom.md\"><code>docs/dom.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "File" },
      { label: 'td', content: "Base64 conversion, image dimensions, magic-number file type checks, and streaming downloads" },
      { label: 'td', content: "<a href=\"./docs/file.md\"><code>docs/file.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "Clipboard" },
      { label: 'td', content: "Text and <code>Blob</code> clipboard copy helper (<code>copyToClipboard</code>)" },
      { label: 'td', content: "<a href=\"./docs/copy.md\"><code>docs/copy.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "History Nav" },
      { label: 'td', content: "Read-only Navigation API subset for session back/forward availability (<code>defineHistoryNav</code>)" },
      { label: 'td', content: "<a href=\"./docs/history-nav.md\"><code>docs/history-nav.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "Event Shortcut" },
      { label: 'td', content: "Strongly-typed <code>window</code> / <code>document</code> <code>on</code> and <code>off</code> wrappers" },
      { label: 'td', content: "<a href=\"./docs/shortcut.md\"><code>docs/shortcut.md</code></a>" }
      ]
    }
    ]
  },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "String and number helpers such as <code>getFileExtension</code> and <code>formatFileSize</code> live in <a href=\"../js-kit/README.md\"><code>@greypan/js-kit</code></a>." }
    ]
  }
]

export default meta
