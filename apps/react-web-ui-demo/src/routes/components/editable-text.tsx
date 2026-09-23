import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/editable-text-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/editable-text')({
  staticData: { title: 'EditableText 可编辑文本' },
  component: Component
})
