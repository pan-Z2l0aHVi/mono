# timer

[English](./timer.md) | 简体中文

时间控制工具：提供支持 `leading`/`trailing`/`both` 的 `debounce`，以及暂停时保留剩余周期的 `defineControllableInterval`。

## 示例

### 防抖与可控定时器

```ts demo=timer-playground
import { debounce, defineControllableInterval } from '@greypan/js-kit'

const debounced = debounce((value: string) => value.trim(), {
  waitMs: 300,
  timing: 'trailing'
})

debounced.call('hello')
debounced.cancel()

const timer = defineControllableInterval({
  callback: () => console.log('tick'),
  interval: 1000
}).make()

timer.start()
timer.pause()
timer.resume()
timer.stop()
```

```js
import { debounce, defineControllableInterval } from '@greypan/js-kit'

const debounced = debounce(value => value.trim(), {
  waitMs: 300,
  timing: 'trailing'
})

debounced.call('hello')
debounced.cancel()

const timer = defineControllableInterval({
  callback: () => console.log('tick'),
  interval: 1000
}).make()

timer.start()
timer.pause()
timer.resume()
timer.stop()
```

## API

| 导出                                                 | 说明                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `debounce(func, options)`                            | 返回包含 `.call()`、`.cancel()`、`.flush()`、`.isPending` 与 `.cachedValue` 的防抖控制器。 |
| `defineControllableInterval({ callback, interval })` | 可组合定时器插件，提供 `start()`、`pause()`、`resume()`、`stop()` 与 `tick(delay)`。       |
