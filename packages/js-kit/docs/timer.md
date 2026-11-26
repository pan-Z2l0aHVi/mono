# timer

English | [简体中文](./timer.CN.md)

Timing utilities: `debounce` with leading/trailing/both timing control, and `defineControllableInterval` with remaining-time pause/resume preservation.

## Examples

### Debounce and controllable interval

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

| Export                                               | Description                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `debounce(func, options)`                            | Returns a debouncer with `.call()`, `.cancel()`, `.flush()`, `.isPending`, and `.cachedValue`. |
| `defineControllableInterval({ callback, interval })` | Composable plugin providing `start()`, `pause()`, `resume()`, `stop()`, and `tick(delay)`.     |
