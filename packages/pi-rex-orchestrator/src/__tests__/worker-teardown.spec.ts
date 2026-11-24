import { describe, expect, it } from 'vite-plus/test'

import { WorkerRegistry } from '../state-machine'
import { cleanupWorkers, closeWorker } from '../worker-teardown'

const noopGitExec = async () => ({ stdout: '', stderr: '', code: 1, killed: false, truncated: false })

describe('worker-teardown fresh snapshot across awaits', () => {
  it('closeWorker 在 await 后重新读取 activeBlockClosed，避免重复关闭已关闭的活跃 Block', async () => {
    const registry = new WorkerRegistry()
    registry.restore([
      {
        workerId: 'w-1',
        agent: 'claude',
        mode: 'headless',
        label: 'w-1',
        blockId: 'blk-active',
        retiredBlockIds: ['blk-retired'],
        activeBlockClosed: false,
        status: 'working',
        cwd: '/tmp/repo'
      }
    ])

    const closedBlocks: string[] = []
    const result = await closeWorker(
      {
        adapter: {
          blockClose: async blockId => {
            closedBlocks.push(blockId)
            // 模拟 retired blockClose 期间事件环已将活跃 Block 关闭
            if (blockId === 'blk-retired') {
              registry.applyBlockClosed('blk-active')
            }
          }
        },
        registry,
        gitExec: noopGitExec,
        persistRegistry: () => {}
      },
      { workerId: 'w-1' },
      {
        hasUI: false,
        ui: { confirm: async () => false, notify: () => {} }
      }
    )

    expect(result.isError).toBeFalsy()
    expect(closedBlocks).toEqual(['blk-retired'])
    expect(registry.get('w-1')?.status).toBe('closed')
  })

  it('cleanupWorkers 在 confirm await 后重新读取最新 status，捕获期间变为 closed 的 worker worktree', async () => {
    const registry = new WorkerRegistry()
    registry.restore([
      {
        workerId: 'w-2',
        agent: 'claude',
        mode: 'headless',
        label: 'w-2',
        blockId: 'blk-active',
        retiredBlockIds: ['blk-old'],
        status: 'working',
        cwd: '/tmp/wt-missing',
        worktree: { path: '/tmp/wt-missing', branch: 'feat/x' }
      }
    ])

    const notifications: string[] = []
    await cleanupWorkers(
      {
        adapter: { blockClose: async () => {} },
        registry,
        gitExec: noopGitExec,
        persistRegistry: () => {}
      },
      {
        hasUI: true,
        ui: {
          confirm: async () => {
            // 模拟确认弹窗期间事件环收到 Block 关闭事件，worker 状态转为 closed
            registry.applyBlockClosed('blk-active')
            return true
          },
          notify: msg => {
            notifications.push(msg)
          }
        }
      }
    )

    // 确认后观察到最新 status === 'closed'，因此进入 worktree 清理并产生清理通知
    expect(notifications.some(msg => msg.startsWith('w-2 '))).toBe(true)
  })
})
