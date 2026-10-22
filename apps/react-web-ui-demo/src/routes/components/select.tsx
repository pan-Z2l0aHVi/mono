import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <ExampleDoc component="select" level="primary" />
      <ExampleDoc component="option" level="secondary" />
    </>
  )
}

export const Route = createFileRoute('/components/select')({
  staticData: { title: 'Select' },
  component: Component
})
