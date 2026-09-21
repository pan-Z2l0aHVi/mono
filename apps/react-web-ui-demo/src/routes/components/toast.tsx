import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/toast-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/toast')({
  staticData: { title: 'Toast 通知' },
  component: Component
})
