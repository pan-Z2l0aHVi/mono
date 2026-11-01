import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="drawer" />
}

export const Route = createFileRoute('/components/drawer')({
  staticData: { title: 'Drawer' },
  component: Component
})
