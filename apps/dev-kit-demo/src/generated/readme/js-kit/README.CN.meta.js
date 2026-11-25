// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/js-kit" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/v/@greypan/js-kit\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/dm/@greypan/js-kit\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/node/v/@greypan/js-kit\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/l/@greypan/js-kit\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "通用 JavaScript / TypeScript 工具函数与可组合插件系统，适用于浏览器、Node.js 与 Worker。" }
    ]
  },
  { label: 'p', content: "<a href=\"./README.md\">English</a> | 简体中文" },
  { label: 'h2', id: 'section-2', content: "在线示例" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started\">交互文档与示例站</a>" }
    ]
  },
  { label: 'h2', id: 'section-3', content: "安装" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "npm", path: './codeblock/5b2c99071258.npm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "pnpm", path: './codeblock/5d812c61c8e8.pnpm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "bun", path: './codeblock/5a05ba519fe5.bun' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "yarn", path: './codeblock/61d831056e1d.yarn' },
  { label: 'h2', id: 'section-4', content: "快速开始" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { definePlugin } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({ </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(message) }))</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineAuth</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({ token: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'xxx'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }))</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> app</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">().</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">defineAuth</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()).</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">make</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">app.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'hello'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(app.token)</span></span></code></pre>", lang: "ts", path: './codeblock/30366daac3ca.ts' },
  { label: 'h2', id: 'section-5', content: "模块索引" },
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
      { label: 'td', content: "<code>plugin-system</code>" },
      { label: 'td', content: "可组合插件（<code>definePlugin</code>）、<code>defineBatchEmitter</code>、<code>defineQueue</code>、<code>defineAckQueue</code>" },
      { label: 'td', content: "<a href=\"./docs/plugin-system.CN.md\"><code>docs/plugin-system.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>url</code>" },
      { label: 'td', content: "<code>parseUrl</code> 与 <code>stringifyUrl</code>，支持绝对/相对/协议相对 URL" },
      { label: 'td', content: "<a href=\"./docs/url.CN.md\"><code>docs/url.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>number</code>" },
      { label: 'td', content: "<code>clamp</code> 与 <code>formatFileSize</code>" },
      { label: 'td', content: "<a href=\"./docs/number.CN.md\"><code>docs/number.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "<code>getFileExtension</code>" },
      { label: 'td', content: "<a href=\"./docs/string.CN.md\"><code>docs/string.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>timer</code>" },
      { label: 'td', content: "<code>debounce</code> 与 <code>defineControllableInterval</code>" },
      { label: 'td', content: "<a href=\"./docs/timer.CN.md\"><code>docs/timer.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>paradigm</code>" },
      { label: 'td', content: "Rust 风格 <code>Result</code>（<code>ok</code>、<code>err</code>、<code>to</code>、<code>andThen</code>、<code>unwrap</code>），支持 <code>@greypan/js-kit/rust</code>" },
      { label: 'td', content: "<a href=\"./docs/paradigm.CN.md\"><code>docs/paradigm.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>shortcut</code>" },
      { label: 'td', content: "<code>safeCall</code> 安全执行封装" },
      { label: 'td', content: "<a href=\"./docs/shortcut.CN.md\"><code>docs/shortcut.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>utility-types</code>" },
      { label: 'td', content: "编译期 TypeScript 工具类型" },
      { label: 'td', content: "<a href=\"./docs/utility-types.CN.md\"><code>docs/utility-types.CN.md</code></a>" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-6', content: "许可证" },
  { label: 'p', content: "MIT" }
]

export default meta
