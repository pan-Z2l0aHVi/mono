import { Outlet } from '@tanstack/react-router'
import { ErrorBoundary } from 'react-error-boundary'

import { RootErrorFallback } from './root-error-fallback'

export function Root() {
  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <web-ui-layout>
        <h1>Vite + Lit</h1>
        <Outlet />
      </web-ui-layout>
      <web-ui-back-top></web-ui-back-top>
    </ErrorBoundary>
  )
}
