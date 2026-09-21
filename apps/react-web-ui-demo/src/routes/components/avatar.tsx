import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/avatar-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/avatar')({
  staticData: { title: 'Avatar 头像' },
  component: Component
})
