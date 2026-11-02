import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="middle-ellipsis" />
}

export const Route = createFileRoute('/components/middle-ellipsis')({
  staticData: { title: 'MiddleEllipsis' },
  component: Component
})
