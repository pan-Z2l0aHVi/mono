import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="slider" />
}

export const Route = createFileRoute('/components/slider')({
  staticData: { title: 'Slider' },
  component: Component
})
