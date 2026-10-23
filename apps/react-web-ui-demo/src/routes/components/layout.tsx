import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="layout" level="primary" />
}

export const Route = createFileRoute('/components/layout')({
  staticData: { title: 'Layout' },
  component: Component
})
