import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="empty" level="primary" />
}

export const Route = createFileRoute('/components/empty')({
  staticData: { title: 'Empty' },
  component: Component
})
