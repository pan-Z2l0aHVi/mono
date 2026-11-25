// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'hr' },
  { label: 'h2', id: 'section-1', content: "title: 历史导航状态" },
  { label: 'h1', id: 'section-2', content: "历史导航状态" },
  { label: 'p', content: "<code>defineHistoryNav(options?)</code> 以 Navigation API 只读子集的形式跟踪当前文档会话的前进/后退可用性（<code>canGoBack</code>、<code>canGoForward</code>、<code>currentEntry</code>、<code>entries()</code>、<code>onCurrentEntryChange()</code>）。它在旁路记录 <code>history.pushState</code> / <code>history.replaceState</code> 而不污染 <code>history.state</code>，并将栈快照持久化至 <code>sessionStorage</code>，调用 <code>dispose()</code> 可完整还原原生方法。" },
  { label: 'h2', id: 'section-3', content: "跟踪前进与后退状态" },
  { label: 'p', content: "应用启动时调用一次（幂等单例），订阅 <code>onCurrentEntryChange</code> 观察导航变化。下方交互演示运行在独立 iframe 沙箱中，不会影响当前文档页的路由历史。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { defineHistoryNav } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> nav</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineHistoryNav</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ namespace: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-app-nav'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> unsubscribe</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> nav.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onCurrentEntryChange</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.navigationType, {</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    from: event.from?.url,</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    current: nav.currentEntry?.url,</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    canGoBack: nav.canGoBack,</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    canGoForward: nav.canGoForward</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  })</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">history.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pushState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ step: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">''</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'?step=1'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">history.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">replaceState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ step: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">''</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'?step=2'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(nav.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">entries</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">().</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">length</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">18</span></span>\n<span class=\"line\"><span class=\"line-number\">19</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">unsubscribe</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">20</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">nav.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">dispose</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span></code></pre>", lang: "ts", meta: "demo=history-nav-sandbox", path: './codeblock/4c26bf65f0f3.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { defineHistoryNav } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> nav</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineHistoryNav</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ namespace: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-app-nav'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> unsubscribe</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> nav.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onCurrentEntryChange</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.navigationType, {</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    from: event.from?.url,</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    current: nav.currentEntry?.url,</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    canGoBack: nav.canGoBack,</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    canGoForward: nav.canGoForward</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  })</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">history.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">pushState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ step: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">''</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'?step=1'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">history.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">replaceState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ step: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">''</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'?step=2'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(nav.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">entries</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">().</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">length</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">18</span></span>\n<span class=\"line\"><span class=\"line-number\">19</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">unsubscribe</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">20</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">nav.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">dispose</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span></code></pre>", lang: "js", path: './codeblock/4c26bf65f0f3.js' },
  { label: 'h2', id: 'section-4', content: "API" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "成员" },
      { label: 'th', content: "类型" },
      { label: 'th', content: "说明" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>canGoBack</code>" },
      { label: 'td', content: "<code>boolean</code>" },
      { label: 'td', content: "历史栈中是否存在可后退条目" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>canGoForward</code>" },
      { label: 'td', content: "<code>boolean</code>" },
      { label: 'td', content: "历史栈中是否存在可前进条目" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>currentEntry</code>" },
      { label: 'td', content: "<code>HistoryNavEntry | null</code>" },
      { label: 'td', content: "当前激活条目（含 <code>id</code>、<code>key</code>、<code>index</code>、<code>url</code>、<code>sameDocument</code>、<code>getState()</code>）" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>entries()</code>" },
      { label: 'td', content: "<code>() => HistoryNavEntry[]</code>" },
      { label: 'td', content: "返回当前文档会话中的全部历史条目" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>onCurrentEntryChange(cb)</code>" },
      { label: 'td', content: "<code>(cb) => () => void</code>" },
      { label: 'td', content: "订阅 <code>push</code>、<code>replace</code>、<code>traverse</code> 状态变化" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>dispose()</code>" },
      { label: 'td', content: "<code>() => void</code>" },
      { label: 'td', content: "移除事件监听、还原原生 <code>history</code> 方法并重置单例" }
      ]
    }
    ]
  }
]

export default meta
