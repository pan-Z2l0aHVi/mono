import path from 'node:path'

import { definePlugin } from '@greypan/js-kit'

import { readJsonFile } from '../shared/config'
import { listPnpmWorkspaceManifests } from '../shared/workspace-manifests'

export interface WorkspaceContext {
  readonly root: string
}

export interface WorkspaceApi {
  /** 每个 workspace `package.json` 的仓库相对路径，按码位排序 */
  readonly manifests: () => readonly string[]
  /** 读取 `manifests()` 给出的 manifest；读不到或不是合法 JSON 时抛出 */
  readonly readManifest: <T = unknown>(file: string) => T
}

export const defineWorkspace = () =>
  definePlugin<WorkspaceApi, WorkspaceContext>(ctx => ({
    manifests: () =>
      listPnpmWorkspaceManifests(ctx.root).map(file => path.relative(ctx.root, file).split(path.sep).join('/')),
    readManifest: <T = unknown>(file: string) => readJsonFile<T>(path.join(ctx.root, file))
  }))
