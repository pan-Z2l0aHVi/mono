import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/theme-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/theme')({
  component: Component
})
