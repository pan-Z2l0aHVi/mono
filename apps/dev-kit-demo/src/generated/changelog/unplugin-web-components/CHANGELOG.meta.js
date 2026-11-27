// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/unplugin-web-components" },
  { label: 'h2', id: 'section-2', content: "1.5.1" },
  { label: 'h3', id: 'section-3', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [7eefb10]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.2.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-4', content: "1.5.0" },
  { label: 'h3', id: 'section-5', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "9787a15: 移除各包 <code>exports</code> 里的 <code>\"./package.json\"</code>。仓库内没有任何消费方；这一项只为按包名读元数据重新放开入口，留着会让后来者把它当成必需项。唯一需要读 manifest 的 <code>check-md-to-comp-artifacts</code> 改为按仓库路径读取。已发布包按 minor 处理：升级后经包名解析元数据会报 <code>ERR_PACKAGE_PATH_NOT_EXPORTED</code>，目前没有已知的外部消费者。" }
    ]
  },
  { label: 'h3', id: 'section-6', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [9787a15]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.1.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-7', content: "1.4.4" },
  { label: 'h3', id: 'section-8', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Fix uppercase and mixed-case kebab web component tags in module sources not being auto-imported" },
      { label: 'p', content: "The transform fast path used a case-sensitive substring check for the tag prefix, so\n<code>&lt;WEB-UI-BUTTON /></code> in <code>.vue</code>/<code>.jsx</code>/<code>.tsx</code> sources never reached the (already\ncase-insensitive) tag regex and silently produced no imports. The fast path now\npre-filters with the same regexes used for matching, so all case variants are\nrecognized and their imports normalized to the lowercase component directory." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [3c81816]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.0.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-9', content: "1.4.3" },
  { label: 'h3', id: 'section-10', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "Updated dependencies [d0a9f32]" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [d0a9f32]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.0.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-11', content: "1.4.2" },
  { label: 'h3', id: 'section-12', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [1e52bc4]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@2.0.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-13', content: "1.4.1" },
  { label: 'h3', id: 'section-14', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [b9faa2c]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.7" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-15', content: "1.4.0" },
  { label: 'h3', id: 'section-16', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "28a8dc5: Vite HTML 入口自动导入：<code>/vite</code> 入口新增 <code>transformIndexHtml</code>，为 Vite 处理的 HTML 构建入口（<code>index.html</code> 等）扫描 kebab-case 自定义元素（大小写不敏感，<code>&lt;WEB-UI-BUTTON></code>/<code>&lt;web-ui-Button></code> 归一到 <code>web-ui-button</code>），并在 <code>&lt;head></code> 前部注入 <code>type=\"module\"</code> 脚本，以静态 <code>import</code> 注册发现的组件；复用 <code>sideEffects</code>/<code>withStyle</code> 导入语义并按组件去重。扫描按序剥离：先剥带引号属性值（其中的尖括号是属性文本而非 tag，避免属性值里的 <code>&lt;script></code> 等字面量吞掉后续真实 tag），再剥 RAWTEXT/RCDATA 区域（<code>script</code>、<code>style</code>、<code>title</code>、<code>textarea</code>、<code>iframe</code>、<code>xmp</code>、<code>noembed</code>、<code>noframes</code>、<code>noscript</code>），最后剥注释；未闭合区域通常延伸到文件末尾，但注释内未闭合的 <code>&lt;script></code>/<code>style</code> 伪 tag 可能吞掉其后的真实 tag。HTML 中不支持驼峰/帕斯卡 tag（HTML tag 名大小写不敏感，解析器统一小写化）。" },
      { label: 'p', content: "模块转换边界修复：React 只识别模块顶部完整的 directive prologue（任意字符串指令，如 <code>'use strict'</code>、<code>'use client'</code>、<code>'use server'</code>），并在其后注入导入——不再只匹配 <code>use client</code>/<code>use server</code> 两种文本，也不命中函数体内部的同名字符串。Vue 只向不含 <code>src</code> 的内联 <code>&lt;script></code>/<code>&lt;script setup></code> 注入；普通外部 <code>&lt;script src></code> 可以与新增的内联 <code>&lt;script setup></code> 共存，只有带 <code>src</code> 的 <code>&lt;script setup></code> 无处可注入时跳过转换。" },
      { label: 'p', content: "能力边界：HTML 注入为 Vite 专属能力，Webpack 适配器保持模块源码转换，不提供 HTML 注入。实际仅发布 <code>/vite</code> 与 <code>/webpack</code> 入口，不再笼统宣称 Rollup/esbuild 支持。" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-17', content: "1.3.6" },
  { label: 'h3', id: 'section-18', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "7c06580: try workflows" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [7c06580]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.6" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-19', content: "1.3.5" },
  { label: 'h3', id: 'section-20', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "cdc5cf7: Release pipeline validation: bump all public packages for trusted publishing verification." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [cdc5cf7]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.5" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-21', content: "1.3.4" },
  { label: 'h3', id: 'section-22', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "57f9984: fix mardkwon table format" },
    { label: 'li', content: "57f9984: fix npm readme cn link" },
    { label: 'li', content: "Updated dependencies [57f9984]" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [57f9984]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.4" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-23', content: "1.3.3" },
  { label: 'h3', id: 'section-24', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "734dea6: fix npm readme cn link" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [734dea6]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.3" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-25', content: "1.3.2" },
  { label: 'h3', id: 'section-26', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "be4008b: Standardize externalization to regex patterns for workspace deps; move msw to package-level devDependencies" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>vite.config.ts</code> for <code>js-kit</code>, <code>browser-kit</code>, <code>web-ui</code>: replace hardcoded workspace dep names with <code>/^@greypan\\//</code> regex; add missing external deps (<code>nanoid</code>, <code>msw</code>)" },
        { label: 'li', content: "<code>browser-kit</code>: move <code>msw</code> from peerDependencies to devDependencies" },
        { label: 'li', content: "<code>test-kit</code>: add <code>msw</code> to devDependencies for local type checking" },
        { label: 'li', content: "<code>web-ui</code>: replace <code>react</code> peer dep with <code>@types/react</code>; add React/Vue usage documentation to README" },
        { label: 'li', content: "<code>unplugin-web-components</code>: fix README import path to use <code>/vite</code> sub-path export" },
        { label: 'li', content: "Fix documentation in READMEs and AGENTS.md to reflect current externalization rules" }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [be4008b]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.2" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-27', content: "1.3.1" },
  { label: 'h3', id: 'section-28', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c56dd3e: add tsconfig package" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [c56dd3e]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-29', content: "1.3.0" },
  { label: 'h3', id: 'section-30', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a4e7f9b: vp monorepo standardization" }
    ]
  },
  { label: 'h3', id: 'section-31', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [a4e7f9b]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-32', content: "1.2.4" },
  { label: 'h3', id: 'section-33', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8f4643d: Audit and reorganize devDependencies/peerDependencies across all packages" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [8f4643d]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.5.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-34', content: "1.2.3" },
  { label: 'h3', id: 'section-35', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a06335a: upgrade agents doc" },
    { label: 'li', content: "Updated dependencies [a06335a]" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [a06335a]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.5.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-36', content: "1.2.2" },
  { label: 'h3', id: 'section-37', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [874638d]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.4.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-38', content: "1.2.1" },
  { label: 'h3', id: 'section-39', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [13802c0]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.3.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-40', content: "1.2.0" },
  { label: 'h3', id: 'section-41', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8944472: Improve engineering structures" }
    ]
  },
  { label: 'h3', id: 'section-42', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [8944472]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.2.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-43', content: "1.1.1" },
  { label: 'h3', id: 'section-44', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [ec36e92]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.1.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-45', content: "1.1.0" },
  { label: 'h3', id: 'section-46', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "4dfde81: 完善子包依赖，修复依赖缺失" }
    ]
  },
  { label: 'h3', id: 'section-47', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [4dfde81]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.1.0" }
        ]
      }
      ]
    }
    ]
  }
]

export default meta
