import type { Router, RouteLocationRaw } from 'vue-router'

import { ensureExampleDocs } from '@/i18n/locale'
import { routeDevKitDocs } from '@/nav'

function docsForPath(path: string): readonly string[] {
  const normalized = path.length > 1 ? path.replace(/\/$/, '') : path
  if (normalized === '/js-kit/getting-started') return ['js-kit/README']
  if (normalized === '/browser-kit/getting-started') return ['browser-kit/README']
  if (normalized === '/js-kit/changelog') return ['js-kit/CHANGELOG']
  if (normalized === '/browser-kit/changelog') return ['browser-kit/CHANGELOG']
  return routeDevKitDocs(normalized)
}

export function ensureRouteData(path: string) {
  const docs = docsForPath(path)
  return docs.length ? ensureExampleDocs(docs) : Promise.resolve()
}

const intentSeen = new Set<string>()

export function prefetchRouteIntent(router: Router, to: RouteLocationRaw) {
  const resolved = router.resolve(to)
  if (intentSeen.has(resolved.fullPath)) return
  intentSeen.add(resolved.fullPath)

  for (const record of resolved.matched) {
    const component = record.components?.default
    if (typeof component === 'function' && !('displayName' in component) && !('__vccOpts' in component)) {
      void (component as () => Promise<unknown>)().catch(() => intentSeen.delete(resolved.fullPath))
    }
  }
  const docs = docsForPath(resolved.path)
  if (docs.length) {
    void ensureExampleDocs(docs).catch(() => intentSeen.delete(resolved.fullPath))
  }
}
