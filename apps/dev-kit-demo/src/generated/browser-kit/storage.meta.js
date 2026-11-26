// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'hr' },
  { label: 'h2', id: 'section-1', content: "title: Storage" },
  { label: 'h1', id: 'section-2', content: "Storage" },
  { label: 'p', content: "<code>defineLocal(namespace?)</code> and <code>defineSession(namespace?)</code> create namespaced <code>localStorage</code> and <code>sessionStorage</code> helpers with TTL expiration, quota cleanup, graceful degradation on restricted storage, and cross-tab <code>watch()</code>. <code>local</code> and <code>session</code> are default unprefixed instances." },
  { label: 'h2', id: 'section-3', content: "Namespaced storage with TTL" },
  { label: 'p', content: "Use <code>set(key, value, ttl?)</code> to persist structured JSON values with an optional millisecond TTL. Expired entries return the default value and are removed automatically on read." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { defineLocal } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> store</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLocal</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-app'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">store.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'profile'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Alice'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, role: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'admin'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> profile</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> store.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">get</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;{ </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">; </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">role</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }>(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'profile'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Expires in 5 seconds</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">store.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'otp'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'482910'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">5_000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Cross-tab updates only (native storage event does not fire in the same tab)</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> unwatch</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> store.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">watch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'otp'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">next</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">prev</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'otp changed across tabs'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { next, prev })</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">unwatch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(profile)</span></span></code></pre>", lang: "ts", meta: "demo=storage-ttl", path: './codeblock/bdbbc55949df.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { defineLocal } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> store</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> defineLocal</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'my-app'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">store.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'profile'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { name: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'Alice'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, role: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'admin'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> profile</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> store.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">get</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'profile'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Expires in 5 seconds</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">store.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">set</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'otp'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'482910'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">5_000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// Cross-tab updates only (native storage event does not fire in the same tab)</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> unwatch</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> store.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">watch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'otp'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">next</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">prev</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'otp changed across tabs'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { next, prev })</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">unwatch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(profile)</span></span></code></pre>", lang: "js", path: './codeblock/598d680c7a50.js' },
  { label: 'h2', id: 'section-4', content: "API" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Method" },
      { label: 'th', content: "Signature" },
      { label: 'th', content: "Description" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>defineLocal</code> / <code>defineSession</code>" },
      { label: 'td', content: "<code>(namespace?: string) => StorageInst</code>" },
      { label: 'td', content: "Return a cached singleton storage instance for the given namespace" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>local</code> / <code>session</code>" },
      { label: 'td', content: "<code>StorageInst</code>" },
      { label: 'td', content: "Default instances without a namespace prefix" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>set</code>" },
      { label: 'td', content: "<code>&lt;T>(key: string, val: T, ttl?: number) => boolean</code>" },
      { label: 'td', content: "Store a value with optional TTL in ms; returns <code>false</code> on restricted storage" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>get</code>" },
      { label: 'td', content: "<code>&lt;T>(key: string, def?: T | null) => T | null</code>" },
      { label: 'td', content: "Read value or return <code>def</code> when missing/expired" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>has</code>" },
      { label: 'td', content: "<code>(key: string) => boolean</code>" },
      { label: 'td', content: "Check whether a non-expired value exists" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>remove</code>" },
      { label: 'td', content: "<code>(key: string) => boolean</code>" },
      { label: 'td', content: "Remove a single key" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>clearUseless</code>" },
      { label: 'td', content: "<code>() => void</code>" },
      { label: 'td', content: "Sweep expired keys within the current namespace" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>clear</code>" },
      { label: 'td', content: "<code>() => void</code>" },
      { label: 'td', content: "Clear all keys in the current namespace (or entire store when unprefixed)" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>watch</code>" },
      { label: 'td', content: "<code>&lt;T>(key: string, cb: (next: T | null, prev: T | null) => void) => () => void</code>" },
      { label: 'td', content: "Listen for cross-tab <code>storage</code> events on the key" }
      ]
    }
    ]
  }
]

export default meta
