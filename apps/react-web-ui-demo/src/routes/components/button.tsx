import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <ExampleDoc component="button" />
      <ExampleDoc component="button-group" />
    </>
  )
}

export const Route = createFileRoute('/components/button')({
  staticData: { title: 'Button' },
  component: Component
})
