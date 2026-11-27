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
  { label: 'p', content: "<a href=\"./README.md\">English</a> | 简体中文 | <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/deps-reload/getting-started\">在线演示</a>" },
  { label: 'h2', id: 'section-2', content: "安装" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># npm</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/deps-reload</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># pnpm</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/deps-reload</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># yarn</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/deps-reload</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># bun</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/deps-reload</span></span></code></pre>", lang: "bash", path: './codeblock/fed160aa6700.bash' },
  { label: 'h2', id: 'section-3', content: "Vite" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// vite.config.ts</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> depsReload </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/deps-reload/vite'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineConfig</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  plugins: [</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    depsReload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      {</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        extensions: [</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.js'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.css'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      }</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    ])</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ]</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span></code></pre>", lang: "ts", path: './codeblock/13619db85a41.ts' },
  { label: 'p', content: "<code>packages/web-ui/dist</code> 中的文件变化时，浏览器会刷新页面。" },
  { label: 'p', content: "这个插件监听构建产物，不会把依赖指向源码，因此应用始终消费包的构建结果。" },
  { label: 'h2', id: 'section-4', content: "Webpack" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// webpack.config.ts</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> depsReload </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/deps-reload/webpack'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  plugins: [</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    depsReload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      {</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/web-ui'</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      }</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    ])</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ],</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  devServer: {</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    hot: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    liveReload: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "ts", path: './codeblock/4aa1592d0218.ts' },
  { label: 'p', content: "Webpack 插件会把每个输出目录加入 watch dependencies。要通过 Webpack Dev Server 获得整页刷新，请启用 live reload 并关闭 HMR。" },
  { label: 'h2', id: 'section-5', content: "API" },
  { label: 'h3', id: 'section-6', content: "<code>depsReload(deps)</code>" },
  { label: 'p', content: "创建插件。" },
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
      { label: 'td', content: "待监听的依赖列表" }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-7', content: "<code>Dep</code>" },
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
      { label: 'td', content: "包名，用于 node_modules 路径。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>path</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "本地包根目录，用于 monorepo 或 npm link。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>outputDir</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "<code>'dist'</code>" },
      { label: 'td', content: "相对 <code>path</code> 的构建输出目录。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>extensions</code>" },
      { label: 'td', content: "<code>string[]</code>" },
      { label: 'td', content: "<code>['.js', '.css']</code>" },
      { label: 'td', content: "待监听的文件扩展名。" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-8', content: "文档导航" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<a href=\"./docs/vite.CN.md\">Vite</a> — Vite 开发服务接入、模块图失效与防抖刷新机制" },
    { label: 'li', content: "<a href=\"./docs/webpack.CN.md\">Webpack</a> — Webpack <code>contextDependencies</code> 与 Dev Server 配置" },
    { label: 'li', content: "<a href=\"./docs/api.CN.md\">API</a> — <code>Dep</code> 完整选项参考、归一化规则与多包示例" }
    ]
  }
]

export default meta
