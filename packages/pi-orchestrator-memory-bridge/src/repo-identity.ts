/**
 * 仓库身份。
 *
 * 编排层是机器级的：同一台机器上所有 worktree 必须认同一个仓库身份，否则
 * `mono-worktrees/pi-shepherd` 与 `mono` 会被当成两个不同的仓库，记忆互相看不见。
 *
 * 判据是 Git 的 common directory——同一仓库的所有 linked worktree 共享同一个
 * `<main>/.git`：
 *
 * ```
 * mono                        --git-common-dir--> .git
 * mono-worktrees/pi-shepherd  --git-common-dir--> /…/mono/.git
 * mono-worktrees/fix-web-ui-demo --git-common-dir--> /…/mono/.git
 * ```
 *
 * 这个做法不是自创的：`pi-hermes-memory`（问题 #120）、`pi-project-memory`（注释写明
 * "matches Claude's linked-worktree key"）都走同一条路。区别是它们各自接管了记忆存储，
 * 而本扩展只需要一个身份，所以直接解析 `.git` 指针，不 spawn git——`herdr_plan` 的批准
 * 回调在热路径上，起子进程不值得。
 *
 * 身份键取「拥有该 common dir 的 checkout 的目录名」并补短哈希：`mono-7f3a2b`。只留目录名
 * 是为了让键可读，加哈希是为了让 `~/work/mono` 与 `~/oss/mono` 不互相覆盖。
 *
 * 目录名先归一到 `[a-z0-9._-]`：键会被 `pi-memory` 的 `memory_search` 文本行解析
 * （`^(?<key>[A-Za-z0-9._-]+):`），含空格或 CJK 的目录名会让整条召回解析失败。非 Git 目录
 * 同样补哈希——只有目录名时 `foo` 与 `foo.bar` 会退化成前缀关系，两个目录的编排记忆互相污染。
 */

import { createHash } from 'node:crypto'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

/** 解析结果。`key` 是稳定的机器级分区名，`root` 是拥有该仓库的主 checkout。 */
export interface RepoIdentity {
  /** 分区键：归一化目录名 + `<hash6>`。 */
  readonly key: string
  /** 主 checkout 的绝对路径；非 Git 目录时就是 cwd。 */
  readonly root: string
  /** 归一化后的目录名（未加哈希）；目录名归一后为空时是 `default`。 */
  readonly name: string
  /** 是否在 Git 仓库内。false 时 key 仍取 `<name>-<hash6>`。 */
  readonly isGit: boolean
}

/** 短哈希长度。6 位十六进制 ≈ 1600 万，同机撞名概率可以忽略。 */
const HASH_LENGTH = 6

/** 归一化目录名的最大长度；超过后截断，避免键长无上限。 */
const MAX_NAME_LENGTH = 48

/** 目录名归一后为空时的 fallback。 */
const DEFAULT_NAME = 'default'

/**
 * 把目录名归一到 `[a-z0-9._-]`。
 *
 * `memory_search` 的文本行只认 `^(?<key>[A-Za-z0-9._-]+):`，所以键里不能出现空格、CJK 或
 * 其他符号——那会让整条召回记录解析失败。无法识别的字符折成 `-`，折叠连续分隔符，去掉
 * 首尾分隔符，超长截断；结果为空时退回 `default`，而不是生成一个只有哈希的键。
 */
export function normalizeRepoKey(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[-.]+$/, '')
  return normalized || DEFAULT_NAME
}

/**
 * 从 `.git` 文件里解出共享的 common dir。
 *
 * 只处理 linked worktree 的两种布局：
 * 1. `<main>/.git/worktrees/<name>/commondir` 指向回 `<main>/.git`（现行布局）；
 * 2. 没有 `commondir` 的老布局，用 `<main>/.git/worktrees/<name>` 往上两级推断。
 *
 * 解析不出来返回 undefined，由调用方退回「用 cwd 自己的目录名」。
 */
export function worktreeCommonDir(worktreeRoot: string, dotGitFile: string): string | undefined {
  let pointer: string
  try {
    pointer = readFileSync(dotGitFile, 'utf8')
  } catch {
    return undefined
  }
  const match = /^gitdir:\s*(.+)$/m.exec(pointer)
  if (!match?.[1]) return undefined

  const gitDir = resolve(worktreeRoot, match[1].trim())
  try {
    const commonDir = readFileSync(join(gitDir, 'commondir'), 'utf8').trim()
    if (commonDir) return resolve(gitDir, commonDir)
  } catch {
    // 不是 linked worktree，或老布局没有 commondir；走下面的推断。
  }

  const parent = dirname(gitDir)
  return basename(parent) === 'worktrees' ? dirname(parent) : undefined
}

/**
 * 找拥有当前工作目录的 checkout 根。
 *
 * 向上找 `.git`：目录形态就是主 checkout 本身；文件形态是 linked worktree，解出 common dir
 * 后取它的父目录（`.git` 的父目录即主 checkout）。`git rev-parse --git-common-dir` 对 bare
 * 仓库返回 `.`，这里对应「common dir 名字不是 `.git`」的情形——此时保留 worktree 根，不猜
 * 另一个目录。
 */
export function findRepoRoot(cwd: string): { root: string; isGit: boolean } {
  let current = resolve(cwd)
  for (;;) {
    const dotGit = join(current, '.git')
    let isDir = false
    let isFile = false
    try {
      const info = statSync(dotGit)
      isDir = info.isDirectory()
      isFile = info.isFile()
    } catch {
      // 这个目录没有 .git，继续向上。
    }

    if (isDir) return { root: current, isGit: true }

    if (isFile) {
      const common = worktreeCommonDir(current, dotGit)
      if (!common) return { root: current, isGit: true }
      return { root: basename(common) === '.git' ? dirname(common) : current, isGit: true }
    }

    const parent = dirname(current)
    if (parent === current) return { root: resolve(cwd), isGit: false }
    current = parent
  }
}

/** 短哈希：取 realpath 的 sha256 前 6 位，大小写归一。 */
function shortHash(path: string): string {
  return createHash('sha256').update(path.toLowerCase()).digest('hex').slice(0, HASH_LENGTH)
}

/**
 * 归一化路径。realpath 失败（路径不存在、权限）时退回原值：身份计算不能因为一次
 * stat 失败就抛错，那会让整轮编排起不来。
 */
function canonical(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}

/**
 * 解析仓库身份。
 *
 * 两种目录都补短哈希：Git 仓库之间撞名是真实风险（同名 fork 并存很常见），非 Git 目录则
 * 只有目录名——`foo` 与 `foo.bar` 会退化成前缀关系，`orchestration.foo.` 是
 * `orchestration.foo.bar.` 的前缀，两个目录的召回互相污染。带哈希后键仍可读
 * （`mono-7f3a2b`），代价只是非 Git 目录的键形态变了（本扩展尚未发布，可接受）。
 */
export function resolveRepoIdentity(cwd: string): RepoIdentity {
  const { root, isGit } = findRepoRoot(cwd)
  const canonicalRoot = canonical(root)
  const name = normalizeRepoKey(basename(canonicalRoot))
  return { key: `${name}-${shortHash(canonicalRoot)}`, root: canonicalRoot, name, isGit }
}
