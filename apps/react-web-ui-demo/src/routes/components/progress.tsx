import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="progress" />
}

export const Route = createFileRoute('/components/progress')({
  staticData: { title: 'Progress' },
  component: Component
})
