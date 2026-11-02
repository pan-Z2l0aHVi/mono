import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="textarea" />
}

export const Route = createFileRoute('/components/textarea')({
  staticData: { title: 'Textarea' },
  component: Component
})
