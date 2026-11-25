// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'hr' },
  { label: 'h2', id: 'section-1', content: "title: 事件简写" },
  { label: 'h1', id: 'section-2', content: "事件简写" },
  { label: 'p', content: "<code>on</code> 与 <code>off</code> 是面向 <code>Window</code> 和 <code>Document</code> 的强类型 <code>addEventListener</code> / <code>removeEventListener</code> 封装，自动根据 <code>WindowEventMap</code> 与 <code>DocumentEventMap</code> 推导事件参数类型。" },
  { label: 'h2', id: 'section-3', content: "强类型全局事件监听" },
  { label: 'p', content: "注册带完整事件类型推导的监听器，并在适当时机通过 <code>off</code>（或 <code>AbortSignal</code>）解绑。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { off, on } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> handleKeydown</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> KeyboardEvent</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'按下按键:'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, event.key)</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">on</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(window, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'keydown'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, handleKeydown)</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 不再需要时移除监听</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">off</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(window, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'keydown'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, handleKeydown)</span></span></code></pre>", lang: "ts", meta: "demo=event-shortcut", path: './codeblock/614a55c11f25.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { off, on } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> handleKeydown</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\"> event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'按下按键:'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, event.key)</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">on</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(window, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'keydown'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, handleKeydown)</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// 不再需要时移除监听</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">off</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(window, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'keydown'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, handleKeydown)</span></span></code></pre>", lang: "js", path: './codeblock/af0ac59fefb5.js' },
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
      { label: 'td', content: "<code>on</code>" },
      { label: 'td', content: "<code>(target: Window | Document, type, listener, options?) => void</code>" },
      { label: 'td', content: "带类型推导的 <code>addEventListener</code> 封装" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>off</code>" },
      { label: 'td', content: "<code>(target: Window | Document, type, listener, options?) => void</code>" },
      { label: 'td', content: "带类型推导的 <code>removeEventListener</code> 封装" }
      ]
    }
    ]
  }
]

export default meta
