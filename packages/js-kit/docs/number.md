# number

English | [简体中文](./number.CN.md)

Numeric helpers for clamping values into a range and formatting byte counts into human-readable file sizes.

## Examples

### Clamp and format file size

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

| Function         | Signature                                           | Description                                                                         |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `clamp`          | `(val: number, min: number, max: number) => number` | Clamps `val` to `[min, max]`, automatically swapping bounds if `min > max`.         |
| `formatFileSize` | `(bytes: number, decimals?: number) => string`      | Formats a byte count into `B` / `KB` / `MB` / `GB` / `TB` (default `decimals = 2`). |
