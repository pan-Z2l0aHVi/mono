import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/context-menu-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="context-menu" />
    </>
  )
}

export const Route = createFileRoute('/components/context-menu')({
  staticData: { title: 'ContextMenu 右键菜单' },
  component: Component
})
