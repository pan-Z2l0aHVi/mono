# number

[English](./number.md) | 简体中文

提供数值范围夹逼与字节数可读格式化工具函数。

## 示例

### 范围夹逼与文件大小格式化

```ts demo=number-helpers
import { clamp, formatFileSize } from '@greypan/js-kit'

const clamped: number = clamp(120, 0, 100) // 100
const reversed: number = clamp(50, 100, 0) // 50
const size: string = formatFileSize(1_572_864, 2) // '1.5 MB'

console.log(clamped, reversed, size)
```

```js
import { clamp, formatFileSize } from '@greypan/js-kit'

const clamped = clamp(120, 0, 100) // 100
const reversed = clamp(50, 100, 0) // 50
const size = formatFileSize(1_572_864, 2) // '1.5 MB'

console.log(clamped, reversed, size)
```

## API

| 函数             | 签名                                                | 说明                                                                    |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| `clamp`          | `(val: number, min: number, max: number) => number` | 将 `val` 限制在 `[min, max]` 范围内；若 `min > max` 会自动交换上下界。  |
| `formatFileSize` | `(bytes: number, decimals?: number) => string`      | 将字节数格式化为 `B` / `KB` / `MB` / `GB` / `TB`（默认保留 2 位小数）。 |
