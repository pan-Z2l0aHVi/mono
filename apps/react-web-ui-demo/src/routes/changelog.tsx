import { createFileRoute } from '@tanstack/react-router'

import { Changelog } from '../components/changelog'

export const Route = createFileRoute('/changelog')({
  component: Changelog
})
