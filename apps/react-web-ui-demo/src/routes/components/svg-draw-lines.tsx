import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/svg-draw-lines-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/svg-draw-lines')({
  component: Component
})
