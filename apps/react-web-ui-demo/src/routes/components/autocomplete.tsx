import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/autocomplete-demo'

function Component() {
  return (
    <div className="p-3">
      <DemoComponent />
    </div>
  )
}

export const Route = createFileRoute('/components/autocomplete')({
  staticData: { title: 'Autocomplete 自动补全' },
  component: Component
})
