// 本文件由 @greypan/md-to-comp 生成，请勿手动编辑。
// source of truth：input 目录下的 markdown —— 示例代码与 API 表的名称/说明/类型/默认值都在那一份里。
// 重新生成：跑一次宿主构建（生成挂在 md-to-comp 的 Vite 插件上）。

export type ExampleApiColumnKind = 'name' | 'code' | 'html'

export interface ExampleApiColumn {
  title: string
  kind: ExampleApiColumnKind
}

export interface ExampleApiTableSection {
  kind: 'table'
  key: string
  title: string
  columns: ExampleApiColumn[]
  rows: string[][]
}

export interface ExampleApiProseSection {
  kind: 'prose'
  key: string
  title: string
  html: string
}

export type ExampleApiSection = ExampleApiTableSection | ExampleApiProseSection

export interface Sample {
  id: string | null
  title: string
  descriptionHtml: string
  html: { react: string; vue: string }
  demoKey: string | null
}

export interface ExampleDoc {
  component: string
  tag: string
  introHtml: string
  samples: Sample[]
  api: ExampleApiSection[]
}

export const exampleDocs: ExampleDoc[] = [
  {
    "component": "autocomplete",
    "tag": "web-ui-autocomplete",
    "introHtml": "<p>可输入并过滤候选的单值选择器：输入文本按 <code>option</code> 的 label 过滤候选，选中后把 label 回填到 input，并把该项的 value 暴露为只读的 <code>selected-value</code>。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "placeholder",
            "<p>input 占位文本。</p>",
            "string",
            "''"
          ],
          [
            "borderless",
            "<p>ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。</p>",
            "boolean",
            "false"
          ],
          [
            "disabled",
            "<p>禁用态，不可输入、不可展开下拉。</p>",
            "boolean",
            "false"
          ],
          [
            "readonly",
            "<p>只读态：不可输入、不可展开下拉。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验。</p>",
            "boolean",
            "false"
          ],
          [
            "portal",
            "<p>在 theme-owned overlay root 中渲染下拉 panel。</p>",
            "boolean",
            "false"
          ],
          [
            "no-scroll-lock",
            "<p>打开时不锁定页面滚动。</p>",
            "boolean",
            "false"
          ],
          [
            "allow-custom-value",
            "<p>允许 Enter 提交不在候选中的输入原文。</p>",
            "boolean",
            "false"
          ],
          [
            "overlayContainer",
            "<p>显式 Portal 容器（property，不是 attribute）。</p>",
            "OverlayContainer",
            "—"
          ],
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "aria-label",
            "<p>无障碍名称。</p>",
            "string | null",
            "null"
          ],
          [
            "aria-labelledby",
            "<p>无障碍名称引用。</p>",
            "string | undefined",
            "—"
          ],
          [
            "filter",
            "<p>候选过滤模式：<code>contains</code>（默认）、<code>prefix</code> 或 <code>none</code>。</p>",
            "FilterMode",
            "'contains'"
          ],
          [
            "value",
            "<p>当前输入文本，也是表单提交值。</p>",
            "string",
            "''"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>输入时触发，<code>value</code> 为当前文本。</p>"
          ],
          [
            "change",
            "<p>选中候选或提交 custom value 时触发。</p>"
          ],
          [
            "focus",
            "<p>trigger 获得焦点时触发。</p>"
          ],
          [
            "blur",
            "<p>trigger 失去焦点时触发。</p>"
          ],
          [
            "open-change",
            "<p>下拉 panel 开合，<code>detail.open</code> 为当前状态。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "trigger",
            "<p>自定义触发区域内容，替换默认 input。</p>"
          ],
          [
            "default",
            "<p>投影 <code>&lt;web-ui-option></code> 候选。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "focus()",
            "<p>聚焦当前 trigger：<code>web-ui-input</code> / <code>web-ui-textarea</code> trigger 把焦点交给内部原生控件，没有自己的 focus 重定向的自定义 trigger 则聚焦 trigger 元素自身。</p>"
          ],
          [
            "blur()",
            "<p>让当前 trigger 失焦。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>键入时按 label 过滤候选（<code>contains</code> 或 <code>prefix</code>，<code>none</code> 关闭过滤）。没有匹配项时下拉 panel 保持关闭；删除字符后重新出现匹配项时，panel 会再次打开。选择 option 时文本回填为该项 label，<code>selected-value</code> 暴露该项的 value；<code>change</code> 在选择提交时触发。支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航。</p>\n<p>Portal panel 创建时会镜像 host 上解析后的这些变量；更新 host 后需重新打开 Portal panel 才会生效。</p>"
      },
      {
        "kind": "prose",
        "key": "trigger",
        "title": "trigger",
        "html": "<p>默认 trigger 是 shadow 内的 <code>web-ui-input</code>。把任意可编辑组件放进 <code>trigger</code> slot 即可替换它——包装 div 继续承载 combobox ARIA，并以 <code>data-custom-trigger</code> 标记当前使用自定义 trigger，overlay 始终以 trigger 元素为锚点。组件的 <code>focus()</code> / <code>blur()</code> 委托到当前生效的 trigger：<code>web-ui-input</code> 与 <code>web-ui-textarea</code> 会把焦点落到内部原生控件；自定义 trigger 没有自己的 focus 重定向时，聚焦 trigger 元素自身。</p>\n<pre><code class=\"language-html\">&lt;web-ui-autocomplete placeholder=\"描述问题\">\n  &lt;web-ui-textarea slot=\"trigger\" rows=\"3\">&lt;/web-ui-textarea>\n  &lt;web-ui-option value=\"bug\" label=\"缺陷\">&lt;/web-ui-option>\n  &lt;web-ui-option value=\"feature\" label=\"需求\">&lt;/web-ui-option>\n&lt;/web-ui-autocomplete>\n</code></pre>\n<p>自定义 trigger 与默认 trigger 共用同一份契约：字符串 <code>value</code> 承载文本、可聚焦，并派发组件委托监听的事件（<code>input</code>、<code>click</code>、<code>focus</code>、<code>blur</code>）。<code>web-ui-input</code> 与 <code>web-ui-textarea</code> 开箱即用；自定义元素只要暴露字符串 <code>value</code> property 即可接入。包装 div 不占 tab 位（<code>tabindex=\"-1\"</code>）：顺序焦点归 trigger 自身，自定义 trigger 必须可聚焦，键盘用户才能到达 combobox。</p>\n<p>多行 trigger（可编辑元素为 <code>&lt;textarea></code>）保留 Enter 换行语义：Enter 不会选中高亮项，也不会提交 custom value，关闭 panel 用 Escape 或 blur。选择 option 仍会把该项 label 回写到 trigger。单行自定义 trigger 保持默认的 Enter 语义。panel 打开时 ArrowUp/ArrowDown 适用同一例外：方向键移动文本光标而不导航候选，该状态下键盘无法导航 option——用指针点击选择。panel 关闭时 ArrowDown/ArrowUp 仍可打开 panel。</p>\n<p>启用 <code>allow-custom-value</code> 后，无匹配且无活动 option 时，Enter 会把当前输入原文作为 custom value 提交并保持 panel 关闭；<code>change</code> 会触发，<code>selected-value</code> 保持为空。组件不会自动创建 option，也不会 trim 原文。命中禁用 option 的文本不会绕过禁用语义，也不会派生为已选 option。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-autocomplete-max-width",
            "<p>下拉框最大宽度</p>",
            "500px"
          ],
          [
            "--wui-autocomplete-max-height",
            "<p>下拉滚动区域最大高度</p>",
            "200px"
          ],
          [
            "--wui-overlay-min-width",
            "<p>下拉框最小宽度</p>",
            "200px"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>键入时按 label 过滤候选，没有匹配项时 panel 保持关闭；下拉 panel 的开合通过 <code>open-change</code> 通知。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-autocomplete</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"选择框架\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onChange</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vue\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Vue\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"react\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"React\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svelte\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Svelte\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-autocomplete</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-autocomplete</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"选择框架\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"onChange\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vue\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Vue\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"react\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"React\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svelte\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Svelte\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-autocomplete</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onChange</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Event</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> select</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> event.currentTarget </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">as</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> HTMLElement</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> &#x26;</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(select.value)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "自定义 trigger",
        "descriptionHtml": "<p>把可编辑组件放进 <code>trigger</code> 插槽即可替换默认 input。多行 trigger 保留 Enter 换行语义，关闭 panel 改用 Escape 或 blur。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-autocomplete</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"描述问题\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> filter</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"none\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-textarea</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> rows</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"3\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-textarea</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"bug\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"缺陷\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"feature\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"需求\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-autocomplete</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-autocomplete</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"描述问题\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> filter</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"none\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-textarea</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> rows</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"3\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-textarea</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"bug\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"缺陷\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"feature\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"需求\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-autocomplete</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "允许自定义值",
        "descriptionHtml": "<p>开启 <code>allow-custom-value</code> 后，无匹配且无活动项时 Enter 会把输入原文作为 custom value 提交，<code>selected-value</code> 保持为空。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-autocomplete</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> allow-custom-value</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入或选择 label\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-autocomplete</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-autocomplete</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> allow-custom-value</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入或选择 label\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-autocomplete</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "avatar",
    "tag": "web-ui-avatar",
    "introHtml": "<p>avatar，支持图片加载失败与无图片时回退到名称首字母，避免在图片缺位处留下空洞。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "src",
            "<p>图片 URL；留空或加载失败时回退。</p>",
            "string",
            "''"
          ],
          [
            "alt",
            "<p>图片替代文本。</p>",
            "string",
            "''"
          ],
          [
            "name",
            "<p>展示名称，用于首字母回退。</p>",
            "string",
            "''"
          ],
          [
            "size",
            "<p>avatar 边长（px）。</p>",
            "number",
            "40"
          ],
          [
            "shape",
            "<p>形状：<code>circle</code>（默认）或 <code>square</code>。</p>",
            "'circle' | 'square'",
            "'circle'"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>图片加载失败时的降级内容，替代默认首字母。</p>"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>传入 <code>src</code> 时按图片渲染，<code>alt</code> 作为图片替代文本，<code>size</code> 决定 avatar 边长。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-avatar</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> src</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/avatars/grey.png\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> alt</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Grey\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">48</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-avatar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-avatar</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> src</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/avatars/grey.png\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> alt</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Grey\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"48\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-avatar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "首字母回退",
        "descriptionHtml": "<p>没有 <code>src</code>、或图片加载失败时，组件从 <code>name</code> 取首字母渲染回退 avatar。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-avatar</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Grey Pan\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">40</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-avatar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-avatar</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Ada Lovelace\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">40</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-avatar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-avatar</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Grey Pan\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"40\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-avatar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-avatar</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Ada Lovelace\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"40\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-avatar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "形状与降级内容",
        "descriptionHtml": "<p><code>shape</code> 控制圆形与方形；<code>default</code> 插槽在图片加载失败时替代默认的首字母回退。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-avatar</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> src</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/broken.png\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> shape</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"square\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">48</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideUser}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-avatar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-avatar</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> src</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/broken.png\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> shape</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"square\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"48\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideUser\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-avatar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideUser } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "back-top",
    "tag": "web-ui-back-top",
    "introHtml": "<p>back top button：滚动超过阈值后出现在角落，点击或按 Enter 平滑 back top；也可以挂到自定义滚动容器内。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "scroll-behavior",
            "<p>滚动行为：<code>smooth</code>（默认）或 <code>auto</code>。</p>",
            "'smooth' | 'auto'",
            "'smooth'"
          ],
          [
            "visible",
            "<p>当前可见状态，由滚动位置驱动。</p>",
            "boolean",
            "false"
          ],
          [
            "scrollTarget",
            "<p>滚动容器，<code>window</code>（默认）或 <code>HTMLElement</code>（property）。</p>",
            "HTMLElement | Window",
            "window"
          ],
          [
            "threshold",
            "<p>显示 button 的滚动阈值（px）。</p>",
            "number",
            "200"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>自定义 button 内容。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "toTop()",
            "<p>滚动回顶部，行为由 <code>scroll-behavior</code> 决定。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "定位",
        "title": "定位",
        "html": "<p><code>scrollTarget</code> 为 <code>window</code> 时 button 固定在视口角落；为 <code>HTMLElement</code> 时需将元素放置在容器内部，button 通过 <code>position: sticky</code> 悬浮于容器底部角落。偏移量沿用 <code>--wui-back-top-top/right/bottom/left</code> CSS 变量。</p>\n<p>角色：<code>button</code>，键盘 Enter 触发 back top。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-back-top-position",
            "<p>CSS 定位</p>",
            "fixed"
          ],
          [
            "--wui-back-top-z-index",
            "<p>层级</p>",
            "var(--wui-layer-auxiliary, 20)"
          ],
          [
            "--wui-back-top-top",
            "<p>上偏移</p>",
            "auto"
          ],
          [
            "--wui-back-top-right",
            "<p>右偏移</p>",
            "20px"
          ],
          [
            "--wui-back-top-bottom",
            "<p>下偏移</p>",
            "20px"
          ],
          [
            "--wui-back-top-left",
            "<p>左偏移</p>",
            "auto"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>默认跟随页面滚动（<code>scrollTarget</code> 为 <code>window</code>），超过 <code>threshold</code> 后显示。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> threshold</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">200</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :threshold</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"200\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "滚动行为",
        "descriptionHtml": "<p><code>scroll-behavior</code> 为 <code>auto</code> 时点击立即到位，不播放平滑滚动动画。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> scroll-behavior</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"auto\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> scroll-behavior</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"auto\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "自定义滚动容器",
        "descriptionHtml": "<p>把 <code>scrollTarget</code> 指向自己的滚动容器后，button 以 <code>position: sticky</code> 悬浮在容器右下角，只随该容器滚动出现。<code>scrollTarget</code> 是 element 属性，需要在挂载后赋值。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> scrollBoxRef</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">null</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> backTopRef</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">null</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">useEffect</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (scrollBoxRef.current </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">&#x26;&#x26;</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> backTopRef.current) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    backTopRef.current.scrollTarget </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> scrollBoxRef.current</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}, [])</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{scrollBoxRef} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"scroll-box\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{backTopRef} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">threshold</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">300</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"scrollBox\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"scroll-box\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"backTop\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :threshold</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"300\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { onMounted, useTemplateRef } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> scrollBox</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useTemplateRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'scrollBox'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> backTop</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useTemplateRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'backTop'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onMounted</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (scrollBox.value </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">&#x26;&#x26;</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> backTop.value) backTop.value.scrollTarget </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> scrollBox.value</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "自定义内容",
        "descriptionHtml": "<p>默认插槽替换 button 内容，交互语义仍由组件提供。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>back top&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>back top&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "badge",
    "tag": "web-ui-badge",
    "introHtml": "<p>badge / 通知计数：把 <code>count</code> 角标叠加在默认插槽内容的一角，<code>dot</code> 模式只显示一个圆点。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "count",
            "<p>显示数字。</p>",
            "number",
            "0"
          ],
          [
            "max",
            "<p>数字上限，超过时显示 <code>max+</code>。</p>",
            "number",
            "99"
          ],
          [
            "dot",
            "<p>点模式，只显示圆点不显示数字。</p>",
            "boolean",
            "false"
          ],
          [
            "show-zero",
            "<p><code>count</code> 为 0 时也显示。</p>",
            "boolean",
            "false"
          ],
          [
            "badge-hidden",
            "<p>完全隐藏 badge。</p>",
            "boolean",
            "false"
          ],
          [
            "offset-x",
            "<p>水平偏移（px）。</p>",
            "number",
            "0"
          ],
          [
            "offset-y",
            "<p>垂直偏移（px）。</p>",
            "number",
            "0"
          ],
          [
            "placement",
            "<p>badge 位置：<code>top-right</code>（默认）、<code>top-left</code>、<code>bottom-right</code>、<code>bottom-left</code>。</p>",
            "'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'",
            "'top-right'"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>被装饰的内容，badge 叠加在它的一角。</p>"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>默认插槽是要装饰的内容，<code>count</code> 超过 <code>max</code> 时显示 <code>max+</code>。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-badge</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> count</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideBell} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">22</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-badge</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-badge</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> count</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">128</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">max</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">99</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideBell} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">22</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-badge</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-badge</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :count</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"5\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideBell\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"22\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-badge</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-badge</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :count</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"128\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :max</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"99\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideBell\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"22\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-badge</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideBell } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "点模式与零值",
        "descriptionHtml": "<p><code>dot</code> 只显示圆点而不显示数字；<code>show-zero</code> 让 <code>count</code> 为 0 时也显示，<code>badge-hidden</code> 完全隐藏。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-badge</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> dot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>消息&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-badge</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-badge</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> count</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">show-zero</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>草稿&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-badge</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-badge</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> dot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>消息&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-badge</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-badge</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :count</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> show-zero</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>草稿&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-badge</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "位置与偏移",
        "descriptionHtml": "<p><code>placement</code> 选择四个角，<code>offset-x</code> / <code>offset-y</code> 在此基础上做像素微调。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-badge</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> count</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">placement</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"bottom-left\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> offset-x</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">-</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">offset-y</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideMail} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">22</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-badge</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-badge</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :count</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"3\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placement</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"bottom-left\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :offset-x</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"-4\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :offset-y</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"4\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideMail\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"22\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-badge</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideMail } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "button-group",
    "tag": "web-ui-button-group",
    "introHtml": "<p>把若干个 <code>&lt;web-ui-button></code> 并成一组：组只负责成员之间的视觉连体（共享一块 glass 底、相邻 button 之间画分割线）与排列方向，不管选中态，也不改变成员各自的事件与表单行为。成员自己的 <code>size</code> 在组内被忽略。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "direction",
            "<p>成员的排列方向。</p>",
            "'horizontal' | 'vertical'",
            "'horizontal'"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>组内的 <code>&lt;web-ui-button></code> 成员。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>以内部派生的视觉上下文控制 button group 方向，不改写子 button 属性。</p>\n<p>在 button group 宿主上设置。该 token 控制两个方向上的长边：横排改的是分割线高度，竖排改的是宽度。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-button-group-divider-length",
            "<p>相邻 button 之间分割线的长度；短边恒为 1px，不随该值变化</p>",
            "20px"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": "basic",
        "title": "水平组",
        "descriptionHtml": "<p>组把成员的圆角收成整组一贯的胶囊形状，并在相邻 button 之间补齐分割线。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>左&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>右&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>左&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>右&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "basic"
      },
      {
        "id": "vertical",
        "title": "垂直组",
        "descriptionHtml": "<p><code>direction</code> 决定横排还是竖排，默认 <code>horizontal</code>；分割线长度由 <code>--wui-button-group-divider-length</code> 控制。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> direction</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vertical\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>上&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>下&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> direction</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vertical\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>上&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>下&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "vertical"
      }
    ]
  },
  {
    "component": "button",
    "tag": "web-ui-button",
    "introHtml": "<p>button 用于触发一个即时操作：提交表单、打开 dialog、切换状态。它不贡献表单值，\n<code>type=\"submit\"</code> / <code>type=\"reset\"</code> 时把原生 activation 转发给宿主 form。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "variant",
            "<p>视觉变体：<code>primary</code> / <code>secondary</code> / <code>ghost</code> / <code>danger</code> / <code>glass</code>。</p>",
            "'primary' | 'secondary' | 'ghost' | 'danger' | 'glass'",
            "'glass'"
          ],
          [
            "disabled",
            "<p>禁用态。禁用时不派发 click，也不参与表单提交。</p>",
            "boolean",
            "false"
          ],
          [
            "loading",
            "<p>加载态。与 <code>disabled</code> 一样阻断交互，并优先渲染 spinner。</p>",
            "boolean",
            "false"
          ],
          [
            "full",
            "<p>占满父容器宽度。</p>",
            "boolean",
            "false"
          ],
          [
            "icon",
            "<p>icon 模式：button 为正方形，默认插槽整体作为 icon。</p>",
            "boolean",
            "false"
          ],
          [
            "size",
            "<p>button 高度（CSS 长度，如 <code>28</code>、<code>32px</code>）。在 <code>web-ui-button-group</code> 内被忽略。</p>",
            "string",
            "''"
          ],
          [
            "type",
            "<p>原生 button 的 <code>type</code>：<code>button</code> / <code>submit</code> / <code>reset</code>。后两者把 activation 转发给宿主 form。</p>",
            "button | submit | reset",
            "'button'"
          ],
          [
            "aria-label",
            "<p>无障碍名称。icon button 必须提供，否则读屏器只会读出空 button。</p>",
            "string | null",
            "null"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>button 文字；<code>icon</code> 模式下整体作为 icon 内容。</p>"
          ],
          [
            "prefix",
            "<p>文字左侧的 icon 或标识。</p>"
          ],
          [
            "suffix",
            "<p>文字右侧的 icon 或标识。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p><code>submit</code> 和 <code>reset</code> 在 composed <code>click</code> 事件完成派发后，通过宿主的 form owner 转发到其原生 <code>&lt;form></code>；对这次 click 调用 <code>preventDefault()</code> 会取消该动作。内部 button 自身仍没有 form owner，因此 <code>SubmitEvent.submitter</code> 为 <code>null</code>。button 不向 <code>FormData</code> 贡献值。</p>\n<p>禁用、加载和 <code>formDisabled</code> 状态（包括祖先 <code>fieldset</code> 导致的禁用）都会阻止 <code>click</code> 事件。</p>\n<p><code>icon</code> 与 <code>loading</code> 同时开启时，button 只渲染 spinner，默认插槽 icon 不投影。默认 icon 几何保持正方形，<code>full</code> 或显式 width 除外。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-button-width",
            "<p>button 宽度</p>",
            "max-content"
          ],
          [
            "--wui-button-px",
            "<p>水平内边距</p>",
            "12px"
          ],
          [
            "--wui-button-gap",
            "<p>前缀/默认/后缀插槽间距</p>",
            "8px"
          ],
          [
            "--wui-button-color",
            "<p>button 文字颜色</p>",
            "随 variant"
          ],
          [
            "--wui-button-bg",
            "<p>button 背景颜色</p>",
            "随 variant"
          ],
          [
            "--wui-button-bg-hover",
            "<p>悬停背景颜色</p>",
            "随 variant"
          ],
          [
            "--wui-button-bg-active",
            "<p>按下背景颜色</p>",
            "随 variant"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "变体",
        "descriptionHtml": "<p><code>variant</code> 决定视觉层级。默认 <code>glass</code> 与页面背景融合，适合工具栏；<code>primary</code> 一页只应有一个。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Primary&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Secondary&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ghost\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Ghost&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"danger\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Danger&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"glass\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Glass&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Primary&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Secondary&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ghost\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Ghost&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"danger\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Danger&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"glass\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Glass&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "插槽",
        "descriptionHtml": "<p>默认插槽是 button 文字；<code>prefix</code> / <code>suffix</code> 放在文字两侧，icon 模式（<code>icon</code>）下默认插槽整体作为 icon。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  搜索</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideChevronRight}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    搜索</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideChevronRight\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideChevronRight, lucideSearch } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "icon 模式",
        "descriptionHtml": "<p><code>icon</code> 让 button 变成正方形 icon button，此时 <code>loading</code> 优先于插槽内容，只渲染 spinner。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"搜索\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> loading</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"加载中\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"搜索\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> loading</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"加载中\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideSearch } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "button group",
        "descriptionHtml": "<p><code>&lt;web-ui-button-group></code> 把多个 button 并成一组并画出相邻分割线；成员 button 的 <code>size</code> 在组内被忽略。</p>\n<p><code>direction</code> 选择横排或竖排，分割线长度由 <code>--wui-button-group-divider-length</code> 控制。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>左&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>右&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>左&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>右&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "checkbox-group",
    "tag": "web-ui-checkbox-group",
    "introHtml": "<p>一组 <code>&lt;web-ui-checkbox></code> 的容器：把成员的选中状态收敛成 <code>string[]</code>，变化时统一派发 <code>input</code> / <code>change</code>，并负责组级禁用与必填校验。属性形式的值是逗号分隔的字符串（<code>value=\"apple,cherry\"</code>），JS 侧读到的始终是数组。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "name",
            "<p>表单字段名，每个选中项各占一个同名字段。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用整组，并把禁用态下发给成员。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验：组为空时拦截原生提交。</p>",
            "boolean",
            "false"
          ],
          [
            "direction",
            "<p>成员排列方向。</p>",
            "'horizontal' | 'vertical'",
            "'vertical'"
          ],
          [
            "value",
            "<p>当前选中的值集合。</p>",
            "string[]",
            "[]"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>选中集合变化时触发，<code>currentTarget.value</code> 是新的数组。</p>"
          ],
          [
            "change",
            "<p>与 <code>input</code> 一起派发，语义上表示一次确认。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>组内的 <code>&lt;web-ui-checkbox></code> 成员。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>同步子 checkbox 的 <code>checked</code> 状态。<code>disabled</code> 提供继承的有效禁用状态，不改写子项自身的 <code>disabled</code> 属性。监听子项 <code>change</code> 事件。<code>direction</code> 传入非法值时回退为 <code>vertical</code>。</p>\n<p>在 group 元素本身，或同一个 <code>&lt;web-ui-theme></code> 作用域内的祖先元素上设置。theme 宿主会为自己的子树声明该间距阶，写在 <code>&lt;web-ui-theme></code> 元素之外的覆盖到不了 group。它的默认值现在经 <code>--wui-space-2</code> 解析，所以在 theme 宿主上覆盖该级会连带改变成员间距；显式设置这个 token 仍然优先于两者。</p>\n<pre><code class=\"language-css\">web-ui-checkbox-group {\n  --wui-checkbox-group-gap: 16px;\n}\n</code></pre>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-checkbox-group-gap",
            "<p>成员 checkbox 之间的间距</p>",
            "var(--wui-space-2)"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": "basic",
        "title": "多选组",
        "descriptionHtml": "<p>组的 <code>value</code> 是会选中的那些项，成员按自己是否在数组里决定选中。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { useState } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'react'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">picked</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setPicked</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'banana'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">])</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"fruit\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{picked} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setPicked</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"apple\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Apple&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"banana\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Banana&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"cherry\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Cherry&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"fruit\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"picked\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"onInput\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"apple\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Apple&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"banana\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Banana&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"cherry\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Cherry&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { WebUiCheckboxGroup, WebUiEvent } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> picked</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">([</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'banana'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">])</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onInput</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> WebUiEvent</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">WebUiCheckboxGroup</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'input'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  picked.value </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> event.currentTarget.value</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "basic"
      },
      {
        "id": "direction",
        "title": "排列方向",
        "descriptionHtml": "<p><code>direction</code> 决定成员横排还是竖排，默认 <code>vertical</code>；成员之间的间距由 <code>--wui-checkbox-group-gap</code> 控制。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> direction</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"horizontal\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{[</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'apple'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"apple\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Apple&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"banana\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Banana&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"cherry\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Cherry&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> direction</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"horizontal\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"['apple']\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"apple\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Apple&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"banana\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Banana&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"cherry\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Cherry&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "direction"
      },
      {
        "id": "disabled-required",
        "title": "组级禁用与必填",
        "descriptionHtml": "<p><code>disabled</code> 关掉整组的交互，这个禁用态会下发给成员；<code>required</code> 让原生表单校验在组为空时拦截提交。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"toppings\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{[</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'cheese'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">]} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">required</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"cheese\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>芝士&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"bacon\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>培根&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"toppings\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"['cheese']\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> required</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"cheese\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>芝士&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"bacon\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>培根&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "disabled-required"
      }
    ]
  },
  {
    "component": "checkbox",
    "tag": "web-ui-checkbox",
    "introHtml": "<p>单个 checkbox，声明 <code>role=\"checkbox\"</code>，支持 Enter / Space 切换；与原生 <code>&lt;form></code> 集成，选中时把 <code>value</code> 提交进 <code>FormData</code>。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "checked",
            "<p>选中状态。</p>",
            "boolean",
            "false"
          ],
          [
            "value",
            "<p>选中时提交的表单值。</p>",
            "string",
            "''"
          ],
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验。</p>",
            "boolean",
            "false"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>选中状态变化时触发。</p>"
          ],
          [
            "change",
            "<p>用户切换选中状态时触发。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>label 文本；为空时收掉 indicator 与 label 之间的间距。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>使用 <code>role=\"checkbox\"</code> 和 <code>aria-checked</code>。Enter/Space 键盘切换。</p>"
      },
      {
        "kind": "prose",
        "key": "布局",
        "title": "布局",
        "html": "<p>宿主是 inline-flex 盒，高度由内容撑开、不继承页面行高，因此不会在 indicator 上下留出多余缝隙；<code>--wui-selection-control-size</code>（<code>18px</code>）决定 indicator 宽高，宿主与相邻文字的对齐固定为 <code>vertical-align: middle</code>。<code>&lt;web-ui-radio></code> 共用同一套契约。indicator 与 label 之间的 10px 归 label 所有：default slot 没画出东西时（空着，或里面只放了一个视觉隐藏的无障碍名，例如 <code>.sr-only</code> 的 span）这段间距一并收起，宿主宽度就等于 indicator。空不空按 label 盒子的渲染宽度判定，而不是按 slot 被指派了节点判定——无障碍名正是「有指派、不画盒」的那一种；也不能用 <code>display: none</code> 收掉 label，那会把这个名字从无障碍树里拿掉。</p>"
      },
      {
        "kind": "prose",
        "key": "选中动画",
        "title": "选中动画",
        "html": "<p>对勾是 <code>@/icons</code> 里的描边资产，由嵌套的 <code>&lt;web-ui-icon></code> 渲染在 <code>&lt;web-ui-svg-draw-lines></code> 内，并带 <code>no-autoplay</code>，所以挂载时就已勾选的控件显示静态勾。勾选时线条从左侧尖端起按恒定笔速画出，时长取 <code>--wui-duration-trigger</code>（默认 160ms），在切换当下从已生效的主题解析，和 indicator 底色那条 transition 落在同一拍；取消时沿同一条路径收回到空白，而不是只淡出；主题范围为 <code>motion=\"reduced\"</code> 时两者都跳过，两个状态直接切换。描边颜色是 <code>--wui-color-on-control</code>，经 <code>&lt;web-ui-icon></code> 的 <code>--wui-icon-color</code> 传下去，因为勾选后它背后就是 <code>--wui-color-accent</code>。这个结构带来两条约束：资产必须保持描边（<code>fill: none</code> + <code>stroke: currentColor</code>），换成实心 icon dash 动画照跑却什么都不画，勾会直接出现；并且它按 <code>&lt;web-ui-icon></code> 自己的默认 18px 渲染，宿主够不到 icon shadow root 里的 <code>&lt;svg></code>，因此不随 <code>--wui-selection-control-size</code> 放大。</p>"
      },
      {
        "kind": "prose",
        "key": "未激活态",
        "title": "未激活态",
        "html": "<p>未选中 indicator 的底色取 <code>--wui-color-surface-control</code>（与中性 button 同一档控件底），深色模式下也能和 <code>--wui-color-page</code> 分辨开。触发区内任意位置（indicator、间距或右侧 slot label）被 hover 时，该底色再叠 6% 状态层。hover 只在 <code>(hover: hover) and (pointer: fine)</code> 设备上生效；没有按下态，已选中和禁用态保持各自底色。<code>&lt;web-ui-radio></code> 共用同一套状态。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>checked</code> 是控件状态，默认插槽是 label 文字。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> checked</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{agreed} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onChange</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setAgreed</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.checked)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  我已阅读并同意服务条款</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :checked</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"agreed\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"agreed = !agreed\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>我已阅读并同意服务条款&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> agreed</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "表单值",
        "descriptionHtml": "<p><code>value</code> 是选中时提交的值，<code>name</code> 是字段名，<code>required</code> 让原生表单校验在未选中时拦截提交。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"plan\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"pro\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> required</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  专业版</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"plan\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"pro\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> required</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>专业版&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "checkbox 组",
        "descriptionHtml": "<p><code>&lt;web-ui-checkbox-group></code> 统一管理成员的选中与表单提交；<code>direction</code> 控制排列方向。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"fruits\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{selected} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setSelected</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"apple\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>苹果&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"banana\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>香蕉&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"cherry\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    樱桃</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-checkbox-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"fruits\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"selected\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"selected = $event.currentTarget.value\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"apple\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>苹果&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"banana\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>香蕉&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"cherry\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>樱桃&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-checkbox-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> selected</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">[]>([])</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "collapse",
    "tag": "web-ui-collapse",
    "introHtml": "<p>collapse panel 把「trigger」与「内容」放在同一行内：trigger 是 default slot，内容放在 <code>content</code> slot。\n开合是严格受控的——组件只派发 <code>open-change</code> 请求，是否真的展开由 Consumer 回写 <code>open</code> 决定。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "open",
            "<p>展开状态。严格受控，唯一状态源；组件只派发请求，不自己改。</p>",
            "boolean",
            "false"
          ],
          [
            "disabled",
            "<p>禁用触发：点击忽略，<code>aria-disabled</code> 写到 trigger 元素上；已展开内容保持现状。</p>",
            "boolean",
            "false"
          ],
          [
            "horizontal",
            "<p>水平方向：沿宽度展开，默认沿高度。</p>",
            "boolean",
            "false"
          ],
          [
            "keep-mounted",
            "<p>关闭稳态保持内容 <code>inert</code> 而非 <code>hidden</code>，保留滚动位置与可测量性。</p>",
            "boolean",
            "false"
          ],
          [
            "peek",
            "<p>关闭稳态露出的尺寸（CSS 长度，如 <code>120px</code>、<code>6rem</code>）。设置后语义等同 <code>keep-mounted</code>。</p>",
            "string | null",
            "null"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "open-change",
            "<p>开合请求。<code>detail.open</code> 是请求的目标状态；Consumer 回写 <code>open</code> 才真正生效。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>trigger。可放原生 <code>button</code> 或任意 <code>web-ui-*</code> 组件。</p>"
          ],
          [
            "content",
            "<p>collapse content。关闭态按 <code>keep-mounted</code> / <code>peek</code> 决定是 <code>hidden</code> 还是 <code>inert</code>。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "show()",
            "<p>展开：把 <code>open</code> 置为 <code>true</code>；程序式变更不派发 <code>open-change</code>。</p>"
          ],
          [
            "close()",
            "<p>收起：把 <code>open</code> 置为 <code>false</code>；程序式变更不派发 <code>open-change</code>。</p>"
          ],
          [
            "toggle()",
            "<p>按当前 <code>open</code> 切换展开 / 收起。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<pre><code class=\"language-html\">&lt;web-ui-collapse>\n  &lt;button type=\"button\">点击切换&lt;/button>\n  &lt;div slot=\"content\">collapse content&lt;/div>\n&lt;/web-ui-collapse>\n</code></pre>\n<p>初始即带 <code>open</code> attribute 时直接落稳态，不播动画。支持嵌套 collapse。</p>"
      },
      {
        "kind": "prose",
        "key": "trigger 语义",
        "title": "trigger 语义",
        "html": "<p>交互语义完全来自 default slot 放入的元素——原生 <code>&lt;button></code>、<code>&lt;web-ui-button></code> 或其他可交互元素原生提供 Enter/Space 激活与焦点。collapse 把 <code>aria-expanded</code> / <code>aria-controls</code>（指向内容 track）与 <code>aria-disabled</code> 回写到 trigger slot 的首个 assigned element。trigger 请使用可交互元素：纯 <code>&lt;span></code> 可点击但没有键盘/焦点语义。</p>"
      },
      {
        "kind": "prose",
        "key": "关闭稳态语义",
        "title": "关闭稳态语义",
        "html": "<p>Consumer的 light DOM 永不移动或卸载。默认关闭稳态在内部内容容器上设 <code>hidden</code>；<code>keep-mounted</code> 时内部容器标记 <code>inert</code>，保留在收起 track 内可测量。</p>"
      },
      {
        "kind": "prose",
        "key": "peek（只露一部分）",
        "title": "peek（只露一部分）",
        "html": "<p>设置 <code>peek</code> 后关闭稳态不再收拢到 0，而是沿动画轴露出内容的头部 <code>peek</code> 长度（<code>horizontal</code> 时改为宽度）：track 保持在内容高度，裁剪长度落在内部容器上。其语义等同 <code>keep-mounted</code>——内容保留挂载但被 <code>inert</code> 阻断，被裁掉的部分不可聚焦、不可点击。内容本身不足 <code>peek</code> 时按内容实际尺寸收起，不留空白。由于固定长度与自适应高度无法由 CSS 插值，<code>peek</code> ↔ 展开这两个方向改为读出像素后以显式长度驱动（每次开合测量一次）；其余动画路径仍是零测量的 grid <code>fr</code> 过渡。</p>\n<pre><code class=\"language-html\">&lt;web-ui-collapse peek=\"120px\">\n  &lt;button type=\"button\">点击切换&lt;/button>\n  &lt;div slot=\"content\">很长的内容——关闭时只露出前 120px&lt;/div>\n&lt;/web-ui-collapse>\n</code></pre>"
      },
      {
        "kind": "prose",
        "key": "边缘渐隐",
        "title": "边缘渐隐",
        "html": "<p>露出区域的裁剪边缘自带一段 alpha 渐变（<code>horizontal</code> 时改为右边），让被裁掉的部分柔和过渡到背景而不是硬切。渐变长度由 <code>peek</code> 推导，不需要也没有第二个属性可调——需要时用 CSS 变量微调：</p>\n<p>渐变带由两层组成，配对方式与 layout header 的晕染一致：上面那条 alpha 渐隐之外，同一条带上再叠一层真实的 <code>backdrop-filter</code> 模糊，被裁掉的内容因此是被<strong>糊掉</strong>的，而不只是被调成半透明。模糊强度由本盒自己的 <code>mask-image</code> 调制——从带子起点为 0 升到后半段满强度、再在裁剪边缘前回到 0：起点不为 0 会在「突然开始模糊」处留一条接缝，末端不为 0 则会一路糊到裁剪边界。展开态活动长度为 0，各色标塌缩到 100% 而末位色标是全透明，于是这一层什么都不画。</p>\n<p>比例设为 <code>0</code> 即关闭渐隐。推导是纯 CSS 的 <code>calc(peek * ratio)</code>：<code>peek</code> 用 rem 时渐变长度自动跟随根字号缩放，JS 侧不需要做任何单位解析。已知限制：<code>peek</code> 取百分比时推导结果不是长度、无法被注册属性插值，会静默回落为「无渐隐」，此时请用 <code>--wui-collapse-peek-edge</code> 显式指定长度。</p>\n<p>渐变是四段「先陡后缓」而非线性：主体全黑延伸到渐变带起点后，前 30% 距离就降到 60% alpha，65% 处 26%，末端落到边缘颜色。线性渐变的 alpha 在带子前 40% 几乎贴着 1.0，人眼感知到的虚化远短于声明长度——把下降前置后，带子从起点就明显发虚，同样长度的感知长度接近翻倍。</p>\n<p>渐变带位置用百分比声明、相对容器的<strong>当前渲染高度</strong>（即 <code>max-height</code> 动画的那个高度），因此收起动画期间渐变带逐帧跟随裁剪边缘移动，<code>mask-image</code> 字符串本身无需插值。渐变带长度由注册的 <code>&lt;length></code> 自定义属性驱动，随开合动画平滑淡入淡出，而不是等收起动画落稳态才突然出现。</p>\n<pre><code class=\"language-html\">&lt;!-- 调强渐隐：比例 0.5 → 120px peek 配 60px 渐隐 -->\n&lt;web-ui-collapse peek=\"120px\" style=\"--wui-collapse-peek-edge-ratio: 0.5\">\n  &lt;button type=\"button\">点击切换&lt;/button>\n  &lt;div slot=\"content\">很长的内容——120px 露出区域的底部渐隐更强&lt;/div>\n&lt;/web-ui-collapse>\n</code></pre>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-collapse-peek-edge-ratio",
            "<p>渐变长度占 <code>peek</code> 的比例</p>",
            "0.4"
          ],
          [
            "--wui-collapse-peek-edge-max",
            "<p>长度上限，避免大 <code>peek</code> 算出过长的虚化带</p>",
            "112px"
          ],
          [
            "--wui-collapse-peek-edge",
            "<p>显式指定长度，优先于推导值</p>",
            "—"
          ],
          [
            "--wui-collapse-peek-edge-color",
            "<p>渐变末端颜色（需带 alpha，mask 按 alpha 解析）</p>",
            "transparent"
          ],
          [
            "--wui-collapse-peek-edge-blur",
            "<p>同一条渐变带上背景模糊的半径</p>",
            "4px"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "已知限制",
        "title": "已知限制",
        "html": "<p><code>horizontal</code> 动画期间内容随宽度变化 reflow。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础用法",
        "descriptionHtml": "<p>trigger 可以是任何可交互元素（原生 <code>button</code>、<code>web-ui-button</code> 等），内容可以是任意节点。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-collapse</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onopen-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.open)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"button\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"w-full text-left\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>点击展开&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>这是 collapse content，支持任意内容。&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-collapse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-collapse</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = $event.detail.open\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"button\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"w-full text-left\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>点击展开&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>这是 collapse content，支持任意内容。&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-collapse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "keep-mounted",
        "descriptionHtml": "<p>默认关闭态把内容 <code>hidden</code>（脱离渲染与可访问性树）。<code>keep-mounted</code> 改为 <code>inert</code>，\n保留滚动位置与可测量性，代价是关闭态仍占布局。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-collapse</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> keep-mounted</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"button\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"w-full text-left\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>展开长列表&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    {Array.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">from</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ length: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">20</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }, (</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">_</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">i</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> key</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{i}>列表项 {i </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">+</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> 1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    ))}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-collapse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-collapse</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> keep-mounted</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"button\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"w-full text-left\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>展开长列表&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> v-for</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"index in 20\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :key</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"index\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>列表项 {{ index }}&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-collapse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "peek",
        "descriptionHtml": "<p><code>peek</code> 让关闭态只露出固定长度的一段，其余被裁剪且不可交互，用来提示「下面还有内容」。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-collapse</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> peek</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"80px\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"button\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"w-full text-left\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>展开长文本&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>关闭时只露出前 80px。&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-collapse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-collapse</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> peek</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"80px\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"button\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"w-full text-left\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>展开长文本&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>关闭时只露出前 80px。&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-collapse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "context-menu",
    "tag": "web-ui-context-menu",
    "introHtml": "<p>右键上下文 menu：第一个子元素是触发区域，其余子元素是 menu item（<code>&lt;web-ui-dropdown-item></code> 等）。打开期间 menu 是模态的，点空白只会关掉 menu。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "disabled",
            "<p>右键与 <code>openAt()</code> 都不打开 menu，不做视觉置灰。</p>",
            "boolean",
            "false"
          ],
          [
            "no-scroll-lock",
            "<p>打开时允许背景滚动。</p>",
            "boolean",
            "false"
          ],
          [
            "long-press",
            "<p>触屏长按打开 menu（opt-in；鼠标始终走 <code>contextmenu</code>）。</p>",
            "boolean",
            "false"
          ],
          [
            "long-press-delay",
            "<p>长按触发前需按住的时长（ms）。</p>",
            "number",
            "500"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "open-change",
            "<p>menu 开合，<code>detail.open</code> 为当前状态。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>第一个元素是触发区域，其余元素是 menu item。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "openAt(x, y)",
            "<p>在视口坐标 <code>(x, y)</code> 处打开 menu；命令式打开不派发 <code>open-change</code>。</p>"
          ],
          [
            "close()",
            "<p>关闭 menu；命令式关闭不派发 <code>open-change</code>。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-context-menu-safe-area-bottom",
            "<p>触屏 menu 需要让开的底部 inset</p>",
            "env(safe-area-inset-bottom, 0px)"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>通过 <code>contextmenu</code> 事件打开。menu item：<code>web-ui-dropdown-item</code>、<code>web-ui-dropdown-divider</code>、<code>web-ui-dropdown-header</code>。支持键盘导航和 submenu hover。</p>\n<p>menu 打开期间是模态的：它渲染进浏览器 top layer 里一个透明的 <code>&lt;dialog></code>，下层页面拿不到任何命中测试。因此「点外面」只会关掉 menu，不会顺带把下面那一行、那个 checkbox、那个链接一起激活。scrim 刻意保持完全透明——它的职责是吃掉这次命中，不是给页面加一层 scrim。另有一处需要知道的代价：menu item 激活后约 160ms 的退场过渡里，scrim 已经提前出了 top layer，下层页面在这段时间重新可点，menu 的层级也退回普通流。</p>\n<p><code>long-press</code> 是 opt-in 且只针对触屏：指针按住 <code>long-press-delay</code>（默认 <code>500</code> ms，与平台原生长按一致）后打开 menu，走与右键完全相同的路径。它只响应 <code>pointerType === 'touch'</code>；按住期间位移超过 10px 即取消，因此滚动不会误开 menu。由于浏览器会把同一次按住也识别为原生手势，长按打开后引擎补发的 <code>contextmenu</code> 与 <code>click</code> 会被吸收，既不会重复打开，也不会把刚打开的 menu 立刻 light-dismiss 掉。</p>\n<p><code>long-press</code> 打开的 menu 从按点<strong>向下</strong>展开：上缘对齐按点 <code>y</code>、水平居中于按点 <code>x</code>，与 iOS / Android 原生长按 menu 的形态一致。下方空间不够时 panel 翻转到按点上方而不是跑出屏幕，两轴都会被夹回视口内，并让开 <code>--wui-context-menu-safe-area-bottom</code>，避免最下面一项落进 home indicator。分流依据是<strong>输入方式</strong>而非视口宽度：窄窗口里的鼠标右键仍然贴着光标左上角展开。两者只有水平对齐量不同 —— 定位走的是同一趟 <code>computePosition</code>，因此不会各自漂移。</p>\n<p><code>disabled</code> 只抑制 menu 行为：右键与 <code>openAt()</code> 都不打开 menu。它不会给 default slot 里的内容置灰或改色——组件自身根本不渲染 menu 面，没有可置灰的对象；禁用 context menu 也不等于禁用触发区。需要让禁用态在视觉上可读时，请在自己的内容上表达。</p>\n<p>menu 打开期间，Consumer可以安全地使用条件渲染（如 Vue <code>v-if</code>）切换、移动或删除 menu item，无需重新插入到宿主元素；portal 内的变更会自动 reconcile，关闭时框架锚点随元素迁回宿主，保证后续框架更新正常。</p>\n<p>关闭时，焦点会归还给 menu 打开前持焦的元素。这条是浏览器模态 dialog 自带的行为，而不是组件自己实现的——也正因如此，它只在 menu 还在 top layer 时才生效。menu item 激活是唯一会提前交还焦点的路径：在点击那一刻就还，退场过渡之后不再过问，于是 menu item 回调若把焦点移到别处（例如就地进入编辑态），焦点就留在那里了。关闭过程不会再把焦点从新的焦点目标上拽走，因此按 blur 提交的那类组件也不会因此提交一次没改过的编辑。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>在触发区域内右键即可打开，menu 从鼠标位置展开。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"context-zone\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>在此区域右键点击&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>粘贴&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"context-zone\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>在此区域右键点击&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>粘贴&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "触屏长按",
        "descriptionHtml": "<p><code>long-press</code> 让触屏按住 <code>long-press-delay</code> 毫秒后打开 menu，从按点向下展开；按住期间位移超过 10px 会取消。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-context-menu</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> long-press</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> long-press-delay</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">600</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"context-zone\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>按住我打开 menu&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>重命名&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>移动&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-context-menu</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> long-press</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :long-press-delay</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"600\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"context-zone\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>按住我打开 menu&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>重命名&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>移动&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "监听开合",
        "descriptionHtml": "<p><code>open-change</code> 通知 menu 开与关；关闭后焦点归还给打开前持焦的元素。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-context-menu</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onopen-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.open)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"context-zone\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>在此区域右键点击&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-context-menu</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"onOpenChange\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"context-zone\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>在此区域右键点击&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onOpenChange</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> CustomEvent</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;{ </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> boolean</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }>) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.open)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "dialog",
    "tag": "web-ui-dialog",
    "introHtml": "<p>模态 dialog，基于原生 <code>&lt;dialog></code> 的 <code>showModal()</code>；支持内置标题带、footer 与完全自绘的 <code>headless</code> 模式。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "open",
            "<p>dialog 可见性。</p>",
            "boolean",
            "false"
          ],
          [
            "closable",
            "<p>显示内置关闭 button。</p>",
            "boolean",
            "false"
          ],
          [
            "horizontal",
            "<p>Footer 操作按钮横向排列。</p>",
            "boolean",
            "false"
          ],
          [
            "no-scroll-lock",
            "<p>打开时不锁定页面滚动。</p>",
            "boolean",
            "false"
          ],
          [
            "no-backdrop-close",
            "<p>禁止点击 backdrop 关闭。</p>",
            "boolean",
            "false"
          ],
          [
            "no-escape-close",
            "<p>禁止按 Escape 关闭。</p>",
            "boolean",
            "false"
          ],
          [
            "controlled",
            "<p>Escape 与 backdrop 仅请求 <code>open=false</code>，由消费方回写。</p>",
            "boolean",
            "false"
          ],
          [
            "heading",
            "<p>标题文字，<code>header</code> 插槽为空时的回落（<code>headless</code> 下忽略）。</p>",
            "string",
            "''"
          ],
          [
            "headless",
            "<p>只保留 overlay 行为，不再渲染内置 header 带、内容区与 footer。</p>",
            "boolean",
            "false"
          ],
          [
            "dialog-label",
            "<p>内部原生 dialog 的 accessible name；<code>headless</code> 下必填。</p>",
            "string",
            "''"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "open-change",
            "<p>open 状态变化，<code>detail.open</code> 为请求的目标状态。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>正文内容。</p>"
          ],
          [
            "header",
            "<p>卡片顶部的 chrome 带，有内容时接管 <code>heading</code>。</p>"
          ],
          [
            "footer",
            "<p>底部操作区。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "showModal()",
            "<p>打开 dialog，等价于把 <code>open</code> 置为 <code>true</code>。</p>"
          ],
          [
            "close()",
            "<p>关闭 dialog，等价于把 <code>open</code> 置为 <code>false</code>。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p><code>header</code> 槽是卡片的 chrome 带：不参与滚动，自带水平 padding（<code>--wui-dialog-inline-padding</code>），内容不会贴到卡片内沿。<code>heading</code> 属性是它的 fallback——槽一旦有分配元素就整条接管，否则非空的 <code>heading</code> 渲染出 <code>.wui-dialog-heading</code>；两者都为空时整条带隐藏。</p>\n<p><code>default</code> 槽在两种模式下都承载正文。默认模式下它渲染进 <code>.desc</code>（卡片的内容区），与 <code>header</code> 带、<code>footer</code> 并列。<code>headless</code> 下整张卡片变成一个滚动层：<code>default</code> 槽渲染进 <code>.wui-dialog-content</code>，<code>header</code> 带、<code>.desc</code> 与 <code>footer</code> 一概不渲染，<code>heading</code> 一并失效。<code>headless</code> 与 <code>&lt;web-ui-drawer></code> 是同一套机制——显式布尔属性，不是「往某个插槽里塞东西」的 toggle。</p>\n<p>使用原生 <code>&lt;dialog></code>，<code>@cancel</code> 阻止默认关闭行为。除非存在 <code>no-escape-close</code>，否则 Escape 调用 <code>close()</code>；除非存在 <code>no-backdrop-close</code>，否则点击 backdrop 关闭。启用 <code>controlled</code> 后，两者都只派发关闭请求而不自关闭。</p>\n<p>启用 <code>closable</code> 后，默认模式与 <code>headless</code> 模式都会渲染内置关闭 button，且与 Escape、backdrop 点击走同一条关闭路径（<code>controlled</code> 对它同样生效）。两种模式的位置已统一：button 都绝对定位到卡片右上角，距卡片两沿的偏移由 <code>--wui-dialog-close-top</code> / <code>--wui-dialog-close-right</code> 控制（默认都是 <code>20px</code>；drawer 关闭 button 仍为 <code>16px</code>）。只有 <code>headless</code> 会把整卡换掉；默认模式下 <code>header</code> 带会为 button 留出避让，长内容不会钻到 button 下面。icon 与 drawer 关闭 button 同为 <code>ooui:close</code>。不启用 <code>closable</code> 时什么都不渲染——既没有 button，也没有多余的包裹层。</p>\n<blockquote>\n<p><strong>Escape 归属</strong>：Escape 由共享仲裁者统一判定，一次按键只关闭<strong>最内层</strong>的已打开 overlay（popover、select、autocomplete、dropdown、context-menu、drawer、dialog 都参与）。例如在 drawer 内打开 select，第一次 Escape 只关 select，第二次才关 drawer。互不嵌套的并列 overlay 按打开顺序关闭最上层。正在播退场过渡的 panel 仍在场上，也仍由它接住 Escape——但只要还有别的 overlay 开着，那一次按键仍然归该层，「一次按键关一层」不因此改变。<code>image-preview</code> 同样参与：它的原生 <code>&lt;dialog></code> 会登记进同一个仲裁者，Escape 按层级判定；组件的 <code>cancel</code> handler 只是拦掉原生的瞬时关闭，把 top layer 保留到退场过渡结束。</p>\n</blockquote>\n<blockquote>\n<p><strong>高度语义</strong>：本 token 限制的是内容区，不是整卡。<code>header</code> 带与 footer 仍由内容撑开，超出上限的部分在 <code>.desc</code> 内部滚动；整卡本身只由字面量 <code>100vh</code> / <code>100dvh</code> 兜底，接住「视口太矮、chrome 加内容区上限也放不下」的情况。要给<strong>整卡</strong>定上限的宿主仍需自行量出 chrome（卡片 block 内边距 + header 带 + 间距 + footer）并从 token 里减掉——Interweave 前端三个 dialog 分别减 142、142、158。不再需要这个数的是「让内容区滚起来」：改动前 <code>.desc</code> 既没有上限也没有 <code>overflow</code>，唯一能滚的是宿主自己撑出来的内层盒子，宿主想让它滚就必须自己算这个高度。</p>\n<p><strong><code>headless</code> 模式没有 <code>.desc</code></strong>，所以该 token 在这一档不生效。<code>headless</code> 下的 <code>default</code> 插槽被包进 <code>.wui-dialog-content</code>，滚动发生在这一层；卡片在内容装得下时仍贴合内容，装不下时由同一条字面量 <code>100vh</code> / <code>100dvh</code> 兜底。内置关闭 button 在内容滚动时保持 <code>--wui-dialog-close-top</code> / <code>--wui-dialog-close-right</code> 给出的位置不变。</p>\n</blockquote>"
      },
      {
        "kind": "prose",
        "key": "accessible name",
        "title": "accessible name",
        "html": "<p>设置了 <code>dialog-label</code> 时，内部原生 <code>&lt;dialog></code> 直接取它的 <code>aria-label</code>；否则在默认模式且 <code>header</code> 带可见时，取指向该带的 <code>aria-labelledby=\"wui-dialog-heading\"</code>。<code>headless</code> 没有可指向的内置标题，所以<strong>名字必须由 Consumer 提供</strong>——<code>dialog-label</code>，或自绘的可关联标题元素。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-dialog-width",
            "<p>dialog 宽度</p>",
            "360px"
          ],
          [
            "--wui-dialog-max-height",
            "<p>内容区（<code>.desc</code>）的最大高度，不是整卡高度。两套 fallback：基础规则 <code>90vh</code>，<code>@supports (height: 100dvh)</code> 内 <code>min(90vh, 90dvh)</code>——不支持 dvh 的引擎只拿到 <code>90vh</code>。整卡换算见下方说明</p>",
            "`90vh` / `min(90vh, 90dvh)`（dvh 引擎）"
          ],
          [
            "--wui-dialog-close-top",
            "<p><code>closable</code> button 距卡片顶部的偏移</p>",
            "20px"
          ],
          [
            "--wui-dialog-close-right",
            "<p><code>closable</code> button 距卡片右沿的偏移</p>",
            "20px"
          ],
          [
            "--wui-dialog-overlay-bg",
            "<p>backdrop 背景色</p>",
            "var(--wui-color-backdrop)"
          ],
          [
            "--wui-dialog-bg",
            "<p>玻璃卡片背景色，回退到 <code>rgb(248 248 248 / 0.92)</code></p>",
            "var(--wui-color-surface-overlay)"
          ],
          [
            "--wui-dialog-padding",
            "<p>卡片的 block 内边距。inline 分量不再作用于卡片：水平内边距移到了各分区（<code>.header</code> / <code>.desc</code> / <code>.wui-dialog-footer</code>），见 <code>--wui-dialog-inline-padding</code></p>",
            "20px 24px 24px"
          ],
          [
            "--wui-dialog-inline-padding",
            "<p><code>header</code> 带、内容区（<code>.desc</code>）与 footer 的水平内边距。卡片自身没有 inline padding，内容区的滚动口（其 border box）因此与卡片内沿重合——scrollbar 贴边——而内容仍保留这个内缩。默认取自 <code>--wui-space-6</code></p>",
            "24px"
          ],
          [
            "--wui-dialog-title-gap",
            "<p>标题下方间距</p>",
            "16px"
          ],
          [
            "--wui-dialog-desc-gap",
            "<p>正文内容下方间距</p>",
            "24px"
          ],
          [
            "--wui-dialog-desc-focus-padding",
            "<p>内容区<strong>block 轴</strong>预留的 focus-ring 余量。<code>.desc</code> 既是滚动容器，又因为有一条轴必须非 <code>visible</code> 而成了裁剪盒，所以紧贴其上下沿的控件，ring 会被 padding box 裁掉；这个余量覆盖 <code>5px</code> 的 ring（<code>offset: 2</code> + <code>width: 3</code>）。横向的 ring 余量改由 <code>--wui-dialog-inline-padding</code> 提供（24px ≫ 5px），所以本 token 只作用于 block 轴——原来的 inline 分量不再生效。成对负 margin 使 chrome 高度保持不变</p>",
            "6px"
          ],
          [
            "--wui-dialog-footer-gap",
            "<p>Footer button 间距</p>",
            "10px` / horizontal `12px"
          ],
          [
            "--wui-dialog-footer-justify",
            "<p>Footer <code>justify-content</code>；horizontal 模式下覆盖为 <code>flex-end</code> 可右对齐</p>",
            "`flex-end`（默认）/ `center`（horizontal）"
          ],
          [
            "--wui-dialog-scale-enter",
            "<p>进场缩放起点：由 <code>1.1</code> 收缩到 <code>1</code>，退场反向</p>",
            "1.1"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>open</code> 控制可见性，<code>heading</code> 是无 header 插槽时的标题回落，<code>closable</code> 渲染内置关闭 button。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onClick</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)}>打开 dialog&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dialog</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">heading</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"确认操作\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> closable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onopen-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.open)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除后无法恢复，确定继续吗？&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"footer\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"danger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onClick</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        删除</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dialog</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @click</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = true\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>打开 dialog&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dialog</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"确认操作\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> closable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = $event.detail.open\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除后无法恢复，确定继续吗？&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"footer\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"danger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @click</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = false\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dialog</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "受控关闭",
        "descriptionHtml": "<p>开启 <code>controlled</code> 后，Escape 与 backdrop 点击只请求 <code>open=false</code>，在消费方回写前 dialog 保持打开。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dialog</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  controlled</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  heading</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"未保存的更改\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  onopen-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">    if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (event.detail.open </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">===</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">requestClose</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">    else</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>离开前要先保存吗？&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dialog</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dialog</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> controlled</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"未保存的更改\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"onOpenChange\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>离开前要先保存吗？&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dialog</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onOpenChange</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> CustomEvent</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;{ </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> boolean</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }>) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">!</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">event.detail.open) </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">requestClose</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "Headless",
        "descriptionHtml": "<p><code>headless</code> 只保留 overlay 行为，默认插槽渲染为卡片内唯一的滚动层；此时必须用 <code>dialog-label</code> 提供可访问名称。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dialog</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">headless</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> dialog-label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"图片详情\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"my-dialog-content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>自定义内容与样式&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dialog</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dialog</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> headless</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> dialog-label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"图片详情\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"my-dialog-content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>自定义内容与样式&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dialog</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "drawer",
    "tag": "web-ui-drawer",
    "introHtml": "<p>侧边 drawer，基于原生 <code>&lt;dialog></code>，自带滑入 / 滑出动画，并可从四周内缘拖拽关闭。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "open",
            "<p>drawer 可见性。</p>",
            "boolean",
            "false"
          ],
          [
            "no-scroll-lock",
            "<p>打开时不锁定页面滚动。</p>",
            "boolean",
            "false"
          ],
          [
            "no-backdrop-close",
            "<p>禁止点击 backdrop 关闭。</p>",
            "boolean",
            "false"
          ],
          [
            "controlled",
            "<p>用户关闭仅请求 <code>open=false</code>，由消费方回写。</p>",
            "boolean",
            "false"
          ],
          [
            "placement",
            "<p>滑入方向：<code>right</code>（默认）、<code>left</code>、<code>top</code>、<code>bottom</code>。</p>",
            "DrawerPlacement",
            "'right'"
          ],
          [
            "heading",
            "<p>标题文字，<code>header</code> 插槽为空时的回落。</p>",
            "string",
            "''"
          ],
          [
            "closable",
            "<p>显示内置关闭 button。</p>",
            "boolean",
            "false"
          ],
          [
            "headless",
            "<p>仅保留 overlay 行为，默认插槽不渲染内置 drawer UI。</p>",
            "boolean",
            "false"
          ],
          [
            "dialog-label",
            "<p>内部原生 dialog 的可访问名称；<code>headless</code> 下必须提供。</p>",
            "string",
            "''"
          ],
          [
            "draggable",
            "<p>在 drawer 内缘显示 drag bar，支持拖拽关闭手势。</p>",
            "boolean",
            "false"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "open-change",
            "<p>open 状态变化，<code>detail.open</code> 为请求的目标状态。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>正文内容。</p>"
          ],
          [
            "header",
            "<p>顶部标题区。</p>"
          ],
          [
            "footer",
            "<p>底部操作区。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "show()",
            "<p>打开 drawer；已打开时为 no-op。</p>"
          ],
          [
            "close()",
            "<p>关闭 drawer；已关闭时为 no-op。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p><code>headless</code> 保留原生 dialog、backdrop、placement 动画、Escape/backdrop 关闭行为和滚动锁定，但不渲染内置 glass 主体、header、关闭 button 或 footer；Consumer 负责完整定义默认插槽内容的样式，并且必须提供 <code>dialog-label</code>，确保原生 dialog 具有可访问名称。</p>\n<p>关闭时保留原生 dialog 的 top layer，待退出过渡完成后调用 <code>dialog.close()</code>。Escape 始终走此关闭路径；<code>no-backdrop-close</code> 仅控制 backdrop 点击。</p>\n<p>启用 <code>closable</code> 时，内置关闭 button 固定在 header 右上角（默认顶部 <code>16px</code>、右侧 <code>16px</code>），不会再拉伸到 drawer 中间。顶部 <code>16px</code> 经 <code>--wui-space-4</code> 解析，因此与 drawer 的 header padding 同源；右侧 <code>16px</code> 是 button 自身到 panel 右边沿的偏移，它并不等于 header 的水平内边距（<code>20px</code>），因此保持字面量。</p>\n<p><code>--wui-drawer-nested-peek-base</code> 不需要消费方声明：默认值 <code>43.2px</code> 是组件用 <code>CSS.registerProperty</code> 注册该属性时的 <code>initialValue</code>（<code>components/drawer/index.ts</code>），窄视口的 <code>28.8px</code> 基准来自 <code>components/drawer/style.css</code> 的 <code>@media (width &lt;= 640px)</code> 规则——这两处就是内置基准的所在地。在宿主或任意祖先上设置该 token 可同时覆盖两者，在任何视口宽度下都生效。</p>\n<p>按内置基准，四层 <code>320px</code> 等宽堆叠逐层露边在桌面端为 <code>29.94px</code> / <code>17.52px</code> / <code>12.43px</code>、窄视口为 <code>19.96px</code> / <code>11.68px</code> / <code>8.29px</code>，对应总堆叠宽度 <code>59.89px</code> 与 <code>39.93px</code>。单层始终不动，因为 <code>ln(1)</code> 为 <code>0</code>。</p>"
      },
      {
        "kind": "prose",
        "key": "拖拽关闭",
        "title": "拖拽关闭",
        "html": "<p>启用 <code>draggable</code> 后，打开的 drawer 在内缘显示灰色胶囊 drag bar（默认 4×56px，视觉中线距内缘 10px；<code>right</code> 在左缘、<code>left</code> 在右缘、<code>top</code> 在下缘、<code>bottom</code> 在上缘）：</p>\n<p>中线跟随 <code>--wui-drawer-content-padding</code> 的半值，并以「半个胶囊厚度 + 4px 呼吸间距」兜底：把该 padding 归零、让内容贴边铺满时，胶囊仍留可见内缩，既不会越出 panel 内缘，也不会贴死 panel 边缘。</p>\n<p>胶囊是纯视觉件：<code>pointer-events: none</code>，本身不吃任何一次按下。真正被按下的是命中层。左右 placement 只有 drag zone；上下 placement 有三层——拖拽 drag zone、沿可抓取边缘的一条端头 drag edge（宽度与胶囊等宽，厚度不小于 <code>--wui-drawer-drag-edge-size</code>），以及整块的 header（<code>placement=bottom</code>）或 footer（<code>placement=top</code>）。drag edge 的高度取「胶囊外沿」与该 token 的较大者，按构造覆盖胶囊所在的带，所以在四个 placement 上，按住胶囊能开始拖拽、悬停胶囊会点亮它。</p>\n<p>让开 header（<code>placement=bottom</code>）或 footer（<code>placement=top</code>）的是 drag zone 本身，因此那一节不会把胶囊推离 panel 边缘；而那一节改由<strong>自己</strong>接拖拽，不再整块按不动：在它里面任意一点起手都能开始拖拽，标题文字同样在内。控件的让开是<strong>逐个控件、在事件层</strong>做的，不是把命中面几何切开——按下路径上只要出现可点元素（原生 <code>button</code> / <code>input</code> / <code>select</code> / <code>textarea</code> / <code>label</code> / <code>a[href]</code> / <code>summary</code>，任何 <code>contenteditable</code>，交互语义 <code>role</code>（<code>button</code>、<code>checkbox</code>、<code>switch</code>、<code>tab</code>、<code>menuitem</code>、<code>option</code>、<code>slider</code> 等），以及任何显式 <code>tabindex</code> 且不为 <code>-1</code>），这一次按下就交给控件、不起拖拽。自绘控件若本身不是原生可交互元素，需要带上其中之一才会被认出来；补 <code>role</code> 或 <code>tabindex</code> 就是入口，而它本身也是无障碍上该做的事。几何切割是被有意否掉的：它必须测量每个控件的位置，控件一动就失效，而且只是把 A6 那条缺陷换了个位置。代价是明说的：内置关闭 button 贴着 panel 右缘、在胶囊跨度之外，仍可点击；落在胶囊水平跨度内的控件，其顶部到 drag edge 高度之间仍被拖拽面盖住。</p>\n<p>「drag bar 占位」自带一条推论：落在这条跨度内、顶边又落在 drag edge 高度（<code>--wui-drawer-drag-edge-size</code>，默认 20px；胶囊外沿更厚时以胶囊为准）之内的控件，上部会被拖拽面盖住——drag bar 就画在那里，起手必须从 drag bar 所在的位置开始。抬 <code>z-index</code> 没用（Chromium 里 drag edge 始终压在 slotted 内容之上），量得着的杠杆是 <code>--wui-drawer-drag-bar-length</code>（同时决定胶囊长度与 drag edge 宽度）与 <code>--wui-drawer-drag-edge-size</code>（drag edge 厚度）。</p>\n<ul>\n<li>拖拽实时跟手，backdrop 透明度按比例淡出。</li>\n<li>backdrop 点击关闭只认<strong>轻点链路</strong>：按下起点在 backdrop 上、且按-放位移在轻点量级内的 click 才关闭。浏览器对「按下 → 拖动 → 松手」生成的 click 落在起点与松手点的共同祖先（dialog）上——从 panel 内容或 backdrop 上开始拖拽、松手落在 backdrop 时，click 的 target 同样是 dialog；组件在 <code>pointerdown</code> 记录起点与坐标做回溯校验，这类拖拽松手一律弹回。<code>detail</code> 为 0 的 click（键盘/程序化来源）不消费指针记录。</li>\n<li>松手时自抓取瞬间起的<strong>净位移</strong>超过 drawer 尺寸的一半（下限 10px）或快速甩动即关闭，否则弹回打开位；方向随 placement 适配。判定的每一环都与 Base UI <code>useSwipeDismiss</code> 对齐：\n<ul>\n<li>位移零点与判定时钟都在<strong>首个 <code>pointermove</code></strong> 处重置，用来吸收「按下 → 首个 move」之间的空隙；该次 move 的整程位移被整体丢弃，因此一次手势至少要两个 move 才可能累积出位移。</li>\n<li>甩动看的是<strong>整段手势</strong>的平均速度（净位移 ÷ 手势时长，分母下限 50ms）<strong>达到</strong> 500px/s，不是释放瞬间的瞬时速度。滑窗只描述最后一小段轨迹；在整段平均速度下，「先往边缘拖出、再快速扫回」不再能凑成甩动。时长为 0 时速度取 0 而不是按 50ms 兜底，因此测不到时长的手势永远不会被读成甩动。</li>\n<li>净位移没有朝闭合方向的松手一律弹回打开位。</li>\n<li>距离判据同样用净位移：从弹回途中抓取后不再拖动就松手，不会被当成「已经拖过一半」。</li>\n<li>自「方向确认点」起反向回撤满 10px 即取消本次甩动，因此拖出后回扫不会关闭。位移重新越过距离阈值会清除该标记，所以「已经拖过一半」不受小幅回撤影响。上游有同一个守卫（<code>cancelledSwipe</code>），但在 drawer 这条路径上永远走不到——<code>DrawerViewport.onRelease</code> 必然返回一个决定。</li>\n<li>朝打开方向的拖拽按平方根压缩（<code>sign(d) · |d| ** 0.5</code>），对齐 <code>applyDirectionalDamping</code>。阻尼作用于本次手势的<strong>增量</strong>、叠加在抓取瞬间的位移之上，因此自限幅而不需要固定的位移上限。</li>\n</ul>\n</li>\n<li>释放速度只决定收尾过渡的时长（180–420ms）；收尾本身是一次交还 CSS 的 <code>transform</code> 过渡，不再创建 WAAPI 动画。</li>\n<li>启用 <code>controlled</code> 后，超过阈值松手仅派发 <code>open-change(false)</code>；drawer 在闭合位短暂等待（120ms 回写窗口），Consumer 拒绝或超时未回写时弹回打开位。</li>\n<li>不支持拖拽打开——关闭态的 drawer 在原生 dialog 之外没有任何渲染物。</li>\n<li><code>prefers-reduced-motion</code> 下松手即时到位，不播放收尾过渡。</li>\n</ul>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-drawer-width",
            "<p>drawer 宽度</p>",
            "320px"
          ],
          [
            "--wui-drawer-height",
            "<p>drawer 高度（上/下）</p>",
            "300px"
          ],
          [
            "--wui-drawer-bg",
            "<p>drawer 背景色</p>",
            "var(--wui-color-surface-overlay)"
          ],
          [
            "--wui-drawer-radius",
            "<p>浮动卡片圆角（非 headless）</p>",
            "var(--wui-radius-overlay, 28px)"
          ],
          [
            "--wui-drawer-inset",
            "<p>浮动卡片视口留边（非 headless）；置 <code>0</code> 为贴边几何</p>",
            "8px"
          ],
          [
            "--wui-drawer-nested-peek-base",
            "<p>嵌套堆叠露边基准 <code>A</code>（<code>width &lt;= 640px</code> 时为 <code>28.8px</code>）；堆叠总宽按 <code>A · ln(n)</code> 增长，单层因此完全不动，每多一层新增的露边递减。置 <code>0</code> 关闭露边。详见下方说明</p>",
            "43.2px"
          ],
          [
            "--wui-drawer-overlay-bg",
            "<p>backdrop 背景色</p>",
            "rgb(0 0 0 / 0.12)"
          ],
          [
            "--wui-drawer-drag-zone-size",
            "<p>Drag-to-close 命中 drag zone 厚度（draggable）</p>",
            "20px"
          ],
          [
            "--wui-drawer-drag-zone-inset",
            "<p>拖拽 drag zone 与它避让的那一节（<code>placement=bottom</code> 的 header / <code>placement=top</code> 的 footer）之间的呼吸间距；该节不存在时为 0</p>",
            "var(--wui-space-1, 4px)"
          ],
          [
            "--wui-drawer-drag-bar-thickness",
            "<p>Drag bar 胶囊厚度（短轴）</p>",
            "4px"
          ],
          [
            "--wui-drawer-drag-bar-length",
            "<p>Drag bar 胶囊长度（沿 drawer 边缘）</p>",
            "56px"
          ],
          [
            "--wui-drawer-drag-edge-size",
            "<p>胶囊命中带沿可抓取边缘的厚度（仅上下 placement）。以胶囊外沿兜底，胶囊所在的带恒被覆盖；默认值与 <code>--wui-drawer-drag-zone-size</code> 同值，于是 drag bar 不会比旁边的带子更难按</p>",
            "20px"
          ],
          [
            "--wui-drawer-header-padding",
            "<p>Header 区域 padding</p>",
            "16px 20px"
          ],
          [
            "--wui-drawer-close-top",
            "<p>内置关闭 button 相对 header 顶部的偏移</p>",
            "16px"
          ],
          [
            "--wui-drawer-close-right",
            "<p>内置关闭 button 相对 drawer 右缘的偏移</p>",
            "16px"
          ],
          [
            "--wui-drawer-content-padding",
            "<p>内容区 padding；同时驱动 drag bar 视觉中线（取半值，不低于半个胶囊厚度 + 4px）</p>",
            "20px"
          ],
          [
            "--wui-drawer-footer-padding",
            "<p>Footer 区域 padding</p>",
            "16px 20px"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>placement</code> 决定滑入方向，<code>heading</code> 是无 header 插槽时的标题回落。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onClick</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)}>打开 drawer&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-drawer</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">placement</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"right\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"设置\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onopen-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.open)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>drawer 正文&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-drawer</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @click</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = true\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>打开 drawer&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-drawer</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placement</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"right\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"设置\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = $event.detail.open\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>drawer 正文&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-drawer</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "拖拽关闭",
        "descriptionHtml": "<p>开启 <code>draggable</code> 后，drawer 内缘出现 drag bar，向关闭方向拖过半或快速甩动即关闭。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-drawer</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">placement</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"bottom\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> draggable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"快捷操作\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>向下拖拽关闭&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-drawer</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-drawer</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placement</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"bottom\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> draggable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"快捷操作\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>向下拖拽关闭&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-drawer</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "footer 操作",
        "descriptionHtml": "<p><code>header</code> / <code>footer</code> 插槽与正文分离，正文滚动时两者保持可见。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-drawer</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">heading</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"编辑资料\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"footer\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    保存</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>正文内容&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-drawer</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-drawer</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"编辑资料\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"footer\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>正文内容&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-drawer</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "dropdown-divider",
    "tag": "web-ui-dropdown-divider",
    "introHtml": "<p>menu 里的 divider，用来切开成组的 menu item。它没有任何属性、事件与插槽，也不参与键盘导航——menu 只会把焦点停在 <code>&lt;web-ui-dropdown-item></code> 上，它自己只声明 <code>role=\"separator\"</code>。它出现在 <code>&lt;web-ui-dropdown></code> / <code>&lt;web-ui-context-menu></code> 的子元素里。</p>",
    "api": [],
    "samples": [
      {
        "id": "basic",
        "title": "分组 divider",
        "descriptionHtml": "<p>divider 插在两组 menu item 之间，宽度撑满 menu panel，两侧各留一点水平外边距。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        操作</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>粘贴&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>操作&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>粘贴&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "basic"
      }
    ]
  },
  {
    "component": "dropdown-header",
    "tag": "web-ui-dropdown-header",
    "introHtml": "<p>menu 里的分组标题：一段不参与交互的小字，给紧随其后的几个 menu item 起名。它没有属性与事件，也不参与键盘导航——menu 只会把焦点停在 <code>&lt;web-ui-dropdown-item></code> 上。分组标题常与 <code>&lt;web-ui-dropdown-divider></code> 一起用。</p>",
    "api": [
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>分组标题的文本。</p>"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": "basic",
        "title": "分组标题",
        "descriptionHtml": "<p>标题让一组 menu item 有名字；它不可聚焦、不可点击，键盘上下键会直接跳过。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        更多</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>粘贴&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>危险操作&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>更多&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>粘贴&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>危险操作&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "basic"
      }
    ]
  },
  {
    "component": "dropdown-item",
    "tag": "web-ui-dropdown-item",
    "introHtml": "<p><code>&lt;web-ui-dropdown></code> 与 <code>&lt;web-ui-context-menu></code> 的 menu item：<code>disabled</code> 让它留在 menu 里但不可选中，键盘导航与悬停都会跳过它；<code>prefix</code> / <code>suffix</code> 插槽放两端的 icon 与快捷键提示；<code>submenu</code> 把嵌套的 submenu 挂到它的下一级。它自己不派发对外事件，<code>value</code> 也不被 menu 消费——那是留给使用方在原生 <code>click</code> 里读的标识。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "disabled",
            "<p>禁用项：留在 menu 里但不可选中，键盘导航与悬停跳过它。</p>",
            "boolean",
            "false"
          ],
          [
            "pl",
            "<p>项的左内边距，写成 CSS 长度；用来对齐有 / 无 <code>prefix</code> icon 的两种项。</p>",
            "string",
            "''"
          ],
          [
            "value",
            "<p>项的标识，由使用方在原生 <code>click</code> 里读取；menu 自己不消费。</p>",
            "string",
            "''"
          ],
          [
            "submenu",
            "<p>作为 submenu 入口：嵌套的 menu item 成为下一级，右侧显示展开箭头。</p>",
            "boolean",
            "false"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "prefix",
            "<p>文本左侧的 icon 或标识。</p>"
          ],
          [
            "default",
            "<p>项的文本；也是 submenu item 的宿主位置。</p>"
          ],
          [
            "suffix",
            "<p>文本右侧的快捷键提示等；<code>submenu</code> 为真时这一位被展开箭头占用。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "focusItem()",
            "<p>聚焦 menu item：通过可见元素聚焦，跨 Shadow DOM 时不丢焦点。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>角色：<code>menuitem</code>。</p>"
      }
    ],
    "samples": [
      {
        "id": "basic",
        "title": "基础 menu",
        "descriptionHtml": "<p>menu item 是宿主的子元素，打开时被迁移进 overlay panel；<code>disabled</code> 的项仍在列表里，只是选不中。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        操作</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"edit\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"copy\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"delete\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        删除</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>操作&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"edit\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"copy\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"delete\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "basic"
      },
      {
        "id": "decorated",
        "title": "icon 与快捷键",
        "descriptionHtml": "<p><code>prefix</code> / <code>suffix</code> 是两个装饰位；<code>pl</code> 把左内边距写进项本身，让没有 icon 的纯文本项与带 14px icon 的项左对齐（8px 内边距 + 14px icon + 8px 间隙）。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideCopy, lucideTrash2 } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        文件</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideCopy}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"opacity-40\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">          ⌘C</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideTrash2}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> pl</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"30px\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>重命名&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>文件&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"14\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideCopy\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"opacity-40\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>⌘C&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"14\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideTrash2\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> pl</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"30px\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>重命名&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideCopy, lucideTrash2 } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "decorated"
      },
      {
        "id": "submenu",
        "title": "带 submenu 的项",
        "descriptionHtml": "<p><code>submenu</code> 把项变成本级 menu 的入口：嵌套在它里面的 menu item 成为下一级，右侧长出展开箭头，鼠标悬停或方向键都能进入。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        更多</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"undo\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>撤销&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> submenu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        导出为</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"pdf\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>PDF&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"png\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>PNG&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>更多&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"undo\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>撤销&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> submenu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      导出为</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"pdf\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>PDF&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"png\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>PNG&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "submenu"
      }
    ]
  },
  {
    "component": "dropdown",
    "tag": "web-ui-dropdown",
    "introHtml": "<p>dropdown menu：<code>trigger</code> 插槽放 trigger，其余子元素作为 menu item 渲染进 overlay panel，支持 divider、分组标题与多级 submenu。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "open",
            "<p>menu 可见性。</p>",
            "boolean",
            "false"
          ],
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "match-width",
            "<p>panel 宽度匹配 trigger 宽度。</p>",
            "boolean",
            "false"
          ],
          [
            "no-scroll-lock",
            "<p>打开时不锁定页面滚动。</p>",
            "boolean",
            "false"
          ],
          [
            "placement",
            "<p>Floating UI 位置，默认 <code>bottom-start</code>。</p>",
            "Placement",
            "'bottom-start'"
          ],
          [
            "offset",
            "<p>与 trigger 的距离（px）。</p>",
            "number",
            "4"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "open-change",
            "<p>menu 开合，<code>detail.open</code> 为当前状态。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "trigger",
            "<p>trigger，请放入可交互元素。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "openMenu()",
            "<p>打开 menu；命令式打开不派发 <code>open-change</code>，并抑制首项的 accent 高亮。</p>"
          ],
          [
            "closeAll()",
            "<p>关闭全部层级；命令式关闭不派发 <code>open-change</code>。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>menu item：<code>web-ui-dropdown-item</code>、<code>web-ui-dropdown-divider</code>、<code>web-ui-dropdown-header</code>。submenu 在 <code>web-ui-dropdown-item</code> 上通过 <code>submenu</code> 属性启用。完整键盘导航支持。</p>"
      },
      {
        "kind": "prose",
        "key": "trigger aria",
        "title": "trigger ARIA",
        "html": "<p><code>aria-haspopup=\"menu\"</code>、<code>aria-expanded</code> 与 <code>aria-controls</code>（指向根 menu panel）回写到 <code>trigger</code> slot 的首个 assigned element。trigger slot 请放入可交互元素。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>menu item 从宿主子元素迁移到 overlay panel，<code>trigger</code> 必须是可交互元素。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    操作</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>操作&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "icon 与快捷键",
        "descriptionHtml": "<p><code>prefix</code> / <code>suffix</code> 插槽装饰 menu item，<code>dropdown-header</code> 给一组项加标题。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    文件</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideCopy}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"opacity-40\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      ⌘C</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideTrash2}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>文件&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"14\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideCopy\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"opacity-40\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>⌘C&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"14\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideTrash2\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideCopy, lucideTrash2 } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "多级 submenu",
        "descriptionHtml": "<p>在 menu item 上设置 <code>submenu</code> 后，嵌套的 submenu item 成为它的下一级。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    更多</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"undo\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>撤销&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> submenu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    导出为</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"pdf\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>PDF&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"png\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>PNG&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svg\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>SVG&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>更多&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"undo\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>撤销&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> submenu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      导出为</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"pdf\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>PDF&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"png\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>PNG&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svg\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>SVG&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "editable-text",
    "tag": "web-ui-editable-text",
    "introHtml": "<p>行内纯文本编辑器：点击文字就地编辑，Enter 与 blur 提交，只有 Escape 取消；文本层与编辑层共用一个盒，进入编辑态不会移动像素。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "placeholder",
            "<p>值为空时显示的占位文本。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用状态，只影响行为不做视觉置灰。</p>",
            "boolean",
            "false"
          ],
          [
            "readonly",
            "<p>只读状态：仍可聚焦全选，但不能编辑或提交。</p>",
            "boolean",
            "false"
          ],
          [
            "commit-on-unmount",
            "<p>卸载时按提交语义结束编辑态；WebKit 下没有 blur，只有它才能保住草稿。</p>",
            "boolean",
            "false"
          ],
          [
            "aria-label",
            "<p>无障碍名称。</p>",
            "string | null",
            "null"
          ],
          [
            "value",
            "<p>当前值，也是表单提交值。</p>",
            "string",
            "''"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>每次输入时触发。</p>"
          ],
          [
            "change",
            "<p>提交草稿时触发（Enter 或 blur）。</p>"
          ],
          [
            "cancel",
            "<p>Escape 取消时触发，不冒泡不组合。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "focus()",
            "<p>聚焦宿主并进入编辑态，键盘聚焦把光标放在文本末尾；<code>disabled</code> 时宿主移出 tab 序列，不产生效果。</p>"
          ],
          [
            "blur()",
            "<p>让宿主失焦；焦点离开编辑层时走 blur 提交语义——草稿成为新值并恰好派发一次 <code>change</code>，<code>readonly</code> 时只退出编辑、不派发。</p>"
          ],
          [
            "select()",
            "<p>进入编辑态并全选内容；已在编辑态时只重新全选。<code>disabled</code> 时不进入编辑。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>点击时光标落在点击处；键盘聚焦时落在文本末尾。<code>Enter</code> 与 <code>blur</code> 均提交草稿并恰好派发一次 <code>change</code>：<code>Enter</code> 不插入换行，并把焦点交还宿主；<code>blur</code> 不干预焦点，焦点留在用户移往的位置。只有 <code>Escape</code> 取消：值回到进入编辑时的状态，派发 <code>cancel</code> 而不派发 <code>change</code>，焦点交还宿主，且按键由编辑层消费，外层 overlay（drawer、menu）不会因同一次按键关闭。<code>cancel</code> 不冒泡也不组合，只在组件本身派发：组件被投映在 overlay shadow 内时（如 drawer 标题），它不会触达 overlay 的原生 <code>cancel</code> 关闭管线，监听一律挂在组件本身。值里已有的换行仍按多行渲染，只是不能再靠输入 <code>Enter</code> 增加换行。空值继续显示 placeholder；编辑层始终按自身内容撑高，因此空草稿或纯空格草稿在宿主自身塌缩的场合（flex 项 <code>min-width: 0</code>、表格单元格）也仍有承接光标的位置。</p>\n<p><code>select()</code> 进入编辑态并全选内容；已在编辑态时只重新全选。<code>disabled</code> 时与 <code>focus()</code> 一样不产生效果。<code>readonly</code> 时仍可聚焦和全选，但输入被拒绝，退出编辑态也不派发 <code>change</code>。</p>\n<p>共用盒子带来两个约束：<code>line-height</code> 需不小于 <code>1</code>，更紧凑时原生编辑层内容会高出自身盒子，文字被顶偏 1px；<code>nowrap</code> 加固定宽度时，超出盒宽的文案在文字态溢出显示、在编辑态于盒内滚动。</p>"
      },
      {
        "kind": "prose",
        "key": "编辑到一半被卸载",
        "title": "编辑到一半被卸载",
        "html": "<p>正在编辑的元素被从 DOM 移除时会发生什么，取决于引擎，这个差异正是本属性存在的理由：</p>\n<ul>\n<li><strong>Chromium</strong> 会在编辑层上派发 <code>blur</code>，因此纯粹的 <code>value</code> 提交今天就已经发生，默认 <code>false</code> 不改变这一点。<code>blur</code> 与它触发的 <code>change</code> 都在卸载回调跑完<strong>之后</strong>同步派发，也就是说提交落在「消费方针对这次移除已经更新完状态」之后。</li>\n<li><strong>WebKit（Safari、iOS）</strong> 完全不派发 <code>blur</code>。默认 <code>false</code> 下什么都不提交，草稿随元素一起丢弃。</li>\n<li><strong>Gecko（Firefox）未验证</strong>：实测所用机器上没有任何 Firefox 能启动，因此这里不做任何断言。把 Gecko 当作未知，而不是默认它与上面两列之一相同；需要靠卸载提交来保住草稿时，请开启本属性。</li>\n</ul>\n<p>如果你的代码依赖「行被回收时草稿不丢」，请<strong>开启 <code>commit-on-unmount</code></strong>：在 Safari 与 iOS 上它是唯一能保住草稿的手段，在 Chromium 上它把提交提前到移除自带的 <code>blur</code> 之前。两个引擎下，卸载都按提交语义收尾一段开着的编辑会话——草稿成为新值、退出编辑、恰好派发一次 <code>change</code>，走的是与 <code>Enter</code>、<code>blur</code> 同一份实现。结论在 Chromium 与 WebKit 上实测过；浏览器测试套件只跑 Chromium，WebKit 的结果来自一次一次性跨引擎取证、不在 CI 里，Gecko 则完全没有测。</p>\n<p><code>Enter</code> 与 <code>blur</code> 由用户动作触发，一律算提交意图；卸载没有这种意图。因此只有草稿与进入编辑时的值确实不同时才提交——什么都没改的会话不会产生空提交。不在编辑态时没有可提交的内容；<code>disabled</code> 或 <code>readonly</code> 时与 <code>blur</code> 路径一致，都不派发提交事件。但两者对「已经有草稿」的处置不同：<code>disabled</code> 下草稿留在组件上，<code>readonly</code> 下草稿是真的丢掉。<code>readonly</code> 阻止不了先前输入的字，而卸载时已没有 blur 可以兜底提交——WebKit 上连 blur 都没有。可达路径是：可编辑态进入 → 起草稿 → 期间翻 readonly → 卸载。这里不按取消处理——取消的契约是恢复进入编辑时的值，而卸载既没有焦点要交也没有宿主接收结果；用户看到的是「我打的字没了」，既没有 <code>change</code> 也没有 <code>cancel</code>。</p>\n<p>提交发生在卸载回调里，<code>change</code> 仍沿组合路径向上派发，因此挂在组件自身或任一祖先上的监听都会执行，<strong>包括自身也正在被卸载的祖先</strong>：派发不要求祖先此刻还在文档里。因此监听器不能假定组件仍在文档中；结果需要活过这次移除时，用 <code>queueMicrotask</code> 之类的方式显式转交给宿主树之外的状态。注意这条可达性对「由 React 自身 render 驱动的卸载」并不成立：那种移除走不到 React 的事件委托根，<code>onChange</code> 不会触发，只能改为从元素上读值——与上文 <code>cancel</code> 的告示同源。在祖先上设 <code>display: none</code> 不算移除——两个引擎下组件都仍在文档中、不派发任何事件，那种场合需要消费方主动结束编辑。</p>\n<p>宿主是行内级盒子：未设宽度时随内容伸缩，折行后高度按行数增长。字体、颜色、文本对齐与空白处理全部继承外部上下文，因此编辑前它就是一段普通文字。</p>\n<p>光标颜色默认跟随共享语义 token <code>--wui-color-accent</code>；在宿主或任意祖先上设置该 token 即可整体改色。两层对长无空格串（连续字母数字）按同一组断行点折行：超出盒宽的长串在盒内断开，文字态不再溢出宿主盒。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-editable-text-white-space",
            "<p>两层的空白处理方式</p>",
            "pre-wrap"
          ],
          [
            "--wui-editable-text-overflow-wrap",
            "<p>两层的断词处理方式；默认让长无空格串在盒内断开，与原生编辑层一致</p>",
            "anywhere"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "交互变更",
        "title": "交互变更",
        "html": "<p><code>blur</code> 恢复提交：<code>Enter</code> 与 <code>blur</code> 均提交草稿，只有 <code>Escape</code> 取消，值回到进入编辑时的状态。<code>Enter</code> 仍不插入换行。<code>cancel</code> 事件不再冒泡：此前冒泡的自定义 <code>cancel</code> 会经 slot 进入外层 overlay shadow 内的 <code>&lt;dialog></code>（<code>composed</code> 与否都会），被当成关闭请求一并关掉（issue #159）；监听请挂在组件本身。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>点击文字进入编辑态，离开即按提交语义收尾。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-editable-text</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"点击编辑这段文字\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"未命名\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-editable-text</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-editable-text</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"点击编辑这段文字\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"未命名\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-editable-text</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "提交与取消",
        "descriptionHtml": "<p>Enter 与 blur 都提交草稿并派发一次 <code>change</code>；Escape 恢复进入编辑时的值，派发 <code>cancel</code> 而不派发 <code>change</code>。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">text</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setText</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'项目名称'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-editable-text</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{text}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    onChange</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setText</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"未命名项目\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  >&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-editable-text</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-editable-text</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"text\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"未命名项目\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    @change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"text = $event.currentTarget.value\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  >&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-editable-text</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> text</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'项目名称'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "监听取消",
        "descriptionHtml": "<p><code>cancel</code> 与原生 <code>&lt;dialog></code> 事件同名但不冒泡、不组合，React 没有对应的合成事件，需要挂原生监听。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> ref</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">null</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">useEffect</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> element</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ref.current</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">!</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">element) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onCancel</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'已取消编辑'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  element.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">addEventListener</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'cancel'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, onCancel)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> element.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">removeEventListener</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'cancel'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, onCancel)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}, [])</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-editable-text</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{ref} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"试试按 Escape\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-editable-text</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-editable-text</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"试试按 Escape\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @cancel</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"onCancel\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-editable-text</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onCancel</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'已取消编辑'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "empty",
    "tag": "web-ui-empty",
    "introHtml": "<p>empty state 占位：<code>title</code> 与 <code>description</code> 提供文案，<code>icon</code> / <code>action</code> 插槽补上图形与操作入口，<code>size</code> 是唯一缩放旋钮。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "title",
            "<p>标题文字。</p>",
            "string",
            "''"
          ],
          [
            "description",
            "<p>描述文字。</p>",
            "string",
            "''"
          ],
          [
            "size",
            "<p>版面缩放基准（px）；非法值或非正数回落为 56。</p>",
            "number",
            "56"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "icon",
            "<p>图形区内容，替代默认 icon。</p>"
          ],
          [
            "default",
            "<p>标题内容，覆盖 <code>title</code> 属性。</p>"
          ],
          [
            "description",
            "<p>描述内容，覆盖 <code>description</code> 属性。</p>"
          ],
          [
            "action",
            "<p>操作区内容，例如主 button。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p><code>size</code> 是整个空态的单一旋钮：它驱动 icon 盒、<code>min-height</code>、内边距与标题/描述字号，因此大 icon 不再配 medium 留白：</p>\n<p>列依次为 size / icon 盒 / 字形 / min-height / 内边距 块/行 / 标题 / 描述：</p>\n<ul>\n<li><code>40</code> / <code>40px</code> / <code>17px</code> / <code>171px</code> / <code>23px/17px</code> / <code>14px</code> / <code>13px</code></li>\n<li><code>56</code> / <code>56px</code> / <code>24px</code> / <code>240px</code> / <code>32px/24px</code> / <code>16px</code> / <code>14px</code></li>\n<li><code>72</code> / <code>72px</code> / <code>31px</code> / <code>309px</code> / <code>41px/31px</code> / <code>16px</code> / <code>14px</code></li>\n</ul>\n<p>派生规则是 <code>min-height: round(size * 30 / 7)</code>、<code>padding-block: round(size * 4 / 7)</code>、<code>padding-inline: round(size * 3 / 7)</code>，默认字形是 <code>round(size * 3 / 7)</code>。</p>\n<p>字号只有一档台阶而不是连续缩放：低于 <code>56</code> 时标题 <code>14px</code>、描述 <code>13px</code>，<code>56</code> 及以上为 <code>16px</code> 与 <code>14px</code>。更大的空态靠留白撑开，而不是靠字变大。</p>\n<p>每一项都覆盖 <code>size</code> 派生的值，因此八个属性始终优先——包括两个字号。默认值取默认 <code>size</code> 为 <code>56</code> 时的取值。</p>"
      },
      {
        "kind": "prose",
        "key": "从 'small' | 'medium' | 'large' 枚举迁移",
        "title": "从 'small' | 'medium' | 'large' 枚举迁移",
        "html": "<p><code>size</code> 现在是数字。被删除的档位是手调值，这套比例只能逼近而复现不了——<code>small</code> 原本是 <code>160px</code> 高、<code>20px 16px</code> 内边距，<code>large</code> 原本是 <code>320px</code> 与 <code>48px 32px</code>。段间距与内容宽度从未跟随档位。</p>\n<p>列依次为 旧值 / 新值 / 默认字形：</p>\n<ul>\n<li><code>small</code> / <code>40</code> / <code>17</code></li>\n<li><code>medium</code> / <code>56</code> / <code>24</code></li>\n<li><code>large</code> / <code>72</code> / <code>31</code></li>\n</ul>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-empty-min-height",
            "<p>最小高度</p>",
            "240px"
          ],
          [
            "--wui-empty-padding",
            "<p>内边距</p>",
            "32px 24px"
          ],
          [
            "--wui-empty-icon-size",
            "<p>icon 容器尺寸，优先于 <code>size</code></p>",
            "56px"
          ],
          [
            "--wui-empty-content-width",
            "<p>标题/描述/操作区最大宽度</p>",
            "480px"
          ],
          [
            "--wui-empty-title-margin-top",
            "<p>icon 与标题之间的间距</p>",
            "16px"
          ],
          [
            "--wui-empty-title-font-size",
            "<p>标题字号</p>",
            "16px"
          ],
          [
            "--wui-empty-description-font-size",
            "<p>描述字号</p>",
            "14px"
          ],
          [
            "--wui-empty-action-margin-top",
            "<p>操作区上方的间距</p>",
            "20px"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>title</code> 与 <code>description</code> 覆盖标题和描述两个主要文案位。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-empty</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> title</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"暂无数据\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> description</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"创建第一条记录后这里会显示列表\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-empty</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-empty</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> title</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"暂无数据\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> description</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"创建第一条记录后这里会显示列表\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-empty</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "自定义 icon 与操作",
        "descriptionHtml": "<p><code>icon</code> 插槽替换默认图形，<code>action</code> 插槽放操作 button；<code>size</code> 驱动 icon 盒、留白与字号。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-empty</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> title</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"还没有文件\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> description</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"上传或新建一个文件开始\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">72</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"icon\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideFolderOpen} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">31</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"action\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    新建文件</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-empty</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-empty</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> title</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"还没有文件\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> description</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"上传或新建一个文件开始\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"72\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"icon\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideFolderOpen\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"31\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"action\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>新建文件&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-empty</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideFolderOpen } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "icon",
    "tag": "web-ui-icon",
    "introHtml": "<p>icon 渲染组件，接受 Iconify 数据对象（<code>@greypan/web-ui/icons</code> 导出的即为此形态）；宿主默认 <code>aria-hidden=\"true\"</code>。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "icon",
            "<p>Iconify 数据对象（property）。</p>",
            "IconifyIcon",
            "—"
          ],
          [
            "spin",
            "<p>旋转动画。</p>",
            "boolean",
            "false"
          ],
          [
            "size",
            "<p>尺寸（px）。</p>",
            "number",
            "18"
          ],
          [
            "color",
            "<p>颜色。</p>",
            "string",
            "—"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>内置 <code>aria-hidden=\"true\"</code>。</p>"
      },
      {
        "kind": "prose",
        "key": "画布",
        "title": "画布",
        "html": "<p>SVG 的 <code>viewBox</code> 取自 <code>icon.left</code>/<code>icon.top</code>/<code>icon.width</code>/<code>icon.height</code>，偏移缺省为 <code>0</code>，尺寸缺省为 Iconify 规范默认的 <code>16</code>。生成的资产都自带画布，因此尺寸兜底只在直接传入原始 <code>IconifyIcon</code> 对象时才会生效。</p>\n<pre><code class=\"language-js\">import { lucideLoaderCircle } from '@greypan/web-ui/icons'\nhtml`&lt;web-ui-icon .icon=${lucideLoaderCircle} spin />`\n</code></pre>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-icon-color",
            "<p>icon 颜色</p>",
            "inherit"
          ],
          [
            "--wui-duration-spin",
            "<p><code>spin</code> 旋转周期；reduce 下放慢到 <code>1600ms</code>，不停</p>",
            "600ms"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>icon</code> 是 Lit 属性绑定（property），不是 attribute。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideSearch } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "尺寸与颜色",
        "descriptionHtml": "<p><code>size</code> 以像素为单位；<code>color</code> 不设置时继承文字颜色（<code>currentColor</code>）。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">24</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">32</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">color</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"#007aff\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"16\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"24\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"32\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> color</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"#007aff\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "旋转动画",
        "descriptionHtml": "<p><code>spin</code> 常用于加载态 icon，<code>reduce</code> 动效偏好下放慢而不停。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideLoaderCircle} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">spin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideLoaderCircle\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> spin</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideLoaderCircle } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "image-preview",
    "tag": "web-ui-image-preview",
    "introHtml": "<p>命令式 image preview：通过 <code>imagePreview()</code> 打开，用返回的 handle 控制；内部使用原生 <code>&lt;dialog></code>，默认挂载到最近的 theme-owned overlay root。下面的表分别列 <code>imagePreview()</code> 的 option 与返回 handle 的成员。</p>",
    "api": [
      {
        "kind": "table",
        "key": "options",
        "title": "Options",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "images",
            "<p>图片列表，至少一项；每项为 <code>{ src, alt? }</code>。</p>",
            "ImagePreviewItem[]",
            "—"
          ],
          [
            "index",
            "<p>初始图片索引，越界时钳制到有效区间。</p>",
            "number",
            "0"
          ],
          [
            "loop",
            "<p>首尾循环切换。</p>",
            "boolean",
            "true"
          ],
          [
            "target",
            "<p>用于解析最近 theme-owned overlay root 的触发元素。</p>",
            "Element",
            "—"
          ],
          [
            "container",
            "<p>显式挂载容器，优先级高于主题作用域。</p>",
            "HTMLElement",
            "—"
          ],
          [
            "nav",
            "<p>展示上一张 / 下一张 button。</p>",
            "boolean",
            "false"
          ],
          [
            "toolbar",
            "<p>展示缩放工具条。</p>",
            "boolean",
            "false"
          ],
          [
            "closable",
            "<p>展示关闭 button。</p>",
            "boolean",
            "false"
          ],
          [
            "indicator",
            "<p>展示「当前 / 总数」indicator。</p>",
            "boolean",
            "false"
          ],
          [
            "swipe",
            "<p>1x 下允许左右滑动切图。</p>",
            "boolean",
            "false"
          ],
          [
            "noScrollLock",
            "<p>打开期间不锁定页面滚动。</p>",
            "boolean",
            "false"
          ],
          [
            "noBackdropClose",
            "<p>点击图片以外的空白区域不关闭。</p>",
            "boolean",
            "false"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "next()",
            "<p>切到下一张；<code>loop</code> 开启时末张回到首张，关闭时已在末张则不动作。</p>"
          ],
          [
            "prev()",
            "<p>切到上一张；<code>loop</code> 开启时首张回到末张，关闭时已在首张则不动作。</p>"
          ],
          [
            "goTo(index)",
            "<p>跳到指定索引；<code>loop</code> 开启时按图片数取模，关闭时钳制到有效区间，切换后缩放复位。</p>"
          ],
          [
            "zoomIn()",
            "<p>放大一档（0.5），上限 4。</p>"
          ],
          [
            "zoomOut()",
            "<p>缩小一档（0.5），下限 1。</p>"
          ],
          [
            "resetZoom()",
            "<p>缩放与平移复位：回到 1x 并居中。</p>"
          ],
          [
            "close()",
            "<p>关闭预览；handle 的 <code>closed</code> 在退场结束后兑现。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>它不复用 <code>&lt;web-ui-dialog></code> 组件：预览需要自身铺满视口的 dialog（全视口 backdrop 由 dialog 内独立 backdrop 层渲染，dialog 元素自身不做 opacity 过渡，玻璃控件的 backdrop blur 全程连续）与自有指针交互，与 dialog 组件的玻璃卡片 / 插槽契约不同源。两者共享 <code>native-dialog-presence</code> 与 <code>scroll-lock</code> 两个底层插件，<code>noScrollLock</code> / <code>noBackdropClose</code> 的命名与语义也对齐同名属性。</p>\n<pre><code class=\"language-ts\">import { imagePreview } from '@greypan/web-ui'\n\nconst preview = imagePreview({\n  images: [{ src: '/a.jpg', alt: '图 A' }, { src: '/b.jpg' }],\n  index: 0,\n  nav: true,\n  toolbar: true,\n  closable: true,\n  indicator: true\n})\n\npreview.next()\npreview.zoomIn()\n\nawait preview.closed\n</code></pre>\n<p><code>ImagePreviewItem</code> 为 <code>{ src: string; alt?: string }</code>；<code>alt</code> 缺省为空字符串。</p>\n<p>展示类 option 默认全关：不传任何 option 时只渲染图片本身，导航、工具条、关闭 button 与 indicator 都需要显式开启。</p>"
      },
      {
        "kind": "table",
        "key": "返回 handle",
        "title": "返回 handle",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "index",
            "<p>当前索引，关闭后保留最后一次的值</p>",
            "number"
          ],
          [
            "scale",
            "<p>当前缩放倍率，区间 <code>[1, 4]</code></p>",
            "number"
          ],
          [
            "images",
            "<p>归一化后的图片列表</p>",
            "readonly ImagePreviewItem[]"
          ],
          [
            "closed",
            "<p>退场结束且宿主移除后兑现</p>",
            "Promise<void>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "交互",
        "title": "交互",
        "html": "<p>方向键始终可切换图片，与 <code>nav</code> 无关；<code>+</code> / <code>-</code> 键和滚轮缩放，<code>0</code> 重置。缩放带锚点：滚轮固定光标下的那一点，双指捏合固定两指中点，工具条 button、键盘快捷键与双击则以视口中心为中心放大。按住鼠标拖拽或单指按住拖拽都能平移图片，方向不限，且与倍率无关：放大后是查看被裁切的边缘，1x 是在视口内移动图片。两种情形共用同一个边界——图片与舞台尺寸差的一半，因此图片永远不会被拖出视口；拖到边界后继续拖是钳制而非回弹。双击图片在 1x 与 2x 之间切换。</p>\n<p>双指缩放始终开启且不提供 option：舞台本身就持有指针交互，没有会冲突的手势。第一根手指照常负责平移 / 滑动，第二根手指落下才进入捏合，并中止进行中的平移或滑动。捏合不会关闭 overlay；混合输入事后可能补发的兼容 <code>click</code> 会被吞掉，而不是当作 backdrop 点击。</p>\n<p>点击图片以外的空白区域或按 Escape 关闭，原生 dialog 始终暴露 <code>image preview</code> 这一可访问名称。<code>swipe</code> 开启且图片多于一张时，图片排布在单条轮播 track 上：当前图与相邻图各占等宽等高的 slide，舞台裁切溢出，整条 track 随手指平移；松手时越过距离阈值（舞台宽度的 15%，取整）滑入相邻图，位移未达阈值但快速轻扫的采样速度达到 320px/s 以上、或位移至少 16px 且速度（窗口采样或整段平均）达到 160px/s 以上的轻扫同样提交，否则弹回；<code>loop</code> 开启时首尾环绕的相邻图恒在当前图两侧，<code>loop</code> 关闭时边界方向回弹不越界。该手势生效期间接管整个拖拽：1x 下横向拖拽用于切图，纵向位移被完全忽略（不驱平移、不跟手）。放大后拖拽一律平移（纵横都跟），不再切换图片。由于 1x 也能平移，<code>resetZoom()</code> 在「已放大」和「已位移」两种情况下都可用——工具条里的重置 button 对已平移的 1x 图片同样可点。</p>\n<p>关闭请求不会立刻销毁原生 dialog：它保持在 top layer，等退场过渡结束后才调用 <code>dialog.close()</code>，随后宿主从 DOM 移除并兑现 <code>closed</code>。打开期间锁定页面滚动，除非 <code>noScrollLock</code> 为 <code>true</code>。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-image-preview-overlay-bg",
            "<p>全视口 backdrop 背景色</p>",
            "rgb(0 0 0 / 0.72)"
          ],
          [
            "--wui-image-preview-edge-gap",
            "<p>控件到视口边缘的可见距离</p>",
            "20px"
          ],
          [
            "--wui-duration-swipe-settle",
            "<p>轮播滑入/回位的过渡时长</p>",
            "220ms"
          ],
          [
            "--wui-ease-swipe",
            "<p>轮播滑入/回位的缓动曲线</p>",
            "cubic-bezier(0.32, 0.72, 0, 1)"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>只传图片时只渲染图片本身，点击图片外空白或按 Escape 关闭。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { imagePreview } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> preview</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> imagePreview</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  images: [</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    { src: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'/photos/a.jpg'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, alt: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'图 A'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> },</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    { src: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'/photos/b.jpg'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, alt: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'图 B'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ]</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">preview.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">next</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">await</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> preview.closed</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { imagePreview } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> preview</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> imagePreview</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    images: [</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      { src: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'/photos/a.jpg'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, alt: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'图 A'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> },</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      { src: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'/photos/b.jpg'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, alt: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'图 B'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    ],</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    nav: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    toolbar: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    closable: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    indicator: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  preview.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">next</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "展示类 option",
        "descriptionHtml": "<p><code>nav</code>、<code>toolbar</code>、<code>closable</code>、<code>indicator</code> 彼此独立且默认关闭，需要显式开启。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> preview</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> imagePreview</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  images,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  index: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  nav: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  toolbar: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  closable: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  indicator: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { imagePreview } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> openFull</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">images</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">src</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">; </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">alt</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }[]) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> imagePreview</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ images, nav: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, toolbar: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, closable: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, indicator: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "滑动与循环",
        "descriptionHtml": "<p><code>swipe</code> 在 1x 倍率下允许左右滑动切图；<code>loop</code> 关闭时首尾钳制、边界方向回弹。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> preview</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> imagePreview</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ images, swipe: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, loop: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { imagePreview } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> openBounded</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">images</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">src</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">; </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">alt</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }[]) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> imagePreview</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ images, swipe: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, loop: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "handle",
        "descriptionHtml": "<p>handle 暴露只读的 <code>index</code>、<code>scale</code>、<code>images</code>、<code>closed</code> 与下表的方法，可据此实现自己的 trigger 与状态 panel。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> preview</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> imagePreview</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ images })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">preview.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">goTo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">preview.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">zoomIn</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">await</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> preview.closed</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(preview.index, preview.scale)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { imagePreview } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">async</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> inspect</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">images</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">src</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">; </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">alt</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }[]) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> preview</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> imagePreview</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ images })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  preview.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">goTo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  preview.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">zoomIn</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  await</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> preview.closed</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(preview.index, preview.scale)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "input-number",
    "tag": "web-ui-input-number",
    "introHtml": "<p>input number，自带步进 button 与 ArrowUp / ArrowDown 键盘增减；空输入或 <code>-</code> 在提交时被忽略，值保持在最后一个有效数字。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "placeholder",
            "<p>占位文本。</p>",
            "string",
            "''"
          ],
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "readonly",
            "<p>只读状态。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验。</p>",
            "boolean",
            "false"
          ],
          [
            "precision",
            "<p>小数精度，在读取与提交时规整。</p>",
            "number",
            "0"
          ],
          [
            "value",
            "<p>当前值。</p>",
            "number",
            "0"
          ],
          [
            "min",
            "<p>最小值。</p>",
            "number",
            "0"
          ],
          [
            "max",
            "<p>最大值。</p>",
            "number",
            "Infinity"
          ],
          [
            "step",
            "<p>步进值。</p>",
            "number",
            "1"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>值变化时触发。</p>"
          ],
          [
            "change",
            "<p>提交时触发。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>ArrowUp/ArrowDown 键增减数值。空输入或 <code>-</code> 在提交时被忽略，值保持在最后一个有效数字。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>min</code> / <code>max</code> / <code>step</code> 约束取值范围与步进幅度。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input-number</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> min</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">max</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">100</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">step</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">20</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input-number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input-number</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :min</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :max</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"100\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :step</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"5\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"20\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input-number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "精度",
        "descriptionHtml": "<p><code>precision</code> 决定小数位数，超出部分在<strong>读取与提交</strong>时规整；赋值本身保留原始小数，因此 <code>precision</code> 与 <code>value</code> 的声明顺序不影响结果（<code>value=\"1.5\" precision=\"2\"</code> 与反序都得到 <code>1.5</code>）。</p>\n<p>编辑中清空或输入非法内容不会破坏 <code>value</code>：失焦时显示会回填为已提交值，表单提交的始终是最后那个合法值。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input-number</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> precision</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">step</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0.01</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">9.99</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input-number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input-number</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :precision</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"2\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :step</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0.01\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"9.99\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input-number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "受控",
        "descriptionHtml": "<p><code>value</code> 是当前值，<code>input</code> 在输入与步进中触发，<code>change</code> 在提交时触发。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">quantity</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setQuantity</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input-number</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{quantity}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    min</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    required</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setQuantity</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  >&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input-number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input-number</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"quantity\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    :min</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"1\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    required</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"quantity = $event.currentTarget.value\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  >&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input-number</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> quantity</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "input",
    "tag": "web-ui-input",
    "introHtml": "<p>文本 input，支持清除 button 与前后缀插槽，并与原生 <code>&lt;form></code> 集成；宿主自身不可聚焦，焦点委托到 shadow 内的原生 input。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "type",
            "<p>HTML input 类型。</p>",
            "string",
            "'text'"
          ],
          [
            "placeholder",
            "<p>占位文本。</p>",
            "string",
            "''"
          ],
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "readonly",
            "<p>只读状态。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验。</p>",
            "boolean",
            "false"
          ],
          [
            "clearable",
            "<p>显示清除 button。</p>",
            "boolean",
            "false"
          ],
          [
            "full",
            "<p>占满父容器宽度。</p>",
            "boolean",
            "false"
          ],
          [
            "borderless",
            "<p>ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。</p>",
            "boolean",
            "false"
          ],
          [
            "aria-label",
            "<p>无障碍 label。</p>",
            "string | null",
            "null"
          ],
          [
            "value",
            "<p>输入值。</p>",
            "string",
            "''"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>输入时触发。</p>"
          ],
          [
            "change",
            "<p>提交时触发（失焦、回车，或点击清除 button 清空）。</p>"
          ],
          [
            "focus",
            "<p>获得焦点时触发。</p>"
          ],
          [
            "blur",
            "<p>失去焦点时触发。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "prefix",
            "<p>输入区左侧的 icon 或文字。</p>"
          ],
          [
            "suffix",
            "<p>输入区右侧的 icon 或文字。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "focus(options?)",
            "<p>聚焦 shadow 内的原生 input；<code>disabled</code> 时不产生效果。</p>"
          ],
          [
            "blur()",
            "<p>让 shadow 内的原生 input 失焦。</p>"
          ],
          [
            "select()",
            "<p>全选当前值；<code>disabled</code> 时不产生效果。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-input-clear-color",
            "<p>清除 button 颜色</p>",
            "var(--wui-color-text-tertiary)"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>type</code> 透传给内部原生 input，<code>placeholder</code> 在空值时显示。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"email\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"name@example.com\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"email\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"name@example.com\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "清除 button",
        "descriptionHtml": "<p><code>clearable</code> 在有值时显示清除 button，<code>full</code> 让 input 占满父容器宽度。点击清除 button 会清空值，并<strong>同时派发 <code>input</code> 与 <code>change</code></strong>（清除是一次已提交的离散变更，不是连续输入，只监听 <code>change</code> 的消费者也能收到）。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> clearable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> full</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入关键词\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> clearable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> full</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入关键词\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "前后缀",
        "descriptionHtml": "<p><code>prefix</code> / <code>suffix</code> 插槽在输入区两侧放 icon 或文字，<code>aria-label</code> 为无可见 label 的输入提供无障碍名称。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"搜索\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> clearable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"搜索组件\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"搜索\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> clearable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"搜索组件\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"16\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideSearch } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "受控值",
        "descriptionHtml": "<p><code>value</code> 是输入值也是表单提交值，<code>input</code> 每次输入都触发，<code>change</code> 在失焦或去抖提交时触发。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">keyword</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setKeyword</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">''</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{keyword}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入后实时搜索\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setKeyword</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  >&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"keyword\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入后实时搜索\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"keyword = $event.currentTarget.value\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  >&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> keyword</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">''</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "layout",
    "tag": "web-ui-layout",
    "introHtml": "<p>响应式页面布局：可选全宽 Banner、桌面端 collapsible sidebar，移动端默认 drawer。页面本身滚动；Banner 滚出后，桌面端 sidebar 和 header 固定在视口内。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "sidebar-collapsed",
            "<p>桌面端侧边栏受控 collapse 状态；只收窄桌面端，不影响移动端 Drawer。</p>",
            "boolean",
            "false"
          ],
          [
            "sidebar-open",
            "<p>移动端侧边栏 Drawer 受控打开状态。</p>",
            "boolean",
            "false"
          ],
          [
            "header-glow",
            "<p>在 header 插槽内容背后显示装饰性晕染。</p>",
            "boolean",
            "false"
          ],
          [
            "mobile",
            "<p>只读派生值：当前视口是否处于移动端断点及以下；写 attribute 会被恢复，property 赋值不生效。</p>",
            "boolean",
            "false"
          ],
          [
            "sidebar-width",
            "<p>桌面端和移动端展开时的侧边栏宽度。</p>",
            "string",
            "'240px'"
          ],
          [
            "collapsed-width",
            "<p>桌面端 collapse 时的侧边栏宽度。</p>",
            "string",
            "'68px'"
          ],
          [
            "sidebar-resizable",
            "<p>启用桌面端侧边栏右边缘拖拽调整宽度。</p>",
            "boolean",
            "false"
          ],
          [
            "sidebar-min-width",
            "<p>拖拽调整的下限（px）；默认回退到 <code>collapsed-width</code>。</p>",
            "string",
            "—"
          ],
          [
            "sidebar-max-width",
            "<p>拖拽调整的上限（px）；钳制在视口一半以内，内置上限优先。</p>",
            "string",
            "—"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "sidebar-collapsed-change",
            "<p>请求更新桌面端 collapse 状态；<code>detail.collapsed</code> 是请求值，Consumer 须回写到 <code>sidebar-collapsed</code>。</p>"
          ],
          [
            "sidebar-open-change",
            "<p>请求更新移动端 Drawer 打开状态；<code>detail.open</code> 是请求值。</p>"
          ],
          [
            "sidebar-width-change",
            "<p>拖拽释放或键盘 Enter 提交调整后请求更新宽度；<code>detail.width</code> 是最终像素宽度。</p>"
          ],
          [
            "mobile-change",
            "<p>不是请求：报告 layout 自己的派生视口状态，<code>detail.mobile</code> 与 <code>mobile</code> 属性同值，每次跨断点只派发一次。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "banner",
            "<p>位于布局主体上方的可选全宽 Banner。</p>"
          ],
          [
            "header",
            "<p>内容区的 sticky header。</p>"
          ],
          [
            "sidebar",
            "<p>侧边栏卡片内容；桌面端内部固定区域与滚动容器由 Consumer 自行定义。</p>"
          ],
          [
            "default",
            "<p>主内容区。</p>"
          ],
          [
            "tabbar",
            "<p>底部 tabbar。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "移动端视口状态",
        "title": "移动端视口状态",
        "html": "<p><code>mobile</code> 是派生输出而不是第二个输入——由 layout 独占写入；property 只读（赋值不生效，严格模式下抛错），写 attribute 会在同一次 reaction 内被恢复、连值一起归位，两种写法都不派发事件。它与 layout 的渲染分支、以及 layout CSS 用来隐藏桌面 aside 的媒体查询（<code>@media (width &lt;= 640px)</code>）是同一条条件，三者不可能互相错开；翻转不再经 resize 去抖，就发生在媒体查询变化的那一刻。<code>mobile-change</code> 每次跨断点只派发一次，元素在窄视口挂载时连接那一刻的那次求值也算一次。Consumer 用 <code>layout.mobile</code> 读当前值、用 <code>mobile-change</code> 收更新即可，CSS 侧可以写 <code>web-ui-layout[mobile]</code>。</p>"
      },
      {
        "kind": "prose",
        "key": "框架侧的消费方式",
        "title": "框架侧的消费方式",
        "html": "<p>layout 自身在 microtask 里重渲染，因此<strong>在宏任务上响应的消费者会读到旧值，而新树已经在屏幕上了</strong>：</p>\n<ul>\n<li><strong>Vue</strong>：模板里绑 <code>@mobile-change</code>，用 <code>ref</code> 存值。Vue 在元素插入前就挂上模板监听（因此也能收到连接期那一次），且它的 flush 在 microtask，早于 layout 自己的更新。</li>\n<li><strong>React</strong>：用 ref 拿到元素，在 <code>useLayoutEffect</code> 里<strong>先读 <code>layout.mobile</code> 再订阅</strong>，并用 <code>flushSync</code> 回写。先读是为了拿到「挂在插入之后的监听收不到」的挂载初值；<code>flushSync</code> 是为了让运行时跨断点抢在 layout 重渲染之前——React 对 DOM 监听里的 setState 走宏任务 flush，否则会出现一帧「drawer 已按新状态渲染、consumer 的值还是旧的」（本仓 React demo 修复前实测 2/221 帧）。</li>\n<li><strong>CSS</strong>：直接按 <code>web-ui-layout[mobile]</code> 写样式，或把它包成一个变体。Tailwind v4 的 app 可以只写一次这条边界的<strong>移动端那一侧</strong>、而不是每个工具类各写一遍：<code>@custom-variant mobile (&amp;:where(web-ui-layout[mobile], web-ui-layout[mobile] *));</code>。两条限制：属性选择器只够得到 layout 子树内的节点，被 overlay portal 到 <code>document.body</code> 的内容仍需媒体查询；<strong>不要拿自定义变体做 min-width 那一侧</strong>——Tailwind 把 <code>@custom-variant</code> 规则排在主题断点之后，同属性的 <code>desktop:</code> 变体会在它之上的每个宽度静默压掉 <code>md:</code>/<code>lg:</code>。</li>\n</ul>"
      },
      {
        "kind": "prose",
        "key": "collapse 只作用于桌面端",
        "title": "collapse 只作用于桌面端",
        "html": "<p><code>sidebar-collapsed</code> 只收窄桌面端侧边栏，布局不对移动端 Drawer 施加任何 collapse 几何。两条分支承载的是同一份 <code>sidebar</code> 插槽内容，所以侧边栏内容密度跟着该属性变的 Consumer 必须按 <code>mobile</code> 收窄这个条件（例如 <code>collapsed &amp;&amp; !layout.mobile</code>，或 CSS 的 <code>web-ui-layout[mobile]</code>），否则桌面的 collapse preference 会一路渲染进 Drawer。见 issue #195。</p>"
      },
      {
        "kind": "prose",
        "key": "侧边栏调整宽度",
        "title": "侧边栏调整宽度",
        "html": "<p>启用 <code>sidebar-resizable</code> 后，桌面端侧边栏右边缘会出现调整 handle（collapse 状态下隐藏）；悬停或拖拽时显示 3px 宽的强调色垂直线和 <code>col-resize</code> 光标。</p>\n<ul>\n<li>拖拽时实时更新宽度（禁止过渡动画，限制在 <code>[min, max]</code> 和视口范围内）。</li>\n<li>释放时触发 <code>sidebar-width-change</code> 事件并携带最终像素宽度，Consumer 回写后宽度重新由 <code>sidebar-width</code> 属性接管；<code>pointercancel</code> 会恢复属性控制的宽度且不触发事件。</li>\n<li>键盘操作（WAI-ARIA splitter 模式）：聚焦后用 ←/→ 以 16px 步进调整（Shift 加速到 64px），Home/End 跳到 min/max，Enter 以同一 <code>sidebar-width-change</code> 请求提交，Escape 撤回未提交的调整。</li>\n<li>移动端 Drawer 始终通过其内置 <code>draggable</code> drawer 支持拖拽关闭。</li>\n</ul>"
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p><code>web-ui-layout</code> 只约束侧边栏卡片的可用空间并管理桌面端 Toggle，不创建桌面端侧边栏 scrollport。若仅让桌面端侧边栏的一部分滚动，请将 <code>sidebar</code> 插槽根节点设为 <code>height: 100%; min-height: 0</code> 的 flex column，再将 <code>overflow-y: auto</code> 设置到目标子元素。这样 Consumer 可自行固定头部和底部，无需额外的公共 slot：</p>\n<pre><code class=\"language-html\">&lt;div slot=\"sidebar\" class=\"sidebar-root\">\n  &lt;div class=\"sidebar-title\">组件列表&lt;/div>\n  &lt;nav class=\"sidebar-nav\">...&lt;/nav>\n&lt;/div>\n</code></pre>\n<pre><code class=\"language-css\">.sidebar-root {\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  min-height: 0;\n}\n\n.sidebar-title {\n  flex-shrink: 0;\n}\n\n.sidebar-nav {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n}\n</code></pre>\n<p>在 <code>640px</code> 及以下——与 <code>mobile</code> 报告的正是同一条条件——侧边栏会切换为使用内置 glass body、可滚动 content 和 drag zone 的 <code>web-ui-drawer</code>。Layout 会将 <code>sidebar-width</code> 映射为 <code>--wui-drawer-width</code>，将 <code>--wui-layout-sidebar-radius</code> 映射为 <code>--wui-drawer-radius</code>。移动端 Toggle 以 glass 变体位于 header 行内。其左缩进默认 <code>8px</code>，可通过 <code>--wui-layout-mobile-toggle-inset</code> 与 Consumer 自身的 header 内边距对齐。</p>\n<p><code>header-glow</code> 会在 header 插槽内容和移动端 Toggle 的背后添加 <code>pointer-events: none</code> 的装饰性晕染。它属于 Header 背景而非前景层，因此插槽内容始终位于其上方。晕染颜色取自 <code>--wui-color-page</code>，因此浅色/暗色模式自动跟随；要改颜色，在 <code>web-ui-layout</code>、theme 或其上层任意位置覆盖该属性即可。晕染由两层伪元素合成：<code>::before</code> 在 header 盒内用 <code>linear-gradient</code> 绘制底色并渐变到全透明，<code>::after</code> 再叠一层真实的 <code>backdrop-filter: blur(4px)</code>，并用 <code>mask</code> 让这层模糊的 alpha 沿高度衰减、到底缘附近归零。两层职责分开后，模糊强度与颜色浓度互不牵制。两层都用负 <code>margin</code> 而不是 <code>transform</code> 撑开；模糊层止于 header 上缘，只向下与向两侧延伸。横向裁剪归属 <code>.layout-content</code>，glow 因此不会撑出横向 scrollbar。布局层级顺序为 Header（<code>10</code>）&lt; Auxiliary（<code>20</code>）&lt; Banner（<code>30</code>）&lt; Tabbar（<code>40</code>）&lt; Sidebar（<code>50</code>）。</p>\n<p>侧边栏卡片表面使用 <code>--wui-color-surface-sidebar</code>：浅色保持半透明中性分层，深色比 <code>--wui-color-page</code> 浅一档、与 <code>--wui-color-surface</code> 同级。它独立成 token，是因为 dialog、drawer 和 toast 共用 <code>--wui-color-surface-overlay</code>，可以采用不同表面。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-layout-sidebar-radius",
            "<p>侧边栏卡片圆角（桌面端和移动端共用）</p>",
            "24px"
          ],
          [
            "--wui-layout-mobile-toggle-inset",
            "<p>移动端 header Toggle 的左缩进</p>",
            "8px"
          ],
          [
            "--wui-layout-sidebar-toggle-width",
            "<p>桌面端侧边栏 collapse Toggle 的宽度，下限为 <code>--wui-control-size</code>（36px）</p>",
            "44px"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>五个插槽各占一区：<code>banner</code> 在主体上方全宽，<code>header</code> 是内容区的 sticky header，<code>sidebar</code> 是侧边栏卡片内容，默认插槽是主内容区，<code>tabbar</code> 是底部栏。<code>header-glow</code> 在 header 插槽内容背后加一层装饰性晕染，它属于背景层，插槽内容始终在它上方。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-layout</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> header-glow</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"banner\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>全宽 Banner&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"header\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Header&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"sidebar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>侧边栏&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>正文&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"tabbar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Tabbar&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-layout</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-layout</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> header-glow</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"banner\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>全宽 Banner&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"header\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Header&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"sidebar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>侧边栏&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>正文&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"tabbar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>Tabbar&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-layout</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "Collapsible sidebar",
        "descriptionHtml": "<p><code>sidebar-collapsed</code> 是桌面端的受控 collapse 状态：它只把桌面端 aside 收窄到 <code>collapsed-width</code>，不影响移动端 Drawer。桌面端 Toggle 由 layout 自己渲染，Consumer 只负责把 <code>sidebar-collapsed-change</code> 的请求值回写。两条分支渲染的是同一份 <code>sidebar</code> 插槽内容，所以内容密度要跟着 collapse 变的 Consumer 必须按 <code>mobile</code> 收窄那个条件（例如 <code>collapsed &amp;&amp; !layout.mobile</code>，或 CSS 的 <code>web-ui-layout[mobile]</code>），否则 collapsed state 会一路渲染进 Drawer（issue #195）。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">collapsed</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setCollapsed</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-layout</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  sidebarCollapsed</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{collapsed}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  onsidebar-collapsed-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setCollapsed</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.collapsed)}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"sidebar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>侧边栏&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>正文&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-layout</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-layout</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :sidebarCollapsed</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"collapsed\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @sidebar-collapsed-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"collapsed = $event.detail.collapsed\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"sidebar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>侧边栏&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>正文&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-layout</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> collapsed</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "拖拽调整宽度",
        "descriptionHtml": "<p>开启 <code>sidebar-resizable</code> 后，桌面端侧边栏右缘出现调整 handle（collapsed state 隐藏），拖拽实时改宽；键盘聚焦后用 ←/→ 以 16px 步进（Shift 加速到 64px），Home/End 跳到上下限。拖拽释放或键盘 Enter 提交时派发一次 <code>sidebar-width-change</code>，携带最终像素宽度；Consumer 回写后宽度重新由 <code>sidebar-width</code> 接管，Escape 撤回未提交的调整。<code>sidebar-min-width</code> / <code>sidebar-max-width</code> 是 px 字面量，上限还受一半视口钳制，内置上限优先于配置值。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">width</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setWidth</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'240px'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-layout</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  sidebar-resizable</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  sidebarWidth</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{width}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  sidebar-min-width</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"160px\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  sidebar-max-width</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"360px\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  onsidebar-width-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setWidth</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.width)}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"sidebar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>侧边栏&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>正文&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-layout</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-layout</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    sidebar-resizable</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    :sidebarWidth</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"width\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    sidebar-min-width</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"160px\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    sidebar-max-width</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"360px\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    @sidebar-width-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"width = $event.detail.width\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"sidebar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>侧边栏&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>正文&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-layout</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> width</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'240px'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "移动端 Drawer 与视口判定",
        "descriptionHtml": "<p><code>sidebar-open</code> 是移动端 Drawer 的受控可见性，与 <code>sidebar-collapsed</code> 相互独立。<code>mobile</code> 由 layout 独占写入，它、layout 的渲染分支和 CSS 的 <code>@media (width &lt;= 640px)</code> 是同一条条件，翻转瞬间三者一起变，还额外派发一次 <code>mobile-change</code>。React 要在 <code>useLayoutEffect</code> 里先读 <code>layout.mobile</code> 再订阅（挂载那一刻派发的事件早于订阅）；跨断点那次回写用 <code>flushSync</code>，否则会有一帧新树已上屏而 Consumer 还是旧值（挂载那次读就在 <code>useLayoutEffect</code> 里，<code>setState</code> 本身上屏前生效，不必再包一层）。Vue 的模板监听在元素插入前挂好，直接绑即可。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { flushSync } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'react-dom'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { useLayoutEffect, useRef, useState } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'react'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> layoutRef</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">null</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">mobile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setMobile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">useLayoutEffect</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> layout</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> layoutRef.current</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">!</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">layout) </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  setMobile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(layout.mobile)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onChange</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\"> event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> flushSync</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setMobile</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.mobile))</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  layout.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">addEventListener</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'mobile-change'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, onChange)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> layout.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">removeEventListener</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'mobile-change'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, onChange)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}, [])</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-layout</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  ref</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{layoutRef}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  sidebarOpen</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  onsidebar-open-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.open)}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"sidebar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>导航&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {mobile </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">?</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '移动端'</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> :</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '桌面端'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-layout</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-layout</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    :sidebarOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    @sidebar-open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = $event.detail.open\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">    @mobile-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"mobile = $event.detail.mobile\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  ></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"sidebar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>导航&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">nav</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    {{ mobile ? '移动端' : '桌面端' }}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-layout</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> mobile</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "middle-ellipsis",
    "tag": "web-ui-middle-ellipsis",
    "introHtml": "<p>单行中间省略：保留首尾、丢掉中间，<code>very-long-file-…-abcdefghij.txt</code>；切点落在字素簇边界上，不会劈开代理对或 emoji。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "text",
            "<p>完整文本，组件只读不回写。</p>",
            "string",
            "''"
          ],
          [
            "marker",
            "<p>插在两端之间的标记；空串即截断但不给可见信号。</p>",
            "string",
            "'…'"
          ],
          [
            "marker-position",
            "<p>标记所在的横向比例 0–100；越界夹紧，<code>NaN</code> 回落 50。</p>",
            "number",
            "50"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>使用条件与 <code>text-overflow: ellipsis</code> 相同：<strong>单行、且有确定行内尺寸</strong>。块级盒子、flex 行里的 <code>flex: 1; min-width: 0</code>、grid track 都可以。宿主按自身内容撑宽时不存在可用空间，组件按量到的宽度切一次就停止继续收缩，而不是一路塌到只剩标记。</p>\n<p>文件名场景靠 <code>marker-position</code> 调节，头部是路径噪声、尾部才是扩展名时取大值。下表是示意而非可复现的取值——确切切点取决于字体——取自 16px <code>system-ui</code>、240px 盒子：</p>\n<p>列依次为 marker-position / 240px 盒子里：</p>\n<ul>\n<li><code>0</code> / <code>very-long-file-name-abcdefghi…</code></li>\n<li><code>50</code>（默认） / <code>very-long-file-…-abcdefghij.txt</code></li>\n<li><code>80</code> / <code>very-l…file-name-abcdefghij.txt</code></li>\n</ul>\n<p>切点一律落在<strong>字素簇</strong>边界上：代理对、组合符序列、ZWJ emoji 都不会被从中间劈开。截断期间完整原文写在文本元素的 <code>title</code> 上，放得下之后移除。宿主需为 <code>direction: ltr</code>；<code>direction: rtl</code> 下合串会被双向算法重排。</p>"
      },
      {
        "kind": "prose",
        "key": "已知限制——复制与辅助技术",
        "title": "已知限制——复制与辅助技术",
        "html": "<p>元素里装的是屏幕上那串，因此选中复制拿到的是截断后的文本，读屏与页内查找命中的也是截断后的串。CSS 的 <code>text-overflow</code> 没有这两个问题（它从不改动文本节点），这是用 JS 算切点绕不开的代价；原文经 <code>title</code> 提供。保持全文留在 DOM 里的替代方案及其代价见 <code>docs/research/web-ui-middle-ellipsis-261007.md</code>。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>与 <code>text-overflow: ellipsis</code> 一样需要单行、且有确定的行内尺寸。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> style</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{{ width: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">240</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> text</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"very-long-file-name-abcdefghij.txt\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> style</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"width: 240px\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> text</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"very-long-file-name-abcdefghij.txt\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "标记",
        "descriptionHtml": "<p><code>marker</code> 是插在两端之间的标记，空串表示截断但不给任何可见信号。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> text</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/Users/grey/Documents/design/spec.txt\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> marker</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"***\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> text</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/Users/grey/Documents/design/spec.txt\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> marker</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"***\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "标记位置",
        "descriptionHtml": "<p><code>marker-position</code> 决定标记的横向比例：头部是路径噪声、尾部才是扩展名时取大值。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> text</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/Users/grey/Documents/design/spec.txt\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> marker-position</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">80</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> text</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/Users/grey/Documents/design/spec.txt\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :marker-position</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"80\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-middle-ellipsis</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "option",
    "tag": "web-ui-option",
    "introHtml": "<p><code>&lt;web-ui-select></code> 与 <code>&lt;web-ui-autocomplete></code> 的 option 载体：<code>value</code> 是选中时提交的值，<code>label</code> 是显示文本（缺省时取自身的文本内容），<code>prefix</code> / <code>suffix</code> 插槽放两端的 icon。它不派发面向使用方的事件——挂载、更新与卸载时发出的注册握手只由父级容器消费；选中态由容器回写 <code>selected</code>。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "value",
            "<p>选中时提交给容器的值。</p>",
            "string",
            "''"
          ],
          [
            "label",
            "<p>显示文本；缺省时取默认插槽的文本内容。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用项：留在列表里但不可选中，键盘导航跳过它。</p>",
            "boolean",
            "false"
          ],
          [
            "selected",
            "<p>选中态，由容器回写；写 <code>selected</code> 属性不会通知容器。</p>",
            "boolean",
            "false"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "prefix",
            "<p>文本左侧的 icon 或标识。</p>"
          ],
          [
            "default",
            "<p>option 文本；<code>label</code> 为空时这段文本就是 label。</p>"
          ],
          [
            "suffix",
            "<p>文本右侧的 icon 或标识。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>非表单关联组件（父级 select 统一提交）。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-option-check-display",
            "<p>选中勾选 icon 的 display 值</p>",
            "block"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": "basic",
        "title": "基础 option",
        "descriptionHtml": "<p><code>label</code> 决定容器里显示什么，<code>value</code> 是容器派发出去的值。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"请选择\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vue\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Vue\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"react\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"React\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svelte\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Svelte\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"请选择\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vue\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Vue\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"react\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"React\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svelte\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Svelte\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "basic"
      },
      {
        "id": "prefix-suffix",
        "title": "前后缀 icon",
        "descriptionHtml": "<p>不写 <code>label</code> 时，<code>label</code> 取默认插槽的文本；<code>prefix</code> 与 <code>suffix</code> 不参与这段文本。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideImage, lucideStar } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"请选择\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"photo\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideImage}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        照片</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"starred\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideStar}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        收藏</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"请选择\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"photo\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"14\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideImage\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      照片</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"starred\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"14\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideStar\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      收藏</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideImage, lucideStar } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "prefix-suffix"
      },
      {
        "id": "disabled",
        "title": "禁用项",
        "descriptionHtml": "<p><code>disabled</code> 的项留在列表里，但不可选中，键盘导航也会跳过它。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"请选择\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vue\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Vue\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svelte\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Svelte（暂不可用）\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"请选择\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vue\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Vue\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svelte\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Svelte（暂不可用）\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "disabled"
      }
    ]
  },
  {
    "component": "popover",
    "tag": "web-ui-popover",
    "introHtml": "<p>锚定触发元素的弹出层，支持 click / hover / manual 三种触发方式，<code>trigger</code> 插槽放 trigger、默认插槽放 panel 内容。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "open",
            "<p>弹出层可见性。</p>",
            "boolean",
            "false"
          ],
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "placement",
            "<p>Floating UI 位置。</p>",
            "Placement",
            "'bottom'"
          ],
          [
            "offset",
            "<p>与锚点的距离（px）。</p>",
            "number",
            "8"
          ],
          [
            "trigger",
            "<p>触发方式：<code>click</code>（默认）、<code>hover</code>、<code>manual</code>。</p>",
            "'click' | 'hover' | 'manual'",
            "'click'"
          ],
          [
            "portal",
            "<p>在 theme-owned overlay root 中渲染。</p>",
            "boolean",
            "false"
          ],
          [
            "overlayContainer",
            "<p>显式 Portal 容器（property）。</p>",
            "OverlayContainer",
            "—"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "open-change",
            "<p>弹出层开合，<code>detail.open</code> 为当前状态。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "trigger",
            "<p>trigger，请放入可交互元素。</p>"
          ],
          [
            "default",
            "<p>弹出层内容。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "show()",
            "<p>打开弹出层；<code>disabled</code> 或已打开时不产生效果。</p>"
          ],
          [
            "close()",
            "<p>关闭弹出层；已关闭时不产生效果。</p>"
          ],
          [
            "toggle()",
            "<p>按当前 <code>open</code> 切换。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>Hover 模式使用 <code>pointerenter</code>/<code>pointerleave</code> 加延迟控制。Click 模式点击切换。Manual 模式仅响应命令式调用。</p>"
      },
      {
        "kind": "prose",
        "key": "trigger aria",
        "title": "trigger ARIA",
        "html": "<p>开合状态回写到 trigger 元素：<code>aria-expanded</code> 与 <code>aria-controls</code>（指向 panel）设在 <code>trigger</code> slot 的首个 assigned element 上（包装结构上的同名属性保留兼容）。trigger slot 请放入可交互元素（原生 button、<code>web-ui-button</code>）。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>click 模式点击 trigger 切换；trigger 请放入可交互元素，ARIA 状态会回写到它。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-popover</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    显示详情</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"popover-body\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>这里是弹出层内容&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-popover</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-popover</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>显示详情&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"popover-body\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>这里是弹出层内容&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-popover</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "Hover 触发",
        "descriptionHtml": "<p><code>trigger</code> 为 <code>hover</code> 时用 <code>pointerenter</code> / <code>pointerleave</code> 加延迟控制开合。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-popover</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> trigger</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"hover\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placement</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"top\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>悬停我&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"popover-body\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>悬停显示的气泡&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-popover</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-popover</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"hover\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placement</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"top\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>悬停我&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"popover-body\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>悬停显示的气泡&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-popover</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "受控开合",
        "descriptionHtml": "<p><code>open</code> 可被程序化写入，<code>open-change</code> 只报告用户来源的开合。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-popover</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onopen-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.open)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onClick</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">!</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">open)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    主题设置</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"popover-body\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>受控内容&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-popover</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-popover</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = $event.detail.open\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @click</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = !open\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>主题设置&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"popover-body\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>受控内容&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-popover</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "radio-group",
    "tag": "web-ui-radio-group",
    "introHtml": "<p>一组 <code>&lt;web-ui-radio></code> 的容器：把成员的选中状态收敛成单个 <code>value</code>，选中变化时统一派发 <code>input</code> / <code>change</code>，并负责组级禁用与必填校验。成员自己声明的 <code>name</code> 在组内不参与提交，表单字段名取组上的 <code>name</code>。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用整组，并把禁用态下发给成员。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验：组没有值时拦截原生提交。</p>",
            "boolean",
            "false"
          ],
          [
            "direction",
            "<p>成员排列方向。</p>",
            "'horizontal' | 'vertical'",
            "'vertical'"
          ],
          [
            "value",
            "<p>当前选中的值，也是成员选中态的唯一来源。</p>",
            "string",
            "''"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>选中变化时触发，<code>currentTarget.value</code> 是新值。</p>"
          ],
          [
            "change",
            "<p>与 <code>input</code> 一起派发，语义上表示一次确认。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>组内的 <code>&lt;web-ui-radio></code> 成员。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p><code>disabled</code> 提供继承的有效禁用状态，不改写子项自身的 <code>disabled</code> 属性。<code>direction</code> 传入非法值时回退为 <code>vertical</code>。</p>\n<p>在 group 元素本身，或同一个 <code>&lt;web-ui-theme></code> 作用域内的祖先元素上设置。theme 宿主会为自己的子树声明该间距阶，写在 <code>&lt;web-ui-theme></code> 元素之外的覆盖到不了 group。它的默认值现在经 <code>--wui-space-2</code> 解析，所以在 theme 宿主上覆盖该级会连带改变成员间距；显式设置这个 token 仍然优先于两者。</p>\n<pre><code class=\"language-css\">web-ui-radio-group {\n  --wui-radio-group-gap: 16px;\n}\n</code></pre>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-radio-group-gap",
            "<p>成员 radio 之间的间距</p>",
            "var(--wui-space-2)"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": "basic",
        "title": "单选组",
        "descriptionHtml": "<p>组持有唯一的值：<code>value</code> 决定谁被选中，成员的选中态由组下发，页面只读组的值。</p>\n<p>Tab 进入组时，焦点落在已选中的成员；若尚无选中项，则落在第一个启用成员。组内只有这个成员是 Tab stop。方向键会在启用成员间循环移动焦点并立即选中；<code>Home</code> 和 <code>End</code> 分别选中第一个和最后一个启用成员。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { useState } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'react'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setSize</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'m'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"size\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{size} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setSize</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"s\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>小&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"m\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"l\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>大&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"size\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"size\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"onInput\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"s\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>小&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"m\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"l\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>大&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { WebUiEvent, WebUiRadioGroup } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'m'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onInput</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> WebUiEvent</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">WebUiRadioGroup</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'input'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  size.value </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> event.currentTarget.value</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "basic"
      },
      {
        "id": "direction",
        "title": "排列方向",
        "descriptionHtml": "<p><code>direction</code> 决定成员横排还是竖排，默认 <code>vertical</code>；成员之间的间距由 <code>--wui-radio-group-gap</code> 控制。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> direction</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"horizontal\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"m\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"s\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>小&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"m\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"l\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>大&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> direction</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"horizontal\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"m\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"s\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>小&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"m\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"l\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>大&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "direction"
      },
      {
        "id": "disabled-required",
        "title": "组级禁用与必填",
        "descriptionHtml": "<p><code>disabled</code> 关掉整组的交互，这个禁用态会下发给成员；<code>required</code> 让原生表单校验在组没有值时拦截提交。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"plan\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"basic\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> required</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"basic\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>基础版&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"pro\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>专业版&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"plan\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"basic\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> required</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"basic\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>基础版&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"pro\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>专业版&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "disabled-required"
      }
    ]
  },
  {
    "component": "radio",
    "tag": "web-ui-radio",
    "introHtml": "<p>单个单选 button，与 <code>&lt;web-ui-checkbox></code> 共用选择控件的盒契约；<code>&lt;web-ui-radio-group></code> 负责在一组 option 之间保持单选。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "checked",
            "<p>选中状态。</p>",
            "boolean",
            "false"
          ],
          [
            "value",
            "<p>选中时提交的表单值。</p>",
            "string",
            "''"
          ],
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验。</p>",
            "boolean",
            "false"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>选中状态变化时触发。</p>"
          ],
          [
            "change",
            "<p>用户切换选中状态时触发。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>label 文本；为空时收掉 indicator 与 label 之间的间距。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "布局",
        "title": "布局",
        "html": "<p>与 <code>&lt;web-ui-checkbox></code> 共用同一套选择控件盒契约，包括「label 没有画出东西时收起间距」这一条——宿主高度由内容撑开、不继承页面行高，indicator 宽高走 <code>--wui-selection-control-size</code>，与相邻文字按 <code>vertical-align: middle</code> 对齐。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>默认插槽是 label 文字。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> checked</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{plan </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">===</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'basic'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"basic\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onChange</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setPlan</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'basic'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  基础版</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :checked</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"plan === 'basic'\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"basic\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"plan = 'basic'\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>基础版&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> plan</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'basic'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "禁用与只读",
        "descriptionHtml": "<p><code>disabled</code> 关闭交互，<code>required</code> 让原生表单校验在未选中时拦截提交。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"plan\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"enterprise\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  企业版（暂不可用）</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"plan\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"enterprise\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>企业版（暂不可用）&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "单选组",
        "descriptionHtml": "<p><code>&lt;web-ui-radio-group></code> 同步子项的选中并统一提交表单值；<code>direction</code> 控制排列方向。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"size\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{size} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">direction</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"horizontal\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setSize</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"s\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>小&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"m\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"l\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>大&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-radio-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio-group</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"size\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"size\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> direction</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"horizontal\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"size = $event.currentTarget.value\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"s\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>小&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"m\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"l\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>大&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-radio-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'m'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "segmented-trigger",
    "tag": "web-ui-segmented-trigger",
    "introHtml": "<p><code>&lt;web-ui-segmented></code> 的分段 button：<code>value</code> 是它代表的分段值，选中由父级 segmented 回写 <code>checked</code>，表单提交归父级。点击或 Enter / Space 派发 <code>change</code>——在组内该事件不冒泡，由父级统一派发一次组级事件；脱离组时才冒泡并穿透 shadow。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "value",
            "<p>分段值。</p>",
            "string",
            "''"
          ],
          [
            "checked",
            "<p>当前选中；由父级 segmented 回写，单独写不通知容器。</p>",
            "boolean",
            "false"
          ],
          [
            "disabled",
            "<p>单独禁用该 trigger。</p>",
            "boolean",
            "false"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "change",
            "<p>点击或 Enter / Space 激活未选中的 trigger 时派发；已是当前项时不派发，且不带 <code>detail</code>。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>button 内容；trigger 没有 label 属性，这段内容就是它的全部显示内容。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>非表单关联组件（父级 segmented 统一提交）。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-segmented-trigger-px",
            "<p>水平内边距</p>",
            "12px"
          ],
          [
            "--wui-segmented-trigger-bg-hover",
            "<p>Trigger 悬停背景</p>",
            "--wui-color-state-layer-hover"
          ],
          [
            "--wui-segmented-trigger-bg-active",
            "<p>Trigger 按下背景</p>",
            "--wui-color-state-layer-active"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": "basic",
        "title": "基础",
        "descriptionHtml": "<p><code>value</code> 决定哪个 trigger 是当前项，容器按它回写 <code>checked</code>；默认插槽里的文本就是 button 内容。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { useState } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'react'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">view</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setView</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'day'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{view} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setView</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"day\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>日&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"week\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>周&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"month\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>月&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"view\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"view = $event.currentTarget.value\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"day\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>日&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"week\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>周&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"month\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>月&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> view</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'day'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "basic"
      },
      {
        "id": "disabled",
        "title": "单独禁用",
        "descriptionHtml": "<p><code>disabled</code> 加在 trigger 上只禁这一项：它留在 track 里，但不可选中，键盘导航也跳过它。加在 <code>&lt;web-ui-segmented></code> 上则是禁用全部 trigger。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { useState } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'react'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">view</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setView</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'list'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{view} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setView</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"list\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>列表&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"grid\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        网格</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"view\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"view = $event.currentTarget.value\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"list\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>列表&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"grid\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>网格&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> view</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'list'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "disabled"
      }
    ]
  },
  {
    "component": "segmented",
    "tag": "web-ui-segmented",
    "introHtml": "<p>segmented（单选 button group），子项是 <code>&lt;web-ui-segmented-trigger></code>；<code>value</code> 同步选中项，并与原生 <code>&lt;form></code> 集成。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "variant",
            "<p>材质变体：<code>inset</code>（默认）或 <code>raised</code>。</p>",
            "'inset' | 'raised'",
            "'inset'"
          ],
          [
            "disabled",
            "<p>禁用全部 trigger。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验。</p>",
            "boolean",
            "false"
          ],
          [
            "value",
            "<p>当前选中值。</p>",
            "string",
            "''"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>选中值变化时触发。</p>"
          ],
          [
            "change",
            "<p>用户切换选中时触发。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>投影 <code>&lt;web-ui-segmented-trigger></code> 子项。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "变体",
        "title": "变体",
        "html": "<p><code>inset</code>（默认，「凹」）是不透明实体 track（<code>--wui-color-surface</code>）——1px 描边环与投影全程常驻，静止 indicator 是 <code>--wui-color-surface-segmented</code> 纯灰底，视觉上嵌入 track。浅色下该 token 与 <code>--wui-color-page</code> 同值，track 与页面齐平，凹感只由常驻环与投影承担；深色下它是「比页面高一档」的 elevation，track 依旧浮离页面。<code>raised</code>（「凸」）是经典形态：flat 灰 track（<code>--wui-color-surface-segmented</code>，无环无投影），静止 indicator 是 <code>--wui-color-surface-selected</code> 实体底加柔投影，浮起于 track 之上。两个变体的按压/拖拽态一致——indicator 转透明玻璃（backdrop blur、80ms 淡入的描边环、1.5x 放大），松开淡回各自静止面。非法值回退 <code>inset</code>。</p>\n<p>与原生 <code>&lt;form></code> 集成（通过 <code>ElementInternals</code>）。</p>\n<p>根据 <code>value</code> 同步子 trigger 的 <code>checked</code> 状态。<code>disabled</code> 提供继承的有效禁用状态，不改写 trigger 自身的 <code>disabled</code> 属性。直接设 <code>value</code> 不派发事件。</p>\n<p>按住当前选中项横向拖拽可滑动 indicator，松手吸附到最近 option（快速抛掷按速度切换）。trigger 宽度不等时，拖拽中的 indicator 取「离自身中心最近的那一项」的宽度——即预览松手会落到的那一项，而不是保持按下那一项的宽度。触摸面声明 <code>touch-action: none</code>，拖拽激活期间阻止 <code>touchmove</code> 默认滚动，避免 iOS Safari 中断手势。</p>"
      },
      {
        "kind": "prose",
        "key": "按压态",
        "title": "按压态",
        "html": "<p>track 在所有状态下都是不透明实体面（<code>--wui-color-surface</code>，浅色即 page 同色、无 backdrop filter），1px 描边环与投影全程不变；转为玻璃的是 indicator 这一层。静止态 indicator 是 <code>--wui-color-surface-segmented</code> 实色底、玻璃输出全部关闭；按压/拖拽态获得 backdrop blur、随 80ms 过渡淡入的玻璃描边环与 1.5x 放大，底色全透明：indicator 的 blur 采样面整个落在 track 之内，此前的玻璃 track 上全透明 indicator 在均匀深底与相邻 track 仅差 +0.5 阶，条纹底实测 indicator 内部灰度 std 1.89（背景渗透）；track 实体化后同一采样 std 归零，按压态本体的可感知性由实色 track 与放大/环/投影共同承担，不再需要 tint 打底或压制 track 边缘装饰。底色不淡入——按下第一帧即落定；松开时 indicator 经 <code>--wui-duration-press</code> 淡回实色灰底。</p>"
      },
      {
        "kind": "prose",
        "key": "文字色",
        "title": "文字色",
        "html": "<p>选中与未选中项文字一律保持 <code>--wui-color-text-secondary</code>——<code>inset</code>/<code>raised</code> 两个变体一致，静止态与按压/拖拽态一致。选中态只由 indicator 承担，任何 label 都不着 <code>--wui-color-accent</code>。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>默认插槽投影 segmented-trigger，选中由 <code>value</code> 决定。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{view} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setView</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"day\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>日&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"week\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>周&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"month\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>月&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"view\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"view = $event.currentTarget.value\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"day\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>日&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"week\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>周&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"month\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>月&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> view</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'week'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "变体",
        "descriptionHtml": "<p><code>variant</code> 选择 track 与 indicator 的材质：<code>inset</code>（默认，嵌入 track）或 <code>raised</code>（经典浮起）。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"raised\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"list\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"list\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>列表&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"grid\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>网格&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"raised\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"list\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"list\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>列表&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"grid\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>网格&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "单项禁用",
        "descriptionHtml": "<p><code>disabled</code> 加在组上会禁用全部 trigger；只禁用某一项时加在该 trigger 上。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"a\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"a\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>可用&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"b\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    不可用</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"a\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"a\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>可用&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"b\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>不可用&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented-trigger</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-segmented</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "select",
    "tag": "web-ui-select",
    "introHtml": "<p>选择器下拉框：默认插槽投影 <code>&lt;web-ui-option></code> 候选，<code>trigger</code> 插槽可替换默认触发区域；支持键盘导航与 Portal。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "placeholder",
            "<p>未选中时显示的占位文本。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验。</p>",
            "boolean",
            "false"
          ],
          [
            "portal",
            "<p>在 theme-owned overlay root 中渲染下拉 panel。</p>",
            "boolean",
            "false"
          ],
          [
            "no-scroll-lock",
            "<p>打开时不锁定页面滚动。</p>",
            "boolean",
            "false"
          ],
          [
            "overlayContainer",
            "<p>显式 Portal 容器（property）。</p>",
            "OverlayContainer",
            "—"
          ],
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "value",
            "<p>选中值。</p>",
            "string",
            "''"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>选中值变化时触发。</p>"
          ],
          [
            "change",
            "<p>用户提交选择时触发。</p>"
          ],
          [
            "open-change",
            "<p>下拉 panel 开合，<code>detail.open</code> 为当前状态。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "trigger",
            "<p>自定义触发区域内容，替换默认 label 与箭头。</p>"
          ],
          [
            "default",
            "<p>投影 <code>&lt;web-ui-option></code> 候选。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>子 <code>&lt;web-ui-option></code> 通过 <code>option-register</code> / <code>option-unregister</code> 注册。打开时，面板使用 <code>role=\"listbox\"</code>，候选项使用 <code>role=\"option\"</code>，当前非空 <code>value</code> 对应的 option 设为 <code>aria-selected=\"true\"</code>，<code>aria-disabled</code> 反映禁用状态。非 Portal 模式下，键盘导航时 <code>aria-activedescendant</code> 指向当前 option；Portal 模式因 option 与 combobox 位于不同的 Shadow DOM 树中，不设置此属性。支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航。</p>\n<p>Portal panel 创建时会镜像 host 上解析后的这些变量；更新 host 后需重新打开 Portal panel 才会生效。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-select-max-width",
            "<p>下拉框最大宽度</p>",
            "500px"
          ],
          [
            "--wui-select-max-height",
            "<p>下拉滚动区域最大高度</p>",
            "200px"
          ],
          [
            "--wui-overlay-min-width",
            "<p>下拉框最小宽度</p>",
            "200px"
          ],
          [
            "--wui-select-bg-hover",
            "<p>Trigger 悬停背景</p>",
            "--wui-color-surface-glass-hover"
          ],
          [
            "--wui-select-bg-active",
            "<p>Trigger 按下/打开背景</p>",
            "--wui-color-surface-glass-active"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>子 <code>&lt;web-ui-option></code> 通过事件向父级注册，键盘支持 ArrowDown / ArrowUp / Enter / Escape。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"请选择\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onChange</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setFramework</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vue\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Vue\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"react\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"React\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svelte\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Svelte\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"请选择\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"framework = $event.currentTarget.value\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vue\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Vue\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"react\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"React\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svelte\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Svelte\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> framework</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">''</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "option 装饰",
        "descriptionHtml": "<p><code>&lt;web-ui-option></code> 的 <code>prefix</code> / <code>suffix</code> 插槽在 label 两侧加 icon 或后缀信息，<code>disabled</code> 项不可选。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"选择优先级\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"high\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"高优先级\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>🔴&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>P0&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"low\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"低优先级\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"选择优先级\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"high\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"高优先级\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>🔴&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>P0&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"low\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"低优先级\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "自定义 trigger",
        "descriptionHtml": "<p>把内容放进 <code>trigger</code> 插槽替换默认 label 与箭头，外壳与 overlay 锚点保持默认。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSettings} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">18</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"theme\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"主题设置\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lang\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"语言设置\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSettings\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"18\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"theme\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"主题设置\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lang\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"语言设置\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideSettings } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "slider",
    "tag": "web-ui-slider",
    "introHtml": "<p>范围 slider，支持刻度标记与垂直方向；拖拽走 pointer capture，键盘支持方向键、Home / End 与 PageUp / PageDown。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "marks",
            "<p>显示刻度标记。</p>",
            "boolean",
            "false"
          ],
          [
            "vertical",
            "<p>垂直方向。</p>",
            "boolean",
            "false"
          ],
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "required",
            "<p>必填校验。</p>",
            "boolean",
            "false"
          ],
          [
            "value",
            "<p>当前值。</p>",
            "number",
            "0"
          ],
          [
            "min",
            "<p>最小值。</p>",
            "number",
            "0"
          ],
          [
            "max",
            "<p>最大值。</p>",
            "number",
            "100"
          ],
          [
            "step",
            "<p>步进值。</p>",
            "number",
            "1"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>拖拽 / 输入过程中触发。</p>"
          ],
          [
            "change",
            "<p>松手或键盘确认时触发。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "focus()",
            "<p>聚焦 <code>role=\"slider\"</code> 的 track 元素。</p>"
          ],
          [
            "blur()",
            "<p>让 track 元素失焦。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>支持 ArrowLeft/Right/Up/Down、Home/End、PageUp/PageDown 键盘导航。使用 pointer capture 处理鼠标、触控笔和触摸交互；组件 host 与触控 track 均声明 <code>touch-action: none</code>，拖拽激活期间同时阻止 <code>touchmove</code> 默认滚动，避免 iOS Safari 在横/纵拖拽过程中接管手势。</p>\n<p>thumb 静止态是正圆，直径取厚度 <code>--wui-slider-thumb-thickness</code>；按压或拖拽时沿 track 方向展开成胶囊，厚度不变、长边取 <code>--wui-slider-thumb-length</code>。横向 slider 的 thumb 展开为宽度方向，纵向 slider 的 thumb 展开为高度方向，与 switch thumb 同一套配方。形状切换带 <code>--wui-duration-press</code> 过渡。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-slider-width",
            "<p>slider 宽度</p>",
            "200px"
          ],
          [
            "--wui-slider-vertical-height",
            "<p>垂直 slider 高度</p>",
            "200px"
          ],
          [
            "--wui-slider-track-size",
            "<p>track 厚度</p>",
            "6px"
          ],
          [
            "--wui-slider-thumb-length",
            "<p>thumb 按压/拖拽态沿 track 方向的长边</p>",
            "24px"
          ],
          [
            "--wui-slider-thumb-thickness",
            "<p>thumb 厚度（静止态为正圆直径）</p>",
            "20px"
          ],
          [
            "--wui-slider-marks-inset",
            "<p>marks 内缩</p>",
            "0"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": "basic",
        "title": "基础",
        "descriptionHtml": "<p><code>min</code> / <code>max</code> / <code>step</code> 约束取值范围与步进幅度。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-slider</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> min</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">max</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">100</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">step</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">5</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">40</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-slider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-slider</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :min</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :max</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"100\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :step</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"5\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"40\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-slider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "basic"
      },
      {
        "id": "marks-vertical",
        "title": "刻度与垂直方向",
        "descriptionHtml": "<p><code>marks</code> 显示刻度标记，<code>vertical</code> 让 slider 沿垂直方向排列。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-slider</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> marks</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> vertical</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> min</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">max</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">10</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-slider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-slider</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> marks</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> vertical</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :min</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :max</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"10\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"3\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-slider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "marks-vertical"
      },
      {
        "id": "controlled",
        "title": "受控值",
        "descriptionHtml": "<p>拖拽过程中 <code>input</code> 连续触发，松手或键盘确认时派发一次 <code>change</code>。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { useState } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'react'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">export</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> default</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Demo</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">volume</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setVolume</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">30</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-slider</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">      value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{volume}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">      min</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">      max</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">100</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">      onInput</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setVolume</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    >&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-slider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  )</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-slider</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"volume\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :min</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :max</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"100\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"onInput\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-slider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { WebUiEvent, WebUiSlider } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> volume</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">30</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onInput</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> WebUiEvent</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">WebUiSlider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'input'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  volume.value </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> event.currentTarget.value</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": "controlled"
      }
    ]
  },
  {
    "component": "spinner",
    "tag": "web-ui-spinner",
    "introHtml": "<p>加载旋转器，声明式放在页面里，或用静态 <code>WebUiSpinner.show()</code> / <code>hide()</code> 做阻塞式加载。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "size",
            "<p>尺寸（px）。</p>",
            "number",
            "24"
          ],
          [
            "description",
            "<p>描述文字。</p>",
            "string",
            "''"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "description",
            "<p>描述插槽，替代 <code>description</code> 属性。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "WebUiSpinner.show(options?)",
            "<p>挂载一个全屏实例并返回它；<code>size</code> / <code>description</code> 覆盖默认外观，<code>duration</code> 大于 0 时到期调用 <code>hide()</code>。</p>"
          ],
          [
            "WebUiSpinner.hide()",
            "<p>拆掉计时器并移除 <code>show()</code> 挂载的实例。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>角色：<code>status</code>，<code>aria-label=\"加载中\"</code>。</p>"
      },
      {
        "kind": "prose",
        "key": "静态 api",
        "title": "静态 API",
        "html": "<pre><code class=\"language-ts\">import { WebUiSpinner } from '@greypan/web-ui'\n\nWebUiSpinner.show() // 显示\nWebUiSpinner.show({ size: 32, duration: 2000 }) // 带 option 显示\nWebUiSpinner.hide() // 隐藏\n</code></pre>\n<p><code>WebUiSpinner.show(options?: { size?: number; duration?: number; description?: string })</code></p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-spinner-size",
            "<p>尺寸，由 <code>size</code> 属性写入</p>",
            "24px"
          ],
          [
            "--wui-duration-spinner",
            "<p>叶片追光周期；reduce 下放慢到 <code>1600ms</code>，不停</p>",
            "800ms"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>size</code> 是像素尺寸，宿主带 <code>role=\"status\"</code> 与 <code>aria-label=\"加载中\"</code>。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-spinner</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">16</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-spinner</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-spinner</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">24</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-spinner</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-spinner</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">32</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-spinner</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-spinner</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"16\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-spinner</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-spinner</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"24\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-spinner</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-spinner</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"32\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-spinner</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "描述文字",
        "descriptionHtml": "<p><code>description</code> 属性或 <code>description</code> 插槽在旋转器旁显示说明。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-spinner</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">32</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">description</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"正在加载数据\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-spinner</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-spinner</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"32\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"description\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>正在加载数据&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-spinner</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "阻塞式加载",
        "descriptionHtml": "<p><code>WebUiSpinner.show()</code> 显示全屏加载，<code>duration</code> 到期自动关闭，<code>hide()</code> 立即隐藏。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { WebUiSpinner } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">WebUiSpinner.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">show</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ size: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, description: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'正在同步云端文件'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">WebUiSpinner.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">show</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ duration: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">2000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">WebUiSpinner.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">hide</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { WebUiSpinner } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> sync</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  WebUiSpinner.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">show</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ size: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">64</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, description: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'正在同步云端文件'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, duration: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">2000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "svg-draw-lines",
    "tag": "web-ui-svg-draw-lines",
    "introHtml": "<p>SVG 线条绘制动画：基于 <code>stroke-dashoffset</code> 在原元素上动画，不克隆、不操作 DOM；默认画入，<code>replay({ reverse: true })</code> 沿原路收回。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "duration",
            "<p>动画时长（毫秒），限制在 0–30000。</p>",
            "number",
            "1000"
          ],
          [
            "easing",
            "<p>传递给 <code>element.animate()</code> 的 CSS 缓动函数。</p>",
            "string",
            "'linear'"
          ],
          [
            "no-autoplay",
            "<p>关闭内容首次出现时的自动播放。</p>",
            "boolean",
            "false"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>需要动画的 SVG 内容。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "replay(options?)",
            "<p>停止当前播放并重新开始，每次调用重新收集子树里的几何元素；<code>options.reverse</code> 为 <code>true</code> 时沿原路径收回。返回的 Promise 在动画全部结束后兑现，无目标或当前主题范围启用 reduced motion 时立即兑现。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>三个属性均会反射（reflected）。</p>\n<p>递归遍历 light DOM 和所有开放 Shadow Root，查找 <code>path</code>、<code>rect</code>、<code>circle</code>、<code>line</code>、<code>polyline</code>、<code>polygon</code>、<code>ellipse</code> 元素。以 <code>Z</code>/<code>z</code> 结尾的 <code>&lt;path></code> 会临时应用缺口修复逻辑确保闭合段正确渲染。画入段完成或取消后恢复所有内联样式。</p>"
      },
      {
        "kind": "prose",
        "key": "自动播放",
        "title": "自动播放",
        "html": "<p>slot 内容第一次稳定时自动播放一次画入。设置 <code>no-autoplay</code> 后保持资产原样、由调用方决定何时播放 —— <code>&lt;web-ui-checkbox></code> 正是靠它避免挂载时就已勾选的勾在页面首帧画出来。</p>"
      },
      {
        "kind": "prose",
        "key": "收回末态",
        "title": "收回末态",
        "html": "<p>收回留下的空白是写在被动画的几何元素上的内联样式，包括嵌套开放 Shadow Root（如 <code>&lt;web-ui-icon></code>）里的节点。克隆这些节点（<code>cloneNode</code>、<code>innerHTML</code> 往返）会把空白一起带走；把节点摘下来再挂回去，描边也仍然是隐去的 —— 收回结束是一个 DOM 状态而不是一条还活着的动画，没有留下任何东西去复原它。要重新显示就调用 <code>replay()</code>。由于组件会递归进入嵌套的开放 Shadow Root，两层 <code>&lt;web-ui-svg-draw-lines></code> 不得覆盖同一批几何元素：每个实例只在第一次动画某个元素时记录它的内联 dash 值，内层留下的空白会被外层当成「消费者自己写的值」。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>默认插槽放需要动画的 SVG 内容，内容第一次稳定时自动播放一次画入。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> duration</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">1200</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">svg</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> viewBox</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0 0 24 24\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> fill</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"none\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> stroke</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"currentColor\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">path</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> d</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"M4 12 L10 18 L20 6\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> stroke-width</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"2\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">path</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">svg</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :duration</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"1200\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">svg</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> viewBox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0 0 24 24\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> fill</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"none\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> stroke</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"currentColor\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">path</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> d</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"M4 12 L10 18 L20 6\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> stroke-width</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"2\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">path</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">svg</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "关闭自动播放",
        "descriptionHtml": "<p><code>no-autoplay</code> 让内容保持资产原样，由调用方决定何时播放。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> no-autoplay</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> easing</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ease-out\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideCheck}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> no-autoplay</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> easing</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ease-out\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideCheck\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideCheck } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "手工重播",
        "descriptionHtml": "<p><code>replay()</code> 取消当前动画并重新收集几何元素；<code>reverse</code> 让线条沿原路收回，收尾的空白作为 DOM 状态保留。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> ref</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">null</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> replay</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ref.current?.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">replay</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> retract</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> () </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> ref.current?.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">replay</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ reverse: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{ref}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">svg</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> viewBox</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0 0 24 24\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> stroke</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"currentColor\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">path</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> d</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"M4 12 L10 18 L20 6\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">path</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">svg</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onClick</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{replay}>重播&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onClick</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{retract}>收回&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lines\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">svg</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> viewBox</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0 0 24 24\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> stroke</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"currentColor\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">path</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> d</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"M4 12 L10 18 L20 6\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">path</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">svg</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-svg-draw-lines</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @click</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lines?.replay()\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>重播&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @click</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lines?.replay({ reverse: true })\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>收回&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { useTemplateRef } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> lines</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useTemplateRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'lines'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "switch",
    "tag": "web-ui-switch",
    "introHtml": "<p>switch 切换，声明 <code>role=\"switch\"</code> 与 <code>aria-checked</code>；<code>loading</code> 期间阻断交互并显示待定状态。键盘焦点落在内层原生 checkbox 上，<strong>空格与 Enter 都能切换</strong>。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "checked",
            "<p>打开 / 关闭状态。</p>",
            "boolean",
            "false"
          ],
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "value",
            "<p>表单提交值。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验。</p>",
            "boolean",
            "false"
          ],
          [
            "loading",
            "<p>加载状态。</p>",
            "boolean",
            "false"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>状态变化时触发。</p>"
          ],
          [
            "change",
            "<p>用户切换 switch 时触发。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>使用 <code>role=\"switch\"</code> 和 <code>aria-checked</code>。Pointer 事件管理按下状态。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>checked</code> 是 switch 状态，<code>value</code> 是表单提交值。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-switch</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> checked</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{enabled} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onChange</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setEnabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.checked)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  启用通知</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-switch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-switch</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :checked</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"enabled\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"enabled = !enabled\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>启用通知&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-switch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> enabled</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "加载与禁用",
        "descriptionHtml": "<p><code>loading</code> 阻断交互并显示加载态，<code>disabled</code> 直接禁用。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-switch</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> loading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存中&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-switch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-switch</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>不可更改&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-switch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-switch</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> loading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存中&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-switch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-switch</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>不可更改&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-switch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "表单值",
        "descriptionHtml": "<p>switch 自身不渲染 label 盒之外的内容，<code>name</code> 与 <code>value</code> 让它在表单里以选中值参与提交。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">form</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-switch</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"newsletter\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"on\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> required</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    订阅邮件</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-switch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">form</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">form</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-switch</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> name</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"newsletter\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"on\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> required</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>订阅邮件&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-switch</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">form</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "textarea",
    "tag": "web-ui-textarea",
    "introHtml": "<p>多行文本 input，支持清除 button、自动高度与前后缀插槽；焦点委托到 shadow 内的原生 textarea。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "placeholder",
            "<p>占位文本。</p>",
            "string",
            "''"
          ],
          [
            "name",
            "<p>表单字段名。</p>",
            "string",
            "''"
          ],
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "readonly",
            "<p>只读状态。</p>",
            "boolean",
            "false"
          ],
          [
            "required",
            "<p>必填校验。</p>",
            "boolean",
            "false"
          ],
          [
            "full",
            "<p>占满父容器宽度。</p>",
            "boolean",
            "false"
          ],
          [
            "clearable",
            "<p>显示清除 button。</p>",
            "boolean",
            "false"
          ],
          [
            "borderless",
            "<p>ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。</p>",
            "boolean",
            "false"
          ],
          [
            "rows",
            "<p>显示行数。</p>",
            "number",
            "3"
          ],
          [
            "minlength",
            "<p>最小长度校验。</p>",
            "number | undefined",
            "—"
          ],
          [
            "maxlength",
            "<p>最大长度校验。</p>",
            "number | undefined",
            "—"
          ],
          [
            "autosize",
            "<p>自动调整高度，同时强制 <code>resize: none</code>。</p>",
            "boolean",
            "false"
          ],
          [
            "max-height",
            "<p>自动高度上限（px），0 表示不限制。</p>",
            "number",
            "0"
          ],
          [
            "aria-label",
            "<p>无障碍 label。</p>",
            "string | null",
            "null"
          ],
          [
            "aria-labelledby",
            "<p>无障碍 label 引用。</p>",
            "string | undefined",
            "—"
          ],
          [
            "value",
            "<p>输入值。</p>",
            "string",
            "''"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "input",
            "<p>输入时触发。</p>"
          ],
          [
            "change",
            "<p>提交时触发。</p>"
          ],
          [
            "focus",
            "<p>获得焦点时触发。</p>"
          ],
          [
            "blur",
            "<p>失去焦点时触发。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "prefix",
            "<p>textarea 左侧的 icon 或文字。</p>"
          ],
          [
            "suffix",
            "<p>textarea 右侧的 icon 或文字。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "focus(options?)",
            "<p>聚焦 shadow 内的原生 textarea；<code>disabled</code> 时不产生效果。</p>"
          ],
          [
            "blur()",
            "<p>让 shadow 内的原生 textarea 失焦。</p>"
          ],
          [
            "select()",
            "<p>全选当前值；<code>disabled</code> 时不产生效果。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-textarea-width",
            "<p>textarea 宽度</p>",
            "200px"
          ],
          [
            "--wui-textarea-clear-color",
            "<p>清除 button 颜色</p>",
            "var(--wui-color-text-tertiary)"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>rows</code> 决定初始显示行数，<code>placeholder</code> 在空值时显示。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-textarea</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> rows</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"写下你的想法\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-textarea</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-textarea</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :rows</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"4\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"写下你的想法\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-textarea</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "自动高度",
        "descriptionHtml": "<p><code>autosize</code> 按内容撑高并强制 <code>resize: none</code>；<code>max-height</code> 是自动高度上限，0 表示不限。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-textarea</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> autosize</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> max-height</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">320</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入多行内容，高度自适应\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-textarea</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-textarea</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> autosize</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :max-height</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"320\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入多行内容，高度自适应\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-textarea</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "前后缀",
        "descriptionHtml": "<p><code>prefix</code> / <code>suffix</code> 插槽在 textarea 两侧放 icon 或计数。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-textarea</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> clearable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"备注\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>📝&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>最多 200 字&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-textarea</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-textarea</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> clearable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"备注\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>📝&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>最多 200 字&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-textarea</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "theme",
    "tag": "web-ui-theme",
    "introHtml": "<p>主题提供者：在自己的子树内定义基础、颜色、层级、阴影与动效 token，并作为该子树的 theme-owned overlay root。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "appearance",
            "<p>配色方案：<code>light</code>、<code>dark</code> 或 <code>system</code>。</p>",
            "ThemeAppearance | undefined",
            "—"
          ],
          [
            "resolved-appearance",
            "<p>解析后的配色方案，只读反射输出。</p>",
            "ResolvedThemeAppearance",
            "'light'"
          ],
          [
            "motion",
            "<p>当前嵌套主题范围的动效偏好：<code>full</code>、<code>reduced</code> 或 <code>system</code>。</p>",
            "ThemeMotion",
            "'system'"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>主题作用域内的内容。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "getOverlayRoot()",
            "<p>返回该主题拥有的 theme-owned overlay root；未设置 <code>appearance</code> 时返回 <code>undefined</code>。</p>"
          ],
          [
            "isReducedMotion()",
            "<p>当前主题范围是否应减少动效：<code>motion</code> 为 <code>reduced</code> / <code>full</code> 时直接给出 <code>true</code> / <code>false</code>，<code>system</code> 时跟随系统偏好。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "portal 挂载契约",
        "title": "Portal 挂载契约",
        "html": "<p>每个 active <code>&lt;web-ui-theme></code> 同时是默认的 scoped theme-owned overlay root。Portal 类组件在未显式传入 <code>overlayContainer</code> 时，会解析到最近的 active theme 的 <code>getOverlayRoot()</code>；无 target 的调用优先使用 root theme 的 theme-owned overlay root。没有 active theme 提供 root 时，回退到全局 fallback overlay root。</p>"
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>在其子树中定义基础、颜色、层级、阴影和动效 token。<code>motion=\"system\"</code> 跟随 <code>prefers-reduced-motion</code>；使用 <code>motion=\"reduced\"</code> 降低当前作用域动效，或在嵌套主题中使用 <code>motion=\"full\"</code> 恢复默认 token。System 配色模式跟随 <code>prefers-color-scheme</code>。</p>\n<p><code>resolved-appearance</code> 是只读的派生宿主属性（同时以 <code>resolvedAppearance</code> property 暴露）：值恒为 <code>light</code> 或 <code>dark</code>；显式 <code>appearance</code> 直接透传，<code>appearance=\"system\"</code> 从 <code>prefers-color-scheme</code> 解析，OS 深浅翻转时实时更新。未设置 <code>appearance</code> 的主题仍保持 inactive，但解析输出使用默认值 <code>light</code>。该 attribute 由组件独占写入并会恢复外部改动，因此消费端可以直接把选择器或 Tailwind custom variant 绑定到 <code>resolved-appearance</code>，无需再维护第二份主题状态。</p>\n<p>配色变化是否使用 View Transitions API 播放动画，由当前主题范围的 <code>motion</code> 档位决定：<code>full</code> 始终播放揭示，<code>reduced</code> 直接落地新 appearance、不播放揭示，<code>system</code> 跟随 <code>prefers-reduced-motion</code>。根主题揭示整页；嵌套主题只揭示自己的 capture box。圆心优先取最近一次 pointerdown 坐标，否则回退主题盒或视口中心；揭示方向跟随解析后的外观，包括 <code>appearance=\"system\"</code> 从 <code>prefers-color-scheme</code> 解析出的结果，深浅两个方向反向播放。不支持的浏览器、reduced-motion 作用域、时长为 0 以及同一 flight 内已有未完成请求都会立即落地新 appearance；当前版本对 <code>appearance=\"system\"</code> 的 OS 深浅翻转不做动画。</p>\n<p>揭示进行中，View Transitions 的 rendering-suppression 规则会强制所有 pointer hit-test 指向 document element，因此 CSS <code>pointer-events</code> 覆盖无法让底层页面继续交互。主题只在 <code>pointerdown</code> 或 wheel 时调用 <code>skipTransition()</code>；<code>pointermove</code> 与 <code>pointerup</code> 永远不会结束揭示，因此发起控件的收尾移动或过渡期间的普通移动都不会打断动画。触发 skip 的事件本身仍按规范以 document element 为目标，但失效窗口到此为止，不会持续满整个揭示时长。</p>\n<p>主题宿主使用 <code>display: contents</code> 且不绘制任何背景：组件库不在宿主页面画背景，嵌入方对主题子树背后的表面保留完全控制权。自定义属性仍可靠继承到 slotted 内容。</p>"
      },
      {
        "kind": "prose",
        "key": "从已移除的 transition 属性迁移",
        "title": "从已移除的 transition 属性迁移",
        "html": "<p>删掉该属性，改用 <code>motion</code> 表达意图。原先带 <code>transition</code> 的主题在默认 <code>motion=\"system\"</code> 下揭示行为不变；需要在系统偏好 reduce 时仍播放揭示，则加 <code>motion=\"full\"</code>。原先不带 <code>transition</code> 的主题现在默认就会揭示，若要保持无动画直接切换，请显式设置 <code>motion=\"reduced\"</code>。</p>"
      },
      {
        "kind": "prose",
        "key": "根节点 page 色同步",
        "title": "根节点 page 色同步",
        "html": "<p>最外层 active theme 会把自己计算出的 <code>--wui-color-page</code> 以行内自定义属性的形式镜像到 <code>document.documentElement</code> 上。它补上的正是该 token 自己到不了的那一处——自定义属性的继承链到 documentElement 就断了，所以消费方写 <code>body { background: var(--wui-color-page) }</code> 只能给滚动区上色，橡皮筋回弹（macOS rubber-band）露出的画布区仍是 UA 背景色；有了这个镜像属性，回弹区也跟随主题。写入时机是主题连接时与 appearance 变化时（含 <code>appearance=\"system\"</code> 跟随系统深浅翻转）；写入的是该主题的计算值，因此消费者在 host 上覆盖 <code>--wui-color-page</code> 会被按当前值原样镜像。<strong>非实时：</strong> 组件不观察 host 自身的样式变化，因此运行中改该属性（改行内样式、切 class、host 级媒体查询）不会实时镜像到 root，要等下一个写入触发点——连接、<code>appearance</code> 变成另一个值、或系统深浅翻转；把 <code>appearance</code> 重新赋成当前值不算触发点，因为值没变时更新会被跳过。页面色需要独立于主题 appearance 变化时，消费者自己在该变量上持有它：在 <code>:root</code> 或 <code>body</code> 上用 <code>!important</code> 定义 <code>--wui-color-page</code>，重要声明在层级上压过本模块写在 documentElement 上的行内值；或者让页面色跟随 <code>appearance</code> 走。只有最外层主题会写入：嵌套主题保留自己的作用域，不改写 root 值。同步权按 connect 顺序归属，最外层断开时顺延给下一个已连接主题；最后一个主题断开时刻意保留最后值而不是移除，避免主题切换间隙闪回 UA 背景。组件库在 documentElement 上只写这一个自定义属性，不写其它内容。</p>"
      },
      {
        "kind": "table",
        "key": "foundation tokens",
        "title": "Foundation tokens",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-input-width",
            "<p>紧凑表单控件默认宽度</p>",
            "200px"
          ],
          [
            "--wui-control-size",
            "<p>控件默认高度和方形最小宽</p>",
            "36px"
          ],
          [
            "--wui-overlay-min-width",
            "<p>锚定 overlay 最小宽度</p>",
            "200px"
          ],
          [
            "--wui-focus-ring-width",
            "<p>Focus indicator 宽度</p>",
            "3px"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "排版 token",
        "title": "排版 token",
        "html": "<p>字号按文字扮演的角色命名，而不是按它在尺度里的位置——<code>caption</code> 是密集 chrome 上的小 label，<code>readout</code> 是数字读数，无后缀的基准字号是正文，<code>title</code> 是有界卡片标题。字重按重量命名，行高按这段文字需要的垂直空气命名。这一族与外观无关：light 和 dark 下取值相同。</p>\n<p>组件里的 <code>line-height: 1</code> 与 <code>line-height: 0</code> 刻意不做 token：前者是控件内单行 label 的垂直居中手段，后者是把包裹盒高收缩到内容——两者都不是排版行高，token 化会诱使调用方把它们当成行高去整体调节。</p>"
      },
      {
        "kind": "table",
        "key": "typography tokens",
        "title": "Typography tokens",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-font-size-caption",
            "<p>密集 chrome label（badge、toast 时间戳、menu group 头）</p>",
            "12px"
          ],
          [
            "--wui-font-size-readout",
            "<p>数字读数（image preview 的计数与缩放比）</p>",
            "13px"
          ],
          [
            "--wui-font-size",
            "<p>正文与控件的基础字号（含控件的占位文本）</p>",
            "14px"
          ],
          [
            "--wui-font-size-title",
            "<p>有界卡片标题（dialog、drawer）</p>",
            "18px"
          ],
          [
            "--wui-font-weight-medium",
            "<p>强调行内文字的中等字重</p>",
            "500"
          ],
          [
            "--wui-font-weight-semibold",
            "<p>标题的半粗字重</p>",
            "600"
          ],
          [
            "--wui-line-height-tight",
            "<p>大号标题的紧行高</p>",
            "1.2"
          ],
          [
            "--wui-line-height-snug",
            "<p>中号标题的适中行高</p>",
            "1.4"
          ],
          [
            "--wui-line-height-normal",
            "<p>正文的常规行高</p>",
            "1.5"
          ],
          [
            "--wui-line-height-relaxed",
            "<p>长文阅读的宽松行高</p>",
            "1.6"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "间距 token",
        "title": "间距 token",
        "html": "<p>4px 基准的六级阶，止于 24px——组件层以生效的静态节奏字面量写入的最大间距值。（唯一更宽的是 <code>&lt;web-ui-empty></code> 的 <code>32px 24px</code>，它由 <code>--wui-empty-size</code> 在 JS 侧派生，属尺寸那根轴而非节奏，理由见下面的排除项。）它不替代组件各自的覆盖 token（<code>--wui-button-px</code>、<code>--wui-dialog-padding</code> 等），而是充当那些 token 的 fallback 默认值——组件仍然决定自己的 padding，间距阶只说明这个值在整体节奏里的位置。因此覆盖某一级，就等于给嵌入应用一根作用于所有已挂阶调用点的密度杠杆——它调的是节奏，不是结构，理由见下面的排除项。</p>\n<p>这一阶刻意不含 <code>1px</code>、<code>2px</code>、<code>6px</code>、<code>7.5px</code>、<code>10px</code> 和负值。<code>1px</code> 是发丝线和描边环的结构宽度；<code>2px</code>、<code>6px</code>、<code>7.5px</code> 是光学修正；<code>10px</code> 是 4px 阶之外的半档耦合值；负 margin 用来抵消 flex gap 或 button 的 padding。它们的「为什么是这个数」各自独立，没有共享间距语义，收进同一把尺子只会让覆盖其中之一时误伤其余。</p>\n<p>第二类排除按语义而非按取值：对齐视口边缘或宿主自身内容边缘的偏移量，即使正好落在 4px 阶上也不挂阶——<code>--wui-image-preview-edge-gap</code>、<code>--wui-toast-viewport-gap</code>、<code>--wui-layout-mobile-toggle-inset</code>、<code>--wui-back-top-right</code> / <code>--wui-back-top-left</code> / <code>--wui-back-top-bottom</code>、<code>--wui-drawer-inset</code> 与 <code>--wui-drawer-close-right</code>。它们的参照系是屏幕或宿主的内容边缘，不是相邻元素之间的节奏；并进间距阶会让「收紧 <code>--wui-space-2</code>」意外把组件推离屏幕边缘。<code>--wui-drawer-close-top</code> 是反例：它经 <code>--wui-space-4</code> 解析，因为它要跟随 drawer 的 header padding，两者必须一起动。</p>\n<p>第三类排除是由组件<strong>尺寸</strong> prop 派生、而非写成节奏值的间距：<code>&lt;web-ui-empty></code> 让 <code>padding</code>、<code>min-block-size</code> 与图形尺寸跟随 <code>--wui-empty-size</code> 缩放，<code>40</code> / <code>56</code> / <code>72</code> 三档实测 padding 分别是 <code>23px 17px</code> / <code>32px 24px</code> / <code>41px 31px</code>。这六个值里有四个是奇数，4px 阶根本无法表示；<code>56</code> 档的 <code>32px 24px</code> 落在基准上纯属尺寸选值的巧合——<code>56</code> 是三档里唯一被 7 整除的，商恰为 8，而 8 本身是 4 的倍数，取整在这一档根本没有发生。一根在三个尺寸里有两个静默失效、只在第三个上碰巧生效的密度杠杆，比没有杠杆更糟；何况整组值本来就随 <code>size</code> 走，因此不挂阶。这里直接写 px 即可。</p>\n<p>覆盖必须落在 <code>&lt;web-ui-theme></code> 作用域内，因为 theme 宿主只为自己的子树声明这些级。已知边界：<code>assets/*.css</code> 的 overlay 样式有两条注入路径——经 theme 自带的 overlay root 注入时间距阶生效，退到 document 级 fallback overlay root（一个看不到 theme token 的普通 <code>div</code>）时，overlay 间距恒取字面量 fallback。</p>"
      },
      {
        "kind": "table",
        "key": "spacing tokens",
        "title": "Spacing tokens",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-space-1",
            "<p>紧凑内边距（badge、menu）</p>",
            "4px"
          ],
          [
            "--wui-space-2",
            "<p>控件间距、组间距、行内间距</p>",
            "8px"
          ],
          [
            "--wui-space-3",
            "<p>控件水平内边距</p>",
            "12px"
          ],
          [
            "--wui-space-4",
            "<p>标准区块间距</p>",
            "16px"
          ],
          [
            "--wui-space-5",
            "<p>overlay 内容内边距</p>",
            "20px"
          ],
          [
            "--wui-space-6",
            "<p>宽 overlay 内边距</p>",
            "24px"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "selection control tokens",
        "title": "Selection control tokens",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-selection-control-size",
            "<p>indicator（圆点 / 方框）宽高</p>",
            "18px"
          ],
          [
            "--wui-radio-group-gap",
            "<p><code>&lt;web-ui-radio-group></code> 的成员间距</p>",
            "var(--wui-space-2)"
          ],
          [
            "--wui-checkbox-group-gap",
            "<p><code>&lt;web-ui-checkbox-group></code> 的成员间距</p>",
            "var(--wui-space-2)"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "radius tokens",
        "title": "Radius tokens",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-radius-control",
            "<p>小型控件的胶囊圆角（button、input、switch、option…）</p>",
            "calc(infinity * 1px)"
          ],
          [
            "--wui-radius-menu",
            "<p>menu/Popover 浮动 panel、多行 textarea 与 toast</p>",
            "18px"
          ],
          [
            "--wui-radius-overlay",
            "<p>大型覆盖层：dialog、drawer、layout sidebar</p>",
            "28px"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "layer tokens",
        "title": "Layer tokens",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-layer-inline-overlay",
            "<p>组件内部 overlay</p>",
            "1"
          ],
          [
            "--wui-layer-header",
            "<p>页面 Header</p>",
            "10"
          ],
          [
            "--wui-layer-auxiliary",
            "<p>悬浮工具控件</p>",
            "20"
          ],
          [
            "--wui-layer-banner",
            "<p>Banner</p>",
            "30"
          ],
          [
            "--wui-layer-tabbar",
            "<p>Tab Bar</p>",
            "40"
          ],
          [
            "--wui-layer-sidebar",
            "<p>侧边栏</p>",
            "50"
          ],
          [
            "--wui-layer-menu",
            "<p>menu/浮动 panel</p>",
            "100"
          ],
          [
            "--wui-layer-menu-nested",
            "<p>嵌套 menu</p>",
            "110"
          ],
          [
            "--wui-layer-toast",
            "<p>Toast</p>",
            "200"
          ],
          [
            "--wui-layer-loading",
            "<p>阻塞式 Loading</p>",
            "300"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "动效 token",
        "title": "动效 token",
        "html": "<p>duration 默认值为 <code>--wui-duration-press: 80ms</code>、<code>--wui-duration-feedback: 100ms</code>、<code>--wui-duration-trigger: 160ms</code>、<code>--wui-duration-focus: 200ms</code>、<code>--wui-duration-float-enter: 240ms</code>、<code>--wui-duration-float-exit: 160ms</code>、<code>--wui-duration-dialog-enter: 320ms</code>、<code>--wui-duration-dialog-exit: 260ms</code>、<code>--wui-duration-drawer-enter: 280ms</code>、<code>--wui-duration-drawer-exit: 240ms</code>、<code>--wui-duration-drawer-nested: 450ms</code>、<code>--wui-duration-toast-enter: 280ms</code>、<code>--wui-duration-toast-exit: 200ms</code>、<code>--wui-duration-collapse-enter: 200ms</code>、<code>--wui-duration-collapse-exit: 160ms</code>、<code>--wui-duration-layout: 200ms</code>、<code>--wui-duration-swipe-settle: 220ms</code>（image-preview 轮播回位）、<code>--wui-duration-spin: 600ms</code>（icon 旋转）、<code>--wui-duration-spinner: 800ms</code>（spinner 叶片追光）与 <code>--wui-theme-transition-duration: 500ms</code>（主题配色揭示）。Easing token 是 <code>--wui-ease-enter</code>、<code>--wui-ease-dialog</code>（<code>cubic-bezier(0.2, 0, 0, 1)</code>）、<code>--wui-ease-slide</code>、<code>--wui-ease-float</code>（<code>cubic-bezier(0.4, 0.38, 0.2, 1)</code>，锚定浮动 panel 专用的无回弹弹簧拟合曲线）、<code>--wui-ease-swipe</code>（<code>cubic-bezier(0.32, 0.72, 0, 1)</code>，轮播回位的减速收尾）与 <code>--wui-theme-transition-easing: ease-in</code>；进入缩放是 <code>--wui-scale-enter: 0.9</code>（浮动 panel 与 image-preview 的图片舞台层由小到大展开），dialog 使用 <code>--wui-dialog-scale-enter: 1.1</code>（由大到小收缩入场，退场反向）。<code>motion=\"reduced\"</code> 下所有转场时长归零（轮播回位一并归零），两个无限加载循环只放慢、不停（<code>--wui-duration-spin</code> / <code>--wui-duration-spinner</code>：<code>600ms</code> / <code>800ms</code> → <code>1600ms</code>）。加载指示冻结会被读成界面卡死。hover/active 背景反馈即时切换、无过渡动画；选中态、按压与 focus 走带时长的过渡，reduce 下同样归零。</p>"
      },
      {
        "kind": "table",
        "key": "color tokens",
        "title": "Color tokens",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "浅色默认值",
            "kind": "code"
          },
          {
            "title": "深色默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-color-page",
            "<p>页面背景</p>",
            "#fff",
            "#242628"
          ],
          [
            "--wui-color-surface",
            "<p>普通 表面</p>",
            "#fff",
            "#2c2c2e"
          ],
          [
            "--wui-color-surface-raised",
            "<p>抬升表面</p>",
            "#f2f2f7",
            "#2c2c2e"
          ],
          [
            "--wui-color-surface-control",
            "<p>中性可交互控件表面</p>",
            "#dfdfdf",
            "#3a3a3c"
          ],
          [
            "--wui-color-surface-track",
            "<p>Slider/Switch track 表面</p>",
            "#e5e5ea",
            "#444446"
          ],
          [
            "--wui-color-surface-menu",
            "<p>Menu 和浮动 panel 表面</p>",
            "rgb(250 250 250 / 0.76)",
            "rgb(49 48 50 / 0.74)"
          ],
          [
            "--wui-color-surface-glass",
            "<p>液态玻璃表面</p>",
            "rgb(250 250 250 / 0.34)",
            "rgb(44 44 46 / 0.42)"
          ],
          [
            "--wui-color-surface-glass-hover",
            "<p>Glass 完整悬停背景</p>",
            "color-mix(... text 6%, surface-glass)",
            "color-mix(... text 6%, surface-glass)"
          ],
          [
            "--wui-color-surface-glass-active",
            "<p>Glass 完整按下背景</p>",
            "color-mix(... text 15%, surface-glass)",
            "color-mix(... text 15%, surface-glass)"
          ],
          [
            "--wui-color-surface-overlay",
            "<p>半透明 overlay 表面</p>",
            "rgb(248 248 248 / 0.92)",
            "rgb(32 34 34 / 0.92)"
          ],
          [
            "--wui-color-surface-sidebar",
            "<p>侧边栏 panel 表面</p>",
            "rgb(233 233 233 / 0.82)",
            "rgb(44 44 46 / 0.8)"
          ],
          [
            "--wui-color-surface-segmented",
            "<p>Segmented indicator 表面</p>",
            "#e5e5ea",
            "#3a3a3c"
          ],
          [
            "--wui-color-surface-selected",
            "<p>选中表面</p>",
            "#fff",
            "#5c5c5e"
          ],
          [
            "--wui-color-text",
            "<p>主要文本</p>",
            "#1b1b1b",
            "#e9eaea"
          ],
          [
            "--wui-color-text-secondary",
            "<p>次要文本</p>",
            "#6a6a6a",
            "#a1a1a6"
          ],
          [
            "--wui-color-text-tertiary",
            "<p>三级文本和弱意图 icon</p>",
            "color-mix(in srgb, var(--wui-color-text) 35%, transparent)",
            "color-mix(in srgb, var(--wui-color-text) 42%, transparent)"
          ],
          [
            "--wui-color-text-disabled",
            "<p>禁用态前景文本</p>",
            "color-mix(in srgb, var(--wui-color-text) 32%, transparent)",
            "color-mix(in srgb, var(--wui-color-text) 38%, transparent)"
          ],
          [
            "--wui-color-state-layer-hover",
            "<p>透明悬停层</p>",
            "color-mix(in srgb, var(--wui-color-text) 6%, transparent)",
            "color-mix(in srgb, var(--wui-color-text) 6%, transparent)"
          ],
          [
            "--wui-color-state-layer-active",
            "<p>透明按下层</p>",
            "color-mix(in srgb, var(--wui-color-text) 15%, transparent)",
            "color-mix(in srgb, var(--wui-color-text) 15%, transparent)"
          ],
          [
            "--wui-color-border",
            "<p>常规边框和 divider</p>",
            "rgb(0 0 0 / 0.1)",
            "rgb(255 255 255 / 0.14)"
          ],
          [
            "--wui-color-glass-highlight",
            "<p>表面 inset 高光</p>",
            "rgb(255 255 255 / 0.9)",
            "rgb(255 255 255 / 0.1)"
          ],
          [
            "--wui-color-glass-ring",
            "<p>1px 描边环底色</p>",
            "rgb(0 0 0 / 0.05)",
            "rgb(255 255 255 / 0.05)"
          ],
          [
            "--wui-color-glass-ring-sheen",
            "<p>描边环角落受光光泽</p>",
            "rgb(255 255 255 / 0.5)",
            "rgb(255 255 255 / 0.2)"
          ],
          [
            "--wui-color-glass-ring-shade",
            "<p>描边环角落背光压暗</p>",
            "rgb(0 0 0 / 0.03)",
            "rgb(0 0 0 / 0.5)"
          ],
          [
            "--wui-color-accent",
            "<p>Accent 和输入焦点边框</p>",
            "#08f",
            "#0a84ff"
          ],
          [
            "--wui-color-on-accent",
            "<p>Accent 上的前景色</p>",
            "#fff",
            "#fff"
          ],
          [
            "--wui-color-on-control",
            "<p>控件内芯前景色</p>",
            "#fff",
            "#f2f2f7"
          ],
          [
            "--wui-color-success",
            "<p>成功</p>",
            "#16a34a",
            "#30d158"
          ],
          [
            "--wui-color-warning",
            "<p>警告</p>",
            "#d97706",
            "#ff9f0a"
          ],
          [
            "--wui-color-danger",
            "<p>危险</p>",
            "#dc2626",
            "#ff453a"
          ],
          [
            "--wui-color-info",
            "<p>信息</p>",
            "#2563eb",
            "#64d2ff"
          ],
          [
            "--wui-color-backdrop",
            "<p>Modal backdrop</p>",
            "rgb(0 0 0 / 0.12)",
            "rgb(0 0 0 / 0.48)"
          ],
          [
            "--wui-color-focus-ring",
            "<p>Focus indicator 颜色，由 accent 派生</p>",
            "color-mix(in srgb, var(--wui-color-accent, #08f) 40%, transparent)",
            "color-mix(in srgb, var(--wui-color-accent, #0a84ff) 62%, transparent)"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "shadow tokens",
        "title": "Shadow tokens",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "浅色默认值",
            "kind": "code"
          },
          {
            "title": "深色默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-shadow-overlay",
            "<p>Modal/Drawer 阴影</p>",
            "2px 16px 40px rgb(0 0 0 / 0.4)",
            "0 18px 48px rgb(0 0 0 / 0.48)"
          ],
          [
            "--wui-shadow-panel",
            "<p>小型浮动 panel 阴影</p>",
            "0 3px 9px rgb(0 0 0 / 0.27)",
            "0 4px 16px rgb(0 0 0 / 0.32)"
          ],
          [
            "--wui-shadow-glass",
            "<p>液态玻璃基础阴影</p>",
            "四层扩散阴影",
            "0 8px 24px rgb(0 0 0 / 0.08)"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "玻璃效果 token",
        "title": "玻璃效果 token",
        "html": "<p><code>--wui-glass-brightness</code> 浅色模式为 <code>1.06</code>，深色模式为 <code>1.02</code>。<code>--wui-glass-corner-radius</code> 默认值为 <code>32px</code>；非 pill 玻璃表面以自身语义圆角（<code>--wui-radius-menu</code> / <code>--wui-radius-overlay</code>，drawer 为 <code>--wui-drawer-radius</code>）覆盖它，使对角描边光影跟随 token 覆盖联动。pill 控件例外：光影渐变需要物理尺寸，继续使用由控件实际尺寸或内部尺寸 token 派生的有限圆角值。</p>"
      },
      {
        "kind": "prose",
        "key": "内部 token",
        "title": "内部 token",
        "html": "<p>以 <code>--wui-internal-*</code> 为前缀的变量是 Shadow DOM 内部接线变量，不属于公共 token API，Consumer 不应覆盖。</p>"
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>appearance</code> 选择配色方案，未设置时主题保持 inactive 但解析输出使用默认的 <code>light</code>。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"dark\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>暗色主题下的 button&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"dark\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>暗色主题下的 button&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "跟随系统与动效范围",
        "descriptionHtml": "<p><code>appearance=\"system\"</code> 跟随 <code>prefers-color-scheme</code>；<code>motion</code> 定义当前范围的动效偏好，<code>reduced</code> 归零转场、两个无限加载循环只放慢。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"system\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> motion</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"reduced\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  {children}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"system\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> motion</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"reduced\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">slot</span><span style=\"--shiki-light:#B31D28;--shiki-light-font-style:italic;--shiki-dark:#FDAEB7;--shiki-dark-font-style:italic\"> /</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "绑定解析后的外观",
        "descriptionHtml": "<p><code>resolved-appearance</code> 是只读的派生输出，可以放心把选择器绑到它上面，无需再维护第二份主题状态。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> style</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{{ colorScheme: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'light dark'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{appearance}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"hero\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>当前外观由 resolved-appearance 选择器控制&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :appearance</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"appearance\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"hero\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>当前外观由 resolved-appearance 选择器控制&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> appearance</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'light'</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> |</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'dark'</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> |</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'system'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'system'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "toast",
    "tag": "web-ui-toast",
    "introHtml": "<p>命令式 toast：通过 <code>toast()</code> 创建一条并拿到它的 id，用 <code>toast.close(id)</code> 关闭；同一个 <code>id</code> 再次调用是更新那一条，而不是新建。下面的表分别列 <code>toast()</code> 的 option、命令式入口，以及 <code>&lt;web-ui-toast></code> 元素自身的属性、事件与方法。</p>",
    "api": [
      {
        "kind": "table",
        "key": "options",
        "title": "Options",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "message",
            "<p>通知文本。</p>",
            "string",
            "—"
          ],
          [
            "type",
            "<p>类型：<code>success</code>、<code>info</code>、<code>warning</code>、<code>error</code>。</p>",
            "ToastType",
            "'info'"
          ],
          [
            "duration",
            "<p>自动关闭时间（ms），0 表示不自动关闭；<code>error</code> 默认 <code>5000</code>。</p>",
            "number",
            "3000"
          ],
          [
            "closable",
            "<p>展示关闭 button。</p>",
            "boolean",
            "true"
          ],
          [
            "id",
            "<p>合并键：同一个 <code>id</code> 再次调用是更新那一条。</p>",
            "string",
            "自动生成"
          ],
          [
            "heading",
            "<p>粗体标题。</p>",
            "string",
            "''"
          ],
          [
            "position",
            "<p>屏幕位置。</p>",
            "ToastPosition",
            "'top-right'"
          ],
          [
            "target",
            "<p>用于查找最近 theme-owned overlay root。</p>",
            "Element",
            "—"
          ],
          [
            "container",
            "<p>显式挂载容器（最高优先级）。</p>",
            "HTMLElement",
            "—"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "methods",
        "title": "Methods",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "toast(options)",
            "<p>创建或更新一条 toast，返回这条 toast 的最终 id。</p>"
          ],
          [
            "toast.success(message, options?)",
            "<p>创建一条 <code>success</code> 类型的 toast。</p>"
          ],
          [
            "toast.info(message, options?)",
            "<p>创建一条 <code>info</code> 类型的 toast。</p>"
          ],
          [
            "toast.warning(message, options?)",
            "<p>创建一条 <code>warning</code> 类型的 toast。</p>"
          ],
          [
            "toast.error(message, options?)",
            "<p>创建一条 <code>error</code> 类型的 toast；它的默认时长是 <code>5000</code>，比其余类型更长。</p>"
          ],
          [
            "toast.close(id)",
            "<p>关闭指定 id 的那条 toast，覆盖它出现的每个阶段。</p>"
          ],
          [
            "toast.clear()",
            "<p>一次关闭当前全部 toast。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p>命令式入口之下没有别的必经步骤：<code>toast()</code> 自行把 toast 元素挂到最近的 theme-owned overlay root（没有主题作用域时回退到全局 fallback root），<code>target</code> 用来解析最近的主题作用域，<code>container</code> 显式指定挂载容器并优先于主题作用域。同一个微任务里的多条 toast 先入队、再一次性挂载，因此待挂载的条目在落地前还能被同 id 的调用改写。</p>\n<p>悬停暂停自动关闭计时器（使用 <code>pointerenter</code>/<code>pointerleave</code>），指针离开后<strong>续跑剩余时间</strong>，而不是重新计满。暂停期间漏掉 <code>pointerleave</code>（指针拖出窗口、元素在悬停中被搬迁或摘出）时，由 document 级 <code>pointerover</code>/<code>pointerout</code>/<code>pointerleave</code> 兜底恢复，不会永久停在屏幕上。</p>\n<pre><code class=\"language-ts\">import { toast } from '@greypan/web-ui'\n\n// 创建\ntoast.success('操作成功')\ntoast.error('出错了', { duration: 5000 })\ntoast.info('提示信息')\ntoast.warning('请注意')\n\n// 带 option\nconst id = toast({ message: '自定义', type: 'info', position: 'bottom-right', duration: 4000, closable: true })\n\n// 关闭\ntoast.close(id)\ntoast.clear()\n\n// upsert：同一 id 再次调用是更新那一条，而不是再建一条\ntoast.error('网络连接中断，正在重试…', { id: 'network' })\ntoast.error('网络连接中断（第 2 次重试）', { id: 'network' })\n\n// 一条 toast 走完整个生命周期\ntoast.info('上传中 0%', { id: 'upload', duration: 0 })\ntoast.info('上传中 60%', { id: 'upload' }) // 省略 duration，计时不动\ntoast.success('上传完成', { id: 'upload', duration: 3000 }) // 换 type，重新开始倒计时\n</code></pre>\n<p>每次调用都返回这条 toast 的最终 id，调用方无需区分新建还是更新。</p>"
      },
      {
        "kind": "prose",
        "key": "upsert 语义",
        "title": "upsert 语义",
        "html": "<p>同一 <code>id</code> 再次调用的结果：</p>\n<p>列依次为 目标状态 / 结果：</p>\n<ul>\n<li>已挂载 / 返回同一个 id；给出的字段覆盖，未给出的保持原值</li>\n<li>同 tick 内仍在待挂载 / patch 待挂载的 options，挂载后生效，不产生第二条</li>\n<li>已关闭或正在退场 / 新建一条；正在离场的那条自行走完退场动画</li>\n</ul>\n<p><code>duration</code> 只有显式传入才重启倒计时（悬停暂停期间是例外：只记新值不点火，指针离开后按新时长计满）；<code>message</code>、<code>heading</code>、<code>type</code> 是普通属性，不碰计时。<code>toast.error</code> 的 5000 默认值在<strong>创建时</strong>兜底，不算显式传入，因此重复调用 <code>toast.error(msg, { id })</code> 不会重置倒计时。<code>position</code> 变化会把元素搬到新容器并保住剩余计时（支持 <code>moveBefore</code> 的引擎直接搬，其余走暂停/续跑降级）；若倒计时在主线程被占用期间已经到期，降级路径会在续跑时直接退场，而不是让它一直挂着。<code>container</code> 与 <code>target</code> 以首次调用为准，不支持把已存在的 toast 换到另一个 overlay root。</p>"
      },
      {
        "kind": "prose",
        "key": "关闭语义",
        "title": "关闭语义",
        "html": "<p><code>toast.close(id)</code> 覆盖 toast 出现的每个阶段，包括「还没开始显示」的两种：</p>\n<p>列依次为 目标状态 / 结果：</p>\n<ul>\n<li>已显示 / 播放退场动画，结束后派发 <code>toast-close</code></li>\n<li>已挂载、<code>show()</code> 未跑 / 没有退场动画可播，立即派发 <code>toast-close</code></li>\n<li>同 tick 仍在待挂载 / 挂载前出队：不会出现，也不派发事件</li>\n<li>已在退场 / 空操作，由那条 toast 自己走完退场</li>\n</ul>\n<p><code>toast.clear()</code> 的口径相同：队列条目一并取消，已挂载的全部关闭。</p>"
      },
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "type",
            "<p>类型：<code>success</code>、<code>info</code>、<code>warning</code>、<code>error</code>。</p>",
            "ToastType",
            "'info'"
          ],
          [
            "position",
            "<p>屏幕位置。</p>",
            "ToastPosition",
            "'top-right'"
          ],
          [
            "heading",
            "<p>粗体标题。</p>",
            "string",
            "''"
          ],
          [
            "message",
            "<p>通知文本。</p>",
            "string",
            "''"
          ],
          [
            "duration",
            "<p>自动关闭时间（ms），0 表示不自动关闭；<code>error</code> 由 manager 兜底为 <code>5000</code>。</p>",
            "number",
            "3000"
          ],
          [
            "no-close-button",
            "<p>隐藏关闭 button。</p>",
            "boolean",
            "false"
          ],
          [
            "visible",
            "<p>是否可见。</p>",
            "boolean",
            "false"
          ],
          [
            "toastId",
            "<p>合并键；只作为属性存在（<code>attribute: false</code>），由 manager 写入。</p>",
            "string",
            "''"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "toast-close",
            "<p>退场结束后派发，<code>detail</code> 含 <code>id</code> 与 <code>reason</code>。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "元素属性与方法",
        "title": "元素属性与方法",
        "html": "<p>命令式入口下，<code>&lt;web-ui-toast></code> 的属性由 manager 写入：合并键落在 <code>toastId</code> 上（只作为属性存在，<code>attribute: false</code>），其余属性与上面的 Props 表一一对应。元素自身还公开一组实例方法：<code>show()</code> 播放入场（<code>visible</code> 置真）并在 <code>duration</code> 大于 0 时开始计时；<code>dismiss(reason?)</code> 关闭并派发 <code>toast-close</code>，已显示时先播退场动画，未显示时立即派发，<code>reason</code> 取 <code>ToastCloseReason</code>，默认 <code>'programmatic'</code>；<code>setDuration(ms)</code> 更新 <code>duration</code> 并按新值重排计时，<code>ms</code> 为 0 表示不再自动关闭；<code>pauseAutoClose()</code> 记下剩余时间并停表，与 <code>resumeAutoClose()</code> 成对续跑；<code>startAutoClose()</code> 按当前 <code>duration</code> 重排自动关闭计时。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-toast-viewport-gap",
            "<p>Toast 到视口边缘的可见距离</p>",
            "16px"
          ],
          [
            "--wui-toast-container-padding",
            "<p>容器预留的扩散阴影绘制空间</p>",
            "40px"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "快捷方法",
        "descriptionHtml": "<p><code>toast.success</code> / <code>info</code> / <code>warning</code> / <code>error</code> 是四种类型的常用写法，<code>error</code> 的默认时长比其余更长。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { toast } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">success</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'操作成功'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'提示信息'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">warning</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'请注意'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">error</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'出错了'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { duration: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">5000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { toast } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">success</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'操作成功'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">error</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'出错了'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { duration: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">5000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "完整 option",
        "descriptionHtml": "<p><code>toast()</code> 接受完整 option：<code>heading</code> 是粗体标题，<code>position</code> 决定落点，<code>duration</code> 为 0 表示不自动关闭。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { toast } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> id</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> toast</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  heading: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'已保存'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  message: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'更改已写入云端'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  type: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'info'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  position: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'bottom-right'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  duration: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">4000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  closable: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { toast } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> notify</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  return</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> toast</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    heading: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'已保存'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    message: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'更改已写入云端'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    type: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'info'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">,</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    position: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'bottom-right'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "合并同一条",
        "descriptionHtml": "<p>给同一个 <code>id</code> 再次调用即更新它，适合进度或重试这类连续状态；<code>duration</code> 只有显式传入才重启倒计时。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { toast } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'上传中 0%'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { id: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'upload'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, duration: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'上传中 60%'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { id: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'upload'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">success</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'上传完成'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { id: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'upload'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, duration: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">3000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { toast } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> upload</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'上传中 0%'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { id: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'upload'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, duration: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'上传中 60%'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { id: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'upload'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">success</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'上传完成'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, { id: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'upload'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, duration: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">3000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> })</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "关闭",
        "descriptionHtml": "<p>每次调用都返回这条 toast 的最终 id；<code>toast.close(id)</code> 关掉单条，<code>toast.clear()</code> 一次收走全部。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { toast } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> id</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'提示信息'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">close</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(id)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">clear</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { toast } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> dismiss</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">() {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> id</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">info</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'提示信息'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">close</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(id)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">clear</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "tooltip",
    "tag": "web-ui-tooltip",
    "introHtml": "<p>tooltip，支持指针与焦点触发；<code>content</code> 属性提供纯文本，<code>content</code> 插槽可放更丰富的内容。</p>",
    "api": [
      {
        "kind": "table",
        "key": "props",
        "title": "Props",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "类型",
            "kind": "code"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "placement",
            "<p>Floating UI 位置，默认 <code>top</code>。</p>",
            "Placement",
            "'top'"
          ],
          [
            "show-delay",
            "<p>显示延迟（毫秒）。</p>",
            "number",
            "200"
          ],
          [
            "hide-delay",
            "<p>隐藏延迟（毫秒）。</p>",
            "number",
            "100"
          ],
          [
            "disabled",
            "<p>禁用状态。</p>",
            "boolean",
            "false"
          ],
          [
            "offset",
            "<p>与 trigger 的距离（px）。</p>",
            "number",
            "6"
          ],
          [
            "content",
            "<p>提示文本，是 <code>content</code> 插槽的纯文本替代。</p>",
            "string",
            "''"
          ],
          [
            "open",
            "<p>可见性。</p>",
            "boolean",
            "false"
          ],
          [
            "portal",
            "<p>在 theme-owned overlay root 中渲染。</p>",
            "boolean",
            "false"
          ],
          [
            "overlayContainer",
            "<p>显式 Portal 容器（property）。</p>",
            "OverlayContainer",
            "—"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "events",
        "title": "Events",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "open-change",
            "<p>提示开合，<code>detail.open</code> 为当前状态。</p>"
          ]
        ]
      },
      {
        "kind": "table",
        "key": "slots",
        "title": "Slots",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          }
        ],
        "rows": [
          [
            "default",
            "<p>trigger。</p>"
          ],
          [
            "content",
            "<p>提示 panel 内容，替代 <code>content</code> 属性。</p>"
          ]
        ]
      },
      {
        "kind": "prose",
        "key": "行为说明",
        "title": "行为说明",
        "html": "<p><code>open</code> 是自管理的可见性属性。指针/焦点触发会更新它，直接赋值 property 也会同步本地或 Portal panel；<code>open-change</code> 仅用户来源的 toggle 时派发。第一个 Tooltip 显示后，相邻 Tooltip 会立即切换；其余 pointer/focus 触发使用延迟计时器。</p>"
      },
      {
        "kind": "table",
        "key": "css custom properties",
        "title": "CSS Custom Properties",
        "columns": [
          {
            "title": "名称",
            "kind": "name"
          },
          {
            "title": "说明",
            "kind": "html"
          },
          {
            "title": "默认值",
            "kind": "code"
          }
        ],
        "rows": [
          [
            "--wui-tooltip-max-width",
            "<p>提示最大宽度</p>",
            "240px"
          ],
          [
            "--wui-tooltip-font-size",
            "<p>提示字号</p>",
            "13px"
          ]
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>默认插槽是 trigger，<code>content</code> 是提示文本。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-tooltip</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> content</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"保存当前更改\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-tooltip</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-tooltip</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> content</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"保存当前更改\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-tooltip</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "内容插槽",
        "descriptionHtml": "<p><code>content</code> 插槽替代纯文本，可放 icon 或带格式的内容。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-tooltip</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placement</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"right\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"default\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideInfo}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    这是一个 &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">strong</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>富文本&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">strong</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">> 提示</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-tooltip</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-tooltip</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placement</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"right\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"default\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideInfo\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>这是一个 &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">strong</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>富文本&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">strong</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">> 提示&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-tooltip</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideInfo } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "延迟",
        "descriptionHtml": "<p><code>show-delay</code> / <code>hide-delay</code> 控制指针进出时的显示与隐藏延迟；<code>disabled</code> 直接关闭提示。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-tooltip</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> content</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"立即出现\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> show-delay</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">hide-delay</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">0</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>悬停我&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-tooltip</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-tooltip</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> content</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"立即出现\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :show-delay</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :hide-delay</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"0\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>悬停我&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-tooltip</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  }
]
