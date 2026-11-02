import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="editable-text" />
}

export const Route = createFileRoute('/components/editable-text')({
  staticData: { title: 'EditableText' },
  component: Component
})
