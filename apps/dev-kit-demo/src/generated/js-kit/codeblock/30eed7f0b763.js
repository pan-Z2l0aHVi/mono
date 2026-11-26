import { defineAckQueue } from '@greypan/js-kit'

const delivered = []
const queue = defineAckQueue({
  onConsume: async item => {
    delivered.push(item)
  }
}).make()

queue.pause()
await queue.enqueue('job-1')
await queue.enqueue('job-2')
await queue.resume()

console.log(delivered)
