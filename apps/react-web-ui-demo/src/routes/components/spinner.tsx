import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="spinner" level="primary" />
}

export const Route = createFileRoute('/components/spinner')({
  staticData: { title: 'Spinner' },
  component: Component
})
