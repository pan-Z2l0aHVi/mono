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
