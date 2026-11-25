// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/browser-kit" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/v/@greypan/browser-kit\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/dm/@greypan/browser-kit\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/node/v/@greypan/browser-kit\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/browser-kit\"><img src=\"https://img.shields.io/npm/l/@greypan/browser-kit\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "面向浏览器的存储、埋点上报、环境检测、DOM、文件、剪贴板、事件与历史导航工具库。" }
    ]
  },
  { label: 'p', content: "<a href=\"./README.md\">English</a> | 简体中文 | <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/browser-kit/getting-started\">在线演示</a>" },
  { label: 'h2', id: 'section-2', content: "安装" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># npm</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># pnpm</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># yarn</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># bun</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/browser-kit</span></span></code></pre>", lang: "bash", path: './codeblock/70b3193684a2.bash' },
  { label: 'h2', id: 'section-3', content: "快速开始" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { defineLocal } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> storage</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLocal</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-app'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Alice'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">get</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// { name: 'Alice' }</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 一小时后过期</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'token'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'abc123'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">3600_000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 监听其他标签页的变更</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> unwatch</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> storage.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">watch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">newValue</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">oldValue</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'user changed'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, newValue, oldValue)</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span></code></pre>", lang: "ts", path: './codeblock/ca14013e3c07.ts' },
  { label: 'h2', id: 'section-4', content: "模块索引" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "模块" },
      { label: 'th', content: "说明" },
      { label: 'th', content: "文档" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "存储" },
      { label: 'td', content: "带命名空间、TTL 过期、配额清理与跨标签页 <code>watch</code> 的存储封装" },
      { label: 'td', content: "<a href=\"./docs/storage.CN.md\"><code>docs/storage.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "埋点上报" },
      { label: 'td', content: "可组合的埋点 outbox（<code>defineTracker</code>、<code>defineBatchTrack</code>、<code>defineOfflineRestore</code>、<code>defineLastWords</code>、<code>definePageErrors</code>）" },
      { label: 'td', content: "<a href=\"./docs/tracker.CN.md\"><code>docs/tracker.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "环境检测" },
      { label: 'td', content: "SSR 安全的浏览器、系统、容器与输入检测（<code>env</code>）" },
      { label: 'td', content: "<a href=\"./docs/env.CN.md\"><code>docs/env.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "DOM 工具" },
      { label: 'td', content: "视口尺寸与根文档滚动偏移读取（<code>getViewportSize</code>、<code>getRootScrollTop</code>、<code>getRootScrollLeft</code>）" },
      { label: 'td', content: "<a href=\"./docs/dom.CN.md\"><code>docs/dom.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "文件工具" },
      { label: 'td', content: "Base64 转换、图片尺寸、魔数类型校验与带进度下载" },
      { label: 'td', content: "<a href=\"./docs/file.CN.md\"><code>docs/file.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "剪贴板" },
      { label: 'td', content: "文本与 <code>Blob</code> 复制封装（<code>copyToClipboard</code>）" },
      { label: 'td', content: "<a href=\"./docs/copy.CN.md\"><code>docs/copy.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "历史导航状态" },
      { label: 'td', content: "Navigation API 只读子集，跟踪当前文档前进/后退可用性（<code>defineHistoryNav</code>）" },
      { label: 'td', content: "<a href=\"./docs/history-nav.CN.md\"><code>docs/history-nav.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "事件简写" },
      { label: 'td', content: "面向 <code>window</code> / <code>document</code> 的强类型 <code>on</code> / <code>off</code> 封装" },
      { label: 'td', content: "<a href=\"./docs/shortcut.CN.md\"><code>docs/shortcut.CN.md</code></a>" }
      ]
    }
    ]
  },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "<code>getFileExtension</code>、<code>formatFileSize</code> 等跨运行时纯 JS 工具位于 <a href=\"../js-kit/README.CN.md\"><code>@greypan/js-kit</code></a>。" }
    ]
  }
]

export default meta
