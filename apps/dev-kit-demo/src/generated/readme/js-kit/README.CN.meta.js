// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/js-kit" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/v/@greypan/js-kit\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/dm/@greypan/js-kit\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/node/v/@greypan/js-kit\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/js-kit\"><img src=\"https://img.shields.io/npm/l/@greypan/js-kit\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "零框架依赖的 JavaScript 工具库与可组合插件系统，适用于浏览器、Node.js 和 Worker。" }
    ]
  },
  { label: 'p', content: "<a href=\"./README.md\">English</a> | 简体中文 | <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started\">在线演示</a>" },
  { label: 'h2', id: 'section-2', content: "安装" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "npm", path: './codeblock/5b2c99071258.npm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "pnpm", path: './codeblock/5d812c61c8e8.pnpm' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "bun", path: './codeblock/5a05ba519fe5.bun' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/js-kit</span></span></code></pre>", lang: "yarn", path: './codeblock/61d831056e1d.yarn' },
  { label: 'h2', id: 'section-3', content: "导入入口" },
  { label: 'p', content: "默认入口 <code>@greypan/js-kit</code> 导出全部运行时工具和 TypeScript 工具类型。如果希望缩小导入范围或直接使用顶层 <code>Result</code> 函数，可以按子路径导入：" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<code>@greypan/js-kit</code> 导出全部模块，以及命名空间对象 <code>rust</code>。" },
    { label: 'li', content: "<code>@greypan/js-kit/rust</code> 直接在顶层导出 <code>ok</code>、<code>err</code>、<code>isOk</code>、<code>isErr</code>、<code>to</code>、<code>andThen</code>、<code>map</code>、<code>mapErr</code> 和 <code>unwrap</code>。" },
    { label: 'li', content: "<code>@greypan/js-kit/plugin-system</code>、<code>@greypan/js-kit/timer</code> 和 <code>@greypan/js-kit/paradigm</code> 分别对应各自独立模块。" }
    ]
  },
  { label: 'h2', id: 'section-4', content: "快速开始" },
  { label: 'h3', id: 'section-5', content: "组合插件" },
  { label: 'p', content: "<code>definePlugin</code> 返回一个惰性构建器。通过 <code>.use()</code> 逐层叠加能力，后注册的插件通过 <code>ctx</code> 访问前序插件的返回值，并可以覆盖同名方法；最后调用 <code>.make()</code> 生成实例。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { definePlugin } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">`[app] ${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">message</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}`</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }))</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> definePrefix</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">prefix</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  definePlugin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">((</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">ctx</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> void</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ({</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ctx.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">`${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">prefix</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}: ${</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">message</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">}`</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }))</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> app</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLogger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">().</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">use</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">definePrefix</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'auth'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)).</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">make</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">app.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'token refreshed'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// [app] auth: token refreshed</span></span></code></pre>", lang: "ts", path: './codeblock/eb65e0a5ab16.ts' },
  { label: 'h3', id: 'section-6', content: "用 <code>Result</code> 处理错误" },
  { label: 'p', content: "当希望把错误作为显式返回值而不是到处写 <code>try/catch</code> 时，可以从 <code>@greypan/js-kit/rust</code> 导入 <code>Result</code> 工具。<code>to()</code> 会把同步抛错或异步 rejection 转为 <code>Result&lt;T, E></code>。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { andThen, err, ok, to } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit/rust'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> parsed</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> to</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> JSON</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">parse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'{\"port\": 8080}'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">as</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">port</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> port</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> andThen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(parsed, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">data</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">typeof</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> data.port </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">===</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'number'</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> ?</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ok</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(data.port) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> err</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">new</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Error</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Missing port'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">))))</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (port.ok) {</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Listening on'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, port.value)</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">else</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">error</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(port.error.message)</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "ts", path: './codeblock/995e56c16bf4.ts' },
  { label: 'h2', id: 'section-7', content: "使用细节" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>批量发射与确认队列。</strong> <code>defineBatchEmitter</code> 在延迟窗口内合并高频调用，并提供 <code>flush()</code> 立即冲刷。<code>defineAckQueue</code> 只有在 <code>onConsume</code> 成功 resolve 后才移出队头元素；如果消费失败，元素会保留在队列中等待下次 <code>resume()</code> 或 <code>flush()</code> 重试。" },
    { label: 'li', content: "<strong>相对路径 URL 解析。</strong> <code>parseUrl</code> 与 <code>stringifyUrl</code> 支持完整 URL、站内相对路径（<code>/api/items?page=1</code>）和协议相对地址（<code>//cdn.example.com/a.js</code>），不会因为缺少 origin 而抛错。" },
    { label: 'li', content: "<strong>定时器控制。</strong> <code>debounce</code> 返回的包装函数带有 <code>.cancel()</code> 和 <code>.flush()</code>。<code>defineControllableInterval</code> 支持 <code>start()</code>、<code>pause()</code>、<code>resume()</code>、<code>restart()</code> 和 <code>stop()</code>，并在暂停期间保留剩余时间。" },
    { label: 'li', content: "<strong>兜底调用。</strong> <code>safeCall(fn, { onError })</code> 同时捕获同步异常和异步 rejection，适合放在卸载钩子或事件监听器里，避免产生未处理的 Promise 拒绝。" },
    { label: 'li', content: "<strong>纯编译期类型。</strong> <code>DeepPartial</code>、<code>DeepRequired</code>、<code>ValueOf</code>、<code>ArrayItem</code>、<code>ArgumentType</code>、<code>Equal</code> 和 <code>ClassPropertyTypes</code> 不产生任何运行时代码。" }
    ]
  },
  { label: 'h2', id: 'section-8', content: "模块索引" },
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
      { label: 'td', content: "<code>plugin-system</code>" },
      { label: 'td', content: "<code>definePlugin</code>、<code>defineBatchEmitter</code>、<code>defineQueue</code>、<code>defineAckQueue</code>、<code>PluginMade</code>" },
      { label: 'td', content: "<a href=\"./docs/plugin-system.CN.md\"><code>docs/plugin-system.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>url</code>" },
      { label: 'td', content: "<code>parseUrl</code>、<code>stringifyUrl</code>" },
      { label: 'td', content: "<a href=\"./docs/url.CN.md\"><code>docs/url.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>number</code>" },
      { label: 'td', content: "<code>clamp</code>、<code>formatFileSize</code>" },
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
      { label: 'td', content: "<code>debounce</code>、<code>defineControllableInterval</code>" },
      { label: 'td', content: "<a href=\"./docs/timer.CN.md\"><code>docs/timer.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>paradigm</code>" },
      { label: 'td', content: "<code>rust</code>（<code>ok</code>、<code>err</code>、<code>to</code>、<code>andThen</code>、<code>map</code>、<code>mapErr</code>、<code>unwrap</code>）" },
      { label: 'td', content: "<a href=\"./docs/paradigm.CN.md\"><code>docs/paradigm.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>shortcut</code>" },
      { label: 'td', content: "<code>safeCall</code>" },
      { label: 'td', content: "<a href=\"./docs/shortcut.CN.md\"><code>docs/shortcut.CN.md</code></a>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>utility-types</code>" },
      { label: 'td', content: "<code>DeepPartial</code>、<code>DeepRequired</code>、<code>ValueOf</code>、<code>ArrayItem</code>、<code>ArgumentType</code>、<code>Equal</code>、<code>ClassPropertyTypes</code>" },
      { label: 'td', content: "<a href=\"./docs/utility-types.CN.md\"><code>docs/utility-types.CN.md</code></a>" }
      ]
    }
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
