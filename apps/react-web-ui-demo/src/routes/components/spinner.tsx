import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/spinner-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/spinner')({
  staticData: { title: 'Spinner 加载指示器' },
  component: Component
})
