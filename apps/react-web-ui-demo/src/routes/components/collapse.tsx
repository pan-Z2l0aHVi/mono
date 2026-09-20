import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/collapse-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/collapse')({
  staticData: { title: 'Collapse 折叠面板' },
  component: Component
})
