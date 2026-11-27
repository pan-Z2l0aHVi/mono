// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "Webpack" },
  { label: 'p', content: "<a href=\"./webpack.md\">English</a> | 简体中文" },
  { label: 'p', content: "将依赖包的构建产物目录注册为 Webpack 的监听依赖，使本地包重新编译后自动触发重编译与页面刷新。" },
  { label: 'h2', id: 'section-2', content: "使用方式" },
  { label: 'p', content: "从 <code>@greypan/deps-reload/webpack</code> 导入 Webpack 入口，并在 Webpack Dev Server 中开启整页 live reload：" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// webpack.config.ts</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> depsReload </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/deps-reload/webpack'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  plugins: [</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    depsReload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      {</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/web-ui'</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      }</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    ])</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ],</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  devServer: {</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    hot: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    liveReload: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "ts", path: './codeblock/4aa1592d0218.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// webpack.config.js</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> depsReload </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/deps-reload/webpack'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  plugins: [</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    depsReload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      {</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/web-ui'</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      }</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    ])</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ],</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  devServer: {</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    hot: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    liveReload: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "js", path: './codeblock/c0e25755013c.js' },
  { label: 'h2', id: 'section-3', content: "工作机制" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>注册 <code>contextDependencies</code></strong>：插件在 <code>thisCompilation</code> 钩子中，将每个依赖解析后的产物目录 <code>outputPath</code>（<code>path.resolve(packageRoot, outputDir)</code>）加入 <code>compilation.contextDependencies</code>。" },
    { label: 'li', content: "<strong>保留原始路径大小写</strong>：大小写折叠仅用于匹配比较；写入 <code>contextDependencies</code> 的路径保留原始大小写，确保在大小写敏感的文件系统上稳定工作。" },
    { label: 'li', content: "<strong>配合 Dev Server 整页刷新</strong>：预打包的外部依赖产物通常无法安全热替换，建议配置 <code>hot: false</code> 并保持 <code>liveReload: true</code>，在重新编译完成后自动刷新浏览器。" }
    ]
  },
  { label: 'h2', id: 'section-4', content: "与 Vite 入口的差异" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "对比项" },
      { label: 'th', content: "Vite（<code>/vite</code>）" },
      { label: 'th', content: "Webpack（<code>/webpack</code>）" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "监听机制" },
      { label: 'td', content: "<code>hotUpdate</code> + <code>moduleGraph.onFileChange</code>" },
      { label: 'td', content: "<code>compilation.contextDependencies.add(outputPath)</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "扩展名过滤" },
      { label: 'td', content: "按 <code>extensions</code> 过滤并忽略 <code>.map</code>" },
      { label: 'td', content: "由 Webpack 目录级监听器触发重编译" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "刷新方式" },
      { label: 'td', content: "防抖发送 <code>ws.send({ type: 'full-reload' })</code>" },
      { label: 'td', content: "由 <code>devServer.liveReload: true</code>（<code>hot: false</code>）控制整页刷新" }
      ]
    }
    ]
  }
]

export default meta
