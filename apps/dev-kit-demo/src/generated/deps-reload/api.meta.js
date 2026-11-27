// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "API" },
  { label: 'p', content: "English | <a href=\"./api.CN.md\">简体中文</a>" },
  { label: 'p', content: "Complete configuration reference and path/extension matching rules for <code>@greypan/deps-reload</code>." },
  { label: 'h2', id: 'section-2', content: "Subpath exports" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Entry" },
      { label: 'th', content: "Target bundler" },
      { label: 'th', content: "Export" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>@greypan/deps-reload/vite</code>" },
      { label: 'td', content: "Vite" },
      { label: 'td', content: "Default export (<code>deps =></code>)" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>@greypan/deps-reload/webpack</code>" },
      { label: 'td', content: "Webpack" },
      { label: 'td', content: "Default export (<code>deps =></code>)" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-3', content: "<code>depsReload(deps)</code>" },
  { label: 'p', content: "Creates the plugin instance for the selected bundler." },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Parameter" },
      { label: 'th', content: "Type" },
      { label: 'th', content: "Description" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>deps</code>" },
      { label: 'td', content: "<code>Dep[]</code>" },
      { label: 'td', content: "List of local or linked dependencies." }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-4', content: "<code>Dep</code>" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> interface</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Dep</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">  /** npm package name, used to resolve packages without a local path */</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">  /** Local package root directory, for monorepos or npm links */</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  path</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">  /** Build output directory relative to the package root */</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  outputDir</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">  /** File extensions in the build output that should trigger a reload */</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  extensions</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">[]</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "ts", path: './codeblock/24e1f7aad0eb.ts' },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Property" },
      { label: 'th', content: "Type" },
      { label: 'th', content: "Default" },
      { label: 'th', content: "Description" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>name</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "Package name. Used as <code>resolve('node_modules', name)</code> when <code>path</code> is omitted." }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>path</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "" },
      { label: 'td', content: "Relative or absolute path to the local package root (monorepo or <code>npm link</code>)." }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>outputDir</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "<code>'dist'</code>" },
      { label: 'td', content: "Build output directory resolved relative to the package root." }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>extensions</code>" },
      { label: 'td', content: "<code>string[]</code>" },
      { label: 'td', content: "<code>['.js', '.css']</code>" },
      { label: 'td', content: "File extensions that trigger a reload in Vite." }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-5', content: "Matching &amp; normalization rules" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>Package root resolution</strong>: If <code>path</code> is provided, <code>resolve(path)</code> is used; otherwise <code>resolve('node_modules', name)</code>." },
    { label: 'li', content: "<strong>Path comparison</strong>: Separators are normalized to <code>/</code>, trailing slashes are stripped, and comparison is case-insensitive so minor casing differences (such as <code>../Packages/Foo</code> vs <code>packages/foo</code>) still match." },
    { label: 'li', content: "<strong>Extension normalization</strong>: Leading dots and surrounding whitespace are normalized and lowercased—<code>'mjs'</code>, <code>'.mjs'</code>, and <code>' .MJS '</code> all normalize to <code>'.mjs'</code>. Empty entries are dropped." },
    { label: 'li', content: "<strong>Source maps ignored</strong>: Any file ending in <code>.map</code> is always skipped in Vite even if <code>.map</code> is listed." }
    ]
  },
  { label: 'h2', id: 'section-6', content: "Multi-package example" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> depsReload </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/deps-reload/vite'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">depsReload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/app-scrollbars'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/app-scrollbars'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    extensions: [</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.mjs'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.css'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  },</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    outputDir: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'dist'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    extensions: [</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.js'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.css'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  },</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">    // Resolves to node_modules/my-linked-lib/build</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-linked-lib'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">18</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    outputDir: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'build'</span></span>\n<span class=\"line\"><span class=\"line-number\">19</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }</span></span>\n<span class=\"line\"><span class=\"line-number\">20</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">])</span></span></code></pre>", lang: "ts", path: './codeblock/740c4fb35249.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> depsReload </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/deps-reload/vite'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">depsReload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/app-scrollbars'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/app-scrollbars'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    extensions: [</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.mjs'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.css'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  },</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'@greypan/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    path: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'../../packages/web-ui'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    outputDir: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'dist'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    extensions: [</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.js'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'.css'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  },</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">    // Resolves to node_modules/my-linked-lib/build</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-linked-lib'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span class=\"line-number\">18</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    outputDir: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'build'</span></span>\n<span class=\"line\"><span class=\"line-number\">19</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }</span></span>\n<span class=\"line\"><span class=\"line-number\">20</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">])</span></span></code></pre>", lang: "js", path: './codeblock/740c4fb35249.js' }
]

export default meta
