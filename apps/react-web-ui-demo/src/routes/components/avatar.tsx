import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="avatar" />
}

export const Route = createFileRoute('/components/avatar')({
  staticData: { title: 'Avatar' },
  component: Component
})
