// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/js-kit" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/v/@greypan/js-kit\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/dm/@greypan/js-kit\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/node/v/@greypan/js-kit\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/l/@greypan/js-kit\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "Framework-free JavaScript/TypeScript utilities and a composable plugin builder for browsers, Node.js, and workers." }
    ]
  },
  { label: 'p', content: "English | <a href=\"./README.CN.md\">简体中文</a>" },
  { label: 'p', content: "<strong>Online Docs:</strong> <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started\">Dev Kit Demo</a>" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>Zero framework dependencies</strong>: Runtime-agnostic code with no DOM or UI framework bindings; works in browsers, Node.js (<code>>=20.11.0</code>), and workers." },
    { label: 'li', content: "<strong>ESM-only &amp; tree-shakable</strong>: Published as native ES modules with <code>\"sideEffects\": false</code> and per-module subpath exports." },
    { label: 'li', content: "<strong>Strict TypeScript types</strong>: Full inference across plugin chains, <code>Result</code> helpers, and compile-time utility types." }
    ]
  },
  { label: 'h2', id: 'section-2', content: "Installation" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "npm", path: './codeblock/5b2c99071258.npm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "pnpm", path: './codeblock/5d812c61c8e8.pnpm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "bun", path: './codeblock/5a05ba519fe5.bun' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "yarn", path: './codeblock/61d831056e1d.yarn' },
  { label: 'h2', id: 'section-3', content: "Quick start" },
  { label: 'h3', id: 'section-4', content: "Composing plugins" },
  { label: 'p', content: "<code>definePlugin</code> creates a lazy builder. Chain <code>.use()</code> to layer capabilities—each plugin receives the accumulated output as <code>ctx</code> and can override earlier methods—then call <code>.make()</code> to build the instance." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { definePlugin } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/plugin-system'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">`[app] ${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">message</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}`</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }))</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> definePrefix</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">prefix</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">((</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">ctx</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> void</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ctx.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">`${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">prefix</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}: ${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">message</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}`</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }))</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> app</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">().</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">definePrefix</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'auth'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)).</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">make</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">app.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'token refreshed'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// [app] auth: token refreshed</span></span></code></pre>", lang: "ts", path: './codeblock/e6300d9802f7.ts' },
  { label: 'h3', id: 'section-5', content: "Handling async errors with Result" },
  { label: 'p', content: "Use <code>@greypan/js-kit/rust</code> to represent failures as values instead of scattering <code>try/catch</code> blocks. <code>to()</code> wraps any <code>Promise</code> into a <code>Promise&lt;Result&lt;T, E>></code>, and <code>andThen()</code> chains follow-up steps while short-circuiting on <code>Err</code>." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { andThen, err, ok, to } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/rust'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> fetched</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> await</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> to</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">Promise</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">resolve</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'{\"port\": 8080}'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">))</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> port</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> await</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> andThen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fetched, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">raw</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> data</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> JSON</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">parse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(raw) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">as</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">port</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> typeof</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> data.port </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">===</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'number'</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> ?</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ok</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(data.port) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> err</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">new</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Error</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Missing port'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">))</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (port.ok) {</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Listening on'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, port.value) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Listening on 8080</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">else</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">error</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(port.error)</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "ts", path: './codeblock/cb0f890c37bc.ts' },
  { label: 'h2', id: 'section-6', content: "Subpath exports" },
  { label: 'p', content: "Import from the root entry <code>@greypan/js-kit</code> for everything, or import individual modules by subpath to narrow your bundle surface:" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Root entry: all modules + `rust` namespace</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { definePlugin, parseUrl, rust } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Top-level `Result` helpers without the `rust.` prefix</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { andThen, err, ok, to } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/rust'</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { debounce, defineControllableInterval } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/timer'</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Individual module subpaths</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { parseUrl, stringifyUrl } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/url'</span></span></code></pre>", lang: "ts", path: './codeblock/b2d82a20cc51.ts' },
  { label: 'p', content: "All module directories (<code>plugin-system</code>, <code>url</code>, <code>number</code>, <code>string</code>, <code>timer</code>, <code>paradigm</code>, <code>shortcut</code>, <code>utility-types</code>) are exposed via <code>@greypan/js-kit/&lt;module></code>." },
  { label: 'h2', id: 'section-7', content: "Modules" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Module" },
      { label: 'th', content: "Subpath" },
      { label: 'th', content: "What it solves" },
      { label: 'th', content: "Core exports" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/plugin-system.md\"><code>plugin-system</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/plugin-system</code>" },
      { label: 'td', content: "Composable plugin builder, batching emitter, fire-and-forget &amp; ack queues" },
      { label: 'td', content: "<code>definePlugin</code>, <code>defineBatchEmitter</code>, <code>defineQueue</code>, <code>defineAckQueue</code>, <code>Plugin</code>, <code>PluginMade</code>, <code>QueueOptions</code>, <code>QueueController</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/paradigm.md\"><code>paradigm</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/paradigm</code>" },
      { label: 'td', content: "Rust-style <code>Result&lt;T, E></code> error handling (also available at <code>/rust</code>)" },
      { label: 'td', content: "<code>rust</code> (<code>ok</code>, <code>err</code>, <code>isOk</code>, <code>isErr</code>, <code>to</code>, <code>andThen</code>, <code>unwrap</code>, <code>Ok</code>, <code>Err</code>, <code>Result</code>)" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/url.md\"><code>url</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/url</code>" },
      { label: 'td', content: "Parsing and serializing absolute, root-relative, and protocol-relative URLs" },
      { label: 'td', content: "<code>parseUrl</code>, <code>stringifyUrl</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/timer.md\"><code>timer</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/timer</code>" },
      { label: 'td', content: "Debouncer with cancel/flush control and pauseable interval plugin" },
      { label: 'td', content: "<code>debounce</code>, <code>defineControllableInterval</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/shortcut.md\"><code>shortcut</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/shortcut</code>" },
      { label: 'td', content: "Fire-and-forget execution that absorbs sync throws and async rejections" },
      { label: 'td', content: "<code>safeCall</code>, <code>SafeCallOptions</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/number.md\"><code>number</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/number</code>" },
      { label: 'td', content: "Numeric range clamping and human-readable byte formatting" },
      { label: 'td', content: "<code>clamp</code>, <code>formatFileSize</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/string.md\"><code>string</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/string</code>" },
      { label: 'td', content: "Lowercased file extension extraction with edge-case validation" },
      { label: 'td', content: "<code>getFileExtension</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/utility-types.md\"><code>utility-types</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/utility-types</code>" },
      { label: 'td', content: "Zero-runtime TypeScript helper types" },
      { label: 'td', content: "<code>DeepPartial</code>, <code>DeepRequired</code>, <code>ValueOf</code>, <code>ArrayItem</code>, <code>ArgumentType</code>, <code>Equal</code>, <code>ClassPropertyTypes</code>" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-8', content: "Usage notes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>Queues and batching</strong>: <code>defineBatchEmitter</code> merges rapid calls within <code>batchingDelay</code> and exposes <code>flush()</code> for immediate delivery. <code>defineQueue</code> marks an item done upon handoff, while <code>defineAckQueue</code> removes an item only after <code>onConsume</code> fulfills—failed items stay queued without blocking subsequent items and retry on <code>resume()</code> or <code>flush()</code>. Both queues accept a synchronous <code>onPersist</code> hook (persist-before-commit)." },
    { label: 'li', content: "<strong>Relative URLs</strong>: <code>parseUrl</code> and <code>stringifyUrl</code> handle full URLs, root-relative paths (<code>/api/items?page=1</code>), and protocol-relative URLs (<code>//cdn.example.com/a.js</code>) without throwing on a missing origin. <code>stringifyUrl</code> omits <code>null</code>/<code>undefined</code> query values by default (<code>omitNil = true</code>)." },
    { label: 'li', content: "<strong>Timers</strong>: <code>debounce(fn, options)</code> returns a controller object (<code>{ call, cancel, flush, isPending, cachedValue }</code>) supporting <code>waitMs</code>, <code>maxWaitMs</code>, and <code>timing</code> (<code>'trailing' | 'leading' | 'both'</code>). <code>defineControllableInterval</code> returns a plugin whose instance exposes <code>start()</code>, <code>pause()</code>, <code>resume()</code>, <code>stop()</code>, and <code>tick(delay)</code>, preserving remaining time across pauses." },
    { label: 'li', content: "<strong>Fire-and-forget calls</strong>: <code>safeCall(fn, { onError })</code> catches both synchronous throws and rejected promises, and suppresses errors thrown inside <code>onError</code> itself—useful in cleanup hooks and event listeners." },
    { label: 'li', content: "<strong>Compile-time types</strong>: Imports from <code>@greypan/js-kit/utility-types</code> emit zero runtime JavaScript." }
    ]
  },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "Looking for browser-specific helpers (storage, telemetry tracking, environment detection, DOM, files, clipboard, history)? See <a href=\"../browser-kit/README.md\"><code>@greypan/browser-kit</code></a>." }
    ]
  },
  { label: 'h2', id: 'section-9', content: "License" },
  { label: 'p', content: "MIT" }
]

export default meta
