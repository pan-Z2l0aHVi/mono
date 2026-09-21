import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/context-menu-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/context-menu')({
  staticData: { title: 'ContextMenu 右键菜单' },
  component: Component
})
