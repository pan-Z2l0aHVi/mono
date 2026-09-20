import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/textarea-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/textarea')({
  staticData: { title: 'Textarea 文本域' },
  component: Component
})
