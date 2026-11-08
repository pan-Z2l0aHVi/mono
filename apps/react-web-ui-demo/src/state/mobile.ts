import { useSyncExternalStore } from 'react'

const MOBILE_QUERY = '(width <= 640px)'

function getSnapshot() {
  return typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches
}

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export function useMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
