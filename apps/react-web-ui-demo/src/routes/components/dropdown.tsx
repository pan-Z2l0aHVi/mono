import { createFileRoute } from '@tanstack/react-router'

import DemoComponent from '@/components/dropdown-demo'

function Component() {
  return (
    <>
      <DemoComponent />
    </>
  )
}

export const Route = createFileRoute('/components/dropdown')({
  staticData: { title: 'Dropdown 下拉菜单' },
  component: Component
})
