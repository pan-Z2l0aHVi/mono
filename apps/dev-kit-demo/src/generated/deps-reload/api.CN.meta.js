// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "API" },
  { label: 'p', content: "<a href=\"./api.md\">English</a> | 简体中文" },
  { label: 'p', content: "<code>@greypan/deps-reload</code> 的完整配置参考与路径/扩展名匹配规则。" },
  { label: 'h2', id: 'section-2', content: "子路径导出" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "入口" },
      { label: 'th', content: "目标打包器" },
      { label: 'th', content: "导出形式" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>@greypan/deps-reload/vite</code>" },
      { label: 'td', content: "Vite" },
      { label: 'td', content: "默认导出（<code>deps => ...</code>）" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>@greypan/deps-reload/webpack</code>" },
      { label: 'td', content: "Webpack" },
      { label: 'td', content: "默认导出（<code>deps => ...</code>）" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-3', content: "<code>depsReload(deps)</code>" },
  { label: 'p', content: "创建对应打包器的插件实例。" },
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
      { label: 'td', content: "待监听的本地包或链接依赖配置列表。" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-4', content: "<code>Dep</code>" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> interface</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Dep</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">  /** npm 包名，未提供 path 时用于定位 node_modules 路径 */</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">  /** 本地包根目录，适用于 monorepo 或 npm link */</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  path</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">  /** 相对于包根目录的构建产物目录 */</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  outputDir</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">  /** 触发刷新的构建产物文件扩展名列表 */</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  extensions</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">[]</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "ts", path: './codeblock/177da63ffa1d.ts' },
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
      { label: 'td', content: "包名。省略 <code>path</code> 时按 <code>resolve('node_modules', name)</code> 解析包根目录。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>path</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "本地包根目录（相对或绝对路径），适用于 monorepo 或 <code>npm link</code>。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>outputDir</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "<code>'dist'</code>" },
      { label: 'td', content: "相对于包根目录的构建产物目录。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>extensions</code>" },
      { label: 'td', content: "<code>string[]</code>" },
      { label: 'td', content: "<code>['.js', '.css']</code>" },
      { label: 'td', content: "在 Vite 中会触发整页刷新的文件扩展名。" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-5', content: "匹配与归一化规则" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>包根目录解析</strong>：提供 <code>path</code> 时使用 <code>resolve(path)</code>；未提供时回退到 <code>resolve('node_modules', name)</code>。" },
    { label: 'li', content: "<strong>路径比较</strong>：路径分隔符统一为 <code>/</code>，去除末尾斜杠并按小写比较，避免配置大小写与文件系统返回不一致（如 <code>../Packages/Foo</code> 与 <code>packages/foo</code>）导致漏触发。" },
    { label: 'li', content: "<strong>扩展名归一化</strong>：自动去除首尾空白和多余前导点并转小写——<code>'mjs'</code>、<code>'.mjs'</code>、<code>' .MJS '</code> 均会归一化为 <code>'.mjs'</code>；空字符串会被过滤。" },
    { label: 'li', content: "<strong>忽略 sourcemap</strong>：在 Vite 中，所有以 <code>.map</code> 结尾的文件都会被跳过。" }
    ]
  },
  { label: 'h2', id: 'section-6', content: "多包配置示例" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> depsReload </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/deps-reload/vite'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">depsReload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/app-scrollbars'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/app-scrollbars'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    extensions: [</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.mjs'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.css'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  },</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    outputDir: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'dist'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    extensions: [</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.js'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.css'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  },</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">    // 解析为 node_modules/my-linked-lib/build</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-linked-lib'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">18</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    outputDir: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'build'</span></span>\n<span class=\"line\"><span class=\"line-number\">19</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }</span></span>\n<span class=\"line\"><span class=\"line-number\">20</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">])</span></span></code></pre>", lang: "ts", path: './codeblock/0d7b58da6ea3.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> depsReload </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/deps-reload/vite'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">depsReload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/app-scrollbars'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/app-scrollbars'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    extensions: [</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.mjs'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.css'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  },</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    outputDir: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'dist'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    extensions: [</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.js'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.css'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  },</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">    // 解析为 node_modules/my-linked-lib/build</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-linked-lib'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">18</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    outputDir: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'build'</span></span>\n<span class=\"line\"><span class=\"line-number\">19</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }</span></span>\n<span class=\"line\"><span class=\"line-number\">20</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">])</span></span></code></pre>", lang: "js", path: './codeblock/0d7b58da6ea3.js' }
]

export default meta
