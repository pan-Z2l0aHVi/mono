import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/collapse-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/collapse')({
  staticData: { title: 'Collapse 折叠面板' },
  component: Component
})
