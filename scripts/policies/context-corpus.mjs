import { defineContextCorpus, readPnpmWorkspaceDirectories } from '@greypan/monorepo-kit'

import { repoRoot } from './repo-root.mjs'

/**
 * 本仓的 context 语料事实：语料根、skill 出处、workspace 目录、软链对应表与 commit scope 来源。
 * 判据在包的 `check-context` 里，取舍见 ADR-0013 与 ADR-0026。
 *
 * 根目录不放 CLAUDE.md：Claude Code 2.1.283+ 原生发现 AGENTS.md，一旦根存在 CLAUDE.md
 * 会静默关闭包级 AGENTS.md 按需注入。根入口只保留 AGENTS.md，Claude Code 与 Codex 读同一份层级文件。
 */
export const contextSymlinks = [
  { path: '.claude/rules', target: '../.agents/rules' },
  { path: '.claude/skills', target: '../.agents/skills' }
]

export const contextCorpus = defineContextCorpus({
  entry: 'AGENTS.md',
  entryMarkers: ['docs/agents/workflow.md'],
  rootDocuments: ['AGENTS.md', 'CLAUDE.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md'],
  forbiddenRootFiles: [
    {
      path: 'CLAUDE.md',
      reason: 'it silently disables Claude Code AGENTS.md discovery and package-level injection'
    }
  ],
  agentDocs: 'docs/agents',
  adrDocs: 'docs/adr',
  agentAssets: '.agents',
  rules: '.agents/rules',
  skills: {
    lockFile: 'skills-lock.json',
    entity: 'skills',
    surface: '.agents/skills',
    vendored: '.agents/skills-vendored',
    facades: ['skills/README.md']
  },
  workspaces: readPnpmWorkspaceDirectories(repoRoot),
  requireWorkspaceEntry: false,
  applicationDirs: ['apps'],
  referenceDirs: ['docs/design'],
  requiredScripts: ['check-context', 'check-pack', 'test-scripts'],
  clientPermissions: '.claude/settings.local.json',
  sessionRoles: '.claude/agents',
  architecture: { file: 'ARCHITECTURE.md', readmes: ['README.md', 'README.CN.md'] },
  commitScopes: {
    file: 'commitlint.config.js',
    rootScope: 'root',
    pick: config => config?.prompt?.scopes ?? []
  },
  symlinks: contextSymlinks,
  authorization: { pointer: 'workflow.md#授权边界与-pr-自动跟进', owner: 'docs/agents/workflow.md' }
})
