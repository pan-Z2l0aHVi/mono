import fs from 'node:fs'
import path from 'node:path'

import type { ConfigEnv, Plugin, UserConfig } from 'vite'

import { errorMessage } from '../../shared/errors'

export interface DevHttpsOptions {
  /** 证书目录；调用方负责给出本机与多 worktree 共用的路径。 */
  readonly certDir: string
  /** 测试档（`mode === 'test'`）缺证书时是否回退 HTTP；默认 `true`。 */
  readonly optionalInTest?: boolean
}

interface DevHttps {
  readonly key: Buffer
  readonly cert: Buffer
}

function certificatePaths(certDir: string): { key: string; cert: string } {
  return {
    key: path.join(certDir, 'localhost-key.pem'),
    cert: path.join(certDir, 'localhost.pem')
  }
}

function readDevHttps(certDir: string): DevHttps | undefined {
  const { key, cert } = certificatePaths(certDir)
  try {
    return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) }
  } catch (error) {
    // 只有「文件不存在」算未配置；权限等其他失败保留原因，不伪装成缺证书。
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw new Error(`cannot read dev HTTPS certificate in ${certDir}: ${errorMessage(error)}`, {
      cause: error
    })
  }
}

function setupHint(certDir: string): string {
  const { key, cert } = certificatePaths(certDir)
  return [
    `找不到本地 HTTPS 证书：${certDir}`,
    '首次使用或换机器时运行：',
    '  mkcert -install',
    `  mkcert -cert-file ${cert} -key-file ${key} localhost 127.0.0.1 ::1`
  ].join('\n')
}

/**
 * 在 Vite 的 `serve` 档（dev 与 preview）打开 HTTPS，证书由本机 mkcert 生成。
 *
 * 构建档不读证书，CI 的 `vp build` 因此不需要本机证书；测试档在证书存在时与 dev 同源，
 * CI 没有证书时回退 HTTP（Playwright 自身忽略证书错误），不按 `VITEST` 分叉。
 */
export function devHttpsConfig(env: ConfigEnv, options: DevHttpsOptions): UserConfig | undefined {
  if (env.command !== 'serve') return

  const https = readDevHttps(options.certDir)
  if (!https) {
    if (env.mode === 'test' && options.optionalInTest !== false) return
    throw new Error(setupHint(options.certDir))
  }

  return { server: { https }, preview: { https } }
}

export function devHttpsPlugin(options: DevHttpsOptions): Plugin {
  return {
    name: 'greypan:dev-https',
    config: (_config, env) => devHttpsConfig(env, options)
  }
}
