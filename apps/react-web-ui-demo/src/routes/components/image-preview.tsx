import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/image-preview-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/image-preview')({
  staticData: { title: 'ImagePreview 图片预览' },
  component: Component
})
