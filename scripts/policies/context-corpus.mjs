import { defineContextCorpus, readPnpmWorkspaceDirectories } from '@greypan/monorepo-kit'

import { repoRoot } from './repo-root.mjs'

/**
 * 本仓的 context 语料事实：语料根、skill 出处、workspace 目录、软链对应表与 commit scope 来源。
 * 判据在包的 `check-context` 里，取舍见 ADR-0026，扫描面见 `docs/agents/agent-context.md`。
 *
 * 根目录不放客户端适配文件。实测 Claude Code 2.1.283 已原生发现 AGENTS.md，但只要根目录存在 CLAUDE.md，
 * 它的原生发现就整条不生效：默认的 claude-md-or-agents-md 只在项目没有 CLAUDE.md 时才读 AGENTS.md，
 * 显式声明 claude-md-and-agents-md 也救不回来（两种模式下包级 AGENTS.md 都不再按需注入）。根入口因此只保留
 * AGENTS.md，Claude Code 与 Codex 读同一份层级文件。这道断言拦住的是「放回一行 @AGENTS.md shim」——它看起来
 * 是零副作用的兼容保险，实际会让全部包级指令静默退回到靠模型自觉 Read。
 */
export const contextCorpus = defineContextCorpus({
  entry: 'AGENTS.md',
  entryMarkers: ['docs/agents/workflow.md', '.agents/skills/task-ledger/SKILL.md'],
  rootDocuments: ['AGENTS.md', 'CLAUDE.md', 'CONTEXT.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md'],
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
  // 哪些容器目录放应用是语义划分，`pnpm-workspace.yaml` 里没有这一层，只能手写。
  applicationDirs: ['apps'],
  referenceDirs: ['docs/research', 'docs/design'],
  requiredScripts: ['check-context', 'check-pack', 'test-scripts'],
  clientPermissions: '.claude/settings.local.json',
  sessionRoles: '.claude/agents',
  architecture: { file: 'ARCHITECTURE.md', readmes: ['README.md', 'README.CN.md'] },
  commitScopes: {
    file: 'commitlint.config.js',
    rootScope: 'root',
    pick: config => config?.prompt?.scopes ?? []
  },
  symlinks: [
    { path: '.claude/rules', target: '../.agents/rules' },
    { path: '.claude/skills', target: '../.agents/skills' }
  ],
  authorization: { pointer: 'workflow.md#怎么取得这个授权', owner: 'docs/agents/workflow.md' }
})
