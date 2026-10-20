import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/context-menu-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="context-menu" />
      <ExampleDoc component="dropdown-item" />
      <ExampleDoc component="dropdown-divider" />
      <ExampleDoc component="dropdown-header" />
    </>
  )
}

export const Route = createFileRoute('/components/context-menu')({
  staticData: { title: 'ContextMenu' },
  component: Component
})
