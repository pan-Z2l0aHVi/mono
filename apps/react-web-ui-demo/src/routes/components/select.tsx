import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <ExampleDoc component="select" />
      <ExampleDoc component="option" />
    </>
  )
}

export const Route = createFileRoute('/components/select')({
  staticData: { title: 'Select' },
  component: Component
})
