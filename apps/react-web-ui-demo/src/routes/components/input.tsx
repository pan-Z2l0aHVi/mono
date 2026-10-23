import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="input" level="primary" />
}

export const Route = createFileRoute('/components/input')({
  staticData: { title: 'Input' },
  component: Component
})
