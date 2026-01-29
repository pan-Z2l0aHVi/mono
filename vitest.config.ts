import type { UserWorkspaceConfig } from 'vitest/config'

export default {
  test: {
    projects: ['packages/*', 'apps/*']
  }
} satisfies UserWorkspaceConfig
