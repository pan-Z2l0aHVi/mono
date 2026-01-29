import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFound
})

function NotFound() {
  return (
    <div className="text-center">
      <h1>404 Not Found</h1>
      <p>你访问的页面不存在</p>
    </div>
  )
}

function RootErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div>
      <h2>Something went wrong</h2> <pre>{message}</pre> <button onClick={resetErrorBoundary}>Retry</button>
    </div>
  )
}

function Root() {
  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <web-ui-layout>
        <h1>Vite + Lit</h1>
        <div className="mb-[8px]">
          <web-ui-button>按钮</web-ui-button>
          <web-ui-button primary>Primary</web-ui-button>
          <web-ui-button text>Text</web-ui-button>
        </div>
        <div className="mb-[8px]">
          <web-ui-button full>Full</web-ui-button>
        </div>
        <web-ui-button>
          <span slot="prefix">prefix</span>按钮2<span slot="suffix">suffix</span>
        </web-ui-button>
        <web-ui-button is-icon>
          <span slot="prefix">prefix</span>icon
        </web-ui-button>
        <Outlet />
      </web-ui-layout>
      <web-ui-back-top
        onvisible-change={e => {
          console.log('visible: ', e.detail.visible)
        }}
      ></web-ui-back-top>
    </ErrorBoundary>
  )
}
