# 模块转换

[English](./module-transforms.md) | 简体中文

当 `.vue`、`.jsx`、`.tsx` 模块中出现匹配前缀的自定义元素标签时，自动注入对应组件导入。

## 标签识别规则

- **支持的文件类型**：`node_modules` 之外的 `.vue`、`.jsx`、`.tsx` 文件；普通 `.js` / `.ts` 文件不会参与转换。
- **kebab-case（大小写不敏感）**：配置 `tagPrefix: 'web-ui'` 时，`<web-ui-button>`、`<WEB-UI-BUTTON>` 与 `<web-ui-Button>` 均归一到 `components/button`。
- **PascalCase**：模块源码中同时支持 `<WebUiButton />` 以及单字母后缀（如 `<WebUiA />`），会按 kebab-case 映射到对应目录（`components/button`、`components/a`）。
- **自动去重**：同一文件中多次使用同一标签只会生成一条导入语句。

## Vue SFC 转换（`.vue`）

插件按以下优先级将导入语句注入到内联脚本块中：

1. 不含 `src` 属性的内联 `<script setup>`
2. 不含 `src` 属性的普通内联 `<script>`
3. 若文件没有内联脚本块，则在顶部自动补充一段 `<script setup>`

若文件仅包含带 `src` 的外部 `<script setup src="...">`，插件会跳过注入，避免破坏外部 setup 块语义。

```vue
<!-- 转换前 -->
<template>
  <web-ui-button>保存</web-ui-button>
</template>
```

```vue
<!-- 转换后（sideEffects: true） -->
<script setup>
import '@greypan/web-ui/components/button'
</script>
<template>
  <web-ui-button>保存</web-ui-button>
</template>
```

## React JSX / TSX 转换（`.jsx`、`.tsx`）

插件会在模块顶部注入导入，同时识别并保留顶层指令序言（如 `'use client'`、`'use server'`、`'use strict'`，兼容注释与分号）。紧跟运算符或类型断言的字符串表达式（如 `'a' + 'b'`、`'x' as const`）不会被误判为指令。

```tsx
// 转换前
'use client'

export function SaveBar() {
  return <web-ui-button>保存</web-ui-button>
}
```

```tsx
// 转换后（sideEffects: true）
'use client'

import '@greypan/web-ui/components/button'
export function SaveBar() {
  return <web-ui-button>保存</web-ui-button>
}
```

## 导入格式对照

| 配置组合                                    | 生成结果                                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 默认（`sideEffects: false`）                | `import { WebUiButton } from '@greypan/web-ui/components/button';`                                  |
| `sideEffects: true`                         | `import '@greypan/web-ui/components/button';`                                                       |
| `sideEffects: true, withStyle: 'style.css'` | `import '@greypan/web-ui/components/button'\nimport '@greypan/web-ui/components/button/style.css';` |
