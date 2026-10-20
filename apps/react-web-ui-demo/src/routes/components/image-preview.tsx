import { createFileRoute } from '@tanstack/react-router'

import ExampleDoc from '@/components/example-doc'
import DemoComponent from '@/components/image-preview-demo'

function Component() {
  return (
    <>
      <DemoComponent />
      <ExampleDoc component="image-preview" />
    </>
  )
}

export const Route = createFileRoute('/components/image-preview')({
  staticData: { title: 'ImagePreview' },
  component: Component
})
