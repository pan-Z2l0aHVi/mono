// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/js-kit" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/v/@greypan/js-kit\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/dm/@greypan/js-kit\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/node/v/@greypan/js-kit\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/l/@greypan/js-kit\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "Framework-free JavaScript utilities and composable plugins for browsers, Node.js, and workers." }
    ]
  },
  { label: 'p', content: "English | <a href=\"./README.CN.md\">简体中文</a> | <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started\">Live demo</a>" },
  { label: 'h2', id: 'section-2', content: "Install" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "npm", path: './codeblock/5b2c99071258.npm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "pnpm", path: './codeblock/5d812c61c8e8.pnpm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "bun", path: './codeblock/5a05ba519fe5.bun' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "yarn", path: './codeblock/61d831056e1d.yarn' },
  { label: 'h2', id: 'section-3', content: "Entry points" },
  { label: 'p', content: "Import from <code>@greypan/js-kit</code> for all runtime helpers and TypeScript utility types. If you want smaller imports or shorter names for <code>Result</code> helpers, use the subpaths below:" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<code>@greypan/js-kit</code> exports every module, plus the <code>rust</code> namespace object." },
    { label: 'li', content: "<code>@greypan/js-kit/rust</code> exports <code>ok</code>, <code>err</code>, <code>isOk</code>, <code>isErr</code>, <code>to</code>, <code>andThen</code>, <code>map</code>, <code>mapErr</code>, and <code>unwrap</code> at top level." },
    { label: 'li', content: "<code>@greypan/js-kit/plugin-system</code>, <code>@greypan/js-kit/timer</code>, and <code>@greypan/js-kit/paradigm</code> expose individual modules directly." }
    ]
  },
  { label: 'h2', id: 'section-4', content: "Quick start" },
  { label: 'h3', id: 'section-5', content: "Composing plugins" },
  { label: 'p', content: "<code>definePlugin</code> creates a lazy plugin builder. Chain <code>.use()</code> to layer capabilities where each plugin receives the previous output as <code>ctx</code>, then call <code>.make()</code> to build the final instance. Later plugins can override methods from earlier ones while still calling <code>ctx.&lt;method>()</code> internally." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { definePlugin } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">`[app] ${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">message</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}`</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }))</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> definePrefix</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">prefix</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">((</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">ctx</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> void</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ctx.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">`${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">prefix</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}: ${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">message</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}`</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }))</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> app</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">().</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">definePrefix</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'auth'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)).</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">make</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">app.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'token refreshed'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// [app] auth: token refreshed</span></span></code></pre>", lang: "ts", path: './codeblock/eb65e0a5ab16.ts' },
  { label: 'h3', id: 'section-6', content: "Handling errors with <code>Result</code>" },
  { label: 'p', content: "Use <code>@greypan/js-kit/rust</code> when you want explicit error values instead of <code>try/catch</code> blocks. <code>to()</code> turns any throwing function or rejected promise into a <code>Result&lt;T, E></code>." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { andThen, err, ok, to } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/rust'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> parsed</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> to</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> JSON</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">parse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'{\"port\": 8080}'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">as</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">port</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> port</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> andThen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(parsed, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">data</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">typeof</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> data.port </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">===</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'number'</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> ?</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ok</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(data.port) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> err</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">new</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Error</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Missing port'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">))))</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (port.ok) {</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Listening on'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, port.value)</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">else</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">error</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(port.error.message)</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "ts", path: './codeblock/995e56c16bf4.ts' },
  { label: 'h2', id: 'section-7', content: "Practical usage notes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>Queues and batching.</strong> <code>defineBatchEmitter</code> merges rapid calls within a delay window and exposes <code>flush()</code> for immediate delivery. <code>defineAckQueue</code> removes an item only after <code>onConsume</code> fulfills; if <code>onConsume</code> rejects, the item stays at the head of the queue for the next <code>resume()</code> or <code>flush()</code>." },
    { label: 'li', content: "<strong>Relative URLs.</strong> <code>parseUrl</code> and <code>stringifyUrl</code> accept full URLs, root-relative paths (<code>/api/items?page=1</code>), and protocol-relative URLs (<code>//cdn.example.com/a.js</code>) without throwing on a missing origin." },
    { label: 'li', content: "<strong>Timers.</strong> <code>debounce</code> returns a wrapper with <code>.cancel()</code> and <code>.flush()</code>. <code>defineControllableInterval</code> supports <code>start()</code>, <code>pause()</code>, <code>resume()</code>, <code>restart()</code>, and <code>stop()</code>, and tracks elapsed time across pauses." },
    { label: 'li', content: "<strong>Fire-and-forget calls.</strong> <code>safeCall(fn, { onError })</code> catches both synchronous throws and rejected promises, which is useful in cleanup hooks and event listeners that must not trigger unhandled rejections." },
    { label: 'li', content: "<strong>Compile-time types.</strong> <code>DeepPartial</code>, <code>DeepRequired</code>, <code>ValueOf</code>, <code>ArrayItem</code>, <code>ArgumentType</code>, <code>Equal</code>, and <code>ClassPropertyTypes</code> produce zero runtime code." }
    ]
  },
  { label: 'h2', id: 'section-8', content: "Modules" },
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
      { label: 'td', content: "<code>plugin-system</code>" },
      { label: 'td', content: "<code>definePlugin</code>, <code>defineBatchEmitter</code>, <code>defineQueue</code>, <code>defineAckQueue</code>, <code>PluginMade</code>" },
      { label: 'td', content: "<a href=\"./docs/plugin-system.md\"><code>docs/plugin-system.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>url</code>" },
      { label: 'td', content: "<code>parseUrl</code>, <code>stringifyUrl</code>" },
      { label: 'td', content: "<a href=\"./docs/url.md\"><code>docs/url.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>number</code>" },
      { label: 'td', content: "<code>clamp</code>, <code>formatFileSize</code>" },
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
      { label: 'td', content: "<code>debounce</code>, <code>defineControllableInterval</code>" },
      { label: 'td', content: "<a href=\"./docs/timer.md\"><code>docs/timer.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>paradigm</code>" },
      { label: 'td', content: "<code>rust</code> (<code>ok</code>, <code>err</code>, <code>to</code>, <code>andThen</code>, <code>map</code>, <code>mapErr</code>, <code>unwrap</code>)" },
      { label: 'td', content: "<a href=\"./docs/paradigm.md\"><code>docs/paradigm.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>shortcut</code>" },
      { label: 'td', content: "<code>safeCall</code>" },
      { label: 'td', content: "<a href=\"./docs/shortcut.md\"><code>docs/shortcut.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>utility-types</code>" },
      { label: 'td', content: "<code>DeepPartial</code>, <code>DeepRequired</code>, <code>ValueOf</code>, <code>ArrayItem</code>, <code>ArgumentType</code>, <code>Equal</code>, <code>ClassPropertyTypes</code>" },
      { label: 'td', content: "<a href=\"./docs/utility-types.md\"><code>docs/utility-types.md</code></a>" }
      ]
    }
    ]
  },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "Browser-specific helpers for storage, telemetry tracking, environment detection, DOM, files, clipboard, and history live in <a href=\"../browser-kit/README.md\"><code>@greypan/browser-kit</code></a>." }
    ]
  },
  { label: 'h2', id: 'section-9', content: "License" },
  { label: 'p', content: "MIT" }
]

export default meta
