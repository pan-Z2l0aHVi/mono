// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/browser-kit" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/v/@greypan/browser-kit\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/dm/@greypan/browser-kit\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/node/v/@greypan/browser-kit\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/l/@greypan/browser-kit\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "面向浏览器的工具库，提供命名空间存储、可组合埋点上报、环境检测、DOM 指标、文件处理、剪贴板、事件简写与历史导航跟踪。" }
    ]
  },
  { label: 'p', content: "<a href=\"./README.md\">English</a> | 简体中文 | <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/browser-kit/getting-started\">在线演示</a>" },
  { label: 'h2', id: 'section-2', content: "安装" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span></code></pre>", lang: "npm", path: './codeblock/1440a9a36db8.npm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span></code></pre>", lang: "pnpm", path: './codeblock/d8a504e49e2b.pnpm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span></code></pre>", lang: "bun", path: './codeblock/ed3c5ad8ba4e.bun' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span></code></pre>", lang: "yarn", path: './codeblock/a2ca3ff823c0.yarn' },
  { label: 'h2', id: 'section-3', content: "快速开始" },
  { label: 'h3', id: 'section-4', content: "带命名空间与 TTL 的存储" },
  { label: 'p', content: "<code>defineLocal(namespace?)</code> 和 <code>defineSession(namespace?)</code> 按命名空间返回缓存单例。写入的值会附带过期时间，过期键在下次读取时自动删除并返回默认值。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { defineLocal } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> storage</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLocal</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-app'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Alice'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">get</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;{ </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }>(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// { name: 'Alice' }</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 一小时后过期（单位 ms）</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'token'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'abc123'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">3_600_000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 监听同源其他标签页的变更</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> unwatch</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">watch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;{ </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }>(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">next</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">prev</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'其他标签页更新了 user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, next, prev)</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">unwatch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span></code></pre>", lang: "ts", path: './codeblock/b3c408eeb395.ts' },
  { label: 'h3', id: 'section-5', content: "组合式埋点上报" },
  { label: 'p', content: "从 <code>defineTracker</code> 出发，用 <code>.use()</code> 按需叠加插件。把 <code>defineBatchTrack()</code> 放在 <code>defineLastWords()</code> 和 <code>definePageErrors()</code> 之前，这样页面退出时会先冲刷批量缓冲，捕获的页面错误也会进入批量上报通道。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  defineBatchTrack,</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  defineLastWords,</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  defineOfflineRestore,</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  definePageErrors,</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  defineTracker</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> tracker</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineTracker</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  url: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'/api/track'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  persistenceKey: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'main-app'</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  .</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">defineBatchTrack</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ defaultBatchDelay: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">500</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, maxBatchKB: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }))</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  .</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">defineOfflineRestore</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">())</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  .</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">defineLastWords</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">())</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  .</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">definePageErrors</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ maxErrors: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">20</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, dedupeWindowMs: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">5_000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }))</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  .</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">make</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">18</span></span>\n<span class=\"line\"><span class=\"line-number\">19</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">tracker.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">track</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ event: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'page_view'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'/'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">20</span></span>\n<span class=\"line\"><span class=\"line-number\">21</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 实例销毁时移除全局监听</span></span>\n<span class=\"line\"><span class=\"line-number\">22</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">tracker.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">stop</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span></code></pre>", lang: "ts", path: './codeblock/18488defa721.ts' },
  { label: 'h2', id: 'section-6', content: "使用细节" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>SSR 安全降级。</strong> 所有模块在访问浏览器 API 前都会检查 <code>window</code> 和 <code>document</code>。在无 DOM 环境下，<code>env.isSsr</code> 为 <code>true</code>，DOM 读取函数返回 <code>0</code>，<code>defineHistoryNav()</code> 返回空操作实例，存储读写静默降级不抛错。" },
    { label: 'li', content: "<strong>受限存储降级。</strong> 在隐私模式或受限 iframe 中访问 <code>localStorage</code> 抛出 <code>SecurityError</code> 时，<code>storage.set()</code> 返回 <code>false</code>，<code>storage.get()</code> 返回默认值。<code>defineTracker</code> 也会自动降级为内存队列，不会打断业务调用。" },
    { label: 'li', content: "<strong><code>storage.watch()</code> 仅触发于跨标签页。</strong> 浏览器原生 <code>storage</code> 事件只在同源的其他标签页触发，不会在当前调用 <code>set()</code> 的标签页触发。同标签页通信请改用 <code>BroadcastChannel</code> 或应用状态。" },
    { label: 'li', content: "<strong>Tracker 传输与跨域。</strong> 默认的 <code>beaconTransport</code> 优先使用 <code>navigator.sendBeacon()</code>，被浏览器拒收时降级到 <code>fetch(..., { method: 'POST', keepalive: true, mode: 'no-cors' })</code>。两条通道都以 <code>text/plain</code> 发送 JSON 字符串，避免跨域预检请求。" },
    { label: 'li', content: "<strong>同源多 Tracker 隔离。</strong> 同一个页面创建多个 Tracker 时，为每个实例传入不同的 <code>persistenceKey</code>，避免它们共用同一个 <code>localStorage</code> 队列键（<code>tracker:queue:&lt;persistenceKey></code>）。" },
    { label: 'li', content: "<strong>历史导航跟踪。</strong> <code>defineHistoryNav()</code> 是幂等单例，在旁路记录 <code>canGoBack</code>、<code>canGoForward</code>、<code>currentEntry</code> 和 <code>entries()</code>，不会往 <code>history.state</code> 写入额外字段。调用 <code>dispose()</code> 可还原原生 <code>history.pushState</code> 与 <code>history.replaceState</code>。" }
    ]
  },
  { label: 'h2', id: 'section-7', content: "模块索引" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "模块" },
      { label: 'th', content: "导出内容" },
      { label: 'th', content: "文档" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>storage</code>" },
      { label: 'td', content: "<code>defineLocal</code>、<code>defineSession</code>、<code>local</code>、<code>session</code>" },
      { label: 'td', content: "<a href=\"./docs/storage.CN.md\"><code>docs/storage.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>tracker</code>" },
      { label: 'td', content: "<code>defineTracker</code>、<code>defineBatchTrack</code>、<code>defineOfflineRestore</code>、<code>defineLastWords</code>、<code>definePageErrors</code>、<code>beaconTransport</code>" },
      { label: 'td', content: "<a href=\"./docs/tracker.CN.md\"><code>docs/tracker.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>env</code>" },
      { label: 'td', content: "<code>env</code>" },
      { label: 'td', content: "<a href=\"./docs/env.CN.md\"><code>docs/env.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>dom</code>" },
      { label: 'td', content: "<code>getViewportSize</code>、<code>getRootScrollTop</code>、<code>getRootScrollLeft</code>" },
      { label: 'td', content: "<a href=\"./docs/dom.CN.md\"><code>docs/dom.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>file</code>" },
      { label: 'td', content: "<code>downloadFile</code>、<code>getImageInfo</code>、<code>isValidBase64</code>、<code>base64ToFile</code>、<code>fileToBase64</code>、<code>isSameFileType</code>" },
      { label: 'td', content: "<a href=\"./docs/file.CN.md\"><code>docs/file.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>copy</code>" },
      { label: 'td', content: "<code>copyToClipboard</code>" },
      { label: 'td', content: "<a href=\"./docs/copy.CN.md\"><code>docs/copy.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>history-nav</code>" },
      { label: 'td', content: "<code>defineHistoryNav</code>" },
      { label: 'td', content: "<a href=\"./docs/history-nav.CN.md\"><code>docs/history-nav.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>shortcut</code>" },
      { label: 'td', content: "<code>on</code>、<code>off</code>" },
      { label: 'td', content: "<a href=\"./docs/shortcut.CN.md\"><code>docs/shortcut.CN.md</code></a>" }
      ]
    }
    ]
  },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "<code>definePlugin</code>、<code>parseUrl</code>、<code>formatFileSize</code>、<code>debounce</code> 等跨运行时纯 JS 工具位于 <a href=\"../js-kit/README.CN.md\"><code>@greypan/js-kit</code></a>。" }
    ]
  },
  { label: 'h2', id: 'section-8', content: "License" },
  { label: 'p', content: "MIT" }
]

export default meta
