import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/button-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/button')({
  staticData: { title: 'Button 按钮' },
  component: Component
})
