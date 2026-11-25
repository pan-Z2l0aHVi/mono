import { defineAckQueue } from '@greypan/js-kit'

const queue = defineAckQueue({
  onConsume: async item => {
    console.log('Consumed item', item.id)
  },
  onConsumeError: (error, item) => {
    console.error('Failed item', item.id, error)
  }
}).make()

queue.enqueue({ id: 1 })
queue.pause()
queue.enqueue({ id: 2 })
queue.resume()
