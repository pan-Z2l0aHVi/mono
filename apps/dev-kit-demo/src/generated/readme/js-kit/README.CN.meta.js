// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/js-kit" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/v/@greypan/js-kit\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/dm/@greypan/js-kit\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/node/v/@greypan/js-kit\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/l/@greypan/js-kit\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "零框架依赖的 JavaScript/TypeScript 工具库与可组合插件构建器，适用于浏览器、Node.js 与 Worker。" }
    ]
  },
  { label: 'p', content: "<a href=\"./README.md\">English</a> | 简体中文" },
  { label: 'p', content: "<strong>在线文档：</strong> <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started\">Dev Kit Demo</a>" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>零框架依赖</strong>：不含 DOM 或 UI 框架绑定，可在浏览器、Node.js（<code>>=20.11.0</code>）和 Worker 中运行。" },
    { label: 'li', content: "<strong>ESM-only 与 Tree-shakable</strong>：原生 ES Module 输出，声明 <code>\"sideEffects\": false</code>，支持按子路径导入单个模块。" },
    { label: 'li', content: "<strong>严格 TypeScript 类型</strong>：覆盖插件链组合、<code>Result</code> 范式与纯编译期类型工具的完整类型推导。" }
    ]
  },
  { label: 'h2', id: 'section-2', content: "安装" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "npm", path: './codeblock/5b2c99071258.npm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "pnpm", path: './codeblock/5d812c61c8e8.pnpm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "bun", path: './codeblock/5a05ba519fe5.bun' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "yarn", path: './codeblock/61d831056e1d.yarn' },
  { label: 'h2', id: 'section-3', content: "快速开始" },
  { label: 'h3', id: 'section-4', content: "组合插件" },
  { label: 'p', content: "<code>definePlugin</code> 返回一个惰性构建器。通过 <code>.use()</code> 逐层叠加能力——每个插件通过 <code>ctx</code> 访问前序插件的输出，也可覆写同名方法——最后调用 <code>.make()</code> 生成实例。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { definePlugin } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/plugin-system'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">`[app] ${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">message</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}`</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }))</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> definePrefix</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">prefix</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">((</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">ctx</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> void</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ctx.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">`${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">prefix</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}: ${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">message</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}`</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }))</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> app</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">().</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">definePrefix</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'auth'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)).</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">make</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">app.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'token refreshed'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// [app] auth: token refreshed</span></span></code></pre>", lang: "ts", path: './codeblock/e6300d9802f7.ts' },
  { label: 'h3', id: 'section-5', content: "用 Result 处理异步错误" },
  { label: 'p', content: "需要把失败表示为显式返回值、避免分散的 <code>try/catch</code> 时，可从 <code>@greypan/js-kit/rust</code> 导入 <code>Result</code> 工具。<code>to()</code> 将任意 <code>Promise</code> 包装为 <code>Promise&lt;Result&lt;T, E>></code>，<code>andThen()</code> 串联后续步骤并在遇到 <code>Err</code> 时短路返回。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { andThen, err, ok, to } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/rust'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> fetched</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> await</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> to</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">Promise</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">resolve</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'{\"port\": 8080}'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">))</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> port</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> await</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> andThen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fetched, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">raw</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> data</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> JSON</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">parse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(raw) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">as</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">port</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> typeof</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> data.port </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">===</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'number'</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> ?</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ok</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(data.port) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> err</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">new</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Error</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Missing port'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">))</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (port.ok) {</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Listening on'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, port.value) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Listening on 8080</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">else</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">error</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(port.error)</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "ts", path: './codeblock/cb0f890c37bc.ts' },
  { label: 'h2', id: 'section-6', content: "子路径导入" },
  { label: 'p', content: "可以直接从根入口 <code>@greypan/js-kit</code> 导入全部能力，或按子路径按需引入以缩小打包体积：" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 根入口：全部模块 + `rust` 命名空间</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { definePlugin, parseUrl, rust } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 顶层 `Result` 工具函数，无需 `rust.` 前缀</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { andThen, err, ok, to } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/rust'</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { debounce, defineControllableInterval } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/timer'</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 按模块子路径导入</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { parseUrl, stringifyUrl } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/url'</span></span></code></pre>", lang: "ts", path: './codeblock/3ab665634b5b.ts' },
  { label: 'p', content: "全部模块目录（<code>plugin-system</code>、<code>url</code>、<code>number</code>、<code>string</code>、<code>timer</code>、<code>paradigm</code>、<code>shortcut</code>、<code>utility-types</code>）均可通过 <code>@greypan/js-kit/&lt;module></code> 导入。" },
  { label: 'h2', id: 'section-7', content: "模块总览" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "模块" },
      { label: 'th', content: "子路径" },
      { label: 'th', content: "解决什么问题" },
      { label: 'th', content: "核心导出" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/plugin-system.CN.md\"><code>plugin-system</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/plugin-system</code>" },
      { label: 'td', content: "可组合插件构建器、批量发射器、待消费队列与确认队列" },
      { label: 'td', content: "<code>definePlugin</code>、<code>defineBatchEmitter</code>、<code>defineQueue</code>、<code>defineAckQueue</code>、<code>Plugin</code>、<code>PluginMade</code>、<code>QueueOptions</code>、<code>QueueController</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/paradigm.CN.md\"><code>paradigm</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/paradigm</code>" },
      { label: 'td', content: "Rust 风格 <code>Result&lt;T, E></code> 错误处理（另提供 <code>/rust</code>）" },
      { label: 'td', content: "<code>rust</code>（<code>ok</code>、<code>err</code>、<code>isOk</code>、<code>isErr</code>、<code>to</code>、<code>andThen</code>、<code>unwrap</code>、<code>Ok</code>、<code>Err</code>、<code>Result</code>）" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/url.CN.md\"><code>url</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/url</code>" },
      { label: 'td', content: "解析与序列化完整 URL、站内相对路径及协议相对地址" },
      { label: 'td', content: "<code>parseUrl</code>、<code>stringifyUrl</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/timer.CN.md\"><code>timer</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/timer</code>" },
      { label: 'td', content: "带取消/冲刷控制的防抖器与可暂停定时器插件" },
      { label: 'td', content: "<code>debounce</code>、<code>defineControllableInterval</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/shortcut.CN.md\"><code>shortcut</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/shortcut</code>" },
      { label: 'td', content: "吞掉同步异常与异步 rejection 的兜底调用" },
      { label: 'td', content: "<code>safeCall</code>、<code>SafeCallOptions</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/number.CN.md\"><code>number</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/number</code>" },
      { label: 'td', content: "数值区间钳制与可读文件大小格式化" },
      { label: 'td', content: "<code>clamp</code>、<code>formatFileSize</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/string.CN.md\"><code>string</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/string</code>" },
      { label: 'td', content: "带边界校验的小写文件扩展名提取" },
      { label: 'td', content: "<code>getFileExtension</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<a href=\"./docs/utility-types.CN.md\"><code>utility-types</code></a>" },
      { label: 'td', content: "<code>@greypan/js-kit/utility-types</code>" },
      { label: 'td', content: "零运行时开销的 TypeScript 工具类型" },
      { label: 'td', content: "<code>DeepPartial</code>、<code>DeepRequired</code>、<code>ValueOf</code>、<code>ArrayItem</code>、<code>ArgumentType</code>、<code>Equal</code>、<code>ClassPropertyTypes</code>" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-8', content: "关键行为说明" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>队列与批量发射</strong>：<code>defineBatchEmitter</code> 在 <code>batchingDelay</code> 窗口内合并高频调用并提供 <code>flush()</code> 立即冲刷。<code>defineQueue</code> 交付即视为完成；<code>defineAckQueue</code> 仅在 <code>onConsume</code> 成功 fulfill 后移除条目，单条失败保留为失败状态且不阻塞后续条目，显式调用 <code>resume()</code> 或 <code>flush()</code> 时重试。两种队列均支持同步 <code>onPersist</code> 持久化快照（先持久化再提交内存状态）。" },
    { label: 'li', content: "<strong>相对路径 URL</strong>：<code>parseUrl</code> 与 <code>stringifyUrl</code> 支持完整 URL、站内相对路径（<code>/api/items?page=1</code>）和协议相对地址（<code>//cdn.example.com/a.js</code>），不会因缺少 origin 抛错。<code>stringifyUrl</code> 默认忽略 <code>null</code>/<code>undefined</code> 参数（<code>omitNil = true</code>）。" },
    { label: 'li', content: "<strong>定时器</strong>：<code>debounce(fn, options)</code> 返回控制对象（<code>{ call, cancel, flush, isPending, cachedValue }</code>），支持 <code>waitMs</code>、<code>maxWaitMs</code> 和 <code>timing</code>（<code>'trailing' | 'leading' | 'both'</code>）。<code>defineControllableInterval</code> 返回插件，<code>.make()</code> 实例化后提供 <code>start()</code>、<code>pause()</code>、<code>resume()</code>、<code>stop()</code> 和 <code>tick(delay)</code>，并在暂停期间保留剩余时间。" },
    { label: 'li', content: "<strong>兜底调用</strong>：<code>safeCall(fn, { onError })</code> 同时捕获同步抛出与异步 rejection，并会吸收 <code>onError</code> 自身抛出的异常，适合清理钩子和事件监听器。" },
    { label: 'li', content: "<strong>纯编译期类型</strong>：从 <code>@greypan/js-kit/utility-types</code> 导入不会产生任何运行时 JavaScript 代码。" }
    ]
  },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "面向浏览器的存储、埋点上报、环境检测、DOM、文件、剪贴板和历史导航工具位于 <a href=\"../browser-kit/README.CN.md\"><code>@greypan/browser-kit</code></a>。" }
    ]
  },
  { label: 'h2', id: 'section-9', content: "License" },
  { label: 'p', content: "MIT" }
]

export default meta
