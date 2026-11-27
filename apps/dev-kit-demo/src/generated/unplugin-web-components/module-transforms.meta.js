// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "Module Transforms" },
  { label: 'p', content: "English | <a href=\"./module-transforms.CN.md\">简体中文</a>" },
  { label: 'p', content: "Automatically inject component imports into <code>.vue</code>, <code>.jsx</code>, and <code>.tsx</code> modules whenever matching custom element tags appear." },
  { label: 'h2', id: 'section-2', content: "Tag detection rules" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>Supported file types</strong>: <code>.vue</code>, <code>.jsx</code>, <code>.tsx</code> outside <code>node_modules</code>. Plain <code>.js</code> / <code>.ts</code> files are not transformed." },
    { label: 'li', content: "<strong>kebab-case (case-insensitive)</strong>: With <code>tagPrefix: 'web-ui'</code>, <code>&lt;web-ui-button></code>, <code>&lt;WEB-UI-BUTTON></code>, and <code>&lt;web-ui-Button></code> all normalize to <code>components/button</code>." },
    { label: 'li', content: "<strong>PascalCase</strong>: <code>&lt;WebUiButton /></code> and single-letter suffixes such as <code>&lt;WebUiA /></code> are also detected in module sources and mapped via kebab-case (<code>components/button</code>, <code>components/a</code>)." },
    { label: 'li', content: "<strong>Deduplication</strong>: Multiple occurrences of the same tag in one file produce a single import statement." }
    ]
  },
  { label: 'h2', id: 'section-3', content: "Vue SFC transforms (<code>.vue</code>)" },
  { label: 'p', content: "The plugin injects imports into the first inline script block with the following precedence:" },
  {
    label: 'ol',
    children: [
    { label: 'li', content: "Inline <code>&lt;script setup></code> (without a <code>src</code> attribute)" },
    { label: 'li', content: "Inline <code>&lt;script></code> (without a <code>src</code> attribute)" },
    { label: 'li', content: "If no inline script exists, a new <code>&lt;script setup></code> block is prepended to the file." }
    ]
  },
  { label: 'p', content: "If the file only has an external <code>&lt;script setup src=\"...\"></code>, it is left untouched because inline imports cannot be added to an external setup block." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- Input --></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Save&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "vue", path: './codeblock/d26e2958b3d3.vue' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- Output (sideEffects: true) --></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/components/button'</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Save&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "vue", path: './codeblock/68dfa454ad3f.vue' },
  { label: 'h2', id: 'section-4', content: "React JSX / TSX transforms (<code>.jsx</code>, <code>.tsx</code>)" },
  { label: 'p', content: "Imports are prepended to the module while preserving leading directive prologues (<code>'use client'</code>, <code>'use server'</code>, <code>'use strict'</code>, with optional comments and semicolons). String expressions followed by operators (such as <code>'a' + 'b'</code> or <code>'x' as const</code>) are not misclassified as directives." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Input</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'use client'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> SaveBar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Save&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "tsx", path: './codeblock/de0e7c757c44.tsx' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Output (sideEffects: true)</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'use client'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/components/button'</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> SaveBar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Save&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "tsx", path: './codeblock/5787dc3542fe.tsx' },
  { label: 'h2', id: 'section-5', content: "Import output modes" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Option combination" },
      { label: 'th', content: "Generated import" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "Default (<code>sideEffects: false</code>)" },
      { label: 'td', content: "<code>import { WebUiButton } from '@greypan/web-ui/components/button';</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>sideEffects: true</code>" },
      { label: 'td', content: "<code>import '@greypan/web-ui/components/button';</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>sideEffects: true, withStyle: 'style.css'</code>" },
      { label: 'td', content: "<code>import '@greypan/web-ui/components/button'\\nimport '@greypan/web-ui/components/button/style.css';</code>" }
      ]
    }
    ]
  }
]

export default meta
