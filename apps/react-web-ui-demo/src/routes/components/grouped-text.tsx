import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="grouped-text" />
}

export const Route = createFileRoute('/components/grouped-text')({
  staticData: { title: 'GroupedText' },
  component: Component
})
