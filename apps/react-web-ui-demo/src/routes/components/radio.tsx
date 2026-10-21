import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <ExampleDoc component="radio" level="primary" />
      <ExampleDoc component="radio-group" level="secondary" />
    </>
  )
}

export const Route = createFileRoute('/components/radio')({
  staticData: { title: 'Radio' },
  component: Component
})
