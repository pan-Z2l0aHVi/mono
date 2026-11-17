import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineThemeTokenParity } from '../theme-token-parity'

const themeTokenParity = defineThemeTokenParity({
  consumerFile: 'packages/consumer/src/style.css',
  consumerVar: 'os-handle-bg',
  authorityFile: 'packages/authority/src/theme.css',
  authorityVar: 'wui-scrollbar-handle',
  authorityBlock: /:host\(\[appearance='light'\]\)[\s\S]*?\{([\s\S]*?)\}/
})

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-theme-token-'))
let fixture = 0

function makeFixture({
  consumerCss = '.os-theme-macos { --os-handle-bg: var(--wui-scrollbar-handle, rgb(0 0 0 / 0.39)); }',
  authorityCss = ":host([appearance='light']) { --wui-scrollbar-handle: rgb(0 0 0 / 0.39); }"
} = {}) {
  const root = path.join(tempRoot, `fixture-${fixture++}`)
  fs.mkdirSync(path.join(root, 'packages/consumer/src'), { recursive: true })
  fs.mkdirSync(path.join(root, 'packages/authority/src'), { recursive: true })
  fs.writeFileSync(path.join(root, 'packages/consumer/src/style.css'), consumerCss)
  fs.writeFileSync(path.join(root, 'packages/authority/src/theme.css'), authorityCss)
  return root
}

function run(root: string) {
  return themeTokenParity.make({ root, env: { ...process.env } }).run()
}

async function failure(root: string): Promise<string> {
  const result = await run(root)
  if (result.ok) assert.fail('expected theme-token-parity to fail')
  return result.error
}

it('theme-token-parity', async () => {
  assert.ok((await run(makeFixture())).ok)

  // 注释里提到 token 不算声明命中。
  const commented = makeFixture({
    consumerCss:
      '/* --wui-scrollbar-handle: 不得在本包声明 */\n.os-theme-macos { --os-handle-bg: var(--wui-scrollbar-handle, rgb(0 0 0 / 0.39)); }'
  })
  assert.ok((await run(commented)).ok)

  const drifted = makeFixture({
    consumerCss: '.os-theme-macos { --os-handle-bg: var(--wui-scrollbar-handle, rgb(0 0 0 / 0.4)); }'
  })
  assert.match(
    await failure(drifted),
    /^theme: packages\/consumer\/src\/style\.css: --os-handle-bg fallback rgb\(0 0 0 \/ 0\.4\)/
  )

  const redeclared = makeFixture({
    consumerCss:
      '.os-theme-macos { --os-handle-bg: var(--wui-scrollbar-handle, rgb(0 0 0 / 0.39)); --wui-scrollbar-handle: rgb(0 0 0 / 0.39); }'
  })
  assert.match(await failure(redeclared), /declares --wui-scrollbar-handle itself/)

  const noFallback = makeFixture({
    consumerCss: '.os-theme-macos { --os-handle-bg: rgb(0 0 0 / 0.39); }'
  })
  assert.match(await failure(noFallback), /is not a var\(--wui-scrollbar-handle, …\) fallback/)

  const missingBlock = makeFixture({
    authorityCss: ":host([appearance='dark']) { --wui-scrollbar-handle: rgb(255 255 255 / 0.74); }"
  })
  assert.match(await failure(missingBlock), /cannot find the comparison block/)

  const missingToken = makeFixture({ authorityCss: ":host([appearance='light']) { --other: 1px; }" })
  assert.match(await failure(missingToken), /does not declare --wui-scrollbar-handle in the block/)
})

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true })
})
