// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/js-kit" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/v/@greypan/js-kit\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/dm/@greypan/js-kit\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/node/v/@greypan/js-kit\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/l/@greypan/js-kit\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "JavaScript utilities and composable plugins. Works in browsers, Node.js, and workers." }
    ]
  },
  { label: 'p', content: "English | <a href=\"./README.CN.md\">简体中文</a>" },
  { label: 'h2', id: 'section-2', content: "Live demo" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started\">Interactive docs &amp; playground</a>" }
    ]
  },
  { label: 'h2', id: 'section-3', content: "Install" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "npm", path: './codeblock/5b2c99071258.npm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "pnpm", path: './codeblock/5d812c61c8e8.pnpm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "bun", path: './codeblock/5a05ba519fe5.bun' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "yarn", path: './codeblock/61d831056e1d.yarn' },
  { label: 'h2', id: 'section-4', content: "Quick start" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { definePlugin } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({ </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(message) }))</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineAuth</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({ token: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'xxx'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }))</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> app</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">().</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">defineAuth</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()).</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">make</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">app.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'hello'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(app.token)</span></span></code></pre>", lang: "ts", path: './codeblock/30366daac3ca.ts' },
  { label: 'h2', id: 'section-5', content: "Modules" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Module" },
      { label: 'th', content: "Description" },
      { label: 'th', content: "Docs" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>plugin-system</code>" },
      { label: 'td', content: "Composable plugins (<code>definePlugin</code>), <code>defineBatchEmitter</code>, <code>defineQueue</code>, <code>defineAckQueue</code>" },
      { label: 'td', content: "<a href=\"./docs/plugin-system.md\"><code>docs/plugin-system.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>url</code>" },
      { label: 'td', content: "<code>parseUrl</code> and <code>stringifyUrl</code> for absolute, relative, and protocol-relative URLs" },
      { label: 'td', content: "<a href=\"./docs/url.md\"><code>docs/url.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>number</code>" },
      { label: 'td', content: "<code>clamp</code> and <code>formatFileSize</code>" },
      { label: 'td', content: "<a href=\"./docs/number.md\"><code>docs/number.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "<code>getFileExtension</code>" },
      { label: 'td', content: "<a href=\"./docs/string.md\"><code>docs/string.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>timer</code>" },
      { label: 'td', content: "<code>debounce</code> and <code>defineControllableInterval</code>" },
      { label: 'td', content: "<a href=\"./docs/timer.md\"><code>docs/timer.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>paradigm</code>" },
      { label: 'td', content: "Rust-style <code>Result</code> (<code>ok</code>, <code>err</code>, <code>to</code>, <code>andThen</code>, <code>unwrap</code>) via <code>rust</code> or <code>@greypan/js-kit/rust</code>" },
      { label: 'td', content: "<a href=\"./docs/paradigm.md\"><code>docs/paradigm.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>shortcut</code>" },
      { label: 'td', content: "<code>safeCall</code> fire-and-forget wrapper" },
      { label: 'td', content: "<a href=\"./docs/shortcut.md\"><code>docs/shortcut.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>utility-types</code>" },
      { label: 'td', content: "Compile-time TypeScript utility types" },
      { label: 'td', content: "<a href=\"./docs/utility-types.md\"><code>docs/utility-types.md</code></a>" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-6', content: "License" },
  { label: 'p', content: "MIT" }
]

export default meta
