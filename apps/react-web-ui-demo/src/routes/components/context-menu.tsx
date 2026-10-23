import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <ExampleDoc component="context-menu" level="primary" />
      <ExampleDoc component="dropdown-item" level="secondary" />
      <ExampleDoc component="dropdown-divider" level="secondary" />
      <ExampleDoc component="dropdown-header" level="secondary" />
    </>
  )
}

export const Route = createFileRoute('/components/context-menu')({
  staticData: { title: 'ContextMenu' },
  component: Component
})
