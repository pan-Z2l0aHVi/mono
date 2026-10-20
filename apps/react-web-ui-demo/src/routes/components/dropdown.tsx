import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/dropdown-demo'
import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="dropdown" />
      <ExampleDoc component="dropdown-item" />
      <ExampleDoc component="dropdown-divider" />
      <ExampleDoc component="dropdown-header" />
    </>
  )
}

export const Route = createFileRoute('/components/dropdown')({
  staticData: { title: 'Dropdown' },
  component: Component
})
