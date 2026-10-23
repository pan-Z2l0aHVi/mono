import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return (
    <>
      <ExampleDoc component="segmented" level="primary" />
      <ExampleDoc component="segmented-trigger" level="secondary" />
    </>
  )
}

export const Route = createFileRoute('/components/segmented')({
  staticData: { title: 'Segmented' },
  component: Component
})
