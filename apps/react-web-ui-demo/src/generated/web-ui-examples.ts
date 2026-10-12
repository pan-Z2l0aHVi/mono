// 本文件由 scripts/generate-web-ui-examples.mjs 生成，请勿手动编辑。
// source of truth：docs/examples/web-ui/*.md（示例与文案）+ packages/web-ui/src/components/*/index.ts（API 契约）。
// 重新生成：node scripts/generate-web-ui-examples.mjs

export interface ExampleApiRow {
  name: string
  type?: string
  default?: string
  description: string
}

export interface ExampleApiSection {
  key: 'props' | 'events' | 'slots'
  title: string
  rows: ExampleApiRow[]
}

export interface ExampleSample {
  title: string
  description: string
  html: { react: string; vue: string }
}

export interface ExampleDoc {
  component: string
  tag: string
  intro: string
  samples: ExampleSample[]
  api: ExampleApiSection[]
}

export const exampleDocs: ExampleDoc[] = [
  {
    "component": "autocomplete",
    "tag": "web-ui-autocomplete",
    "intro": "可输入并过滤候选的单值选择器：输入文本按 `option` 的 label 过滤候选，选中后把 label 回填到输入框，并把该项的 value 暴露为只读的 `selected-value`。",
    "samples": [
      {
        "title": "基础",
        "description": "键入时按 label 过滤候选，没有匹配项时面板保持关闭；下拉面板的开合通过 `open-change` 通知。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"选择框架\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onChange</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">console</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">log</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"vue\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Vue\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"react\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"React\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"svelte\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Svelte\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"选择框架\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"onChange\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"vue\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Vue\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"react\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"React\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"svelte\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Svelte\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">function</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">onChange</span>(<span class=\"hl-type\">event</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">Event</span>)<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">select</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">as</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">HTMLElement</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">&amp;</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">value</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">string</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n  </span><span class=\"hl-builtin\">console</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">log</span>(<span class=\"hl-type\">select</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "自定义触发器",
        "description": "把可编辑组件放进 `trigger` 插槽即可替换默认输入框。多行触发器保留 Enter 换行语义，关闭面板改用 Escape 或 blur。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"描述问题\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">filter</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"none\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">rows</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"3\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"bug\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"缺陷\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"feature\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"需求\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"描述问题\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">filter</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"none\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">rows</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"3\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"bug\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"缺陷\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"feature\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"需求\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "允许自定义值",
        "description": "开启 `allow-custom-value` 后，无匹配且无活动项时 Enter 会把输入原文作为 custom value 提交，`selected-value` 保持为空。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">allow-custom-value</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"输入或选择标签\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">allow-custom-value</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"输入或选择标签\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-autocomplete</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "description": "输入框占位文本。"
          },
          {
            "name": "borderless",
            "type": "boolean",
            "default": "false",
            "description": "ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用态，不可输入、不可展开下拉。"
          },
          {
            "name": "readonly",
            "type": "boolean",
            "default": "false",
            "description": "只读态：不可输入、不可展开下拉。"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "description": "必填校验。"
          },
          {
            "name": "portal",
            "type": "boolean",
            "default": "false",
            "description": "在 theme-owned overlay root 中渲染下拉面板。"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "description": "打开时不锁定页面滚动。"
          },
          {
            "name": "allow-custom-value",
            "type": "boolean",
            "default": "false",
            "description": "允许 Enter 提交不在候选中的输入原文。"
          },
          {
            "name": "overlayContainer",
            "type": "OverlayContainer",
            "default": "—",
            "description": "显式 Portal 容器（property，不是 attribute）。"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "aria-label",
            "type": "string | null",
            "default": "null",
            "description": "无障碍名称。"
          },
          {
            "name": "aria-labelledby",
            "type": "string | undefined",
            "default": "—",
            "description": "无障碍名称引用。"
          },
          {
            "name": "filter",
            "type": "FilterMode",
            "default": "'contains'",
            "description": "候选过滤模式：`contains`（默认）、`prefix` 或 `none`。"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "description": "当前输入文本，也是表单提交值。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "输入时触发，`value` 为当前文本。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "选中候选或提交 custom value 时触发。"
          },
          {
            "name": "focus",
            "type": "FocusEvent",
            "description": "触发器获得焦点时触发。"
          },
          {
            "name": "blur",
            "type": "FocusEvent",
            "description": "触发器失去焦点时触发。"
          },
          {
            "name": "open-change",
            "type": "CustomEvent<{ open: boolean }>",
            "description": "下拉面板开合，`detail.open` 为当前状态。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "trigger",
            "description": "自定义触发区域内容，替换默认输入框。"
          },
          {
            "name": "default",
            "description": "投影 `<web-ui-option>` 候选。"
          }
        ]
      }
    ]
  },
  {
    "component": "avatar",
    "tag": "web-ui-avatar",
    "intro": "头像，支持图片加载失败与无图片时回退到名称首字母，避免在图片缺位处留下空洞。",
    "samples": [
      {
        "title": "基础",
        "description": "传入 `src` 时按图片渲染，`alt` 作为图片替代文本，`size` 决定头像边长。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">src</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"/avatars/grey.png\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">alt</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Grey\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">48</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">src</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"/avatars/grey.png\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">alt</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Grey\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"48\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "首字母回退",
        "description": "没有 `src`、或图片加载失败时，组件从 `name` 取首字母渲染回退头像。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Grey Pan\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">40</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Ada Lovelace\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">40</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Grey Pan\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"40\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Ada Lovelace\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"40\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "形状与降级内容",
        "description": "`shape` 控制圆形与方形；`default` 插槽在图片加载失败时替代默认的首字母回退。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">src</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"/broken.png\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">shape</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"square\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">48</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideUser</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">src</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"/broken.png\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">shape</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"square\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"48\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideUser\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-avatar</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideUser</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "src",
            "type": "string",
            "default": "''",
            "description": "图片 URL；留空或加载失败时回退。"
          },
          {
            "name": "alt",
            "type": "string",
            "default": "''",
            "description": "图片替代文本。"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "展示名称，用于首字母回退。"
          },
          {
            "name": "size",
            "type": "number",
            "default": "40",
            "description": "头像边长（px）。"
          },
          {
            "name": "shape",
            "type": "'circle' | 'square'",
            "default": "'circle'",
            "description": "形状：`circle`（默认）或 `square`。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "图片加载失败时的降级内容，替代默认首字母。"
          }
        ]
      }
    ]
  },
  {
    "component": "back-top",
    "tag": "web-ui-back-top",
    "intro": "回到顶部按钮：滚动超过阈值后出现在角落，点击或按 Enter 平滑回到顶部；也可以挂到自定义滚动容器内。",
    "samples": [
      {
        "title": "基础",
        "description": "默认跟随页面滚动（`scrollTarget` 为 `window`），超过 `threshold` 后显示。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">threshold</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">200</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:threshold</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"200\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "滚动行为",
        "description": "`scroll-behavior` 为 `auto` 时点击立即到位，不播放平滑滚动动画。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">scroll-behavior</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"auto\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">scroll-behavior</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"auto\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "自定义滚动容器",
        "description": "把 `scrollTarget` 指向自己的滚动容器后，按钮以 `position: sticky` 悬浮在容器右下角，只随该容器滚动出现。`scrollTarget` 是 element 属性，需要在挂载后赋值。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">scrollBoxRef</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">useRef</span>(<span class=\"hl-literal\">null</span>)<span class=\"hl-text\">\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">backTopRef</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">useRef</span>(<span class=\"hl-literal\">null</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-builtin\">useEffect</span>(()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">if</span><span class=\"hl-text\"> </span>(<span class=\"hl-type\">scrollBoxRef</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">current</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">&amp;&amp;</span><span class=\"hl-text\"> </span><span class=\"hl-type\">backTopRef</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">current</span>)<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n    </span><span class=\"hl-type\">backTopRef</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">current</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">scrollTarget</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-type\">scrollBoxRef</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">current</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span>,<span class=\"hl-text\"> </span>[])<span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span>(<span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">ref</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">scrollBoxRef</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"scroll-box\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">ref</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">backTopRef</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">threshold</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">300</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-text\">)</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">ref</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"scrollBox\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"scroll-box\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">ref</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"backTop\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:threshold</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"300\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">onMounted</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">useTemplateRef</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">scrollBox</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">useTemplateRef</span>(<span class=\"hl-string\">'scrollBox'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">backTop</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">useTemplateRef</span>(<span class=\"hl-string\">'backTop'</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-fn\">onMounted</span>(()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">if</span><span class=\"hl-text\"> </span>(<span class=\"hl-type\">scrollBox</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">&amp;&amp;</span><span class=\"hl-text\"> </span><span class=\"hl-type\">backTop</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-text\"> </span><span class=\"hl-type\">backTop</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">scrollTarget</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-type\">scrollBox</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "自定义内容",
        "description": "默认插槽替换按钮内容，交互语义仍由组件提供。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">回到顶部</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">回到顶部</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-back-top</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "scroll-behavior",
            "type": "'smooth' | 'auto'",
            "default": "'smooth'",
            "description": "滚动行为：`smooth`（默认）或 `auto`。"
          },
          {
            "name": "visible",
            "type": "boolean",
            "default": "false",
            "description": "当前可见状态，由滚动位置驱动。"
          },
          {
            "name": "scrollTarget",
            "type": "HTMLElement | Window",
            "default": "window",
            "description": "滚动容器，`window`（默认）或 `HTMLElement`（property）。"
          },
          {
            "name": "threshold",
            "type": "number",
            "default": "200",
            "description": "显示按钮的滚动阈值（px）。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "自定义按钮内容。"
          }
        ]
      }
    ]
  },
  {
    "component": "badge",
    "tag": "web-ui-badge",
    "intro": "徽标 / 通知计数：把 `count` 角标叠加在默认插槽内容的一角，`dot` 模式只显示一个圆点。",
    "samples": [
      {
        "title": "基础",
        "description": "默认插槽是要装饰的内容，`count` 超过 `max` 时显示 `max+`。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">count</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">5</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideBell</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">22</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">count</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">128</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">max</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">99</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideBell</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">22</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:count</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"5\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideBell\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"22\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:count</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"128\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:max</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"99\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideBell\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"22\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideBell</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "点模式与零值",
        "description": "`dot` 只显示圆点而不显示数字；`show-zero` 让 `count` 为 0 时也显示，`badge-hidden` 完全隐藏。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">dot</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">消息</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">count</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">0</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">show-zero</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">草稿</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">dot</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">消息</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:count</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">show-zero</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">草稿</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "位置与偏移",
        "description": "`placement` 选择四个角，`offset-x` / `offset-y` 在此基础上做像素微调。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">count</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">3</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placement</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"bottom-left\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">offset-x</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-operator\">-</span><span class=\"hl-number\">4</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">offset-y</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">4</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideMail</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">22</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:count</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"3\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placement</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"bottom-left\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:offset-x</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"-4\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:offset-y</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"4\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideMail\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"22\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-badge</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideMail</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "count",
            "type": "number",
            "default": "0",
            "description": "显示数字。"
          },
          {
            "name": "max",
            "type": "number",
            "default": "99",
            "description": "数字上限，超过时显示 `max+`。"
          },
          {
            "name": "dot",
            "type": "boolean",
            "default": "false",
            "description": "点模式，只显示圆点不显示数字。"
          },
          {
            "name": "show-zero",
            "type": "boolean",
            "default": "false",
            "description": "`count` 为 0 时也显示。"
          },
          {
            "name": "badge-hidden",
            "type": "boolean",
            "default": "false",
            "description": "完全隐藏徽标。"
          },
          {
            "name": "offset-x",
            "type": "number",
            "default": "0",
            "description": "水平偏移（px）。"
          },
          {
            "name": "offset-y",
            "type": "number",
            "default": "0",
            "description": "垂直偏移（px）。"
          },
          {
            "name": "placement",
            "type": "'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'",
            "default": "'top-right'",
            "description": "徽标位置：`top-right`（默认）、`top-left`、`bottom-right`、`bottom-left`。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "被装饰的内容，徽标叠加在它的一角。"
          }
        ]
      }
    ]
  },
  {
    "component": "button",
    "tag": "web-ui-button",
    "intro": "按钮用于触发一个即时操作：提交表单、打开对话框、切换状态。它不贡献表单值，\n`type=\"submit\"` / `type=\"reset\"` 时把原生 activation 转发给宿主 form。",
    "samples": [
      {
        "title": "变体",
        "description": "`variant` 决定视觉层级。默认 `glass` 与页面背景融合，适合工具栏；`primary` 一页只应有一个。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">Primary</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">Secondary</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ghost\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">Ghost</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"danger\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">Danger</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"glass\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">Glass</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">Primary</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">Secondary</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ghost\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">Ghost</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"danger\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">Danger</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"glass\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">Glass</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "插槽",
        "description": "默认插槽是按钮文字；`prefix` / `suffix` 放在文字两侧，图标模式（`icon`）下默认插槽整体作为图标。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-text\">搜索\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"suffix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideChevronRight</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideSearch\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-text\">搜索\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"suffix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideChevronRight\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideChevronRight</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "图标模式",
        "description": "`icon` 让按钮变成正方形图标按钮，此时 `loading` 优先于插槽内容，只渲染 spinner。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">aria-label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"搜索\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">loading</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">aria-label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"加载中\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">aria-label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"搜索\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideSearch\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">loading</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">aria-label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"加载中\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideSearch\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "按钮组",
        "description": "`<web-ui-button-group>` 把多个按钮并成一组并画出相邻分割线；成员按钮的 `size` 在组内被忽略。\n\n\n\n\n\n`direction` 选择横排或竖排，分割线长度由 `--wui-button-group-divider-length` 控制。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button-group</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">左</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">中</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">右</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button-group</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button-group</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">左</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">中</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">右</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button-group</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "variant",
            "type": "'primary' | 'secondary' | 'ghost' | 'danger' | 'glass'",
            "default": "'glass'",
            "description": "视觉变体：`primary` / `secondary` / `ghost` / `danger` / `glass`。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用态。禁用时不派发 click，也不参与表单提交。"
          },
          {
            "name": "loading",
            "type": "boolean",
            "default": "false",
            "description": "加载态。与 `disabled` 一样阻断交互，并优先渲染 spinner。"
          },
          {
            "name": "full",
            "type": "boolean",
            "default": "false",
            "description": "占满父容器宽度。"
          },
          {
            "name": "icon",
            "type": "boolean",
            "default": "false",
            "description": "图标模式：按钮为正方形，默认插槽整体作为图标。"
          },
          {
            "name": "size",
            "type": "string",
            "default": "''",
            "description": "按钮高度（CSS 长度，如 `28`、`32px`）。在 `web-ui-button-group` 内被忽略。"
          },
          {
            "name": "type",
            "type": "button | submit | reset",
            "default": "'button'",
            "description": "原生 button 的 `type`：`button` / `submit` / `reset`。后两者把 activation 转发给宿主 form。"
          },
          {
            "name": "aria-label",
            "type": "string | null",
            "default": "null",
            "description": "无障碍名称。图标按钮必须提供，否则读屏器只会读出空按钮。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "按钮文字；`icon` 模式下整体作为图标内容。"
          },
          {
            "name": "prefix",
            "description": "文字左侧的图标或标识。"
          },
          {
            "name": "suffix",
            "description": "文字右侧的图标或标识。"
          }
        ]
      }
    ]
  },
  {
    "component": "checkbox",
    "tag": "web-ui-checkbox",
    "intro": "单个复选框，声明 `role=\"checkbox\"`，支持 Enter / Space 切换；与原生 `<form>` 集成，选中时把 `value` 提交进 `FormData`。",
    "samples": [
      {
        "title": "基础",
        "description": "`checked` 是控件状态，默认插槽是标签文字。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">checked</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">agreed</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onChange</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setAgreed</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">checked</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-text\">我已阅读并同意服务条款\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:checked</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"agreed\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"agreed = !agreed\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">我已阅读并同意服务条款</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">agreed</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-literal\">false</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "表单值",
        "description": "`value` 是选中时提交的值，`name` 是字段名，`required` 让原生表单校验在未选中时拦截提交。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"plan\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"pro\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">required</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-text\">专业版\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"plan\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"pro\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">required</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">专业版</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "复选框组",
        "description": "`<web-ui-checkbox-group>` 统一管理成员的选中与表单提交；`direction` 控制排列方向。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox-group</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"fruits\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">selected</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onInput</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setSelected</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"apple\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">苹果</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"banana\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">香蕉</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"cherry\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    樱桃\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-checkbox-group</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox-group</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"fruits\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"selected\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@input</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"selected = $event.currentTarget.value\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"apple\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">苹果</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"banana\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">香蕉</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"cherry\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">樱桃</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-checkbox</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-checkbox-group</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">selected</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">string</span>[]<span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">([])\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "checked",
            "type": "boolean",
            "default": "false",
            "description": "选中状态。"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "description": "选中时提交的表单值。"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "description": "必填校验。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "选中状态变化时触发。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "用户切换选中状态时触发。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "标签文本；为空时收掉指示器与标签之间的间距。"
          }
        ]
      }
    ]
  },
  {
    "component": "collapse",
    "tag": "web-ui-collapse",
    "intro": "折叠面板把「触发器」与「内容」放在同一行内：触发器是 default slot，内容放在 `content` slot。\n开合是严格受控的——组件只派发 `open-change` 请求，是否真的展开由 Consumer 回写 `open` 决定。",
    "samples": [
      {
        "title": "基础用法",
        "description": "触发器可以是任何可交互元素（原生 `button`、`web-ui-button` 等），内容可以是任意节点。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">open</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">open</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onopen-change</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setOpen</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">detail</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">open</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">type</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"button\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"w-full text-left\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">点击展开</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"content\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">这是折叠内容，支持任意内容。</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:open</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@open-change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open = $event.detail.open\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">type</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"button\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"w-full text-left\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">点击展开</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"content\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">这是折叠内容，支持任意内容。</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">open</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-literal\">false</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "keep-mounted",
        "description": "默认关闭态把内容 `hidden`（脱离渲染与可访问性树）。`keep-mounted` 改为 `inert`，\n保留滚动位置与可测量性，代价是关闭态仍占布局。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">keep-mounted</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">type</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"button\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"w-full text-left\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">展开长列表</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"content\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">{</span><span class=\"hl-builtin\">Array</span><span class=\"hl-operator\">.</span><span class=\"hl-keyword\">from</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">length</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">20</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>,<span class=\"hl-text\"> </span>(<span class=\"hl-type\">_</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">i</span>)<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span>(<span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">key</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">i</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">列表项 </span><span class=\"hl-punct\">{</span><span class=\"hl-type\">i</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">+</span><span class=\"hl-text\"> </span><span class=\"hl-number\">1</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    ))</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">keep-mounted</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">type</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"button\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"w-full text-left\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">展开长列表</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"content\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">v-for</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"index in 20\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:key</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"index\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">列表项 </span><span class=\"hl-punct\">{{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">index</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}}</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "peek",
        "description": "`peek` 让关闭态只露出固定长度的一段，其余被裁剪且不可交互，用来提示「下面还有内容」。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">peek</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"80px\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">type</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"button\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"w-full text-left\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">展开长文本</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"content\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">关闭时只露出前 80px。</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">peek</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"80px\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">type</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"button\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"w-full text-left\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">展开长文本</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"content\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">关闭时只露出前 80px。</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-collapse</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "description": "展开状态。严格受控，唯一状态源；组件只派发请求，不自己改。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用触发：点击忽略，`aria-disabled` 写到 trigger 元素上；已展开内容保持现状。"
          },
          {
            "name": "horizontal",
            "type": "boolean",
            "default": "false",
            "description": "水平方向：沿宽度展开，默认沿高度。"
          },
          {
            "name": "keep-mounted",
            "type": "boolean",
            "default": "false",
            "description": "关闭稳态保持内容 `inert` 而非 `hidden`，保留滚动位置与可测量性。"
          },
          {
            "name": "peek",
            "type": "string | null",
            "default": "null",
            "description": "关闭稳态露出的尺寸（CSS 长度，如 `120px`、`6rem`）。设置后语义等同 `keep-mounted`。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "type": "CustomEvent<{ open: boolean }>",
            "description": "开合请求。`detail.open` 是请求的目标状态；Consumer 回写 `open` 才真正生效。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "触发器。可放原生 `button` 或任意 `web-ui-*` 组件。"
          },
          {
            "name": "content",
            "description": "折叠内容。关闭态按 `keep-mounted` / `peek` 决定是 `hidden` 还是 `inert`。"
          }
        ]
      }
    ]
  },
  {
    "component": "context-menu",
    "tag": "web-ui-context-menu",
    "intro": "右键上下文菜单：第一个子元素是触发区域，其余子元素是菜单项（`<web-ui-dropdown-item>` 等）。打开期间菜单是模态的，点空白只会关掉菜单。",
    "samples": [
      {
        "title": "基础",
        "description": "在触发区域内右键即可打开，菜单从鼠标位置展开。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"context-zone\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">在此区域右键点击</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">复制</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">粘贴</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-divider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-divider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">删除</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"context-zone\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">在此区域右键点击</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">复制</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">粘贴</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-divider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-divider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">删除</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "触屏长按",
        "description": "`long-press` 让触屏按住 `long-press-delay` 毫秒后打开菜单，从按点向下展开；按住期间位移超过 10px 会取消。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">long-press</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">long-press-delay</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">600</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"context-zone\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">按住我打开菜单</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">重命名</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">移动</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">long-press</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:long-press-delay</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"600\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"context-zone\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">按住我打开菜单</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">重命名</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">移动</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "监听开合",
        "description": "`open-change` 通知菜单开与关；关闭后焦点归还给打开前持焦的元素。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onopen-change</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">console</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">log</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">detail</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">open</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"context-zone\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">在此区域右键点击</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">复制</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@open-change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"onOpenChange\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"context-zone\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">在此区域右键点击</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">复制</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-context-menu</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">function</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">onOpenChange</span>(<span class=\"hl-type\">event</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">CustomEvent</span>&lt;<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">open</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">boolean</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>&gt;)<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-builtin\">console</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">log</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">detail</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">open</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "右键与 `openAt()` 都不打开菜单，不做视觉置灰。"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "description": "打开时允许背景滚动。"
          },
          {
            "name": "long-press",
            "type": "boolean",
            "default": "false",
            "description": "触屏长按打开菜单（opt-in；鼠标始终走 `contextmenu`）。"
          },
          {
            "name": "long-press-delay",
            "type": "number",
            "default": "500",
            "description": "长按触发前需按住的时长（ms）。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "type": "CustomEvent<{ open: boolean }>",
            "description": "菜单开合，`detail.open` 为当前状态。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "第一个元素是触发区域，其余元素是菜单项。"
          }
        ]
      }
    ]
  },
  {
    "component": "dialog",
    "tag": "web-ui-dialog",
    "intro": "模态对话框，基于原生 `<dialog>` 的 `showModal()`；支持内置标题带、footer 与完全自绘的 `headless` 模式。",
    "samples": [
      {
        "title": "基础",
        "description": "`open` 控制可见性，`heading` 是无 header 插槽时的标题回落，`closable` 渲染内置关闭按钮。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span>[<span class=\"hl-type\">open</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">setOpen</span>]<span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">useState</span>(<span class=\"hl-literal\">false</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span>(<span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onClick</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span>()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setOpen</span>(<span class=\"hl-literal\">true</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">打开对话框</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">open</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">open</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"确认操作\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">closable</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onopen-change</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setOpen</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">detail</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">open</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">删除后无法恢复，确定继续吗？</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"footer\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"danger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onClick</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span>()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setOpen</span>(<span class=\"hl-literal\">false</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n        删除\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/&gt;</span><span class=\"hl-text\">\n)</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@click</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open = true\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">打开对话框</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:open</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"确认操作\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">closable</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@open-change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open = $event.detail.open\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">删除后无法恢复，确定继续吗？</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"footer\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"danger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@click</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open = false\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">删除</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">open</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-literal\">false</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "受控关闭",
        "description": "开启 `controlled` 后，Escape 与遮罩点击只请求 `open=false`，在消费方回写前对话框保持打开。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-text\">\n  </span><span class=\"hl-attr\">open</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">open</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n  </span><span class=\"hl-attr\">controlled</span><span class=\"hl-text\">\n  </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"未保存的更改\"</span><span class=\"hl-text\">\n  </span><span class=\"hl-attr\">onopen-change</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n    </span><span class=\"hl-keyword\">if</span><span class=\"hl-text\"> </span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">detail</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">open</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">===</span><span class=\"hl-text\"> </span><span class=\"hl-literal\">false</span>)<span class=\"hl-text\"> </span><span class=\"hl-fn\">requestClose</span>()<span class=\"hl-text\">\n    </span><span class=\"hl-keyword\">else</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setOpen</span>(<span class=\"hl-literal\">true</span>)<span class=\"hl-text\">\n  </span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">离开前要先保存吗？</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:open</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">controlled</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"未保存的更改\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@open-change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"onOpenChange\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">离开前要先保存吗？</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">function</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">onOpenChange</span>(<span class=\"hl-type\">event</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">CustomEvent</span>&lt;<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">open</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">boolean</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>&gt;)<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">if</span><span class=\"hl-text\"> </span>(<span class=\"hl-operator\">!</span><span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">detail</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">open</span>)<span class=\"hl-text\"> </span><span class=\"hl-fn\">requestClose</span>()<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "Headless",
        "description": "`headless` 只保留浮层行为，默认插槽渲染为卡片内唯一的滚动层；此时必须用 `dialog-label` 提供可访问名称。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">open</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">open</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">headless</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">dialog-label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"图片详情\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"my-dialog-content\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">自定义内容与样式</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:open</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">headless</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">dialog-label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"图片详情\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"my-dialog-content\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">自定义内容与样式</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dialog</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "description": "对话框可见性。"
          },
          {
            "name": "closable",
            "type": "boolean",
            "default": "false",
            "description": "显示内置关闭按钮。"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "description": "打开时不锁定页面滚动。"
          },
          {
            "name": "no-backdrop-close",
            "type": "boolean",
            "default": "false",
            "description": "禁止点击遮罩关闭。"
          },
          {
            "name": "no-escape-close",
            "type": "boolean",
            "default": "false",
            "description": "禁止按 Escape 关闭。"
          },
          {
            "name": "controlled",
            "type": "boolean",
            "default": "false",
            "description": "Escape 与遮罩仅请求 `open=false`，由消费方回写。"
          },
          {
            "name": "heading",
            "type": "string",
            "default": "''",
            "description": "标题文字，`header` 插槽为空时的回落（`headless` 下忽略）。"
          },
          {
            "name": "headless",
            "type": "boolean",
            "default": "false",
            "description": "只保留浮层行为，不再渲染内置 header 带、内容区与 footer。"
          },
          {
            "name": "dialog-label",
            "type": "string",
            "default": "''",
            "description": "内部原生 dialog 的 accessible name；`headless` 下必填。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "type": "CustomEvent<{ open: boolean }>",
            "description": "开关状态变化，`detail.open` 为请求的目标状态。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "正文内容。"
          },
          {
            "name": "header",
            "description": "卡片顶部的 chrome 带，有内容时接管 `heading`。"
          },
          {
            "name": "footer",
            "description": "底部操作区。"
          }
        ]
      }
    ]
  },
  {
    "component": "drawer",
    "tag": "web-ui-drawer",
    "intro": "侧边抽屉，基于原生 `<dialog>`，自带滑入 / 滑出动画，并可从四周内缘拖拽关闭。",
    "samples": [
      {
        "title": "基础",
        "description": "`placement` 决定滑入方向，`heading` 是无 header 插槽时的标题回落。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span>[<span class=\"hl-type\">open</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">setOpen</span>]<span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">useState</span>(<span class=\"hl-literal\">false</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span>(<span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onClick</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span>()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setOpen</span>(<span class=\"hl-literal\">true</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">打开抽屉</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">open</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">open</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placement</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"right\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"设置\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onopen-change</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setOpen</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">detail</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">open</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">抽屉正文</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/&gt;</span><span class=\"hl-text\">\n)</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@click</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open = true\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">打开抽屉</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:open</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placement</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"right\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"设置\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@open-change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open = $event.detail.open\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">抽屉正文</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">open</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-literal\">false</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "拖拽关闭",
        "description": "开启 `draggable` 后，抽屉内缘出现 drag bar，向关闭方向拖过半或快速甩动即关闭。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">open</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">open</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placement</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"bottom\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">draggable</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"快捷操作\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">向下拖拽关闭</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:open</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placement</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"bottom\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">draggable</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"快捷操作\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">向下拖拽关闭</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "页脚操作",
        "description": "`header` / `footer` 插槽与正文分离，正文滚动时两者保持可见。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">open</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">open</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"编辑资料\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"footer\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-text\">保存\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">正文内容</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:open</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"编辑资料\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"footer\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">保存</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">正文内容</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">p</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-drawer</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "description": "抽屉可见性。"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "description": "打开时不锁定页面滚动。"
          },
          {
            "name": "no-backdrop-close",
            "type": "boolean",
            "default": "false",
            "description": "禁止点击遮罩关闭。"
          },
          {
            "name": "controlled",
            "type": "boolean",
            "default": "false",
            "description": "用户关闭仅请求 `open=false`，由消费方回写。"
          },
          {
            "name": "placement",
            "type": "DrawerPlacement",
            "default": "'right'",
            "description": "滑入方向：`right`（默认）、`left`、`top`、`bottom`。"
          },
          {
            "name": "heading",
            "type": "string",
            "default": "''",
            "description": "标题文字，`header` 插槽为空时的回落。"
          },
          {
            "name": "closable",
            "type": "boolean",
            "default": "false",
            "description": "显示内置关闭按钮。"
          },
          {
            "name": "headless",
            "type": "boolean",
            "default": "false",
            "description": "仅保留浮层行为，默认插槽不渲染内置抽屉 UI。"
          },
          {
            "name": "dialog-label",
            "type": "string",
            "default": "''",
            "description": "内部原生 dialog 的可访问名称；`headless` 下必须提供。"
          },
          {
            "name": "draggable",
            "type": "boolean",
            "default": "false",
            "description": "在抽屉内缘显示 drag bar，支持拖拽关闭手势。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "type": "CustomEvent<{ open: boolean }>",
            "description": "开关状态变化，`detail.open` 为请求的目标状态。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "正文内容。"
          },
          {
            "name": "header",
            "description": "顶部标题区。"
          },
          {
            "name": "footer",
            "description": "底部操作区。"
          }
        ]
      }
    ]
  },
  {
    "component": "dropdown",
    "tag": "web-ui-dropdown",
    "intro": "下拉菜单：`trigger` 插槽放触发器，其余子元素作为菜单项渲染进浮层面板，支持分隔线、分组标题与多级子菜单。",
    "samples": [
      {
        "title": "基础",
        "description": "菜单项从宿主子元素迁移到浮层面板，`trigger` 必须是可交互元素。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-text\">操作\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">编辑</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">复制</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-divider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-divider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">删除</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">操作</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">编辑</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">复制</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-divider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-divider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">删除</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "图标与快捷键",
        "description": "`prefix` / `suffix` 插槽装饰菜单项，`dropdown-header` 给一组项加标题。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-text\">文件\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-header</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">编辑</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-header</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">14</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideCopy</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">复制\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"suffix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"opacity-40\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      ⌘C\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">14</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideTrash2</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">删除\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">文件</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-header</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">编辑</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-header</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"14\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideCopy\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">复制\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"suffix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"opacity-40\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">⌘C</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"14\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideTrash2\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">删除\n    </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideCopy</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">lucideTrash2</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "多级子菜单",
        "description": "在菜单项上设置 `submenu` 后，嵌套的子菜单项成为它的下一级。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-text\">更多\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"undo\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">撤销</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">submenu</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    导出为\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"pdf\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">PDF</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"png\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">PNG</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"svg\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">SVG</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">更多</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"undo\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">撤销</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">submenu</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-text\">导出为\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"pdf\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">PDF</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"png\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">PNG</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"svg\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">SVG</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown-item</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-dropdown</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "description": "菜单可见性。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "match-width",
            "type": "boolean",
            "default": "false",
            "description": "面板宽度匹配触发器宽度。"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "description": "打开时不锁定页面滚动。"
          },
          {
            "name": "placement",
            "type": "Placement",
            "default": "'bottom-start'",
            "description": "Floating UI 位置，默认 `bottom-start`。"
          },
          {
            "name": "offset",
            "type": "number",
            "default": "4",
            "description": "与触发器的距离（px）。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "type": "CustomEvent<{ open: boolean }>",
            "description": "菜单开合，`detail.open` 为当前状态。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "trigger",
            "description": "触发器，请放入可交互元素。"
          }
        ]
      }
    ]
  },
  {
    "component": "editable-text",
    "tag": "web-ui-editable-text",
    "intro": "行内纯文本编辑器：点击文字就地编辑，Enter 与 blur 提交，只有 Escape 取消；文本层与编辑层共用一个盒，进入编辑态不会移动像素。",
    "samples": [
      {
        "title": "基础",
        "description": "点击文字进入编辑态，离开即按提交语义收尾。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"点击编辑这段文字\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"未命名\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"点击编辑这段文字\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"未命名\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "提交与取消",
        "description": "Enter 与 blur 都提交草稿并派发一次 `change`；Escape 恢复进入编辑时的值，派发 `cancel` 而不派发 `change`。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span>[<span class=\"hl-type\">text</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">setText</span>]<span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">useState</span>(<span class=\"hl-string\">'项目名称'</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span>(<span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">text</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">onChange</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setText</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-punct\">}</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"未命名项目\"</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-text\">)</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"text\"</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"未命名项目\"</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">@change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"text = $event.currentTarget.value\"</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">text</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-string\">'项目名称'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "监听取消",
        "description": "`cancel` 与原生 `<dialog>` 事件同名但不冒泡、不组合，React 没有对应的合成事件，需要挂原生监听。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">useRef</span>(<span class=\"hl-literal\">null</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-builtin\">useEffect</span>(()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">element</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">current</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">if</span><span class=\"hl-text\"> </span>(<span class=\"hl-operator\">!</span><span class=\"hl-type\">element</span>)<span class=\"hl-text\"> </span><span class=\"hl-keyword\">return</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">onCancel</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span>()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">console</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">log</span>(<span class=\"hl-string\">'已取消编辑'</span>)<span class=\"hl-text\">\n  </span><span class=\"hl-type\">element</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">addEventListener</span>(<span class=\"hl-string\">'cancel'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">onCancel</span>)<span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span>()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-type\">element</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">removeEventListener</span>(<span class=\"hl-string\">'cancel'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">onCancel</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span>,<span class=\"hl-text\"> </span>[])<span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">ref</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-builtin\">ref</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"试试按 Escape\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"试试按 Escape\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@cancel</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"onCancel\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-editable-text</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">function</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">onCancel</span>()<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-builtin\">console</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">log</span>(<span class=\"hl-string\">'已取消编辑'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "description": "值为空时显示的占位文本。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态，只影响行为不做视觉置灰。"
          },
          {
            "name": "readonly",
            "type": "boolean",
            "default": "false",
            "description": "只读状态：仍可聚焦全选，但不能编辑或提交。"
          },
          {
            "name": "commit-on-unmount",
            "type": "boolean",
            "default": "false",
            "description": "卸载时按提交语义结束编辑态；WebKit 下没有 blur，只有它才能保住草稿。"
          },
          {
            "name": "aria-label",
            "type": "string | null",
            "default": "null",
            "description": "无障碍名称。"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "description": "当前值，也是表单提交值。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "每次输入时触发。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "提交草稿时触发（Enter 或 blur）。"
          },
          {
            "name": "cancel",
            "type": "Event",
            "description": "Escape 取消时触发，不冒泡不组合。"
          }
        ]
      }
    ]
  },
  {
    "component": "empty",
    "tag": "web-ui-empty",
    "intro": "空状态占位：`title` 与 `description` 提供文案，`icon` / `action` 插槽补上图形与操作入口，`size` 是唯一缩放旋钮。",
    "samples": [
      {
        "title": "基础",
        "description": "`title` 与 `description` 覆盖标题和描述两个主要文案位。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-empty</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">title</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"暂无数据\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">description</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"创建第一条记录后这里会显示列表\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-empty</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-empty</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">title</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"暂无数据\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">description</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"创建第一条记录后这里会显示列表\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-empty</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "自定义图标与操作",
        "description": "`icon` 插槽替换默认图形，`action` 插槽放操作按钮；`size` 驱动图标盒、留白与字号。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-empty</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">title</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"还没有文件\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">description</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"上传或新建一个文件开始\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">72</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"icon\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideFolderOpen</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">31</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"action\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-text\">新建文件\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-empty</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-empty</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">title</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"还没有文件\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">description</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"上传或新建一个文件开始\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"72\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"icon\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideFolderOpen\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"31\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"action\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">新建文件</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-empty</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideFolderOpen</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "title",
            "type": "string",
            "default": "''",
            "description": "标题文字。"
          },
          {
            "name": "description",
            "type": "string",
            "default": "''",
            "description": "描述文字。"
          },
          {
            "name": "size",
            "type": "number",
            "default": "56",
            "description": "版面缩放基准（px）；非法值或非正数回落为 56。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "icon",
            "description": "图形区内容，替代默认图标。"
          },
          {
            "name": "default",
            "description": "标题内容，覆盖 `title` 属性。"
          },
          {
            "name": "description",
            "description": "描述内容，覆盖 `description` 属性。"
          },
          {
            "name": "action",
            "description": "操作区内容，例如主按钮。"
          }
        ]
      }
    ]
  },
  {
    "component": "icon",
    "tag": "web-ui-icon",
    "intro": "图标渲染组件，接受 Iconify 数据对象（`@greypan/web-ui/icons` 导出的即为此形态）；宿主默认 `aria-hidden=\"true\"`。",
    "samples": [
      {
        "title": "基础",
        "description": "`icon` 是 Lit 属性绑定（property），不是 attribute。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideSearch\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "尺寸与颜色",
        "description": "`size` 以像素为单位；`color` 不设置时继承文字颜色（`currentColor`）。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">16</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">24</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">32</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">color</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"#007aff\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideSearch\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"16\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideSearch\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"24\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideSearch\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"32\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">color</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"#007aff\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "旋转动画",
        "description": "`spin` 常用于加载态图标，`reduce` 动效偏好下放慢而不停。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideLoaderCircle</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">spin</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideLoaderCircle\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">spin</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideLoaderCircle</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "icon",
            "type": "IconifyIcon",
            "default": "—",
            "description": "Iconify 数据对象（property）。"
          },
          {
            "name": "spin",
            "type": "boolean",
            "default": "false",
            "description": "旋转动画。"
          },
          {
            "name": "size",
            "type": "number",
            "default": "18",
            "description": "尺寸（px）。"
          },
          {
            "name": "color",
            "type": "string",
            "default": "—",
            "description": "颜色。"
          }
        ]
      }
    ]
  },
  {
    "component": "image-preview",
    "tag": "web-ui-image-preview",
    "intro": "命令式图片预览：通过 `imagePreview()` 打开，用返回的句柄控制；内部使用原生 `<dialog>`，默认挂载到最近的 theme-owned overlay root。",
    "samples": [
      {
        "title": "基础",
        "description": "只传图片时只渲染图片本身，点击图片外空白或按 Escape 关闭。",
        "html": {
          "react": "<span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">imagePreview</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">imagePreview</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-prop\">images</span>:<span class=\"hl-text\"> </span>[<span class=\"hl-text\">\n    </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">src</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'/photos/a.jpg'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">alt</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'图 A'</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>,<span class=\"hl-text\">\n    </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">src</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'/photos/b.jpg'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">alt</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'图 B'</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n  </span>]<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">next</span>()<span class=\"hl-text\">\n</span><span class=\"hl-keyword\">await</span><span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">closed</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">imagePreview</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">function</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">open</span>()<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">imagePreview</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\">\n    </span><span class=\"hl-prop\">images</span>:<span class=\"hl-text\"> </span>[<span class=\"hl-text\">\n      </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">src</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'/photos/a.jpg'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">alt</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'图 A'</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>,<span class=\"hl-text\">\n      </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">src</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'/photos/b.jpg'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">alt</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'图 B'</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n    </span>],<span class=\"hl-text\">\n    </span><span class=\"hl-type\">nav</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\">\n    </span><span class=\"hl-type\">toolbar</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\">\n    </span><span class=\"hl-type\">closable</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\">\n    </span><span class=\"hl-type\">indicator</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n  </span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">next</span>()<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "展示类选项",
        "description": "`nav`、`toolbar`、`closable`、`indicator` 彼此独立且默认关闭，需要显式开启。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">imagePreview</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-type\">images</span>,<span class=\"hl-text\">\n  </span><span class=\"hl-type\">index</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">0</span>,<span class=\"hl-text\">\n  </span><span class=\"hl-type\">nav</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\">\n  </span><span class=\"hl-type\">toolbar</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\">\n  </span><span class=\"hl-type\">closable</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\">\n  </span><span class=\"hl-type\">indicator</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span>)",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">imagePreview</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">function</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">openFull</span>(<span class=\"hl-type\">images</span>:<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">src</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">string</span>;<span class=\"hl-text\"> </span><span class=\"hl-type\">alt</span><span class=\"hl-operator\">?</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">string</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>[])<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">imagePreview</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">images</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">nav</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">toolbar</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">closable</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">indicator</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "滑动与循环",
        "description": "`swipe` 在 1x 倍率下允许左右滑动切图；`loop` 关闭时首尾钳制、边界方向回弹。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">imagePreview</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">images</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">swipe</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">loop</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">false</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">imagePreview</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">function</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">openBounded</span>(<span class=\"hl-type\">images</span>:<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">src</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">string</span>;<span class=\"hl-text\"> </span><span class=\"hl-type\">alt</span><span class=\"hl-operator\">?</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">string</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>[])<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">imagePreview</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">images</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">swipe</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">loop</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">false</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "句柄",
        "description": "句柄暴露 `index`、`scale`、`images`、`closed` 与全部控制方法，可据此实现自己的触发器与状态面板。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">imagePreview</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">images</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">goTo</span>(<span class=\"hl-number\">2</span>)<span class=\"hl-text\">\n</span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">zoomIn</span>()<span class=\"hl-text\">\n</span><span class=\"hl-keyword\">await</span><span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">closed</span><span class=\"hl-text\">\n</span><span class=\"hl-builtin\">console</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">log</span>(<span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">index</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">scale</span>)",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">imagePreview</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">async</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">function</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">inspect</span>(<span class=\"hl-type\">images</span>:<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">src</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">string</span>;<span class=\"hl-text\"> </span><span class=\"hl-type\">alt</span><span class=\"hl-operator\">?</span>:<span class=\"hl-text\"> </span><span class=\"hl-builtin\">string</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>[])<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">imagePreview</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">images</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n  </span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">goTo</span>(<span class=\"hl-number\">2</span>)<span class=\"hl-text\">\n  </span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">zoomIn</span>()<span class=\"hl-text\">\n  </span><span class=\"hl-keyword\">await</span><span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">closed</span><span class=\"hl-text\">\n  </span><span class=\"hl-builtin\">console</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">log</span>(<span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">index</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">preview</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">scale</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "images",
            "type": "ImagePreviewItem[]",
            "default": "[]",
            "description": "图片列表，至少一项；每项为 `{ src, alt? }`。"
          },
          {
            "name": "loop",
            "type": "boolean",
            "default": "true",
            "description": "首尾循环切换。"
          },
          {
            "name": "nav",
            "type": "boolean",
            "default": "false",
            "description": "展示上一张 / 下一张按钮。"
          },
          {
            "name": "toolbar",
            "type": "boolean",
            "default": "false",
            "description": "展示缩放工具条。"
          },
          {
            "name": "closable",
            "type": "boolean",
            "default": "false",
            "description": "展示关闭按钮。"
          },
          {
            "name": "indicator",
            "type": "boolean",
            "default": "false",
            "description": "展示「当前 / 总数」指示器。"
          },
          {
            "name": "swipe",
            "type": "boolean",
            "default": "false",
            "description": "1x 下允许左右滑动切图。"
          },
          {
            "name": "noScrollLock",
            "type": "boolean",
            "default": "false",
            "description": "打开期间不锁定页面滚动。"
          },
          {
            "name": "noBackdropClose",
            "type": "boolean",
            "default": "false",
            "description": "点击图片以外的空白区域不关闭。"
          }
        ]
      }
    ]
  },
  {
    "component": "input-number",
    "tag": "web-ui-input-number",
    "intro": "数字输入框，自带步进按钮与 ArrowUp / ArrowDown 键盘增减；空输入或 `-` 在提交时被忽略，值保持在最后一个有效数字。",
    "samples": [
      {
        "title": "基础",
        "description": "`min` / `max` / `step` 约束取值范围与步进幅度。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">min</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">0</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">max</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">100</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">step</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">5</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">20</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:min</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:max</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"100\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:step</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"5\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"20\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "精度",
        "description": "`precision` 决定小数位数，超出部分会被规整。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">precision</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">2</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">step</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">0.01</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">9.99</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:precision</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"2\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:step</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0.01\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"9.99\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "受控",
        "description": "`value` 是当前值，`input` 在输入与步进中触发，`change` 在提交时触发。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span>[<span class=\"hl-type\">quantity</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">setQuantity</span>]<span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">useState</span>(<span class=\"hl-number\">1</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span>(<span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">quantity</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">min</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">1</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">required</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">onInput</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setQuantity</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-punct\">}</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-text\">)</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"quantity\"</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">:min</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"1\"</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">required</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">@input</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"quantity = $event.currentTarget.value\"</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-input-number</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">quantity</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-number\">1</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "description": "占位文本。"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "readonly",
            "type": "boolean",
            "default": "false",
            "description": "只读状态。"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "description": "必填校验。"
          },
          {
            "name": "precision",
            "type": "number",
            "default": "0",
            "description": "小数精度。"
          },
          {
            "name": "value",
            "type": "number",
            "default": "0",
            "description": "当前值。"
          },
          {
            "name": "min",
            "type": "number",
            "default": "0",
            "description": "最小值。"
          },
          {
            "name": "max",
            "type": "number",
            "default": "Infinity",
            "description": "最大值。"
          },
          {
            "name": "step",
            "type": "number",
            "default": "1",
            "description": "步进值。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "值变化时触发。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "提交时触发。"
          }
        ]
      }
    ]
  },
  {
    "component": "input",
    "tag": "web-ui-input",
    "intro": "文本输入框，支持清除按钮与前后缀插槽，并与原生 `<form>` 集成；宿主自身不可聚焦，焦点委托到 shadow 内的原生 input。",
    "samples": [
      {
        "title": "基础",
        "description": "`type` 透传给内部原生 input，`placeholder` 在空值时显示。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">type</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"email\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"name@example.com\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">type</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"email\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"name@example.com\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "清除按钮",
        "description": "`clearable` 在有值时显示清除按钮，`full` 让输入框占满父容器宽度。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">clearable</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">full</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"输入关键词\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">clearable</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">full</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"输入关键词\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "前后缀",
        "description": "`prefix` / `suffix` 插槽在输入区两侧放图标或文字，`aria-label` 为无可见标签的输入提供无障碍名称。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">aria-label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"搜索\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">clearable</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"搜索组件\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">16</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">aria-label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"搜索\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">clearable</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"搜索组件\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideSearch\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"16\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideSearch</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "受控值",
        "description": "`value` 是输入值也是表单提交值，`input` 每次输入都触发，`change` 在失焦或去抖提交时触发。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span>[<span class=\"hl-type\">keyword</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">setKeyword</span>]<span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">useState</span>(<span class=\"hl-string\">''</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span>(<span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">keyword</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"输入后实时搜索\"</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">onInput</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setKeyword</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-punct\">}</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-text\">)</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"keyword\"</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"输入后实时搜索\"</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">@input</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"keyword = $event.currentTarget.value\"</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-input</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">keyword</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-string\">''</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "type",
            "type": "string",
            "default": "'text'",
            "description": "HTML input 类型。"
          },
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "description": "占位文本。"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "readonly",
            "type": "boolean",
            "default": "false",
            "description": "只读状态。"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "description": "必填校验。"
          },
          {
            "name": "clearable",
            "type": "boolean",
            "default": "false",
            "description": "显示清除按钮。"
          },
          {
            "name": "full",
            "type": "boolean",
            "default": "false",
            "description": "占满父容器宽度。"
          },
          {
            "name": "borderless",
            "type": "boolean",
            "default": "false",
            "description": "ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。"
          },
          {
            "name": "aria-label",
            "type": "string | null",
            "default": "null",
            "description": "无障碍标签。"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "description": "输入值。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "输入时触发。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "提交时触发。"
          },
          {
            "name": "focus",
            "type": "FocusEvent",
            "description": "获得焦点时触发。"
          },
          {
            "name": "blur",
            "type": "FocusEvent",
            "description": "失去焦点时触发。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "prefix",
            "description": "输入区左侧的图标或文字。"
          },
          {
            "name": "suffix",
            "description": "输入区右侧的图标或文字。"
          }
        ]
      }
    ]
  },
  {
    "component": "middle-ellipsis",
    "tag": "web-ui-middle-ellipsis",
    "intro": "单行中间省略：保留首尾、丢掉中间，`very-long-file-…-abcdefghij.txt`；切点落在字素簇边界上，不会劈开代理对或 emoji。",
    "samples": [
      {
        "title": "基础",
        "description": "与 `text-overflow: ellipsis` 一样需要单行、且有确定的行内尺寸。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">style</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">width</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">240</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">text</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"very-long-file-name-abcdefghij.txt\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">style</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"width: 240px\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">text</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"very-long-file-name-abcdefghij.txt\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "标记",
        "description": "`marker` 是插在两端之间的标记，空串表示截断但不给任何可见信号。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">text</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"/Users/grey/Documents/design/spec.txt\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">marker</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"***\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">text</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"/Users/grey/Documents/design/spec.txt\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">marker</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"***\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "标记位置",
        "description": "`marker-position` 决定标记的横向比例：头部是路径噪声、尾部才是扩展名时取大值。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">text</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"/Users/grey/Documents/design/spec.txt\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">marker-position</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">80</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">text</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"/Users/grey/Documents/design/spec.txt\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:marker-position</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"80\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-middle-ellipsis</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "text",
            "type": "string",
            "default": "''",
            "description": "完整文本，组件只读不回写。"
          },
          {
            "name": "marker",
            "type": "string",
            "default": "'…'",
            "description": "插在两端之间的标记；空串即截断但不给可见信号。"
          },
          {
            "name": "marker-position",
            "type": "number",
            "default": "50",
            "description": "标记所在的横向比例 0–100；越界夹紧，`NaN` 回落 50。"
          }
        ]
      }
    ]
  },
  {
    "component": "popover",
    "tag": "web-ui-popover",
    "intro": "锚定触发元素的弹出层，支持 click / hover / manual 三种触发方式，`trigger` 插槽放触发器、默认插槽放面板内容。",
    "samples": [
      {
        "title": "基础",
        "description": "click 模式点击触发器切换；触发器请放入可交互元素，ARIA 状态会回写到它。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-text\">显示详情\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"popover-body\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">这里是弹出层内容</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">显示详情</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"popover-body\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">这里是弹出层内容</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "Hover 触发",
        "description": "`trigger` 为 `hover` 时用 `pointerenter` / `pointerleave` 加延迟控制开合。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">trigger</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"hover\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placement</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"top\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">悬停我</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"popover-body\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">悬停显示的气泡</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">trigger</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"hover\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placement</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"top\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">悬停我</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"popover-body\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">悬停显示的气泡</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "受控开合",
        "description": "`open` 可被程序化写入，`open-change` 只报告用户来源的开合。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">open</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">open</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onopen-change</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setOpen</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">detail</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">open</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onClick</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span>()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setOpen</span>(<span class=\"hl-operator\">!</span><span class=\"hl-type\">open</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-text\">主题设置\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"popover-body\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">受控内容</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:open</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@open-change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open = $event.detail.open\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@click</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"open = !open\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">主题设置</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"popover-body\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">受控内容</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-popover</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">open</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-literal\">false</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "description": "弹出层可见性。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "placement",
            "type": "Placement",
            "default": "'bottom'",
            "description": "Floating UI 位置。"
          },
          {
            "name": "offset",
            "type": "number",
            "default": "8",
            "description": "与锚点的距离（px）。"
          },
          {
            "name": "trigger",
            "type": "'click' | 'hover' | 'manual'",
            "default": "'click'",
            "description": "触发方式：`click`（默认）、`hover`、`manual`。"
          },
          {
            "name": "portal",
            "type": "boolean",
            "default": "false",
            "description": "在 theme-owned overlay root 中渲染。"
          },
          {
            "name": "overlayContainer",
            "type": "OverlayContainer",
            "default": "—",
            "description": "显式 Portal 容器（property）。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "type": "CustomEvent<{ open: boolean }>",
            "description": "弹出层开合，`detail.open` 为当前状态。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "trigger",
            "description": "触发器，请放入可交互元素。"
          },
          {
            "name": "default",
            "description": "弹出层内容。"
          }
        ]
      }
    ]
  },
  {
    "component": "radio",
    "tag": "web-ui-radio",
    "intro": "单个单选按钮，与 `<web-ui-checkbox>` 共用选择控件的盒契约；`<web-ui-radio-group>` 负责在一组选项之间保持单选。",
    "samples": [
      {
        "title": "基础",
        "description": "默认插槽是标签文字。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">checked</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">plan</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">===</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'basic'</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"basic\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onChange</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span>()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setPlan</span>(<span class=\"hl-string\">'basic'</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-text\">基础版\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:checked</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"plan === 'basic'\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"basic\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"plan = 'basic'\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">基础版</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">plan</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-string\">'basic'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "禁用与只读",
        "description": "`disabled` 关闭交互，`required` 让原生表单校验在未选中时拦截提交。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"plan\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"enterprise\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-text\">企业版（暂不可用）\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"plan\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"enterprise\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">企业版（暂不可用）</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "单选组",
        "description": "`<web-ui-radio-group>` 同步子项的选中并统一提交表单值；`direction` 控制排列方向。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio-group</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"size\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">size</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">direction</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"horizontal\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onInput</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setSize</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"s\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">小</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"m\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">中</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"l\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">大</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-radio-group</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio-group</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"size\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"size\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">direction</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"horizontal\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@input</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"size = $event.currentTarget.value\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"s\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">小</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"m\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">中</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"l\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">大</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-radio</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-radio-group</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">size</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-string\">'m'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "checked",
            "type": "boolean",
            "default": "false",
            "description": "选中状态。"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "description": "选中时提交的表单值。"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "description": "必填校验。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "选中状态变化时触发。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "用户切换选中状态时触发。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "标签文本；为空时收掉指示器与标签之间的间距。"
          }
        ]
      }
    ]
  },
  {
    "component": "segmented",
    "tag": "web-ui-segmented",
    "intro": "分段控制器（单选按钮组），子项是 `<web-ui-segmented-trigger>`；`value` 同步选中项，并与原生 `<form>` 集成。",
    "samples": [
      {
        "title": "基础",
        "description": "默认插槽投影 segmented-trigger，选中由 `value` 决定。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">view</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onInput</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setView</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"day\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">日</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"week\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">周</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"month\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">月</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"view\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@input</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"view = $event.currentTarget.value\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"day\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">日</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"week\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">周</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"month\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">月</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">view</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-string\">'week'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "变体",
        "description": "`variant` 选择轨道与指示器的材质：`inset`（默认，嵌入轨道）或 `raised`（经典浮起）。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"raised\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"list\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"list\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">列表</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"grid\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">网格</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"raised\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"list\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"list\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">列表</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"grid\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">网格</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "单项禁用",
        "description": "`disabled` 加在组上会禁用全部 trigger；只禁用某一项时加在该 trigger 上。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"a\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"a\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">可用</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"b\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    不可用\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"a\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"a\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">可用</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"b\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">不可用</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-segmented-trigger</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-segmented</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "variant",
            "type": "'inset' | 'raised'",
            "default": "'inset'",
            "description": "材质变体：`inset`（默认）或 `raised`。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用全部 trigger。"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "description": "必填校验。"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "description": "当前选中值。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "选中值变化时触发。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "用户切换选中时触发。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "投影 `<web-ui-segmented-trigger>` 子项。"
          }
        ]
      }
    ]
  },
  {
    "component": "select",
    "tag": "web-ui-select",
    "intro": "选择器下拉框：默认插槽投影 `<web-ui-option>` 候选，`trigger` 插槽可替换默认触发区域；支持键盘导航与 Portal。",
    "samples": [
      {
        "title": "基础",
        "description": "子 `<web-ui-option>` 通过事件向父级注册，键盘支持 ArrowDown / ArrowUp / Enter / Escape。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"请选择\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onChange</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setFramework</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"vue\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Vue\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"react\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"React\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"svelte\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Svelte\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"请选择\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"framework = $event.currentTarget.value\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"vue\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Vue\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"react\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"React\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"svelte\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"Svelte\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">framework</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-string\">''</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "选项装饰",
        "description": "`<web-ui-option>` 的 `prefix` / `suffix` 插槽在标签两侧加图标或后缀信息，`disabled` 项不可选。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"选择优先级\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"high\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"高优先级\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">🔴</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"suffix\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">P0</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"low\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"低优先级\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"选择优先级\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"high\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"高优先级\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">🔴</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"suffix\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">P0</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"low\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"低优先级\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "自定义触发器",
        "description": "把内容放进 `trigger` 插槽替换默认 label 与箭头，外壳与浮层锚点保持默认。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideSettings</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">18</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"theme\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"主题设置\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lang\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"语言设置\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"trigger\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideSettings\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"18\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"theme\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"主题设置\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lang\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"语言设置\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-option</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-select</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideSettings</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "description": "未选中时显示的占位文本。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "description": "必填校验。"
          },
          {
            "name": "portal",
            "type": "boolean",
            "default": "false",
            "description": "在 theme-owned overlay root 中渲染下拉面板。"
          },
          {
            "name": "no-scroll-lock",
            "type": "boolean",
            "default": "false",
            "description": "打开时不锁定页面滚动。"
          },
          {
            "name": "overlayContainer",
            "type": "OverlayContainer",
            "default": "—",
            "description": "显式 Portal 容器（property）。"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "description": "选中值。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "选中值变化时触发。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "用户提交选择时触发。"
          },
          {
            "name": "open-change",
            "type": "CustomEvent<{ open: boolean }>",
            "description": "下拉面板开合，`detail.open` 为当前状态。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "trigger",
            "description": "自定义触发区域内容，替换默认 label 与箭头。"
          },
          {
            "name": "default",
            "description": "投影 `<web-ui-option>` 候选。"
          }
        ]
      }
    ]
  },
  {
    "component": "slider",
    "tag": "web-ui-slider",
    "intro": "范围滑块，支持刻度标记与垂直方向；拖拽走 pointer capture，键盘支持方向键、Home / End 与 PageUp / PageDown。",
    "samples": [
      {
        "title": "基础",
        "description": "`min` / `max` / `step` 约束取值范围与步进幅度。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">min</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">0</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">max</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">100</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">step</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">5</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">40</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:min</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:max</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"100\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:step</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"5\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"40\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "刻度与垂直方向",
        "description": "`marks` 显示刻度标记，`vertical` 让滑块沿垂直方向排列。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">marks</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">vertical</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">min</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">0</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">max</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">10</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">3</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">marks</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">vertical</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:min</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:max</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"10\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"3\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "受控值",
        "description": "拖拽过程中 `input` 连续触发，松手或键盘确认时派发一次 `change`。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span>[<span class=\"hl-type\">volume</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">setVolume</span>]<span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">useState</span>(<span class=\"hl-number\">30</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span>(<span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">volume</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">min</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">0</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">max</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">100</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n    </span><span class=\"hl-attr\">onInput</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setVolume</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">value</span>)<span class=\"hl-punct\">}</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-text\">)</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"volume\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:min</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:max</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"100\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@input</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"volume = $event.currentTarget.value\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-slider</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">volume</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-number\">30</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "marks",
            "type": "boolean",
            "default": "false",
            "description": "显示刻度标记。"
          },
          {
            "name": "vertical",
            "type": "boolean",
            "default": "false",
            "description": "垂直方向。"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "description": "必填校验。"
          },
          {
            "name": "value",
            "type": "number",
            "default": "0",
            "description": "当前值。"
          },
          {
            "name": "min",
            "type": "number",
            "default": "0",
            "description": "最小值。"
          },
          {
            "name": "max",
            "type": "number",
            "default": "100",
            "description": "最大值。"
          },
          {
            "name": "step",
            "type": "number",
            "default": "1",
            "description": "步进值。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "拖拽 / 输入过程中触发。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "松手或键盘确认时触发。"
          }
        ]
      }
    ]
  },
  {
    "component": "spinner",
    "tag": "web-ui-spinner",
    "intro": "加载旋转器，声明式放在页面里，或用静态 `WebUiSpinner.show()` / `hide()` 做阻塞式加载。",
    "samples": [
      {
        "title": "基础",
        "description": "`size` 是像素尺寸，宿主带 `role=\"status\"` 与 `aria-label=\"加载中\"`。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">16</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">24</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">32</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"16\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"24\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"32\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "描述文字",
        "description": "`description` 属性或 `description` 插槽在旋转器旁显示说明。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">size</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">32</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">description</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"正在加载数据\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:size</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"32\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"description\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">正在加载数据</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-spinner</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "阻塞式加载",
        "description": "`WebUiSpinner.show()` 显示全屏加载，`duration` 到期自动关闭，`hide()` 立即隐藏。",
        "html": {
          "react": "<span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">WebUiSpinner</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-type\">WebUiSpinner</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">show</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">size</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">64</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">description</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'正在同步云端文件'</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-type\">WebUiSpinner</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">show</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">duration</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">2000</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-type\">WebUiSpinner</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">hide</span>()",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">WebUiSpinner</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">function</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">sync</span>()<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-type\">WebUiSpinner</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">show</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">size</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">64</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">description</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'正在同步云端文件'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">duration</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">2000</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "size",
            "type": "number",
            "default": "24",
            "description": "尺寸（px）。"
          },
          {
            "name": "description",
            "type": "string",
            "default": "''",
            "description": "描述文字。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "description",
            "description": "描述插槽，替代 `description` 属性。"
          }
        ]
      }
    ]
  },
  {
    "component": "svg-draw-lines",
    "tag": "web-ui-svg-draw-lines",
    "intro": "SVG 线条绘制动画：基于 `stroke-dashoffset` 在原元素上动画，不克隆、不操作 DOM；默认画入，`replay({ reverse: true })` 沿原路收回。",
    "samples": [
      {
        "title": "基础",
        "description": "默认插槽放需要动画的 SVG 内容，内容第一次稳定时自动播放一次画入。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">duration</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">1200</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">svg</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">viewBox</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0 0 24 24\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">fill</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"none\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">stroke</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"currentColor\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">path</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">d</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"M4 12 L10 18 L20 6\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">stroke-width</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"2\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">path</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">svg</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:duration</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"1200\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">svg</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">viewBox</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0 0 24 24\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">fill</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"none\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">stroke</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"currentColor\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">path</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">d</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"M4 12 L10 18 L20 6\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">stroke-width</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"2\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">path</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">svg</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "关闭自动播放",
        "description": "`no-autoplay` 让内容保持资产原样，由调用方决定何时播放。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">no-autoplay</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">easing</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ease-out\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideCheck</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">no-autoplay</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">easing</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ease-out\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideCheck\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideCheck</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "手工重播",
        "description": "`replay()` 取消当前动画并重新收集几何元素；`reverse` 让线条沿原路收回，收尾的空白作为 DOM 状态保留。",
        "html": {
          "react": "<span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">useRef</span>(<span class=\"hl-literal\">null</span>)<span class=\"hl-text\">\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">replay</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span>()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">current</span><span class=\"hl-operator\">?</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">replay</span>()<span class=\"hl-text\">\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">retract</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span>()<span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">current</span><span class=\"hl-operator\">?</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">replay</span>(<span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">reverse</span>:<span class=\"hl-text\"> </span><span class=\"hl-literal\">true</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">return</span><span class=\"hl-text\"> </span>(<span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">ref</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-builtin\">ref</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">svg</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">viewBox</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0 0 24 24\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">stroke</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"currentColor\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n        </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">path</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">d</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"M4 12 L10 18 L20 6\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">path</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">svg</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onClick</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">replay</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">重播</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onClick</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">retract</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">收回</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/&gt;</span><span class=\"hl-text\">\n)</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">ref</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lines\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">svg</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">viewBox</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0 0 24 24\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">stroke</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"currentColor\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n      </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">path</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">d</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"M4 12 L10 18 L20 6\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">path</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">svg</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-svg-draw-lines</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@click</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lines?.replay()\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">重播</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@click</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lines?.replay({ reverse: true })\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">收回</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">useTemplateRef</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lines</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">useTemplateRef</span>(<span class=\"hl-string\">'lines'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "duration",
            "type": "number",
            "default": "1000",
            "description": "动画时长（毫秒），限制在 0–30000。"
          },
          {
            "name": "easing",
            "type": "string",
            "default": "'linear'",
            "description": "传递给 `element.animate()` 的 CSS 缓动函数。"
          },
          {
            "name": "no-autoplay",
            "type": "boolean",
            "default": "false",
            "description": "关闭内容首次出现时的自动播放。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "需要动画的 SVG 内容。"
          }
        ]
      }
    ]
  },
  {
    "component": "switch",
    "tag": "web-ui-switch",
    "intro": "开关切换，声明 `role=\"switch\"` 与 `aria-checked`；`loading` 期间阻断交互并显示待定状态。",
    "samples": [
      {
        "title": "基础",
        "description": "`checked` 是开关状态，`value` 是表单提交值。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">checked</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">enabled</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">onChange</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">event</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">setEnabled</span>(<span class=\"hl-type\">event</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">currentTarget</span><span class=\"hl-operator\">.</span><span class=\"hl-prop\">checked</span>)<span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-text\">启用通知\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:checked</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"enabled\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">@change</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"enabled = !enabled\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">启用通知</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">enabled</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>(<span class=\"hl-literal\">false</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "加载与禁用",
        "description": "`loading` 阻断交互并显示加载态，`disabled` 直接禁用。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">loading</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">保存中</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">不可更改</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">loading</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">保存中</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">disabled</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">不可更改</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "表单值",
        "description": "开关自身不渲染标签盒之外的内容，`name` 与 `value` 让它在表单里以选中值参与提交。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">form</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"newsletter\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"on\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">required</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-text\">订阅邮件\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">form</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">form</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">name</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"newsletter\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">value</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"on\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">required</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">订阅邮件</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-switch</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">form</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "checked",
            "type": "boolean",
            "default": "false",
            "description": "打开 / 关闭状态。"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "description": "表单提交值。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "description": "必填校验。"
          },
          {
            "name": "loading",
            "type": "boolean",
            "default": "false",
            "description": "加载状态。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "状态变化时触发。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "用户切换开关时触发。"
          }
        ]
      }
    ]
  },
  {
    "component": "textarea",
    "tag": "web-ui-textarea",
    "intro": "多行文本输入框，支持清除按钮、自动高度与前后缀插槽；焦点委托到 shadow 内的原生 textarea。",
    "samples": [
      {
        "title": "基础",
        "description": "`rows` 决定初始显示行数，`placeholder` 在空值时显示。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">rows</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">4</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"写下你的想法\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:rows</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"4\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"写下你的想法\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "自动高度",
        "description": "`autosize` 按内容撑高并强制 `resize: none`；`max-height` 是自动高度上限，0 表示不限。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">autosize</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">max-height</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">320</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"输入多行内容，高度自适应\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">autosize</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:max-height</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"320\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placeholder</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"输入多行内容，高度自适应\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "前后缀",
        "description": "`prefix` / `suffix` 插槽在文本域两侧放图标或计数。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">clearable</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">aria-label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"备注\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">📝</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"suffix\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">最多 200 字</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">clearable</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">aria-label</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"备注\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"prefix\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">📝</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">span</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"suffix\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">最多 200 字</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">span</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-textarea</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "placeholder",
            "type": "string",
            "default": "''",
            "description": "占位文本。"
          },
          {
            "name": "name",
            "type": "string",
            "default": "''",
            "description": "表单字段名。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "readonly",
            "type": "boolean",
            "default": "false",
            "description": "只读状态。"
          },
          {
            "name": "required",
            "type": "boolean",
            "default": "false",
            "description": "必填校验。"
          },
          {
            "name": "full",
            "type": "boolean",
            "default": "false",
            "description": "占满父容器宽度。"
          },
          {
            "name": "clearable",
            "type": "boolean",
            "default": "false",
            "description": "显示清除按钮。"
          },
          {
            "name": "borderless",
            "type": "boolean",
            "default": "false",
            "description": "ghost 形态：移除边框、背景与阴影，保留 padding 与 focus ring。"
          },
          {
            "name": "rows",
            "type": "number",
            "default": "3",
            "description": "显示行数。"
          },
          {
            "name": "minlength",
            "type": "number | undefined",
            "default": "—",
            "description": "最小长度校验。"
          },
          {
            "name": "maxlength",
            "type": "number | undefined",
            "default": "—",
            "description": "最大长度校验。"
          },
          {
            "name": "autosize",
            "type": "boolean",
            "default": "false",
            "description": "自动调整高度，同时强制 `resize: none`。"
          },
          {
            "name": "max-height",
            "type": "number",
            "default": "0",
            "description": "自动高度上限（px），0 表示不限制。"
          },
          {
            "name": "aria-label",
            "type": "string | null",
            "default": "null",
            "description": "无障碍标签。"
          },
          {
            "name": "aria-labelledby",
            "type": "string | undefined",
            "default": "—",
            "description": "无障碍标签引用。"
          },
          {
            "name": "value",
            "type": "string",
            "default": "''",
            "description": "输入值。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "input",
            "type": "Event",
            "description": "输入时触发。"
          },
          {
            "name": "change",
            "type": "Event",
            "description": "提交时触发。"
          },
          {
            "name": "focus",
            "type": "FocusEvent",
            "description": "获得焦点时触发。"
          },
          {
            "name": "blur",
            "type": "FocusEvent",
            "description": "失去焦点时触发。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "prefix",
            "description": "文本域左侧的图标或文字。"
          },
          {
            "name": "suffix",
            "description": "文本域右侧的图标或文字。"
          }
        ]
      }
    ]
  },
  {
    "component": "theme",
    "tag": "web-ui-theme",
    "intro": "主题提供者：在自己的子树内定义基础、颜色、层级、阴影与动效 token，并作为该子树的 theme-owned overlay root。",
    "samples": [
      {
        "title": "基础",
        "description": "`appearance` 选择配色方案，未设置时主题保持 inactive 但解析输出使用默认的 `light`。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">appearance</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"dark\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">暗色主题下的按钮</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">appearance</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"dark\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"primary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">暗色主题下的按钮</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "跟随系统与动效范围",
        "description": "`appearance=\"system\"` 跟随 `prefers-color-scheme`；`motion` 定义当前范围的动效偏好，`reduced` 归零转场、两个无限加载循环只放慢。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">appearance</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"system\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">motion</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"reduced\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">{</span><span class=\"hl-type\">children</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">appearance</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"system\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">motion</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"reduced\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">slot</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">/&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "绑定解析后的外观",
        "description": "`resolved-appearance` 是只读的派生输出，可以放心把选择器绑到它上面，无需再维护第二份主题状态。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">style</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">colorScheme</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'light dark'</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">appearance</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">appearance</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">className</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"hero\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">当前外观由 resolved-appearance 选择器控制</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:appearance</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"appearance\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">class</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"hero\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">当前外观由 resolved-appearance 选择器控制</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-theme</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'vue'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">const</span><span class=\"hl-text\"> </span><span class=\"hl-type\">appearance</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">=</span><span class=\"hl-text\"> </span><span class=\"hl-builtin\">ref</span>&lt;<span class=\"hl-string\">'light'</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">|</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'dark'</span><span class=\"hl-text\"> </span><span class=\"hl-operator\">|</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'system'</span>&gt;(<span class=\"hl-string\">'system'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "appearance",
            "type": "ThemeAppearance | undefined",
            "default": "—",
            "description": "配色方案：`light`、`dark` 或 `system`。"
          },
          {
            "name": "resolved-appearance",
            "type": "ResolvedThemeAppearance",
            "default": "'light'",
            "description": "解析后的配色方案，只读反射输出。"
          },
          {
            "name": "motion",
            "type": "ThemeMotion",
            "default": "'system'",
            "description": "当前嵌套主题范围的动效偏好：`full`、`reduced` 或 `system`。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "主题作用域内的内容。"
          }
        ]
      }
    ]
  },
  {
    "component": "toast",
    "tag": "web-ui-toast",
    "intro": "Toast 通知。常规用法是命令式 API `toast()`：同一 `id` 的再次调用是更新那一条，而不是新建。",
    "samples": [
      {
        "title": "快捷方法",
        "description": "`toast.success` / `info` / `warning` / `error` 是四种类型的常用写法，`error` 的默认时长比其余更长。",
        "html": {
          "react": "<span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">toast</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">success</span>(<span class=\"hl-string\">'操作成功'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">info</span>(<span class=\"hl-string\">'提示信息'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">warning</span>(<span class=\"hl-string\">'请注意'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">error</span>(<span class=\"hl-string\">'出错了'</span>,<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">duration</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">5000</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">toast</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">success</span>(<span class=\"hl-string\">'操作成功'</span>)<span class=\"hl-text\">\n</span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">error</span>(<span class=\"hl-string\">'出错了'</span>,<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">duration</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">5000</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "合并同一条",
        "description": "给同一个 `id` 再次调用即更新它，适合进度或重试这类连续状态；`duration` 只有显式传入才重启倒计时。",
        "html": {
          "react": "<span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">toast</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">info</span>(<span class=\"hl-string\">'上传中 0%'</span>,<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">id</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'upload'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">duration</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">0</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">info</span>(<span class=\"hl-string\">'上传中 60%'</span>,<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">id</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'upload'</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">success</span>(<span class=\"hl-string\">'上传完成'</span>,<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">id</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'upload'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">duration</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">3000</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">toast</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui'</span><span class=\"hl-text\">\n\n</span><span class=\"hl-keyword\">function</span><span class=\"hl-text\"> </span><span class=\"hl-fn\">upload</span>()<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\">\n  </span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">info</span>(<span class=\"hl-string\">'上传中 0%'</span>,<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">id</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'upload'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">duration</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">0</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n  </span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">info</span>(<span class=\"hl-string\">'上传中 60%'</span>,<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">id</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'upload'</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n  </span><span class=\"hl-type\">toast</span><span class=\"hl-operator\">.</span><span class=\"hl-fn\">success</span>(<span class=\"hl-string\">'上传完成'</span>,<span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-prop\">id</span>:<span class=\"hl-text\"> </span><span class=\"hl-string\">'upload'</span>,<span class=\"hl-text\"> </span><span class=\"hl-type\">duration</span>:<span class=\"hl-text\"> </span><span class=\"hl-number\">3000</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span>)<span class=\"hl-text\">\n</span><span class=\"hl-punct\">}</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "直接使用元素",
        "description": "单个 Toast 元素可声明式使用，`heading` 与 `message` 是两级文案，`no-close-button` 隐藏关闭按钮。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-toast</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">type</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"success\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"已保存\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">message</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"更改已写入云端\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">duration</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">3000</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">visible</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-toast</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-toast</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">type</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"success\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">heading</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"已保存\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">message</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"更改已写入云端\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:duration</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"3000\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">visible</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-toast</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "toastId",
            "type": "string",
            "default": "''",
            "description": "这条 toast 的合并键（property）。"
          },
          {
            "name": "type",
            "type": "ToastType",
            "default": "'info'",
            "description": "类型：`success`、`info`、`warning`、`error`。"
          },
          {
            "name": "position",
            "type": "ToastPosition",
            "default": "'top-right'",
            "description": "屏幕位置，默认 `top-right`。"
          },
          {
            "name": "heading",
            "type": "string",
            "default": "''",
            "description": "粗体标题。"
          },
          {
            "name": "message",
            "type": "string",
            "default": "''",
            "description": "通知文本。"
          },
          {
            "name": "duration",
            "type": "number",
            "default": "3000",
            "description": "自动关闭时间（ms），0 表示不自动关闭。"
          },
          {
            "name": "no-close-button",
            "type": "boolean",
            "default": "false",
            "description": "隐藏关闭按钮。"
          },
          {
            "name": "visible",
            "type": "boolean",
            "default": "false",
            "description": "当前是否可见。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "toast-close",
            "type": "CustomEvent<{ id: string; reason: ToastCloseReason }>",
            "description": "退场结束后派发，`detail` 含 `id` 与 `reason`。"
          }
        ]
      }
    ]
  },
  {
    "component": "tooltip",
    "tag": "web-ui-tooltip",
    "intro": "工具提示，支持指针与焦点触发；`content` 属性提供纯文本，`content` 插槽可放更丰富的内容。",
    "samples": [
      {
        "title": "基础",
        "description": "默认插槽是触发器，`content` 是提示文本。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">content</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"保存当前更改\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">保存</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">content</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"保存当前更改\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">variant</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"secondary\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">保存</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "内容插槽",
        "description": "`content` 插槽替代纯文本，可放图标或带格式的内容。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placement</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"right\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"default\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">icon</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-type\">lucideInfo</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"content\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-text\">这是一个 </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">strong</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">富文本</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">strong</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\"> 提示\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">placement</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"right\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"default\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:icon</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"lucideInfo\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-icon</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">div</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">slot</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"content\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">这是一个 </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">strong</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">富文本</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">strong</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\"> </span><span class=\"hl-text\">提示</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">div</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">script</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">setup</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">lang</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"ts\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-keyword\">import</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">{</span><span class=\"hl-text\"> </span><span class=\"hl-type\">lucideInfo</span><span class=\"hl-text\"> </span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-keyword\">from</span><span class=\"hl-text\"> </span><span class=\"hl-string\">'@greypan/web-ui/icons'</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">script</span><span class=\"hl-punct\">&gt;</span>"
        }
      },
      {
        "title": "延迟",
        "description": "`show-delay` / `hide-delay` 控制指针进出时的显示与隐藏延迟；`disabled` 直接关闭提示。",
        "html": {
          "react": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">content</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"立即出现\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">show-delay</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">0</span><span class=\"hl-punct\">}</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">hide-delay</span><span class=\"hl-punct\">=</span><span class=\"hl-punct\">{</span><span class=\"hl-number\">0</span><span class=\"hl-punct\">}</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">悬停我</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;</span><span class=\"hl-punct\">/</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-punct\">&gt;</span>",
          "vue": "<span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">content</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"立即出现\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:show-delay</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0\"</span><span class=\"hl-text\"> </span><span class=\"hl-attr\">:hide-delay</span><span class=\"hl-punct\">=</span><span class=\"hl-string\">\"0\"</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n    </span><span class=\"hl-punct\">&lt;</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">悬停我</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-button</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n  </span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">web-ui-tooltip</span><span class=\"hl-punct\">&gt;</span><span class=\"hl-text\">\n</span><span class=\"hl-punct\">&lt;/</span><span class=\"hl-tag\">template</span><span class=\"hl-punct\">&gt;</span>"
        }
      }
    ],
    "api": [
      {
        "key": "props",
        "title": "Props",
        "rows": [
          {
            "name": "placement",
            "type": "Placement",
            "default": "'top'",
            "description": "Floating UI 位置，默认 `top`。"
          },
          {
            "name": "show-delay",
            "type": "number",
            "default": "200",
            "description": "显示延迟（毫秒）。"
          },
          {
            "name": "hide-delay",
            "type": "number",
            "default": "100",
            "description": "隐藏延迟（毫秒）。"
          },
          {
            "name": "disabled",
            "type": "boolean",
            "default": "false",
            "description": "禁用状态。"
          },
          {
            "name": "offset",
            "type": "number",
            "default": "6",
            "description": "与触发器的距离（px）。"
          },
          {
            "name": "content",
            "type": "string",
            "default": "''",
            "description": "提示文本，是 `content` 插槽的纯文本替代。"
          },
          {
            "name": "open",
            "type": "boolean",
            "default": "false",
            "description": "可见性。"
          },
          {
            "name": "portal",
            "type": "boolean",
            "default": "false",
            "description": "在 theme-owned overlay root 中渲染。"
          },
          {
            "name": "overlayContainer",
            "type": "OverlayContainer",
            "default": "—",
            "description": "显式 Portal 容器（property）。"
          }
        ]
      },
      {
        "key": "events",
        "title": "Events",
        "rows": [
          {
            "name": "open-change",
            "type": "CustomEvent<{ open: boolean }>",
            "description": "提示开合，`detail.open` 为当前状态。"
          }
        ]
      },
      {
        "key": "slots",
        "title": "Slots",
        "rows": [
          {
            "name": "default",
            "description": "触发器。"
          },
          {
            "name": "content",
            "description": "提示面板内容，替代 `content` 属性。"
          }
        ]
      }
    ]
  }
]
