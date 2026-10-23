import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <ExampleDoc component="button" level="primary" />
      <ExampleDoc component="button-group" level="secondary" />
    </>
  )
}

export const Route = createFileRoute('/components/button')({
  staticData: { title: 'Button' },
  component: Component
})
