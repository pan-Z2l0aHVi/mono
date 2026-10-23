import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="dialog" level="primary" />
}

export const Route = createFileRoute('/components/dialog')({
  staticData: { title: 'Dialog' },
  component: Component
})
