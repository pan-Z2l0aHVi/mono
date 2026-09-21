import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/back-top-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/back-top')({
  staticData: { title: 'BackTop 回到顶部' },
  component: Component
})
