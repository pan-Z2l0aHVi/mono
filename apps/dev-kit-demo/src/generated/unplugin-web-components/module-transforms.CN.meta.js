// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "模块转换" },
  { label: 'p', content: "<a href=\"./module-transforms.md\">English</a> | 简体中文" },
  { label: 'p', content: "当 <code>.vue</code>、<code>.jsx</code>、<code>.tsx</code> 模块中出现匹配前缀的自定义元素标签时，自动注入对应组件导入。" },
  { label: 'h2', id: 'section-2', content: "标签识别规则" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "<strong>支持的文件类型</strong>：<code>node_modules</code> 之外的 <code>.vue</code>、<code>.jsx</code>、<code>.tsx</code> 文件；普通 <code>.js</code> / <code>.ts</code> 文件不会参与转换。" },
    { label: 'li', content: "<strong>kebab-case（大小写不敏感）</strong>：配置 <code>tagPrefix: 'web-ui'</code> 时，<code>&lt;web-ui-button></code>、<code>&lt;WEB-UI-BUTTON></code> 与 <code>&lt;web-ui-Button></code> 均归一到 <code>components/button</code>。" },
    { label: 'li', content: "<strong>PascalCase</strong>：模块源码中同时支持 <code>&lt;WebUiButton /></code> 以及单字母后缀（如 <code>&lt;WebUiA /></code>），会按 kebab-case 映射到对应目录（<code>components/button</code>、<code>components/a</code>）。" },
    { label: 'li', content: "<strong>自动去重</strong>：同一文件中多次使用同一标签只会生成一条导入语句。" }
    ]
  },
  { label: 'h2', id: 'section-3', content: "Vue SFC 转换（<code>.vue</code>）" },
  { label: 'p', content: "插件按以下优先级将导入语句注入到内联脚本块中：" },
  {
    label: 'ol',
    children: [
    { label: 'li', content: "不含 <code>src</code> 属性的内联 <code>&lt;script setup></code>" },
    { label: 'li', content: "不含 <code>src</code> 属性的普通内联 <code>&lt;script></code>" },
    { label: 'li', content: "若文件没有内联脚本块，则在顶部自动补充一段 <code>&lt;script setup></code>" }
    ]
  },
  { label: 'p', content: "若文件仅包含带 <code>src</code> 的外部 <code>&lt;script setup src=\"...\"></code>，插件会跳过注入，避免破坏外部 setup 块语义。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- 转换前 --></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "vue", path: './codeblock/36648cefd7dc.vue' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- 转换后（sideEffects: true） --></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/components/button'</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "vue", path: './codeblock/cd95c870b3a9.vue' },
  { label: 'h2', id: 'section-4', content: "React JSX / TSX 转换（<code>.jsx</code>、<code>.tsx</code>）" },
  { label: 'p', content: "插件会在模块顶部注入导入，同时识别并保留顶层指令序言（如 <code>'use client'</code>、<code>'use server'</code>、<code>'use strict'</code>，兼容注释与分号）。紧跟运算符或类型断言的字符串表达式（如 <code>'a' + 'b'</code>、<code>'x' as const</code>）不会被误判为指令。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 转换前</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'use client'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> SaveBar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "tsx", path: './codeblock/a6e655e86337.tsx' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 转换后（sideEffects: true）</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'use client'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/components/button'</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> SaveBar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "tsx", path: './codeblock/c158116516d7.tsx' },
  { label: 'h2', id: 'section-5', content: "导入格式对照" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "配置组合" },
      { label: 'th', content: "生成结果" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "默认（<code>sideEffects: false</code>）" },
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
