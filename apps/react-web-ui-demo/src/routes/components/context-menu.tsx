import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/context-menu-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/context-menu')({
  staticData: { title: 'ContextMenu 右键菜单' },
  component: Component
})
