import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/svg-draw-lines-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="svg-draw-lines" />
    </>
  )
}

export const Route = createFileRoute('/components/svg-draw-lines')({
  staticData: { title: 'SVGDrawLines 描边动画' },
  component: Component
})
