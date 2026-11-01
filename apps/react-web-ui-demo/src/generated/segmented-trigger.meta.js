// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "Segmented Trigger" },
  { label: 'p', content: "A segment button of <code>&lt;web-ui-segmented></code>: <code>value</code> is the segment value it represents, the selected state is written back by the parent segmented through <code>checked</code>, and form submission belongs to the parent." },
  { label: 'p', content: "A click or Enter / Space dispatches <code>change</code>—inside a group the event does not bubble, and the parent dispatches one group-level event instead; only outside a group does it bubble and cross the shadow boundary." },
  { label: 'h2', id: 'section-2', content: "Samples" },
  { label: 'h3', id: 'section-3', content: "Basic" },
  { label: 'p', content: "<code>value</code> decides which trigger is the current one, and the container writes <code>checked</code> back according to it; the text in the default slot is the button content." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { useState } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'react'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">view</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setView</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'day'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{view} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setView</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"day\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Day&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"week\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Week&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"month\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Month&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "tsx", path: './codeblock/e55457b51ba2.tsx', load: () => import('./codeblock/e55457b51ba2.tsx') },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"view\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"view = $event.currentTarget.value\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"day\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Day&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"week\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Week&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"month\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Month&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">8</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> view</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'day'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "vue", path: './codeblock/5e6bb86270a5.vue' },
  { label: 'h3', id: 'section-4', content: "Individual disabling" },
  { label: 'p', content: "<code>disabled</code> on a trigger disables only that item: it stays in the track but cannot be selected, and keyboard navigation skips it. On <code>&lt;web-ui-segmented></code> it disables every trigger." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { useState } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'react'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">view</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setView</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'list'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{view} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setView</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"list\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>List&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"grid\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        Grid</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "tsx", path: './codeblock/fd88c055d426.tsx', load: () => import('./codeblock/fd88c055d426.tsx') },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"view\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"view = $event.currentTarget.value\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"list\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>List&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"grid\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Grid&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">7</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> view</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'list'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "vue", path: './codeblock/63b3602c7bb7.vue' },
  { label: 'h2', id: 'section-5', content: "API" },
  { label: 'h3', id: 'section-6', content: "Props" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Name" },
      { label: 'th', content: "Description" },
      { label: 'th', content: "Type" },
      { label: 'th', content: "Default" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>value</code>" },
      { label: 'td', content: "Segment value." },
      { label: 'td', content: "<code>string</code>" },
      { label: 'td', content: "<code>''</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>checked</code>" },
      { label: 'td', content: "Currently selected; written back by the parent segmented, setting it alone does not notify the container." },
      { label: 'td', content: "<code>boolean</code>" },
      { label: 'td', content: "<code>false</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>disabled</code>" },
      { label: 'td', content: "Disables this trigger individually." },
      { label: 'td', content: "<code>boolean</code>" },
      { label: 'td', content: "<code>false</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>aria-label</code>" },
      { label: 'td', content: "Accessible name forwarded to the inner <code>role=\"option\"</code>; required when the slot contains only an icon." },
      { label: 'td', content: "<code>string | null</code>" },
      { label: 'td', content: "<code>null</code>" }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-7', content: "Events" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Name" },
      { label: 'th', content: "Description" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>change</code>" },
      { label: 'td', content: "Dispatched when a click or Enter / Space activates a trigger that is not selected; not dispatched when it is already current, and carries no <code>detail</code>." }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-8', content: "Slots" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Name" },
      { label: 'th', content: "Description" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>default</code>" },
      { label: 'td', content: "Button content; the trigger has no label attribute, so this content is all it displays." }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-9', content: "Behavior" },
  { label: 'p', content: "Not a form-associated component (the parent segmented submits uniformly)." },
  { label: 'h3', id: 'section-10', content: "CSS Custom Properties" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Name" },
      { label: 'th', content: "Description" },
      { label: 'th', content: "Default" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>--wui-segmented-trigger-px</code>" },
      { label: 'td', content: "Horizontal padding" },
      { label: 'td', content: "<code>12px</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>--wui-segmented-trigger-bg-hover</code>" },
      { label: 'td', content: "Trigger hover background" },
      { label: 'td', content: "<code>--wui-color-state-layer-hover</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>--wui-segmented-trigger-bg-active</code>" },
      { label: 'td', content: "Trigger pressed background" },
      { label: 'td', content: "<code>--wui-color-state-layer-active</code>" }
      ]
    }
    ]
  }
]

export default meta
