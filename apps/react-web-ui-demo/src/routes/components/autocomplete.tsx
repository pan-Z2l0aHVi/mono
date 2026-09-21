import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/autocomplete-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/autocomplete')({
  staticData: { title: 'Autocomplete 自动补全' },
  component: Component
})
