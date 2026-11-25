// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/browser-kit" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/v/@greypan/browser-kit\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/dm/@greypan/browser-kit\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/node/v/@greypan/browser-kit\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/l/@greypan/browser-kit\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "Browser utilities for namespaced storage, composable telemetry tracking, environment detection, DOM metrics, files, clipboard, events, and session history." }
    ]
  },
  { label: 'p', content: "English | <a href=\"./README.CN.md\">简体中文</a> | <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/browser-kit/getting-started\">Live demo</a>" },
  { label: 'h2', id: 'section-2', content: "Install" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span></code></pre>", lang: "npm", path: './codeblock/1440a9a36db8.npm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span></code></pre>", lang: "pnpm", path: './codeblock/d8a504e49e2b.pnpm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span></code></pre>", lang: "bun", path: './codeblock/ed3c5ad8ba4e.bun' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span></code></pre>", lang: "yarn", path: './codeblock/a2ca3ff823c0.yarn' },
  { label: 'h2', id: 'section-3', content: "Quick start" },
  { label: 'h3', id: 'section-4', content: "Namespaced storage with TTL" },
  { label: 'p', content: "<code>defineLocal(namespace?)</code> and <code>defineSession(namespace?)</code> return cached singletons per namespace. Values are wrapped with metadata so expired keys return the default value and are deleted on read." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { defineLocal } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> storage</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLocal</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-app'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Alice'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">get</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;{ </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }>(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// { name: 'Alice' }</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Expire after one hour (ms)</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'token'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'abc123'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">3_600_000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Listen for changes from other tabs on the same origin</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> unwatch</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">watch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;{ </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }>(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">next</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">prev</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user changed in another tab'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, next, prev)</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">unwatch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span></code></pre>", lang: "ts", path: './codeblock/7bbb246178cf.ts' },
  { label: 'h3', id: 'section-5', content: "Composable telemetry tracker" },
  { label: 'p', content: "Start with <code>defineTracker</code> and attach plugins with <code>.use()</code>. Register <code>defineBatchTrack()</code> before <code>defineLastWords()</code> and <code>definePageErrors()</code> so page exit flushes drain the batch buffer and captured errors go through batching." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  defineBatchTrack,</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  defineLastWords,</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  defineOfflineRestore,</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  definePageErrors,</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  defineTracker</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> tracker</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineTracker</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  url: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'/api/track'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  persistenceKey: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'main-app'</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  .</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">defineBatchTrack</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ defaultBatchDelay: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">500</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, maxBatchKB: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }))</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  .</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">defineOfflineRestore</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">())</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  .</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">defineLastWords</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">())</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  .</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">definePageErrors</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ maxErrors: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">20</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, dedupeWindowMs: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">5_000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }))</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  .</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">make</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">18</span></span>\n<span class=\"line\"><span class=\"line-number\">19</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">tracker.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">track</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ event: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'page_view'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'/'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">20</span></span>\n<span class=\"line\"><span class=\"line-number\">21</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Detach global listeners when tearing down</span></span>\n<span class=\"line\"><span class=\"line-number\">22</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">tracker.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">stop</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span></code></pre>", lang: "ts", path: './codeblock/01aa288f6cdc.ts' },
  { label: 'h2', id: 'section-6', content: "Practical usage notes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>SSR safety.</strong> Every module checks for <code>window</code> and <code>document</code> before touching browser APIs. <code>env</code> reports <code>isSsr: true</code>, DOM helpers return <code>0</code>, <code>defineHistoryNav()</code> returns a no-op instance, and storage degrades without throwing." },
    { label: 'li', content: "<strong>Restricted storage.</strong> In private browsing or sandboxed iframes where <code>localStorage</code> throws <code>SecurityError</code>, <code>storage.set()</code> returns <code>false</code> and <code>storage.get()</code> returns the default value. <code>defineTracker</code> falls back to an in-memory outbox instead of breaking <code>track()</code>." },
    { label: 'li', content: "<strong>Cross-tab <code>storage.watch()</code>.</strong> The browser <code>storage</code> event only fires in other tabs of the same origin, never in the tab that called <code>set()</code>. Use <code>BroadcastChannel</code> or app state if you need same-tab notifications." },
    { label: 'li', content: "<strong>Tracker transport and CORS.</strong> Default <code>beaconTransport</code> tries <code>navigator.sendBeacon()</code> first and falls back to <code>fetch(..., { method: 'POST', keepalive: true, mode: 'no-cors' })</code>. Both send a JSON string as <code>text/plain</code> to avoid CORS preflight requests." },
    { label: 'li', content: "<strong>Multiple trackers on one origin.</strong> Pass a distinct <code>persistenceKey</code> to each <code>defineTracker()</code> call so their <code>localStorage</code> outbox keys (<code>tracker:queue:&lt;persistenceKey></code>) do not collide." },
    { label: 'li', content: "<strong>History tracking.</strong> <code>defineHistoryNav()</code> is an idempotent singleton that tracks <code>canGoBack</code>, <code>canGoForward</code>, <code>currentEntry</code>, and <code>entries()</code> without writing extra fields into <code>history.state</code>. Call <code>dispose()</code> to restore the native <code>history.pushState</code> and <code>history.replaceState</code> methods." }
    ]
  },
  { label: 'h2', id: 'section-7', content: "Modules" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Module" },
      { label: 'th', content: "Exports" },
      { label: 'th', content: "Docs" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>storage</code>" },
      { label: 'td', content: "<code>defineLocal</code>, <code>defineSession</code>, <code>local</code>, <code>session</code>" },
      { label: 'td', content: "<a href=\"./docs/storage.md\"><code>docs/storage.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>tracker</code>" },
      { label: 'td', content: "<code>defineTracker</code>, <code>defineBatchTrack</code>, <code>defineOfflineRestore</code>, <code>defineLastWords</code>, <code>definePageErrors</code>, <code>beaconTransport</code>" },
      { label: 'td', content: "<a href=\"./docs/tracker.md\"><code>docs/tracker.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>env</code>" },
      { label: 'td', content: "<code>env</code>" },
      { label: 'td', content: "<a href=\"./docs/env.md\"><code>docs/env.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>dom</code>" },
      { label: 'td', content: "<code>getViewportSize</code>, <code>getRootScrollTop</code>, <code>getRootScrollLeft</code>" },
      { label: 'td', content: "<a href=\"./docs/dom.md\"><code>docs/dom.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>file</code>" },
      { label: 'td', content: "<code>downloadFile</code>, <code>getImageInfo</code>, <code>isValidBase64</code>, <code>base64ToFile</code>, <code>fileToBase64</code>, <code>isSameFileType</code>" },
      { label: 'td', content: "<a href=\"./docs/file.md\"><code>docs/file.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>copy</code>" },
      { label: 'td', content: "<code>copyToClipboard</code>" },
      { label: 'td', content: "<a href=\"./docs/copy.md\"><code>docs/copy.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>history-nav</code>" },
      { label: 'td', content: "<code>defineHistoryNav</code>" },
      { label: 'td', content: "<a href=\"./docs/history-nav.md\"><code>docs/history-nav.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>shortcut</code>" },
      { label: 'td', content: "<code>on</code>, <code>off</code>" },
      { label: 'td', content: "<a href=\"./docs/shortcut.md\"><code>docs/shortcut.md</code></a>" }
      ]
    }
    ]
  },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "Runtime-agnostic helpers such as <code>definePlugin</code>, <code>parseUrl</code>, <code>formatFileSize</code>, and <code>debounce</code> live in <a href=\"../js-kit/README.md\"><code>@greypan/js-kit</code></a>." }
    ]
  },
  { label: 'h2', id: 'section-8', content: "License" },
  { label: 'p', content: "MIT" }
]

export default meta
