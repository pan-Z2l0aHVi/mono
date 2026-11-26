// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "url" },
  { label: 'p', content: "<a href=\"./url.md\">English</a> | 简体中文" },
  { label: 'p', content: "解析与构建绝对路径、相对路径及协议相对 URL，支持结构化 <code>query</code> 参数与 <code>hash</code>。" },
  { label: 'h2', id: 'section-2', content: "示例" },
  { label: 'h3', id: 'section-3', content: "解析与构建 URL" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { parseUrl, stringifyUrl } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> parsed</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> parseUrl</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'https://example.com/search?q=mono&#x26;tag=a&#x26;tag=b#top'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> rebuilt</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> stringifyUrl</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    base: parsed.base,</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    query: { </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">...</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">parsed.query, page: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'2'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, empty: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">undefined</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> },</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    hash: parsed.hash</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  },</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">  true</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(parsed, rebuilt)</span></span></code></pre>", lang: "ts", meta: "demo=url-playground", path: './codeblock/d34cba7b516a.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { parseUrl, stringifyUrl } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> parsed</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> parseUrl</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'https://example.com/search?q=mono&#x26;tag=a&#x26;tag=b#top'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> rebuilt</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> stringifyUrl</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    base: parsed.base,</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    query: { </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">...</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">parsed.query, page: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'2'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, empty: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">undefined</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> },</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    hash: parsed.hash</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  },</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">  true</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(parsed, rebuilt)</span></span></code></pre>", lang: "js", path: './codeblock/d34cba7b516a.js' },
  { label: 'h2', id: 'section-4', content: "API" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "函数" },
      { label: 'th', content: "签名" },
      { label: 'th', content: "说明" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>parseUrl</code>" },
      { label: 'td', content: "<code>(url?: string) => URLObject</code>" },
      { label: 'td', content: "将 URL 字符串拆解为 <code>{ base, query, hash }</code>。" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>stringifyUrl</code>" },
      { label: 'td', content: "<code>(opts: Partial&lt;URLObject>, omitNil?: boolean) => string</code>" },
      { label: 'td', content: "根据 <code>{ base, query, hash }</code> 拼接 URL 字符串（默认忽略 <code>null</code>/<code>undefined</code>）。" }
      ]
    }
    ]
  }
]

export default meta
