type Listener = (dialog: HTMLDialogElement | undefined) => void

const layers: HTMLDialogElement[] = []
const listeners = new Set<Listener>()

export function getTopModalLayer(): HTMLDialogElement | undefined {
  return layers.at(-1)
}

function notify() {
  const top = getTopModalLayer()
  for (const listener of listeners) listener(top)
}

export function registerModalLayer(dialog: HTMLDialogElement) {
  const index = layers.indexOf(dialog)
  if (index !== -1) return
  layers.push(dialog)
  notify()
}

export function unregisterModalLayer(dialog: HTMLDialogElement) {
  const index = layers.indexOf(dialog)
  if (index === -1) return
  layers.splice(index, 1)
  notify()
}

export function subscribeModalLayer(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
