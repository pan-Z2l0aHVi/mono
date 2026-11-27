// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/deps-reload" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/deps-reload\"><img src=\"https://img.shields.io/npm/v/@greypan/deps-reload\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/deps-reload\"><img src=\"https://img.shields.io/npm/dm/@greypan/deps-reload\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/deps-reload\"><img src=\"https://img.shields.io/node/v/@greypan/deps-reload\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/deps-reload\"><img src=\"https://img.shields.io/npm/l/@greypan/deps-reload\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "依赖构建产物变化时刷新页面。" }
    ]
  },
  { label: 'p', content: "<a href=\"./README.md\">English</a> | 简体中文" },
  { label: 'p', content: "<strong>在线文档：</strong> <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/deps-reload/getting-started\">Dev Kit Demo</a>" },
  { label: 'h2', id: 'section-2', content: "安装" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># npm</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/deps-reload</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># pnpm</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/deps-reload</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># yarn</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/deps-reload</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># bun</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/deps-reload</span></span></code></pre>", lang: "bash", path: './codeblock/fed160aa6700.bash' },
  { label: 'h2', id: 'section-3', content: "快速开始" },
  { label: 'h3', id: 'section-4', content: "Vite" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// vite.config.ts</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> depsReload </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/deps-reload/vite'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineConfig</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  plugins: [</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    depsReload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      {</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        extensions: [</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.js'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.css'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      }</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    ])</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ]</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span></code></pre>", lang: "ts", path: './codeblock/13619db85a41.ts' },
  { label: 'p', content: "<code>packages/web-ui/dist</code> 中的文件变化时，浏览器会刷新页面。插件监听构建产物而非将依赖 alias 到源码，确保应用始终消费真实构建结果。" },
  { label: 'h3', id: 'section-5', content: "Webpack" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// webpack.config.ts</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> depsReload </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/deps-reload/webpack'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  plugins: [</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    depsReload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      {</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/web-ui'</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      }</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    ])</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ],</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  devServer: {</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    hot: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    liveReload: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "ts", path: './codeblock/4aa1592d0218.ts' },
  { label: 'p', content: "Webpack 插件会把每个产物目录加入 <code>compilation.contextDependencies</code>。要通过 Webpack Dev Server 触发整页刷新，请启用 <code>liveReload</code> 并关闭 <code>hot</code>。" },
  { label: 'h2', id: 'section-6', content: "API" },
  { label: 'h3', id: 'section-7', content: "<code>depsReload(deps)</code>" },
  { label: 'p', content: "提供 <code>@greypan/deps-reload/vite</code> 与 <code>@greypan/deps-reload/webpack</code> 两个默认导出入口。" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "参数" },
      { label: 'th', content: "类型" },
      { label: 'th', content: "说明" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>deps</code>" },
      { label: 'td', content: "<code>Dep[]</code>" },
      { label: 'td', content: "待监听的本地或链接依赖项" }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-8', content: "<code>Dep</code>" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "属性" },
      { label: 'th', content: "类型" },
      { label: 'th', content: "默认值" },
      { label: 'th', content: "说明" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>name</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "包名；省略 <code>path</code> 时默认解析 <code>node_modules/&lt;name></code>。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>path</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "本地包根目录，适用于 monorepo 或 <code>npm link</code>。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>outputDir</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "<code>'dist'</code>" },
      { label: 'td', content: "相对包根目录的构建产物目录。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>extensions</code>" },
      { label: 'td', content: "<code>string[]</code>" },
      { label: 'td', content: "<code>['.js', '.css']</code>" },
      { label: 'td', content: "Vite 下监听的文件扩展名（自动归一为小写并补齐前导 <code>.</code>）。" }
      ]
    }
    ]
  },
  { label: 'p', content: "匹配说明：" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "Vite 中路径匹配统一分隔符且忽略大小写，始终跳过 <code>.map</code> sourcemap 文件。" },
    { label: 'li', content: "单次构建的连续文件写入会防抖合并（<code>300ms</code>，最长等待 <code>3000ms</code>）为一次整页刷新。" }
    ]
  },
  { label: 'h2', id: 'section-9', content: "文档导航" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<a href=\"./docs/vite.CN.md\">Vite</a> — 模块图失效、防抖刷新机制与 monorepo <code>fs.allow</code>" },
    { label: 'li', content: "<a href=\"./docs/webpack.CN.md\">Webpack</a> — <code>contextDependencies</code>、Dev Server 配置与 Vite 差异" }
    ]
  }
]

export default meta
