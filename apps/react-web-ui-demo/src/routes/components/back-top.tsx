import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="back-top" />
}

export const Route = createFileRoute('/components/back-top')({
  staticData: { title: 'BackTop' },
  component: Component
})
