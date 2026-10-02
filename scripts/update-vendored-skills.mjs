import { spawnSync } from 'node:child_process'
// 第三方 skill 的自动更新入口：官方 `skills update` 引擎 + 收割式落盘。
//
// 为什么不直接在仓库根跑 `npx skills update`：update 会把变更的第三方 skill
// 重装成实体目录写进 `.agents/skills/<name>`，覆盖指向真实家的软链（本仓的
// .agents/skills 全部是软链，见 packages/ai-skill/AGENTS.md）。这里把 update
// 隔离在临时目录里跑——lock 复制过去，CLI 照常重解析源、比对 computedHash、
// 只装变更项、更新 lock——然后由 reconcile 把变更内容搬回真实家：
//   - 被自撰 skill 依赖而镜像在根 skills/ 的（如 herdr）→ 根 skills/<name>
//   - 其余 → .agents/skills-vendored/<name>
// 并刷新 .agents/skills 软链、把更新过的 lock 拷回仓库根，最后跑
// checkRepoLayout 确认三层布局不变量完好。
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checkScript = join(root, 'packages', 'ai-skill', 'scripts', 'check-skills.mjs')

const symlinkTargetFor = (name, repoRoot) =>
  existsSync(join(repoRoot, 'skills', name)) ? join('..', '..', 'skills', name) : join('..', 'skills-vendored', name)

/**
 * Normalize the .agents/skills surface: every expected skill must be a symlink
 * to its real home. Repairs clobbered entries (a bare in-repo `skills update`
 * leaves real directories behind) and missing links, so re-running this script
 * is always a valid repair path.
 */
function relinkAgentSurface(repoRoot) {
  const agentsSkillsDir = join(repoRoot, '.agents', 'skills')
  const names = new Set([
    ...readdirSync(join(repoRoot, 'skills')),
    ...readdirSync(join(repoRoot, '.agents', 'skills-vendored'))
  ])
  for (const name of names) {
    const linkPath = join(agentsSkillsDir, name)
    const expectedTarget = symlinkTargetFor(name, repoRoot)
    const expectedReal = join(repoRoot, expectedTarget)
    const isCorrect = (() => {
      try {
        return lstatSync(linkPath).isSymbolicLink() && realpathSync(linkPath) === realpathSync(expectedReal)
      } catch {
        return false
      }
    })()
    if (!isCorrect) {
      rmSync(linkPath, { recursive: true, force: true })
      symlinkSync(expectedTarget, linkPath)
    }
  }
}

/**
 * Move updated skills from the temp update workspace back to their real homes,
 * refresh the .agents/skills symlinks, and write the updated lock back to the
 * repo root. Pure filesystem work over the given directories; the CLI run is
 * the caller's job (see main).
 *
 * @param {{
 *   repoRoot: string,
 *   tmpAgentsSkillsDir: string,
 *   lockBefore: { skills: Record<string, unknown> },
 *   lockAfter: { skills: Record<string, unknown> },
 * }} options
 * @returns {string[]} names of skills whose content changed
 */
export function reconcileUpdatedSkills({ repoRoot, tmpAgentsSkillsDir, lockBefore, lockAfter }) {
  const changed = Object.keys(lockAfter.skills).filter(name => {
    const before = /** @type {{ computedHash?: string } | undefined} */ (lockBefore.skills[name])
    const after = /** @type {{ computedHash?: string } | undefined} */ (lockAfter.skills[name])
    return before?.computedHash !== after?.computedHash
  })

  for (const name of changed) {
    const updated = join(tmpAgentsSkillsDir, name)
    if (!existsSync(updated)) {
      throw new Error(`skills update reported "${name}" as changed but ${updated} is missing; nothing to harvest`)
    }
    const home = existsSync(join(repoRoot, 'skills', name))
      ? join(repoRoot, 'skills', name)
      : join(repoRoot, '.agents', 'skills-vendored', name)
    rmSync(home, { recursive: true, force: true })
    cpSync(updated, home, { recursive: true })
  }
  // 无论有没有变更项都整面归一：clobber 过的实体目录、缺失或指向错误的软链在此修复，
  // 使「误跑 skills update 之后重放本命令」成为有效的修复路径。注意 harvest 非原子：
  // 先写真实家与软链、最后过 checkRepoLayout，检查失败时仓库处于部分更新状态（git 可回滚）。
  relinkAgentSurface(repoRoot)
  writeFileSync(join(repoRoot, 'skills-lock.json'), `${JSON.stringify(lockAfter, null, 2)}\n`)
  return changed.sort()
}

export function main() {
  const lockPath = join(root, 'skills-lock.json')
  const lockBefore = JSON.parse(readFileSync(lockPath, 'utf8'))
  const workspace = join(tmpdir(), `skills-update-${process.pid}-${Date.now()}`)
  mkdirSync(workspace, { recursive: true })
  try {
    writeFileSync(join(workspace, 'skills-lock.json'), JSON.stringify(lockBefore, null, 2))
    // -y：临时目录可自动判定为 project scope，跳过交互确认。
    const run = spawnSync('pnpm', ['dlx', 'skills@latest', 'update', '-y'], { cwd: workspace, stdio: 'inherit' })
    if (run.status !== 0) {
      throw new Error(`pnpm dlx skills update failed with exit code ${run.status}`)
    }
    const lockAfter = JSON.parse(readFileSync(join(workspace, 'skills-lock.json'), 'utf8'))
    const changed = reconcileUpdatedSkills({
      repoRoot: root,
      tmpAgentsSkillsDir: join(workspace, '.agents', 'skills'),
      lockBefore,
      lockAfter
    })
    console.log(`updated ${changed.length ? changed.join(', ') : 'no skills (all up to date)'}`)
    const check = spawnSync(process.execPath, [checkScript], { stdio: 'inherit' })
    if (check.status !== 0) {
      throw new Error('layout check failed after harvesting updated skills; see output above')
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
