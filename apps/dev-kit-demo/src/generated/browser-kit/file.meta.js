// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'hr' },
  { label: 'h2', id: 'section-1', content: "title: File" },
  { label: 'h1', id: 'section-2', content: "File" },
  { label: 'p', content: "Browser file helpers for base64 conversion and validation, magic-number file type checks, image dimension reading, and file downloads with progress callbacks." },
  { label: 'h2', id: 'section-3', content: "Base64 conversion, image info &amp; magic-number check" },
  { label: 'p', content: "Validate base64 strings, convert between <code>File</code> and <code>data:</code> URLs, read image dimensions, and compare real file headers with <code>isSameFileType</code>." },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { base64ToFile, fileToBase64, getImageInfo, isSameFileType, isValidBase64 } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> pngDataUrl</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> valid</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> isValidBase64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl)</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> fileA</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> base64ToFile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'pixel-a'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> fileB</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> base64ToFile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'pixel-b'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">dataUrl</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">sameType</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> await</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> Promise</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">all</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  fileToBase64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA),</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  getImageInfo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA),</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  isSameFileType</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA, fileB)</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">])</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ valid, dataUrlPrefix: dataUrl.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">slice</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">22</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">), info, sameType })</span></span></code></pre>", lang: "ts", meta: "demo=file-inspector", path: './codeblock/ce934d263acf.ts' },
  { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { base64ToFile, fileToBase64, getImageInfo, isSameFileType, isValidBase64 } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/browser-kit'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> pngDataUrl</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> valid</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> isValidBase64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl)</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> fileA</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> base64ToFile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'pixel-a'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> fileB</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> base64ToFile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(pngDataUrl, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'pixel-b'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span></span>\n<span class=\"line\"><span class=\"line-number\">10</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">dataUrl</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">sameType</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> await</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> Promise</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">all</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  fileToBase64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA),</span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  getImageInfo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA),</span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  isSameFileType</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(fileA, fileB)</span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">])</span></span>\n<span class=\"line\"><span class=\"line-number\">15</span></span>\n<span class=\"line\"><span class=\"line-number\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ valid, dataUrlPrefix: dataUrl.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">slice</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">22</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">), info, sameType })</span></span></code></pre>", lang: "js", path: './codeblock/ce934d263acf.js' },
  { label: 'h2', id: 'section-4', content: "API" },
  {
    label: 'table',
    children: [
    {
      label: 'tr',
      children: [
      { label: 'th', content: "Function" },
      { label: 'th', content: "Description" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>downloadFile(arg, filename?, onProgress?)</code>" },
      { label: 'td', content: "Trigger download from a <code>File</code>, <code>Blob</code>, or absolute URL with stream progress" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>getImageInfo(source)</code>" },
      { label: 'td', content: "Resolve <code>{ width, height }</code> for a <code>File</code>, <code>Blob</code>, or image URL" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>isValidBase64(str)</code>" },
      { label: 'td', content: "Validate raw base64 strings or <code>data:</code> URLs" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>base64ToFile(base64, filename?)</code>" },
      { label: 'td', content: "Convert base64 / <code>data:</code> URL into a <code>File</code>" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>fileToBase64(file)</code>" },
      { label: 'td', content: "Convert a <code>File</code> or <code>Blob</code> into a base64 <code>data:</code> URL" }
      ]
    },
    {
      label: 'tr',
      children: [
      { label: 'td', content: "<code>isSameFileType(...files)</code>" },
      { label: 'td', content: "Compare leading 8-byte magic numbers across files" }
      ]
    }
    ]
  }
]

export default meta
