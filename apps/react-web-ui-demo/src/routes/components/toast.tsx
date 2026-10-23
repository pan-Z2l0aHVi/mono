import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="toast" level="primary" />
}

export const Route = createFileRoute('/components/toast')({
  staticData: { title: 'Toast' },
  component: Component
})
