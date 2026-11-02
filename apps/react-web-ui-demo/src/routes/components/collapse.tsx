import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="collapse" />
}

export const Route = createFileRoute('/components/collapse')({
  staticData: { title: 'Collapse' },
  component: Component
})
