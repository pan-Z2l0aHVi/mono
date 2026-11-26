// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "utility-types" },
  { label: 'p', content: "<a href=\"./utility-types.md\">English</a> | 简体中文" },
  { label: 'p', content: "纯编译期 TypeScript 工具类型，零运行时开销。" },
  { label: 'h2', id: 'section-2', content: "示例" },
  { label: 'h3', id: 'section-3', content: "常用类型变换" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ArgumentType,</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ArrayItem,</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ClassPropertyTypes,</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  DeepPartial,</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  DeepRequired,</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  Equal,</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ValueOf</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/js-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">type</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Config</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">api</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">url</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">; </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">retries</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> } }</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">type</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> PartialConfig</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> DeepPartial</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">Config</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">type</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> RequiredConfig</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> DeepRequired</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">Config</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">type</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Status</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ValueOf</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;{ </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">readonly</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\"> ok</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> 200</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">; </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">readonly</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\"> fail</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> 500</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }></span></span>\n<span class=\"line\"><span class=\"line-number\">15</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">type</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Elem</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ArrayItem</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">[]></span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">type</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> FirstArg</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ArgumentType</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">id</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> void</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">17</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">type</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> IsSame</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Equal</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">Elem</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">18</span></span>\n<span class=\"line\"><span class=\"line-number\">19</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">class</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Service</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">20</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  endpoint</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '/api'</span></span>\n<span class=\"line\"><span class=\"line-number\">21</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  timeout</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> 3000</span></span>\n<span class=\"line\"><span class=\"line-number\">22</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span class=\"line-number\">23</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">type</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ServiceProps</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ClassPropertyTypes</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">Service</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">24</span></span>\n<span class=\"line\"><span class=\"line-number\">25</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> type</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Preview</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">PartialConfig</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">RequiredConfig</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">Status</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">Elem</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">FirstArg</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">IsSame</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">ServiceProps</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]</span></span></code></pre>", lang: "ts", path: './codeblock/135d08c09b55.ts' },
  { label: 'h2', id: 'section-4', content: "类型对照表" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "类型" },
      { label: 'th', content: "输入示例" },
      { label: 'th', content: "推导结果" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>ValueOf&lt;T></code>" },
      { label: 'td', content: "<code>ValueOf&lt;{ a: 1; b: 'x' }></code>" },
      { label: 'td', content: "<code>1 | 'x'</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>ArrayItem&lt;T></code>" },
      { label: 'td', content: "<code>ArrayItem&lt;string[]></code>" },
      { label: 'td', content: "<code>string</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>ArgumentType&lt;T></code>" },
      { label: 'td', content: "<code>ArgumentType&lt;(a: number, b: string) => void></code>" },
      { label: 'td', content: "<code>[a: number, b: string]</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>DeepPartial&lt;T></code>" },
      { label: 'td', content: "<code>DeepPartial&lt;{ a: { b: number } }></code>" },
      { label: 'td', content: "<code>{ a?: { b?: number } }</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>DeepRequired&lt;T></code>" },
      { label: 'td', content: "<code>DeepRequired&lt;{ a?: { b?: number } }></code>" },
      { label: 'td', content: "<code>{ a: { b: number } }</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>ClassPropertyTypes&lt;T></code>" },
      { label: 'td', content: "<code>ClassPropertyTypes&lt;Service></code>" },
      { label: 'td', content: "<code>{ endpoint: string; timeout: number }</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>Equal&lt;X, Y></code>" },
      { label: 'td', content: "<code>Equal&lt;string, string></code>" },
      { label: 'td', content: "<code>true</code>" }
      ]
    }
    ]
  }
]

export default meta
