// 本文件由 @greypan/md-to-comp 生成，请勿手动编辑。
// source of truth：input 目录下的 markdown —— 示例代码与 API 表的名称/说明/类型/默认值都在那一份里。
// 重新生成：跑一次宿主构建（生成挂在 md-to-comp 的 Vite 插件上）。

export interface ExampleApiRow {
  name: string
  type?: string
  default?: string
  descriptionHtml: string
}

export interface ExampleApiSection {
  key: string
  title: string
  rows: ExampleApiRow[]
}

export interface ExampleSample {
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
  samples: ExampleSample[]
  api: ExampleApiSection[]
}

export const exampleDocs: ExampleDoc[] = [
  {
    "component": "autocomplete",
    "tag": "web-ui-autocomplete",
    "introHtml": "<p>可输入并过滤候选的单值选择器：输入文本按 <code>option</code> 的 label 过滤候选，选中后把 label 回填到输入框，并把该项的 value 暴露为只读的 <code>selected-value</code>。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>输入框占位文本。</p>"
          },
          {
            "name": "borderless",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用态，不可输入、不可展开下拉。</p>"
          },
          {
            "name": "readonly",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>只读态：不可输入、不可展开下拉。</p>"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>必填校验。</p>"
          },
          {
            "name": "portal",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>在 theme-owned overlay root 中渲染下拉面板。</p>"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>打开时不锁定页面滚动。</p>"
          },
          {
            "name": "allow-custom-value",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>允许 Enter 提交不在候选中的输入原文。</p>"
          },
          {
            "name": "overlayContainer",
            "type": "OverlayContainer",
            "default": "—",
            "descriptionHtml": "<p>显式 Portal 容器（property，不是 attribute）。</p>"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "aria-label",
            "type": "string | null",
            "default": "null",
            "descriptionHtml": "<p>无障碍名称。</p>"
          },
          {
            "name": "aria-labelledby",
            "type": "string | undefined",
            "default": "—",
            "descriptionHtml": "<p>无障碍名称引用。</p>"
          },
          {
            "name": "filter",
            "type": "FilterMode",
            "default": "'contains'",
            "descriptionHtml": "<p>候选过滤模式：<code>contains</code>（默认）、<code>prefix</code> 或 <code>none</code>。</p>"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>当前输入文本，也是表单提交值。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>输入时触发，<code>value</code> 为当前文本。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>选中候选或提交 custom value 时触发。</p>"
          },
          {
            "name": "focus",
            "descriptionHtml": "<p>触发器获得焦点时触发。</p>"
          },
          {
            "name": "blur",
            "descriptionHtml": "<p>触发器失去焦点时触发。</p>"
          },
          {
            "name": "open-change",
            "descriptionHtml": "<p>下拉面板开合，<code>detail.open</code> 为当前状态。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "trigger",
            "descriptionHtml": "<p>自定义触发区域内容，替换默认输入框。</p>"
          },
          {
            "name": "default",
            "descriptionHtml": "<p>投影 <code>&lt;web-ui-option></code> 候选。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>键入时按 label 过滤候选，没有匹配项时面板保持关闭；下拉面板的开合通过 <code>open-change</code> 通知。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-autocomplete</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"选择框架\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onChange</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.currentTarget.value)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vue\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Vue\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"react\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"React\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svelte\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Svelte\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-autocomplete</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-autocomplete</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"选择框架\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"onChange\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"vue\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Vue\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"react\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"React\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"svelte\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Svelte\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-autocomplete</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onChange</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> Event</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> select</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> event.currentTarget </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">as</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> HTMLElement</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> &#x26;</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> string</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  console.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">log</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(select.value)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "自定义触发器",
        "descriptionHtml": "<p>把可编辑组件放进 <code>trigger</code> 插槽即可替换默认输入框。多行触发器保留 Enter 换行语义，关闭面板改用 Escape 或 blur。</p>",
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
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-autocomplete</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> allow-custom-value</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入或选择标签\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-autocomplete</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-autocomplete</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> allow-custom-value</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入或选择标签\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-autocomplete</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "avatar",
    "tag": "web-ui-avatar",
    "introHtml": "<p>头像，支持图片加载失败与无图片时回退到名称首字母，避免在图片缺位处留下空洞。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "src",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>图片 URL；留空或加载失败时回退。</p>"
          },
          {
            "name": "alt",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>图片替代文本。</p>"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>展示名称，用于首字母回退。</p>"
          },
          {
            "name": "size",
            "type": "number",
            "default": "40",
            "descriptionHtml": "<p>头像边长（px）。</p>"
          },
          {
            "name": "shape",
            "type": "'circle' | 'square'",
            "default": "'circle'",
            "descriptionHtml": "<p>形状：<code>circle</code>（默认）或 <code>square</code>。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>图片加载失败时的降级内容，替代默认首字母。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>传入 <code>src</code> 时按图片渲染，<code>alt</code> 作为图片替代文本，<code>size</code> 决定头像边长。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-avatar</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> src</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/avatars/grey.png\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> alt</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Grey\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">48</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-avatar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-avatar</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> src</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"/avatars/grey.png\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> alt</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"Grey\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"48\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-avatar</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "首字母回退",
        "descriptionHtml": "<p>没有 <code>src</code>、或图片加载失败时，组件从 <code>name</code> 取首字母渲染回退头像。</p>",
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
    "introHtml": "<p>回到顶部按钮：滚动超过阈值后出现在角落，点击或按 Enter 平滑回到顶部；也可以挂到自定义滚动容器内。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "scroll-behavior",
            "type": "'smooth' | 'auto'",
            "default": "'smooth'",
            "descriptionHtml": "<p>滚动行为：<code>smooth</code>（默认）或 <code>auto</code>。</p>"
          },
          {
            "name": "visible",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>当前可见状态，由滚动位置驱动。</p>"
          },
          {
            "name": "scrollTarget",
            "type": "HTMLElement | Window",
            "default": "window",
            "descriptionHtml": "<p>滚动容器，<code>window</code>（默认）或 <code>HTMLElement</code>（property）。</p>"
          },
          {
            "name": "threshold",
            "type": "number",
            "default": "200",
            "descriptionHtml": "<p>显示按钮的滚动阈值（px）。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>自定义按钮内容。</p>"
          }
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
        "descriptionHtml": "<p>把 <code>scrollTarget</code> 指向自己的滚动容器后，按钮以 <code>position: sticky</code> 悬浮在容器右下角，只随该容器滚动出现。<code>scrollTarget</code> 是 element 属性，需要在挂载后赋值。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> scrollBoxRef</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">null</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> backTopRef</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">null</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">useEffect</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (scrollBoxRef.current </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">&#x26;&#x26;</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> backTopRef.current) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    backTopRef.current.scrollTarget </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> scrollBoxRef.current</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}, [])</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{scrollBoxRef} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"scroll-box\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{backTopRef} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">threshold</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">300</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"scrollBox\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"scroll-box\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"backTop\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :threshold</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"300\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { onMounted, useTemplateRef } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> scrollBox</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useTemplateRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'scrollBox'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> backTop</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useTemplateRef</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'backTop'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onMounted</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (scrollBox.value </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">&#x26;&#x26;</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> backTop.value) backTop.value.scrollTarget </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> scrollBox.value</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">})</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "自定义内容",
        "descriptionHtml": "<p>默认插槽替换按钮内容，交互语义仍由组件提供。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>回到顶部&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>回到顶部&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-back-top</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "badge",
    "tag": "web-ui-badge",
    "introHtml": "<p>徽标 / 通知计数：把 <code>count</code> 角标叠加在默认插槽内容的一角，<code>dot</code> 模式只显示一个圆点。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "count",
            "type": "number",
            "default": "0",
            "descriptionHtml": "<p>显示数字。</p>"
          },
          {
            "name": "max",
            "type": "number",
            "default": "99",
            "descriptionHtml": "<p>数字上限，超过时显示 <code>max+</code>。</p>"
          },
          {
            "name": "dot",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>点模式，只显示圆点不显示数字。</p>"
          },
          {
            "name": "show-zero",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p><code>count</code> 为 0 时也显示。</p>"
          },
          {
            "name": "badge-hidden",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>完全隐藏徽标。</p>"
          },
          {
            "name": "offset-x",
            "type": "number",
            "default": "0",
            "descriptionHtml": "<p>水平偏移（px）。</p>"
          },
          {
            "name": "offset-y",
            "type": "number",
            "default": "0",
            "descriptionHtml": "<p>垂直偏移（px）。</p>"
          },
          {
            "name": "placement",
            "type": "'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'",
            "default": "'top-right'",
            "descriptionHtml": "<p>徽标位置：<code>top-right</code>（默认）、<code>top-left</code>、<code>bottom-right</code>、<code>bottom-left</code>。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>被装饰的内容，徽标叠加在它的一角。</p>"
          }
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
    "component": "button",
    "tag": "web-ui-button",
    "introHtml": "<p>按钮用于触发一个即时操作：提交表单、打开对话框、切换状态。它不贡献表单值，\n<code>type=\"submit\"</code> / <code>type=\"reset\"</code> 时把原生 activation 转发给宿主 form。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "variant",
            "type": "'primary' | 'secondary' | 'ghost' | 'danger' | 'glass'",
            "default": "'glass'",
            "descriptionHtml": "<p>视觉变体：<code>primary</code> / <code>secondary</code> / <code>ghost</code> / <code>danger</code> / <code>glass</code>。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用态。禁用时不派发 click，也不参与表单提交。</p>"
          },
          {
            "name": "loading",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>加载态。与 <code>disabled</code> 一样阻断交互，并优先渲染 spinner。</p>"
          },
          {
            "name": "full",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>占满父容器宽度。</p>"
          },
          {
            "name": "icon",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>图标模式：按钮为正方形，默认插槽整体作为图标。</p>"
          },
          {
            "name": "size",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>按钮高度（CSS 长度，如 <code>28</code>、<code>32px</code>）。在 <code>web-ui-button-group</code> 内被忽略。</p>"
          },
          {
            "name": "type",
            "type": "button | submit | reset",
            "default": "'button'",
            "descriptionHtml": "<p>原生 button 的 <code>type</code>：<code>button</code> / <code>submit</code> / <code>reset</code>。后两者把 activation 转发给宿主 form。</p>"
          },
          {
            "name": "aria-label",
            "type": "string | null",
            "default": "null",
            "descriptionHtml": "<p>无障碍名称。图标按钮必须提供，否则读屏器只会读出空按钮。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>按钮文字；<code>icon</code> 模式下整体作为图标内容。</p>"
          },
          {
            "name": "prefix",
            "descriptionHtml": "<p>文字左侧的图标或标识。</p>"
          },
          {
            "name": "suffix",
            "descriptionHtml": "<p>文字右侧的图标或标识。</p>"
          }
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
        "descriptionHtml": "<p>默认插槽是按钮文字；<code>prefix</code> / <code>suffix</code> 放在文字两侧，图标模式（<code>icon</code>）下默认插槽整体作为图标。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  搜索</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideChevronRight}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    搜索</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideChevronRight\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideChevronRight, lucideSearch } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "图标模式",
        "descriptionHtml": "<p><code>icon</code> 让按钮变成正方形图标按钮，此时 <code>loading</code> 优先于插槽内容，只渲染 spinner。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"搜索\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> loading</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"加载中\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideSearch}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"搜索\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> loading</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> aria-label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"加载中\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideSearch\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideSearch } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "按钮组",
        "descriptionHtml": "<p><code>&lt;web-ui-button-group></code> 把多个按钮并成一组并画出相邻分割线；成员按钮的 <code>size</code> 在组内被忽略。</p>\n<p><code>direction</code> 选择横排或竖排，分割线长度由 <code>--wui-button-group-divider-length</code> 控制。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>左&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>右&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>左&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>中&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>右&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button-group</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "checkbox",
    "tag": "web-ui-checkbox",
    "introHtml": "<p>单个复选框，声明 <code>role=\"checkbox\"</code>，支持 Enter / Space 切换；与原生 <code>&lt;form></code> 集成，选中时把 <code>value</code> 提交进 <code>FormData</code>。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "checked",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>选中状态。</p>"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>选中时提交的表单值。</p>"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>必填校验。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>选中状态变化时触发。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>用户切换选中状态时触发。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>标签文本；为空时收掉指示器与标签之间的间距。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>checked</code> 是控件状态，默认插槽是标签文字。</p>",
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
        "title": "复选框组",
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
    "introHtml": "<p>折叠面板把「触发器」与「内容」放在同一行内：触发器是 default slot，内容放在 <code>content</code> slot。\n开合是严格受控的——组件只派发 <code>open-change</code> 请求，是否真的展开由 Consumer 回写 <code>open</code> 决定。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>展开状态。严格受控，唯一状态源；组件只派发请求，不自己改。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用触发：点击忽略，<code>aria-disabled</code> 写到 trigger 元素上；已展开内容保持现状。</p>"
          },
          {
            "name": "horizontal",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>水平方向：沿宽度展开，默认沿高度。</p>"
          },
          {
            "name": "keep-mounted",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>关闭稳态保持内容 <code>inert</code> 而非 <code>hidden</code>，保留滚动位置与可测量性。</p>"
          },
          {
            "name": "peek",
            "type": "string | null",
            "default": "null",
            "descriptionHtml": "<p>关闭稳态露出的尺寸（CSS 长度，如 <code>120px</code>、<code>6rem</code>）。设置后语义等同 <code>keep-mounted</code>。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "descriptionHtml": "<p>开合请求。<code>detail.open</code> 是请求的目标状态；Consumer 回写 <code>open</code> 才真正生效。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>触发器。可放原生 <code>button</code> 或任意 <code>web-ui-*</code> 组件。</p>"
          },
          {
            "name": "content",
            "descriptionHtml": "<p>折叠内容。关闭态按 <code>keep-mounted</code> / <code>peek</code> 决定是 <code>hidden</code> 还是 <code>inert</code>。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础用法",
        "descriptionHtml": "<p>触发器可以是任何可交互元素（原生 <code>button</code>、<code>web-ui-button</code> 等），内容可以是任意节点。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-collapse</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">onopen-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.open)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"button\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"w-full text-left\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>点击展开&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>这是折叠内容，支持任意内容。&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-collapse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-collapse</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = $event.detail.open\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"button\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"w-full text-left\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>点击展开&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"content\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>这是折叠内容，支持任意内容。&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-collapse</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
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
    "introHtml": "<p>右键上下文菜单：第一个子元素是触发区域，其余子元素是菜单项（<code>&lt;web-ui-dropdown-item></code> 等）。打开期间菜单是模态的，点空白只会关掉菜单。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>右键与 <code>openAt()</code> 都不打开菜单，不做视觉置灰。</p>"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>打开时允许背景滚动。</p>"
          },
          {
            "name": "long-press",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>触屏长按打开菜单（opt-in；鼠标始终走 <code>contextmenu</code>）。</p>"
          },
          {
            "name": "long-press-delay",
            "type": "number",
            "default": "500",
            "descriptionHtml": "<p>长按触发前需按住的时长（ms）。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "descriptionHtml": "<p>菜单开合，<code>detail.open</code> 为当前状态。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>第一个元素是触发区域，其余元素是菜单项。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>在触发区域内右键即可打开，菜单从鼠标位置展开。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"context-zone\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>在此区域右键点击&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>粘贴&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"context-zone\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>在此区域右键点击&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>粘贴&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "触屏长按",
        "descriptionHtml": "<p><code>long-press</code> 让触屏按住 <code>long-press-delay</code> 毫秒后打开菜单，从按点向下展开；按住期间位移超过 10px 会取消。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-context-menu</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> long-press</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> long-press-delay</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">600</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"context-zone\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>按住我打开菜单&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>重命名&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>移动&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-context-menu</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> long-press</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :long-press-delay</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"600\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"context-zone\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>按住我打开菜单&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">div</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>重命名&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>移动&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-context-menu</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "监听开合",
        "descriptionHtml": "<p><code>open-change</code> 通知菜单开与关；关闭后焦点归还给打开前持焦的元素。</p>",
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
    "introHtml": "<p>模态对话框，基于原生 <code>&lt;dialog></code> 的 <code>showModal()</code>；支持内置标题带、footer 与完全自绘的 <code>headless</code> 模式。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>对话框可见性。</p>"
          },
          {
            "name": "closable",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>显示内置关闭按钮。</p>"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>打开时不锁定页面滚动。</p>"
          },
          {
            "name": "no-backdrop-close",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁止点击遮罩关闭。</p>"
          },
          {
            "name": "no-escape-close",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁止按 Escape 关闭。</p>"
          },
          {
            "name": "controlled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>Escape 与遮罩仅请求 <code>open=false</code>，由消费方回写。</p>"
          },
          {
            "name": "heading",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>标题文字，<code>header</code> 插槽为空时的回落（<code>headless</code> 下忽略）。</p>"
          },
          {
            "name": "headless",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>只保留浮层行为，不再渲染内置 header 带、内容区与 footer。</p>"
          },
          {
            "name": "dialog-label",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>内部原生 dialog 的 accessible name；<code>headless</code> 下必填。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "descriptionHtml": "<p>开关状态变化，<code>detail.open</code> 为请求的目标状态。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>正文内容。</p>"
          },
          {
            "name": "header",
            "descriptionHtml": "<p>卡片顶部的 chrome 带，有内容时接管 <code>heading</code>。</p>"
          },
          {
            "name": "footer",
            "descriptionHtml": "<p>底部操作区。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>open</code> 控制可见性，<code>heading</code> 是无 header 插槽时的标题回落，<code>closable</code> 渲染内置关闭按钮。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onClick</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)}>打开对话框&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dialog</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">heading</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"确认操作\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> closable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onopen-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.open)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除后无法恢复，确定继续吗？&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"footer\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"danger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onClick</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">        删除</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dialog</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @click</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = true\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>打开对话框&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dialog</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"确认操作\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> closable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = $event.detail.open\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除后无法恢复，确定继续吗？&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"footer\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"danger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @click</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = false\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dialog</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "受控关闭",
        "descriptionHtml": "<p>开启 <code>controlled</code> 后，Escape 与遮罩点击只请求 <code>open=false</code>，在消费方回写前对话框保持打开。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dialog</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  controlled</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  heading</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"未保存的更改\"</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">  onopen-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">    if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (event.detail.open </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">===</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">requestClose</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">    else</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  }}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>离开前要先保存吗？&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dialog</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dialog</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> controlled</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"未保存的更改\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"onOpenChange\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>离开前要先保存吗？&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dialog</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">function</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onOpenChange</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> CustomEvent</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;{ </span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">:</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> boolean</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }>) {</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">  if</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">!</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">event.detail.open) </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">requestClose</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">()</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "Headless",
        "descriptionHtml": "<p><code>headless</code> 只保留浮层行为，默认插槽渲染为卡片内唯一的滚动层；此时必须用 <code>dialog-label</code> 提供可访问名称。</p>",
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
    "introHtml": "<p>侧边抽屉，基于原生 <code>&lt;dialog></code>，自带滑入 / 滑出动画，并可从四周内缘拖拽关闭。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>抽屉可见性。</p>"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>打开时不锁定页面滚动。</p>"
          },
          {
            "name": "no-backdrop-close",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁止点击遮罩关闭。</p>"
          },
          {
            "name": "controlled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>用户关闭仅请求 <code>open=false</code>，由消费方回写。</p>"
          },
          {
            "name": "placement",
            "type": "DrawerPlacement",
            "default": "'right'",
            "descriptionHtml": "<p>滑入方向：<code>right</code>（默认）、<code>left</code>、<code>top</code>、<code>bottom</code>。</p>"
          },
          {
            "name": "heading",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>标题文字，<code>header</code> 插槽为空时的回落。</p>"
          },
          {
            "name": "closable",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>显示内置关闭按钮。</p>"
          },
          {
            "name": "headless",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>仅保留浮层行为，默认插槽不渲染内置抽屉 UI。</p>"
          },
          {
            "name": "dialog-label",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>内部原生 dialog 的可访问名称；<code>headless</code> 下必须提供。</p>"
          },
          {
            "name": "draggable",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>在抽屉内缘显示 drag bar，支持拖拽关闭手势。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "descriptionHtml": "<p>开关状态变化，<code>detail.open</code> 为请求的目标状态。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>正文内容。</p>"
          },
          {
            "name": "header",
            "descriptionHtml": "<p>顶部标题区。</p>"
          },
          {
            "name": "footer",
            "descriptionHtml": "<p>底部操作区。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>placement</code> 决定滑入方向，<code>heading</code> 是无 header 插槽时的标题回落。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> [</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">] </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> useState</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">return</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> (</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onClick</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{() </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">true</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)}>打开抽屉&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-drawer</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">placement</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"right\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"设置\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> onopen-change</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">event</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =></span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setOpen</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(event.detail.open)}></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>抽屉正文&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-drawer</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @click</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = true\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>打开抽屉&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-drawer</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placement</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"right\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"设置\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> @open-change</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open = $event.detail.open\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>抽屉正文&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-drawer</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { ref } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> 'vue'</span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">const</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\"> =</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> ref</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">false</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">)</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "拖拽关闭",
        "descriptionHtml": "<p>开启 <code>draggable</code> 后，抽屉内缘出现 drag bar，向关闭方向拖过半或快速甩动即关闭。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-drawer</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> open</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{open} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">placement</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"bottom\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> draggable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"快捷操作\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>向下拖拽关闭&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-drawer</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-drawer</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :open</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"open\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placement</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"bottom\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> draggable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"快捷操作\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>向下拖拽关闭&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">p</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-drawer</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "页脚操作",
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
    "component": "dropdown",
    "tag": "web-ui-dropdown",
    "introHtml": "<p>下拉菜单：<code>trigger</code> 插槽放触发器，其余子元素作为菜单项渲染进浮层面板，支持分隔线、分组标题与多级子菜单。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>菜单可见性。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "match-width",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>面板宽度匹配触发器宽度。</p>"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>打开时不锁定页面滚动。</p>"
          },
          {
            "name": "placement",
            "type": "Placement",
            "default": "'bottom-start'",
            "descriptionHtml": "<p>Floating UI 位置，默认 <code>bottom-start</code>。</p>"
          },
          {
            "name": "offset",
            "type": "number",
            "default": "4",
            "descriptionHtml": "<p>与触发器的距离（px）。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "descriptionHtml": "<p>菜单开合，<code>detail.open</code> 为当前状态。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "trigger",
            "descriptionHtml": "<p>触发器，请放入可交互元素。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>菜单项从宿主子元素迁移到浮层面板，<code>trigger</code> 必须是可交互元素。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    操作</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>操作&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-divider</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "图标与快捷键",
        "descriptionHtml": "<p><code>prefix</code> / <code>suffix</code> 插槽装饰菜单项，<code>dropdown-header</code> 给一组项加标题。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    文件</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideCopy}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> className</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"opacity-40\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      ⌘C</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">icon</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{lucideTrash2}>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"trigger\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>文件&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>编辑&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-header</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"14\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideCopy\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>复制</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> class</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"opacity-40\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>⌘C&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"14\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"lucideTrash2\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-icon</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>删除</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown-item</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-dropdown</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> setup</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> lang</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"ts\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">import</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> { lucideCopy, lucideTrash2 } </span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">from</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\"> '@greypan/web-ui/icons'</span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">script</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "多级子菜单",
        "descriptionHtml": "<p>在菜单项上设置 <code>submenu</code> 后，嵌套的子菜单项成为它的下一级。</p>",
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
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>值为空时显示的占位文本。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态，只影响行为不做视觉置灰。</p>"
          },
          {
            "name": "readonly",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>只读状态：仍可聚焦全选，但不能编辑或提交。</p>"
          },
          {
            "name": "commit-on-unmount",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>卸载时按提交语义结束编辑态；WebKit 下没有 blur，只有它才能保住草稿。</p>"
          },
          {
            "name": "aria-label",
            "type": "string | null",
            "default": "null",
            "descriptionHtml": "<p>无障碍名称。</p>"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>当前值，也是表单提交值。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>每次输入时触发。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>提交草稿时触发（Enter 或 blur）。</p>"
          },
          {
            "name": "cancel",
            "descriptionHtml": "<p>Escape 取消时触发，不冒泡不组合。</p>"
          }
        ]
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
    "introHtml": "<p>空状态占位：<code>title</code> 与 <code>description</code> 提供文案，<code>icon</code> / <code>action</code> 插槽补上图形与操作入口，<code>size</code> 是唯一缩放旋钮。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "title",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>标题文字。</p>"
          },
          {
            "name": "description",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>描述文字。</p>"
          },
          {
            "name": "size",
            "type": "number",
            "default": "56",
            "descriptionHtml": "<p>版面缩放基准（px）；非法值或非正数回落为 56。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "icon",
            "descriptionHtml": "<p>图形区内容，替代默认图标。</p>"
          },
          {
            "name": "default",
            "descriptionHtml": "<p>标题内容，覆盖 <code>title</code> 属性。</p>"
          },
          {
            "name": "description",
            "descriptionHtml": "<p>描述内容，覆盖 <code>description</code> 属性。</p>"
          },
          {
            "name": "action",
            "descriptionHtml": "<p>操作区内容，例如主按钮。</p>"
          }
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
        "title": "自定义图标与操作",
        "descriptionHtml": "<p><code>icon</code> 插槽替换默认图形，<code>action</code> 插槽放操作按钮；<code>size</code> 驱动图标盒、留白与字号。</p>",
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
    "introHtml": "<p>图标渲染组件，接受 Iconify 数据对象（<code>@greypan/web-ui/icons</code> 导出的即为此形态）；宿主默认 <code>aria-hidden=\"true\"</code>。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "icon",
            "type": "IconifyIcon",
            "default": "—",
            "descriptionHtml": "<p>Iconify 数据对象（property）。</p>"
          },
          {
            "name": "spin",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>旋转动画。</p>"
          },
          {
            "name": "size",
            "type": "number",
            "default": "18",
            "descriptionHtml": "<p>尺寸（px）。</p>"
          },
          {
            "name": "color",
            "type": "string",
            "default": "—",
            "descriptionHtml": "<p>颜色。</p>"
          }
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
        "descriptionHtml": "<p><code>spin</code> 常用于加载态图标，<code>reduce</code> 动效偏好下放慢而不停。</p>",
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
    "introHtml": "<p>命令式图片预览：通过 <code>imagePreview()</code> 打开，用返回的句柄控制；内部使用原生 <code>&lt;dialog></code>，默认挂载到最近的 theme-owned overlay root。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "images",
            "type": "ImagePreviewItem[]",
            "default": "[]",
            "descriptionHtml": "<p>图片列表，至少一项；每项为 <code>{ src, alt? }</code>。</p>"
          },
          {
            "name": "loop",
            "type": "boolean",
            "default": "true",
            "descriptionHtml": "<p>首尾循环切换。</p>"
          },
          {
            "name": "nav",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>展示上一张 / 下一张按钮。</p>"
          },
          {
            "name": "toolbar",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>展示缩放工具条。</p>"
          },
          {
            "name": "closable",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>展示关闭按钮。</p>"
          },
          {
            "name": "indicator",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>展示「当前 / 总数」指示器。</p>"
          },
          {
            "name": "swipe",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>1x 下允许左右滑动切图。</p>"
          },
          {
            "name": "noScrollLock",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>打开期间不锁定页面滚动。</p>"
          },
          {
            "name": "noBackdropClose",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>点击图片以外的空白区域不关闭。</p>"
          }
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
        "title": "展示类选项",
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
        "title": "句柄",
        "descriptionHtml": "<p>句柄暴露 <code>index</code>、<code>scale</code>、<code>images</code>、<code>closed</code> 与全部控制方法，可据此实现自己的触发器与状态面板。</p>",
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
    "introHtml": "<p>数字输入框，自带步进按钮与 ArrowUp / ArrowDown 键盘增减；空输入或 <code>-</code> 在提交时被忽略，值保持在最后一个有效数字。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>占位文本。</p>"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "readonly",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>只读状态。</p>"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>必填校验。</p>"
          },
          {
            "name": "precision",
            "type": "number",
            "default": "0",
            "descriptionHtml": "<p>小数精度。</p>"
          },
          {
            "name": "value",
            "type": "number",
            "default": "0",
            "descriptionHtml": "<p>当前值。</p>"
          },
          {
            "name": "min",
            "type": "number",
            "default": "0",
            "descriptionHtml": "<p>最小值。</p>"
          },
          {
            "name": "max",
            "type": "number",
            "default": "Infinity",
            "descriptionHtml": "<p>最大值。</p>"
          },
          {
            "name": "step",
            "type": "number",
            "default": "1",
            "descriptionHtml": "<p>步进值。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>值变化时触发。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>提交时触发。</p>"
          }
        ]
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
        "descriptionHtml": "<p><code>precision</code> 决定小数位数，超出部分会被规整。</p>",
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
    "introHtml": "<p>文本输入框，支持清除按钮与前后缀插槽，并与原生 <code>&lt;form></code> 集成；宿主自身不可聚焦，焦点委托到 shadow 内的原生 input。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "type",
            "type": "string",
            "default": "'text'",
            "descriptionHtml": "<p>HTML input 类型。</p>"
          },
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>占位文本。</p>"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "readonly",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>只读状态。</p>"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>必填校验。</p>"
          },
          {
            "name": "clearable",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>显示清除按钮。</p>"
          },
          {
            "name": "full",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>占满父容器宽度。</p>"
          },
          {
            "name": "borderless",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。</p>"
          },
          {
            "name": "aria-label",
            "type": "string | null",
            "default": "null",
            "descriptionHtml": "<p>无障碍标签。</p>"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>输入值。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>输入时触发。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>提交时触发。</p>"
          },
          {
            "name": "focus",
            "descriptionHtml": "<p>获得焦点时触发。</p>"
          },
          {
            "name": "blur",
            "descriptionHtml": "<p>失去焦点时触发。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "prefix",
            "descriptionHtml": "<p>输入区左侧的图标或文字。</p>"
          },
          {
            "name": "suffix",
            "descriptionHtml": "<p>输入区右侧的图标或文字。</p>"
          }
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
        "title": "清除按钮",
        "descriptionHtml": "<p><code>clearable</code> 在有值时显示清除按钮，<code>full</code> 让输入框占满父容器宽度。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> clearable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> full</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入关键词\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> clearable</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> full</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"输入关键词\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-input</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "前后缀",
        "descriptionHtml": "<p><code>prefix</code> / <code>suffix</code> 插槽在输入区两侧放图标或文字，<code>aria-label</code> 为无可见标签的输入提供无障碍名称。</p>",
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
    "component": "middle-ellipsis",
    "tag": "web-ui-middle-ellipsis",
    "introHtml": "<p>单行中间省略：保留首尾、丢掉中间，<code>very-long-file-…-abcdefghij.txt</code>；切点落在字素簇边界上，不会劈开代理对或 emoji。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "text",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>完整文本，组件只读不回写。</p>"
          },
          {
            "name": "marker",
            "type": "string",
            "default": "'…'",
            "descriptionHtml": "<p>插在两端之间的标记；空串即截断但不给可见信号。</p>"
          },
          {
            "name": "marker-position",
            "type": "number",
            "default": "50",
            "descriptionHtml": "<p>标记所在的横向比例 0–100；越界夹紧，<code>NaN</code> 回落 50。</p>"
          }
        ]
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
    "component": "popover",
    "tag": "web-ui-popover",
    "introHtml": "<p>锚定触发元素的弹出层，支持 click / hover / manual 三种触发方式，<code>trigger</code> 插槽放触发器、默认插槽放面板内容。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>弹出层可见性。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "placement",
            "type": "Placement",
            "default": "'bottom'",
            "descriptionHtml": "<p>Floating UI 位置。</p>"
          },
          {
            "name": "offset",
            "type": "number",
            "default": "8",
            "descriptionHtml": "<p>与锚点的距离（px）。</p>"
          },
          {
            "name": "trigger",
            "type": "'click' | 'hover' | 'manual'",
            "default": "'click'",
            "descriptionHtml": "<p>触发方式：<code>click</code>（默认）、<code>hover</code>、<code>manual</code>。</p>"
          },
          {
            "name": "portal",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>在 theme-owned overlay root 中渲染。</p>"
          },
          {
            "name": "overlayContainer",
            "type": "OverlayContainer",
            "default": "—",
            "descriptionHtml": "<p>显式 Portal 容器（property）。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "descriptionHtml": "<p>弹出层开合，<code>detail.open</code> 为当前状态。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "trigger",
            "descriptionHtml": "<p>触发器，请放入可交互元素。</p>"
          },
          {
            "name": "default",
            "descriptionHtml": "<p>弹出层内容。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>click 模式点击触发器切换；触发器请放入可交互元素，ARIA 状态会回写到它。</p>",
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
    "component": "radio",
    "tag": "web-ui-radio",
    "introHtml": "<p>单个单选按钮，与 <code>&lt;web-ui-checkbox></code> 共用选择控件的盒契约；<code>&lt;web-ui-radio-group></code> 负责在一组选项之间保持单选。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "checked",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>选中状态。</p>"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>选中时提交的表单值。</p>"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>必填校验。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>选中状态变化时触发。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>用户切换选中状态时触发。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>标签文本；为空时收掉指示器与标签之间的间距。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>默认插槽是标签文字。</p>",
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
    "component": "segmented",
    "tag": "web-ui-segmented",
    "introHtml": "<p>分段控制器（单选按钮组），子项是 <code>&lt;web-ui-segmented-trigger></code>；<code>value</code> 同步选中项，并与原生 <code>&lt;form></code> 集成。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "variant",
            "type": "'inset' | 'raised'",
            "default": "'inset'",
            "descriptionHtml": "<p>材质变体：<code>inset</code>（默认）或 <code>raised</code>。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用全部 trigger。</p>"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>必填校验。</p>"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>当前选中值。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>选中值变化时触发。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>用户切换选中时触发。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>投影 <code>&lt;web-ui-segmented-trigger></code> 子项。</p>"
          }
        ]
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
        "descriptionHtml": "<p><code>variant</code> 选择轨道与指示器的材质：<code>inset</code>（默认，嵌入轨道）或 <code>raised</code>（经典浮起）。</p>",
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
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>未选中时显示的占位文本。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>必填校验。</p>"
          },
          {
            "name": "portal",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>在 theme-owned overlay root 中渲染下拉面板。</p>"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>打开时不锁定页面滚动。</p>"
          },
          {
            "name": "overlayContainer",
            "type": "OverlayContainer",
            "default": "—",
            "descriptionHtml": "<p>显式 Portal 容器（property）。</p>"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>选中值。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>选中值变化时触发。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>用户提交选择时触发。</p>"
          },
          {
            "name": "open-change",
            "descriptionHtml": "<p>下拉面板开合，<code>detail.open</code> 为当前状态。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "trigger",
            "descriptionHtml": "<p>自定义触发区域内容，替换默认 label 与箭头。</p>"
          },
          {
            "name": "default",
            "descriptionHtml": "<p>投影 <code>&lt;web-ui-option></code> 候选。</p>"
          }
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
        "title": "选项装饰",
        "descriptionHtml": "<p><code>&lt;web-ui-option></code> 的 <code>prefix</code> / <code>suffix</code> 插槽在标签两侧加图标或后缀信息，<code>disabled</code> 项不可选。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"选择优先级\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"high\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"高优先级\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>🔴&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>P0&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"low\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"低优先级\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> placeholder</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"选择优先级\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"high\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"高优先级\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"prefix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>🔴&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">      &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> slot</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"suffix\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>P0&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">span</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> value</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"low\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> label</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"低优先级\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> disabled</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-option</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-select</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "自定义触发器",
        "descriptionHtml": "<p>把内容放进 <code>trigger</code> 插槽替换默认 label 与箭头，外壳与浮层锚点保持默认。</p>",
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
    "introHtml": "<p>范围滑块，支持刻度标记与垂直方向；拖拽走 pointer capture，键盘支持方向键、Home / End 与 PageUp / PageDown。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "marks",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>显示刻度标记。</p>"
          },
          {
            "name": "vertical",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>垂直方向。</p>"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>必填校验。</p>"
          },
          {
            "name": "value",
            "type": "number",
            "default": "0",
            "descriptionHtml": "<p>当前值。</p>"
          },
          {
            "name": "min",
            "type": "number",
            "default": "0",
            "descriptionHtml": "<p>最小值。</p>"
          },
          {
            "name": "max",
            "type": "number",
            "default": "100",
            "descriptionHtml": "<p>最大值。</p>"
          },
          {
            "name": "step",
            "type": "number",
            "default": "1",
            "descriptionHtml": "<p>步进值。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>拖拽 / 输入过程中触发。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>松手或键盘确认时触发。</p>"
          }
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
        "descriptionHtml": "<p><code>marks</code> 显示刻度标记，<code>vertical</code> 让滑块沿垂直方向排列。</p>",
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
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "size",
            "type": "number",
            "default": "24",
            "descriptionHtml": "<p>尺寸（px）。</p>"
          },
          {
            "name": "description",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>描述文字。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "description",
            "descriptionHtml": "<p>描述插槽，替代 <code>description</code> 属性。</p>"
          }
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
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "duration",
            "type": "number",
            "default": "1000",
            "descriptionHtml": "<p>动画时长（毫秒），限制在 0–30000。</p>"
          },
          {
            "name": "easing",
            "type": "string",
            "default": "'linear'",
            "descriptionHtml": "<p>传递给 <code>element.animate()</code> 的 CSS 缓动函数。</p>"
          },
          {
            "name": "no-autoplay",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>关闭内容首次出现时的自动播放。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>需要动画的 SVG 内容。</p>"
          }
        ]
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
    "introHtml": "<p>开关切换，声明 <code>role=\"switch\"</code> 与 <code>aria-checked</code>；<code>loading</code> 期间阻断交互并显示待定状态。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "checked",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>打开 / 关闭状态。</p>"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单提交值。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>必填校验。</p>"
          },
          {
            "name": "loading",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>加载状态。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>状态变化时触发。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>用户切换开关时触发。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>checked</code> 是开关状态，<code>value</code> 是表单提交值。</p>",
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
        "descriptionHtml": "<p>开关自身不渲染标签盒之外的内容，<code>name</code> 与 <code>value</code> 让它在表单里以选中值参与提交。</p>",
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
    "introHtml": "<p>多行文本输入框，支持清除按钮、自动高度与前后缀插槽；焦点委托到 shadow 内的原生 textarea。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>占位文本。</p>"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>表单字段名。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "readonly",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>只读状态。</p>"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>必填校验。</p>"
          },
          {
            "name": "full",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>占满父容器宽度。</p>"
          },
          {
            "name": "clearable",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>显示清除按钮。</p>"
          },
          {
            "name": "borderless",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。</p>"
          },
          {
            "name": "rows",
            "type": "number",
            "default": "3",
            "descriptionHtml": "<p>显示行数。</p>"
          },
          {
            "name": "minlength",
            "type": "number | undefined",
            "default": "—",
            "descriptionHtml": "<p>最小长度校验。</p>"
          },
          {
            "name": "maxlength",
            "type": "number | undefined",
            "default": "—",
            "descriptionHtml": "<p>最大长度校验。</p>"
          },
          {
            "name": "autosize",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>自动调整高度，同时强制 <code>resize: none</code>。</p>"
          },
          {
            "name": "max-height",
            "type": "number",
            "default": "0",
            "descriptionHtml": "<p>自动高度上限（px），0 表示不限制。</p>"
          },
          {
            "name": "aria-label",
            "type": "string | null",
            "default": "null",
            "descriptionHtml": "<p>无障碍标签。</p>"
          },
          {
            "name": "aria-labelledby",
            "type": "string | undefined",
            "default": "—",
            "descriptionHtml": "<p>无障碍标签引用。</p>"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>输入值。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "descriptionHtml": "<p>输入时触发。</p>"
          },
          {
            "name": "change",
            "descriptionHtml": "<p>提交时触发。</p>"
          },
          {
            "name": "focus",
            "descriptionHtml": "<p>获得焦点时触发。</p>"
          },
          {
            "name": "blur",
            "descriptionHtml": "<p>失去焦点时触发。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "prefix",
            "descriptionHtml": "<p>文本域左侧的图标或文字。</p>"
          },
          {
            "name": "suffix",
            "descriptionHtml": "<p>文本域右侧的图标或文字。</p>"
          }
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
        "descriptionHtml": "<p><code>prefix</code> / <code>suffix</code> 插槽在文本域两侧放图标或计数。</p>",
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
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "appearance",
            "type": "ThemeAppearance | undefined",
            "default": "—",
            "descriptionHtml": "<p>配色方案：<code>light</code>、<code>dark</code> 或 <code>system</code>。</p>"
          },
          {
            "name": "resolved-appearance",
            "type": "ResolvedThemeAppearance",
            "default": "'light'",
            "descriptionHtml": "<p>解析后的配色方案，只读反射输出。</p>"
          },
          {
            "name": "motion",
            "type": "ThemeMotion",
            "default": "'system'",
            "descriptionHtml": "<p>当前嵌套主题范围的动效偏好：<code>full</code>、<code>reduced</code> 或 <code>system</code>。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>主题作用域内的内容。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p><code>appearance</code> 选择配色方案，未设置时主题保持 inactive 但解析输出使用默认的 <code>light</code>。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"dark\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>暗色主题下的按钮&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"dark\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"primary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>暗色主题下的按钮&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
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
    "introHtml": "<p>Toast 通知。常规用法是命令式 API <code>toast()</code>：同一 <code>id</code> 的再次调用是更新那一条，而不是新建。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "toastId",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>这条 toast 的合并键（property）。</p>"
          },
          {
            "name": "type",
            "type": "ToastType",
            "default": "'info'",
            "descriptionHtml": "<p>类型：<code>success</code>、<code>info</code>、<code>warning</code>、<code>error</code>。</p>"
          },
          {
            "name": "position",
            "type": "ToastPosition",
            "default": "'top-right'",
            "descriptionHtml": "<p>屏幕位置，默认 <code>top-right</code>。</p>"
          },
          {
            "name": "heading",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>粗体标题。</p>"
          },
          {
            "name": "message",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>通知文本。</p>"
          },
          {
            "name": "duration",
            "type": "number",
            "default": "3000",
            "descriptionHtml": "<p>自动关闭时间（ms），0 表示不自动关闭。</p>"
          },
          {
            "name": "no-close-button",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>隐藏关闭按钮。</p>"
          },
          {
            "name": "visible",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>当前是否可见。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "toast-close",
            "descriptionHtml": "<p>退场结束后派发，<code>detail</code> 含 <code>id</code> 与 <code>reason</code>。</p>"
          }
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
        "title": "直接使用元素",
        "descriptionHtml": "<p>单个 Toast 元素可声明式使用，<code>heading</code> 与 <code>message</code> 是两级文案，<code>no-close-button</code> 隐藏关闭按钮。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-toast</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"success\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"已保存\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> message</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"更改已写入云端\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> duration</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">3000</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">visible</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-toast</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-toast</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> type</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"success\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> heading</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"已保存\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> message</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"更改已写入云端\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> :duration</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"3000\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> visible</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-toast</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      }
    ]
  },
  {
    "component": "tooltip",
    "tag": "web-ui-tooltip",
    "introHtml": "<p>工具提示，支持指针与焦点触发；<code>content</code> 属性提供纯文本，<code>content</code> 插槽可放更丰富的内容。</p>",
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "placement",
            "type": "Placement",
            "default": "'top'",
            "descriptionHtml": "<p>Floating UI 位置，默认 <code>top</code>。</p>"
          },
          {
            "name": "show-delay",
            "type": "number",
            "default": "200",
            "descriptionHtml": "<p>显示延迟（毫秒）。</p>"
          },
          {
            "name": "hide-delay",
            "type": "number",
            "default": "100",
            "descriptionHtml": "<p>隐藏延迟（毫秒）。</p>"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>禁用状态。</p>"
          },
          {
            "name": "offset",
            "type": "number",
            "default": "6",
            "descriptionHtml": "<p>与触发器的距离（px）。</p>"
          },
          {
            "name": "content",
            "type": "string",
            "default": "''",
            "descriptionHtml": "<p>提示文本，是 <code>content</code> 插槽的纯文本替代。</p>"
          },
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>可见性。</p>"
          },
          {
            "name": "portal",
            "type": "boolean",
            "default": "false",
            "descriptionHtml": "<p>在 theme-owned overlay root 中渲染。</p>"
          },
          {
            "name": "overlayContainer",
            "type": "OverlayContainer",
            "default": "—",
            "descriptionHtml": "<p>显式 Portal 容器（property）。</p>"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "descriptionHtml": "<p>提示开合，<code>detail.open</code> 为当前状态。</p>"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "descriptionHtml": "<p>触发器。</p>"
          },
          {
            "name": "content",
            "descriptionHtml": "<p>提示面板内容，替代 <code>content</code> 属性。</p>"
          }
        ]
      }
    ],
    "samples": [
      {
        "id": null,
        "title": "基础",
        "descriptionHtml": "<p>默认插槽是触发器，<code>content</code> 是提示文本。</p>",
        "html": {
          "react": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-tooltip</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> content</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"保存当前更改\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-tooltip</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>",
          "vue": "<pre class=\"shiki shiki-themes github-light github-dark mdc-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-tooltip</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> content</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"保存当前更改\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">    &#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"secondary\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>保存&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-button</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">  &#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-tooltip</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">template</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>"
        },
        "demoKey": null
      },
      {
        "id": null,
        "title": "内容插槽",
        "descriptionHtml": "<p><code>content</code> 插槽替代纯文本，可放图标或带格式的内容。</p>",
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
