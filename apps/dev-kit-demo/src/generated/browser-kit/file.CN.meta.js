// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'hr' },
  { label: 'h2', id: 'section-1', content: "title: 文件工具" },
  { label: 'h1', id: 'section-2', content: "文件工具" },
  { label: 'p', content: "浏览器端文件处理工具，涵盖 Base64 校验与转换、文件头魔数类型比对、图片尺寸读取以及带进度回调的文件下载。" },
  { label: 'h2', id: 'section-3', content: "Base64 互转、图片尺寸与魔数校验" },
  { label: 'p', content: "校验 Base64 字符串、在 <code>File</code> 与 <code>data:</code> URL 之间互转、读取图片宽高，以及用 <code>isSameFileType</code> 比对真实文件头。" },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { base64ToFile, fileToBase64, getImageInfo, isSameFileType, isValidBase64 } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> pngDataUrl</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> valid</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> isValidBase64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl)</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> fileA</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> base64ToFile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'pixel-a'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> fileB</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> base64ToFile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'pixel-b'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">dataUrl</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">sameType</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> await</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> Promise</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">all</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  fileToBase64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA),</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  getImageInfo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA),</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  isSameFileType</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA, fileB)</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">])</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ valid, dataUrlPrefix: dataUrl.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">slice</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">22</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">), info, sameType })</span></span></code></pre>", lang: "ts", meta: "demo=file-inspector", path: './codeblock/ce934d263acf.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { base64ToFile, fileToBase64, getImageInfo, isSameFileType, isValidBase64 } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> pngDataUrl</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> valid</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> isValidBase64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl)</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> fileA</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> base64ToFile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'pixel-a'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> fileB</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> base64ToFile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'pixel-b'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">dataUrl</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">sameType</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> await</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> Promise</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">all</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  fileToBase64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA),</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  getImageInfo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA),</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  isSameFileType</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA, fileB)</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">])</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ valid, dataUrlPrefix: dataUrl.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">slice</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">22</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">), info, sameType })</span></span></code></pre>", lang: "js", path: './codeblock/ce934d263acf.js' },
  { label: 'h2', id: 'section-4', content: "API" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "函数" },
      { label: 'th', content: "说明" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>downloadFile(arg, filename?, onProgress?)</code>" },
      { label: 'td', content: "下载 <code>File</code>、<code>Blob</code> 或远程 URL，支持流式进度回调" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>getImageInfo(source)</code>" },
      { label: 'td', content: "读取 <code>File</code>、<code>Blob</code> 或图片 URL 的 <code>{ width, height }</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>isValidBase64(str)</code>" },
      { label: 'td', content: "校验裸 Base64 字符串或 <code>data:</code> URL 是否合法" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>base64ToFile(base64, filename?)</code>" },
      { label: 'td', content: "将 Base64 / <code>data:</code> URL 转为 <code>File</code> 对象" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>fileToBase64(file)</code>" },
      { label: 'td', content: "将 <code>File</code> 或 <code>Blob</code> 转为 Base64 <code>data:</code> URL" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>isSameFileType(...files)</code>" },
      { label: 'td', content: "基于前 8 字节文件头魔数判断多个文件真实类型是否一致" }
      ]
    }
    ]
  }
]

export default meta
