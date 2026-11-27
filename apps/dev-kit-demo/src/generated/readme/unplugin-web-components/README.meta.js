// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/unplugin-web-components" },
  { label: 'p', content: "<a href=\"https://www.npmjs.com/package/@greypan/unplugin-web-components\"><img src=\"https://img.shields.io/npm/v/@greypan/unplugin-web-components\" alt=\"npm version\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/unplugin-web-components\"><img src=\"https://img.shields.io/npm/dm/@greypan/unplugin-web-components\" alt=\"npm downloads\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/unplugin-web-components\"><img src=\"https://img.shields.io/node/v/@greypan/unplugin-web-components\" alt=\"node version\"></a>\n<a href=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml\"><img src=\"https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg\" alt=\"CI\"></a>\n<a href=\"https://www.npmjs.com/package/@greypan/unplugin-web-components\"><img src=\"https://img.shields.io/npm/l/@greypan/unplugin-web-components\" alt=\"License: MIT\"></a>" },
  {
    label: 'blockquote',
    children: [
    { label: 'p', content: "Vite and Webpack plugin that imports web components when their tags appear." }
    ]
  },
  { label: 'p', content: "English | <a href=\"./README.CN.md\">简体中文</a> | <a href=\"https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/unplugin-web-components/getting-started\">Live demo</a>" },
  { label: 'h2', id: 'section-2', content: "Install" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># npm</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">npm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> install</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/unplugin-web-components</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># pnpm</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pnpm</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/unplugin-web-components</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># yarn</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">yarn</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/unplugin-web-components</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\"># bun</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">bun</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> add</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> @greypan/unplugin-web-components</span></span></code></pre>", lang: "bash", path: './codeblock/1975c612bf29.bash' },
  { label: 'h2', id: 'section-3', content: "Quick start" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// vite.config.ts</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> unpluginWebComponents </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/unplugin-web-components/vite'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineConfig</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  plugins: [</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    unpluginWebComponents</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      tagPrefix: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      packageName: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      sideEffects: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    })</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ]</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span></code></pre>", lang: "ts", path: './codeblock/3c2cca9d8bc0.ts' },
  { label: 'p', content: "When you use <code>&lt;web-ui-button></code> in a Vue template, React JSX or TSX, or a Vite HTML entry, the matching import is added automatically." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- Vue --></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Click me&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "vue", path: './codeblock/1d327d35fce1.vue' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// React</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> App</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Click me&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "tsx", path: './codeblock/dfedab37000c.tsx' },
  { label: 'h3', id: 'section-4', content: "Vite HTML entry" },
  { label: 'p', content: "For an HTML entry processed by Vite, the plugin injects a module script with one import per component." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;!</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">doctype</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> html</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">html</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"en\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">head</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">meta</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> charset</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"UTF-8\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> /></span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">title</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Vanilla + web-ui&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">title</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">head</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">body</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Click me&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"module\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> src</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/src/main.ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">body</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">html</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "html", path: './codeblock/ed88a3b737c0.html' },
  { label: 'p', content: "With <code>sideEffects: true</code>, the injected script is roughly:" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"module\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  import</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/components/button'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "html", path: './codeblock/53b835a2134c.html' },
  { label: 'p', content: "HTML injection rules:" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "Only kebab-case custom elements are detected. HTML tag names are case-insensitive, so <code>&lt;WEB-UI-BUTTON></code> and <code>&lt;web-ui-Button></code> match <code>web-ui-button</code>. CamelCase names such as <code>&lt;WebUiButton></code> do not." },
    { label: 'li', content: "Tags inside comments, <code>script</code>, <code>style</code>, <code>title</code>, <code>textarea</code>, <code>iframe</code>, and similar raw-text regions are ignored." },
    { label: 'li', content: "The HTML must go through a Vite build. Files in <code>public/</code> and HTML opened directly from disk are not transformed." }
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
      { label: 'th', content: "Parameter" },
      { label: 'th', content: "Type" },
      { label: 'th', content: "Default" },
      { label: 'th', content: "Description" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>options.tagPrefix</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "Component tag prefix, for example <code>'web-ui'</code>." }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>options.packageName</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "NPM package name, for example <code>'@greypan/web-ui'</code>." }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>options.sideEffects</code>" },
      { label: 'td', content: "<code>boolean</code>" },
      { label: 'td', content: "<code>false</code>" },
      { label: 'td', content: "Use side-effect imports such as <code>import 'pkg'</code>." }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>options.withStyle</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "CSS file to import with each component." }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-7', content: "Supported bundlers" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Entry" },
      { label: 'th', content: "Module transforms" },
      { label: 'th', content: "HTML injection" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>/vite</code>" },
      { label: 'td', content: "Vue (<code>.vue</code>), React (<code>.tsx</code>/<code>.jsx</code>)" },
      { label: 'td', content: "Vite HTML entry (<code>index.html</code>)" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>/webpack</code>" },
      { label: 'td', content: "Vue (<code>.vue</code>), React (<code>.tsx</code>/<code>.jsx</code>)" },
      { label: 'td', content: "" }
      ]
    }
    ]
  },
  { label: 'p', content: "Only <code>/vite</code> and <code>/webpack</code> subpath exports are published. HTML injection is Vite-only. The Webpack adapter transforms module sources and does not inject into HTML." },
  { label: 'h2', id: 'section-8', content: "Documentation" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<a href=\"./docs/module-transforms.md\">Module Transforms</a> — Vue SFC and React JSX/TSX transforms, directive prologues, and import modes" },
    { label: 'li', content: "<a href=\"./docs/html-injection.md\">HTML Injection</a> — Vite <code>transformIndexHtml</code> rules, ignored regions, and boundaries" },
    { label: 'li', content: "<a href=\"./docs/api.md\">API</a> — Full options reference and Vite/Webpack configuration examples" }
    ]
  }
]

export default meta
