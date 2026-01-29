import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/home/')({
  staticData: {
    icon: 'Home'
  },
  component: () => {
    return (
      <div className="p-12px">
        <title>Home</title>
        <h3>Welcome Home!</h3>
      </div>
    )
  }
})
