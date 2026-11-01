import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="popover" />
}

export const Route = createFileRoute('/components/popover')({
  staticData: { title: 'Popover' },
  component: Component
})
