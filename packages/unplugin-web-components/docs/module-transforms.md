# Module Transforms

English | [简体中文](./module-transforms.CN.md)

Automatically inject component imports into `.vue`, `.jsx`, and `.tsx` modules whenever matching custom element tags appear.

## Tag detection rules

- **Supported file types**: `.vue`, `.jsx`, `.tsx` outside `node_modules`. Plain `.js` / `.ts` files are not transformed.
- **kebab-case (case-insensitive)**: With `tagPrefix: 'web-ui'`, `<web-ui-button>`, `<WEB-UI-BUTTON>`, and `<web-ui-Button>` all normalize to `components/button`.
- **PascalCase**: `<WebUiButton />` and single-letter suffixes such as `<WebUiA />` are also detected in module sources and mapped via kebab-case (`components/button`, `components/a`).
- **Deduplication**: Multiple occurrences of the same tag in one file produce a single import statement.

## Vue SFC transforms (`.vue`)

The plugin injects imports into the first inline script block with the following precedence:

1. Inline `<script setup>` (without a `src` attribute)
2. Inline `<script>` (without a `src` attribute)
3. If no inline script exists, a new `<script setup>` block is prepended to the file.

If the file only has an external `<script setup src="...">`, it is left untouched because inline imports cannot be added to an external setup block.

```vue
<!-- Input -->
<template>
  <web-ui-button>Save</web-ui-button>
</template>
```

```vue
<!-- Output (sideEffects: true) -->
<script setup>
import '@greypan/web-ui/components/button'
</script>
<template>
  <web-ui-button>Save</web-ui-button>
</template>
```

## React JSX / TSX transforms (`.jsx`, `.tsx`)

Imports are prepended to the module while preserving leading directive prologues (`'use client'`, `'use server'`, `'use strict'`, with optional comments and semicolons). String expressions followed by operators (such as `'a' + 'b'` or `'x' as const`) are not misclassified as directives.

```tsx
// Input
'use client'

export function SaveBar() {
  return <web-ui-button>Save</web-ui-button>
}
```

```tsx
// Output (sideEffects: true)
'use client'

import '@greypan/web-ui/components/button'
export function SaveBar() {
  return <web-ui-button>Save</web-ui-button>
}
```

## Import output modes

| Option combination                          | Generated import                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Default (`sideEffects: false`)              | `import { WebUiButton } from '@greypan/web-ui/components/button';`                                  |
| `sideEffects: true`                         | `import '@greypan/web-ui/components/button';`                                                       |
| `sideEffects: true, withStyle: 'style.css'` | `import '@greypan/web-ui/components/button'\nimport '@greypan/web-ui/components/button/style.css';` |
