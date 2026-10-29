import fs from 'node:fs'
import path from 'node:path'

import { defineNoMutualLinks } from '@greypan/monorepo-kit'

/** 上游件的锁定清单；缺失或不可读时 fail-closed。 */
function lockedSkills(root) {
  try {
    return Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'skills-lock.json'), 'utf8')).skills)
  } catch {
    throw new Error('cannot run: skills-lock.json is missing or unreadable')
  }
}

/** 指令面语料与链接方向的仓库事实，扫描面见 `docs/agents/agent-context.md`「链接面与指令面」。 */
export const noMutualLinks = defineNoMutualLinks({
  roots: [
    'AGENTS.md',
    'CLAUDE.md',
    'CONTEXT.md',
    'ARCHITECTURE.md',
    'CONTRIBUTING.md',
    'docs/agents',
    'docs/adr',
    '.agents',
    'skills/README.md'
  ],
  workspaces: [
    { directory: 'packages', deep: ['AGENTS.md'], shallow: ['README.md'] },
    { directory: 'apps', deep: ['AGENTS.md'], shallow: ['README.md'] }
  ],
  mirror: {
    entity: 'skills',
    surface: '.agents/skills',
    vendored: '.agents/skills-vendored',
    lockedNames: lockedSkills
  },
  forbiddenDirections: [{ from: 'docs/agents/', to: '.agents/rules/', label: 'docs-to-rules' }]
})
