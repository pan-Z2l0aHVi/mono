import { defineBatchEmitter } from '@greypan/js-kit'

const emitter = defineBatchEmitter<{ id: number }>({
  onFlushed: items => {
    console.log('Flushed batch:', items.length)
  }
}).make()

void emitter.batchEmit({ id: 1 }, 300)
void emitter.batchEmit({ id: 2 }, 300)
