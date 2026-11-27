import type { Router, RouteLocationRaw } from 'vue-router'

import { ensureExampleDocs } from '@/i18n/locale'
import { routeDevKitDocs } from '@/nav'

const STATIC_ROUTE_DOCS: Record<string, readonly string[]> = {
  '/js-kit/getting-started': ['js-kit/README'],
  '/js-kit/changelog': ['js-kit/CHANGELOG'],
  '/browser-kit/getting-started': ['browser-kit/README'],
  '/browser-kit/changelog': ['browser-kit/CHANGELOG'],
  '/deps-reload/getting-started': ['deps-reload/README'],
  '/deps-reload/changelog': ['deps-reload/CHANGELOG'],
  '/unplugin-web-components/getting-started': ['unplugin-web-components/README'],
  '/unplugin-web-components/changelog': ['unplugin-web-components/CHANGELOG']
}

function docsForPath(path: string): readonly string[] {
  const normalized = path.length > 1 ? path.replace(/\/$/, '') : path
  return STATIC_ROUTE_DOCS[normalized] ?? routeDevKitDocs(normalized)
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
