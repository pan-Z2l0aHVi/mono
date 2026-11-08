import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ConfigEnv } from 'vite'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { devHttpsConfig } from '../dev-https'

const created: string[] = []

function certDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'greypan-dev-https-'))
  created.push(dir)
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content)
  return dir
}

function env(overrides: Partial<ConfigEnv>): ConfigEnv {
  return { command: 'serve', mode: 'development', isSsrBuild: false, isPreview: false, ...overrides }
}

afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('devHttpsConfig', () => {
  it('serve 档读取 mkcert 证书并同时设置 server 与 preview', () => {
    const dir = certDir({ 'localhost.pem': 'cert', 'localhost-key.pem': 'key' })
    expect(devHttpsConfig(env({}), { certDir: dir })).toEqual({
      server: { https: { key: Buffer.from('key'), cert: Buffer.from('cert') } },
      preview: { https: { key: Buffer.from('key'), cert: Buffer.from('cert') } }
    })
  })

  it('build 档不读证书', () => {
    expect(devHttpsConfig(env({ command: 'build', mode: 'production' }), { certDir: '/nonexistent' })).toBeUndefined()
  })

  it('dev 缺证书时报错并给出 mkcert 命令', () => {
    expect(() => devHttpsConfig(env({}), { certDir: certDir({}) })).toThrow(
      /mkcert -cert-file .*localhost\.pem -key-file .*localhost-key\.pem localhost 127\.0\.0\.1 ::1/
    )
  })

  it('test 缺证书时回退 HTTP', () => {
    expect(devHttpsConfig(env({ mode: 'test' }), { certDir: certDir({}) })).toBeUndefined()
  })

  it('optionalInTest 为 false 时 test 缺证书也报错', () => {
    expect(() => devHttpsConfig(env({ mode: 'test' }), { certDir: certDir({}), optionalInTest: false })).toThrow(
      /找不到本地 HTTPS 证书/
    )
  })
})
