// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/unplugin-web-components" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/unplugin-web-components\"><img src=\"https://img.shields.io/npm/v/@greypan/unplugin-web-components\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/unplugin-web-components\"><img src=\"https://img.shields.io/npm/dm/@greypan/unplugin-web-components\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/unplugin-web-components\"><img src=\"https://img.shields.io/node/v/@greypan/unplugin-web-components\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/unplugin-web-components\"><img src=\"https://img.shields.io/npm/l/@greypan/unplugin-web-components\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "在标签出现时自动导入 Web Components 的 Vite/Webpack 插件。" }
    ]
  },
  { label: 'p', content: "<a href=\"./README.md\">English</a> | 简体中文 | <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/unplugin-web-components/getting-started\">在线演示</a>" },
  { label: 'h2', id: 'section-2', content: "安装" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># npm</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/unplugin-web-components</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># pnpm</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/unplugin-web-components</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># yarn</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/unplugin-web-components</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># bun</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/unplugin-web-components</span></span></code></pre>", lang: "bash", path: './codeblock/1975c612bf29.bash' },
  { label: 'h2', id: 'section-3', content: "快速开始" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// vite.config.ts</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> unpluginWebComponents </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/unplugin-web-components/vite'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineConfig</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  plugins: [</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    unpluginWebComponents</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      tagPrefix: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      packageName: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      sideEffects: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    })</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ]</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span></code></pre>", lang: "ts", path: './codeblock/3c2cca9d8bc0.ts' },
  { label: 'p', content: "在 Vue 模板、React JSX/TSX 或 Vite HTML 入口中使用 <code>&lt;web-ui-button></code> 时，会自动加入对应导入。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- Vue --></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>点击我&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "vue", path: './codeblock/5ce500b9da84.vue' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// React</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> App</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>点击我&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "tsx", path: './codeblock/8a73db64c99e.tsx' },
  { label: 'h3', id: 'section-4', content: "Vite HTML 入口" },
  { label: 'p', content: "对于由 Vite 处理的 HTML 入口，插件会注入一个模块脚本，为每个组件生成一条导入。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;!</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">doctype</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> html</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">html</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"zh-CN\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">head</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">meta</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> charset</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"UTF-8\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> /></span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">title</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Vanilla + web-ui&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">title</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">head</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">body</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>点击我&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"module\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> src</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/src/main.ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">body</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">html</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "html", path: './codeblock/fa2930e254d1.html' },
  { label: 'p', content: "<code>sideEffects: true</code> 时，注入的脚本大致如下：" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"module\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  import</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/components/button'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "html", path: './codeblock/53b835a2134c.html' },
  { label: 'p', content: "HTML 注入规则：" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "只识别 kebab-case 自定义元素。HTML 标签名不区分大小写，因此 <code>&lt;WEB-UI-BUTTON></code> 和 <code>&lt;web-ui-Button></code> 都匹配 <code>web-ui-button</code>。<code>&lt;WebUiButton></code> 这样的驼峰名不匹配。" },
    { label: 'li', content: "注释、<code>script</code>、<code>style</code>、<code>title</code>、<code>textarea</code>、<code>iframe</code> 等原始文本区域中的标签会被忽略。" },
    { label: 'li', content: "HTML 必须经过 Vite 构建。<code>public/</code> 中的文件和直接从磁盘打开的 HTML 不会被转换。" }
    ]
  },
  { label: 'h2', id: 'section-5', content: "API" },
  { label: 'h3', id: 'section-6', content: "<code>unpluginWebComponents(options)</code>" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "参数" },
      { label: 'th', content: "类型" },
      { label: 'th', content: "默认值" },
      { label: 'th', content: "说明" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>options.tagPrefix</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "组件标签前缀，例如 <code>'web-ui'</code>。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>options.packageName</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "npm 包名，例如 <code>'@greypan/web-ui'</code>。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>options.sideEffects</code>" },
      { label: 'td', content: "<code>boolean</code>" },
      { label: 'td', content: "<code>false</code>" },
      { label: 'td', content: "使用副作用导入，例如 <code>import 'pkg'</code>。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>options.withStyle</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "随组件导入的 CSS 文件。" }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-7', content: "支持的打包器" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "入口" },
      { label: 'th', content: "模块转换" },
      { label: 'th', content: "HTML 注入" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>/vite</code>" },
      { label: 'td', content: "Vue（<code>.vue</code>）、React（<code>.tsx</code>/<code>.jsx</code>）" },
      { label: 'td', content: "Vite HTML 入口（<code>index.html</code>）" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>/webpack</code>" },
      { label: 'td', content: "Vue（<code>.vue</code>）、React（<code>.tsx</code>/<code>.jsx</code>）" },
      { label: 'td', content: "" }
      ]
    }
    ]
  },
  { label: 'p', content: "只发布 <code>/vite</code> 和 <code>/webpack</code> 子路径。HTML 注入仅限 Vite。Webpack 适配器只转换模块源码，不注入 HTML。" },
  { label: 'h2', id: 'section-8', content: "文档导航" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<a href=\"./docs/module-transforms.CN.md\">模块转换</a> — Vue SFC 与 React JSX/TSX 转换、指令序言保留与导入模式" },
    { label: 'li', content: "<a href=\"./docs/html-injection.CN.md\">HTML 注入</a> — Vite <code>transformIndexHtml</code> 注入规则、忽略区域与边界说明" },
    { label: 'li', content: "<a href=\"./docs/api.CN.md\">API</a> — 完整选项参考与 Vite/Webpack 配置示例" }
    ]
  }
]

export default meta
