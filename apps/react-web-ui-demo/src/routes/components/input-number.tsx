import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="input-number" />
}

export const Route = createFileRoute('/components/input-number')({
  staticData: { title: 'InputNumber' },
  component: Component
})
