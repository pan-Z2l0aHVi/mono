import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
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
