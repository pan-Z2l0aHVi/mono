import { defineBatchEmitter } from '@greypan/js-kit'

const batches: string[][] = []
const emitter = defineBatchEmitter<string>({
  onFlushed: items => {
    batches.push(items)
  }
}).make()

void emitter.batchEmit('click', 200)
void emitter.batchEmit('scroll', 200)
emitter.flush()

console.log(batches)
