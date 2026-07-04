export function on<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (ev: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function on<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  listener: (ev: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function on(
  target: Window | Document,
  type: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions
): void {
  target.addEventListener(type, listener, options)
}

export function off<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (ev: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function off<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  listener: (ev: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void
export function off(
  target: Window | Document,
  type: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions
): void {
  target.addEventListener(type, listener, options)
}
