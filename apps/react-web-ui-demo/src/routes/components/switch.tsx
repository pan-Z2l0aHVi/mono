import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="switch" />
}

export const Route = createFileRoute('/components/switch')({
  staticData: { title: 'Switch' },
  component: Component
})
