import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="badge" />
}

export const Route = createFileRoute('/components/badge')({
  staticData: { title: 'Badge' },
  component: Component
})
