import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="icon" level="primary" />
}

export const Route = createFileRoute('/components/icon')({
  staticData: { title: 'Icon' },
  component: Component
})
