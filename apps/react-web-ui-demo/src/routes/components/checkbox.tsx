import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <ExampleDoc component="checkbox" />
      <ExampleDoc component="checkbox-group" />
    </>
  )
}

export const Route = createFileRoute('/components/checkbox')({
  staticData: { title: 'Checkbox' },
  component: Component
})
