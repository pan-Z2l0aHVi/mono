// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'hr' },
  { label: 'h2', id: 'section-1', content: "title: Event Shortcut" },
  { label: 'h1', id: 'section-2', content: "Event Shortcut" },
  { label: 'p', content: "<code>on</code> and <code>off</code> are thin, strongly-typed wrappers around <code>addEventListener</code> and <code>removeEventListener</code> for <code>Window</code> and <code>Document</code>, inferring the exact event type from <code>WindowEventMap</code> and <code>DocumentEventMap</code>." },
  { label: 'h2', id: 'section-3', content: "Typed <code>window</code> / <code>document</code> listeners" },
  { label: 'p', content: "Attach listeners with full event type inference and clean them up with <code>off</code> (or an <code>AbortSignal</code>)." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { off, on } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> handleKeydown</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> KeyboardEvent</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'key pressed:'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, event.key)</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">on</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(window, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'keydown'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, handleKeydown)</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Detach when no longer needed</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">off</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(window, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'keydown'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, handleKeydown)</span></span></code></pre>", lang: "ts", meta: "demo=event-shortcut", path: './codeblock/448e6114045f.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { off, on } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> handleKeydown</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\"> event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'key pressed:'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, event.key)</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">on</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(window, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'keydown'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, handleKeydown)</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Detach when no longer needed</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">off</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(window, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'keydown'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, handleKeydown)</span></span></code></pre>", lang: "js", path: './codeblock/63423ad44bf3.js' },
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
      { label: 'td', content: "<code>on</code>" },
      { label: 'td', content: "<code>(target: Window | Document, type, listener, options?) => void</code>" },
      { label: 'td', content: "Typed <code>addEventListener</code> wrapper" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>off</code>" },
      { label: 'td', content: "<code>(target: Window | Document, type, listener, options?) => void</code>" },
      { label: 'td', content: "Typed <code>removeEventListener</code> wrapper" }
      ]
    }
    ]
  }
]

export default meta
