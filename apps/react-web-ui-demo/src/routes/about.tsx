import { createFileRoute } from '@tanstack/react-router'

function About() {
  return <div className="p-3">About</div>
}

export const Route = createFileRoute('/about')({
  staticData: { title: 'About' },
  component: About
})
