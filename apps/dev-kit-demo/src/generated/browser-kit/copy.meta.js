// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "copy" },
  { label: 'p', content: "English | <a href=\"./copy.CN.md\">简体中文</a>" },
  { label: 'p', content: "Cross-browser clipboard copy helper supporting plain strings and <code>Blob</code> inputs with automatic fallback." },
  { label: 'h2', id: 'section-2', content: "Examples" },
  { label: 'h3', id: 'section-3', content: "Copy text or Blob" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { copyToClipboard } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">await</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> copyToClipboard</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Hello from @greypan/browser-kit'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">await</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> copyToClipboard</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">new</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Blob</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'&#x3C;b>Hi&#x3C;/b>'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">], { type: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'text/html'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }))</span></span></code></pre>", lang: "ts", meta: "demo=copy-text", path: './codeblock/efbbb5b2ce10.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { copyToClipboard } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">await</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> copyToClipboard</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Hello from @greypan/browser-kit'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">await</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> copyToClipboard</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">new</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Blob</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'&#x3C;b>Hi&#x3C;/b>'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">], { type: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'text/html'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }))</span></span></code></pre>", lang: "js", path: './codeblock/efbbb5b2ce10.js' },
  { label: 'h2', id: 'section-4', content: "API" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Function" },
      { label: 'th', content: "Signature" },
      { label: 'th', content: "Description" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>copyToClipboard</code>" },
      { label: 'td', content: "<code>(content: string | Blob, options?: CopyOptions) => Promise&lt;void></code>" },
      { label: 'td', content: "Writes text or a <code>Blob</code> to the system clipboard." }
      ]
    }
    ]
  },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Option" },
      { label: 'th', content: "Type" },
      { label: 'th', content: "Default" },
      { label: 'th', content: "Description" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>format</code>" },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "<code>'text/plain'</code>" },
      { label: 'td', content: "Clipboard MIME type (inferred from <code>Blob.type</code> when omitted)." }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>debug</code>" },
      { label: 'td', content: "<code>boolean</code>" },
      { label: 'td', content: "<code>false</code>" },
      { label: 'td', content: "Enables diagnostic console logging when copy fails." }
      ]
    }
    ]
  }
]

export default meta
