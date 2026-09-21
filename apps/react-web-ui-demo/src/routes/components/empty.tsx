import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/empty-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/empty')({
  staticData: { title: 'Empty 空状态' },
  component: Component
})
