import fs from 'node:fs'
import path from 'node:path'

import { definePlugin } from '@greypan/js-kit'

import { readJsonFile } from '../shared/config'

export interface TurboContext {
  readonly root: string
}

export interface TurboApi {
  /** 读取仓库内的 turbo 配置；缺省是根 `turbo.json`，缺失或不是合法 JSON 时抛出 */
  readonly config: <T = unknown>(file?: string) => T
  /** turbo CLI 入口，用于在隔离副本里跑 `--dry=json` */
  readonly cli: () => string
}

export const defineTurbo = () =>
  definePlugin<TurboApi, TurboContext>(ctx => ({
    config: <T = unknown>(file = 'turbo.json') => {
      const absolute = path.join(ctx.root, file)
      if (!fs.existsSync(absolute)) throw new Error(`${file} not found in ${ctx.root}`)
      return readJsonFile<T>(absolute)
    },
    cli: () => path.join(ctx.root, 'node_modules/turbo/bin/turbo')
  }))
