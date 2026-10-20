import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/drawer-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="drawer" />
    </>
  )
}

export const Route = createFileRoute('/components/drawer')({
  staticData: { title: 'Drawer' },
  component: Component
})
