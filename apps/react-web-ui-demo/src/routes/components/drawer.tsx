import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/drawer-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/drawer')({ component: Component })
