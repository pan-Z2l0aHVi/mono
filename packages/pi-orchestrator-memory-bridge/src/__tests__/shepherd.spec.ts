/**
 * 协调者模式。
 *
 * 两条约束都要测：
 * 1. **物理**：`/shepherd on` 从激活工具集里摘掉 `edit` / `write`，退出时原样恢复。
 * 2. **强制**：即使模型仍尝试调用（工具声明在请求前生成，可能滞后一轮），`tool_call` 钩子
 *    也会 block 并给出可读原因。
 *
 * 只测指令文本是不够的——指令是给模型看的建议，钩子与工具集才是约束。
 */

import { describe, expect, it } from 'vite-plus/test'

import { blockedReason, isBlockedInShepherd, renderShepherdInstructions, withoutBlockedTools } from '../shepherd'

const ctx = { repoKey: 'mono-a1b2c3', root: '/Users/x/mono' }

describe('工具集裁剪', () => {
  it('摘掉 edit 与 write，其余顺序不变', () => {
    const result = withoutBlockedTools(['read', 'edit', 'bash', 'write', 'grep'])

    expect(result).toEqual(['read', 'bash', 'grep'])
  })

  it('bash 不被摘掉（协调者需要只读探查）', () => {
    expect(withoutBlockedTools(['bash'])).toEqual(['bash'])
  })

  it('只拦 edit 与 write', () => {
    expect(isBlockedInShepherd('edit')).toBe(true)
    expect(isBlockedInShepherd('write')).toBe(true)
    for (const name of ['read', 'bash', 'herdr_plan', 'herdr_dispatch', 'task_board']) {
      expect(isBlockedInShepherd(name)).toBe(false)
    }
  })

  it('重复裁剪是幂等的', () => {
    const once = withoutBlockedTools(['read', 'edit', 'write'])
    expect(withoutBlockedTools(once)).toEqual(once)
  })
})

describe('注入指令', () => {
  it('带仓库身份与路径', () => {
    const text = renderShepherdInstructions(ctx)

    expect(text).toContain('<shepherd-mode>')
    expect(text).toContain('</shepherd-mode>')
    expect(text).toContain('mono-a1b2c3')
    expect(text).toContain('/Users/x/mono')
  })

  it('说清禁止 edit / write，且与 BLOCKED_TOOLS 一致', () => {
    const text = renderShepherdInstructions(ctx)

    expect(text).toContain('edit 与 write 已从工具集移除')
  })

  it('给出完整流程：recall → plan → dispatch → watch → review', () => {
    const text = renderShepherdInstructions(ctx)

    for (const step of ['orchestration_memory_recall', 'herdr_plan', 'herdr_dispatch', 'herdr_watch', 'herdr_review']) {
      expect(text).toContain(step)
    }
  })

  it('点名允许的手段（调研、看板、对话）', () => {
    const text = renderShepherdInstructions(ctx)

    expect(text).toContain('调研')
    expect(text).toContain('task_board')
    expect(text).toContain('ask_user')
  })

  it('禁止借 bash 写文件与提交', () => {
    const text = renderShepherdInstructions(ctx)

    expect(text).toMatch(/bash 只用于只读/)
    expect(text).toContain('git commit')
  })

  it('同一输入输出恒定（否则每轮都会让 system prompt 段失效）', () => {
    expect(renderShepherdInstructions(ctx)).toBe(renderShepherdInstructions(ctx))
  })
})

describe('拒绝原因', () => {
  it('指明工具名与出路，避免模型反复重试', () => {
    const reason = blockedReason('edit')

    expect(reason).toContain('edit')
    expect(reason).toContain('herdr_plan')
    expect(reason).toContain('herdr_dispatch')
  })

  it('不同工具给出不同原因文本', () => {
    expect(blockedReason('edit')).toContain('edit')
    expect(blockedReason('write')).toContain('write')
  })
})
