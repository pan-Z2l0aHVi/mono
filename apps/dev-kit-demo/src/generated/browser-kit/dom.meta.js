// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'hr' },
  { label: 'h2', id: 'section-1', content: "title: DOM" },
  { label: 'h1', id: 'section-2', content: "DOM" },
  { label: 'p', content: "SSR-safe helpers for reading the current viewport dimensions and root document scroll offsets." },
  { label: 'h2', id: 'section-3', content: "Viewport size and root scroll offsets" },
  { label: 'p', content: "<code>getViewportSize()</code>, <code>getRootScrollTop()</code>, and <code>getRootScrollLeft()</code> safely return zeros when <code>window</code> or <code>document</code> is unavailable." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { getRootScrollLeft, getRootScrollTop, getViewportSize } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> viewport</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> getViewportSize</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> scroll</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  top: </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">getRootScrollTop</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(),</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  left: </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">getRootScrollLeft</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ viewport, scroll })</span></span></code></pre>", lang: "ts", meta: "demo=dom-metrics", path: './codeblock/bb4911cbda04.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { getRootScrollLeft, getRootScrollTop, getViewportSize } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> viewport</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> getViewportSize</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> scroll</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  top: </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">getRootScrollTop</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(),</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  left: </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">getRootScrollLeft</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ viewport, scroll })</span></span></code></pre>", lang: "js", path: './codeblock/bb4911cbda04.js' },
  { label: 'h2', id: 'section-4', content: "API" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Function" },
      { label: 'th', content: "Return type" },
      { label: 'th', content: "Description" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>getViewportSize()</code>" },
      { label: 'td', content: "<code>{ width: number; height: number }</code>" },
      { label: 'td', content: "Current <code>window.innerWidth</code> / <code>window.innerHeight</code> (zeros in SSR)" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>getRootScrollTop()</code>" },
      { label: 'td', content: "<code>number</code>" },
      { label: 'td', content: "Current vertical scroll offset of the root document" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>getRootScrollLeft()</code>" },
      { label: 'td', content: "<code>number</code>" },
      { label: 'td', content: "Current horizontal scroll offset of the root document" }
      ]
    }
    ]
  }
]

export default meta
