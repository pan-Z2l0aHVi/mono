import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'

function Component() {
  return <ExampleDoc component="svg-draw-lines" />
}

export const Route = createFileRoute('/components/svg-draw-lines')({
  staticData: { title: 'SVGDrawLines' },
  component: Component
})
