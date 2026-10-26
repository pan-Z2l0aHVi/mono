import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import vue from '@vitejs/plugin-vue'
import { build } from 'vite-plus'
import { expect, it } from 'vite-plus/test'
import { defaultConfig, Hub, type Config } from 'wuchale'

import { adapter } from '../index'

it('通过 wuchale 提取 PO、编译目录并构建真实 Vue SFC，源文件保持不变', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'wuchale-vue-integration-')))
  try {
    await symlink(resolve(import.meta.dirname, '../../node_modules'), join(root, 'node_modules'), 'dir')
    await mkdir(join(root, 'src/locales'), { recursive: true })
    await mkdir(join(root, 'public'))
    await writeFile(join(root, 'public/logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    await writeFile(join(root, 'package.json'), '{"name":"wuchale-vue-fixture","type":"module"}')
    const source = await readFile(new URL('./fixtures/template-only.vue', import.meta.url), 'utf8')
    const staticSource = await readFile(new URL('./fixtures/static.vue', import.meta.url), 'utf8')
    const interactiveSource = await readFile(new URL('./fixtures/interactive.vue', import.meta.url), 'utf8')
    await writeFile(join(root, 'src/Example.vue'), source)
    await writeFile(join(root, 'src/Static.vue'), staticSource)
    await writeFile(join(root, 'src/Interactive.vue'), interactiveSource)
    await writeFile(
      join(root, 'src/main.ts'),
      [
        'export { default as Example } from "./Example.vue"',
        'export { default as Static } from "./Static.vue"',
        'export { default as Interactive } from "./Interactive.vue"',
        'export { loadLocale } from "wuchale/load-utils"'
      ].join('\n')
    )
    await writeFile(
      join(root, 'src/locales/fr.po'),
      [
        'msgid ""',
        'msgstr ""',
        '"Content-Type: text/plain; charset=UTF-8\\n"',
        '"Language: fr\\n"',
        '',
        'msgid "Greeting"',
        'msgstr "Salutation"',
        '',
        'msgid "Hello & 😀"',
        'msgstr "Bonjour & 😀"',
        '',
        'msgid "Hello {0}, {1} items!"',
        'msgstr "Il y a {1} articles pour {0}."',
        ''
      ].join('\n')
    )
    const config: Config = {
      ...defaultConfig,
      locales: ['en', 'fr'],
      adapters: { main: adapter() },
      ai: null,
      dev: 'read',
      logLevel: 'error'
    }
    const extraction = await Hub.create('cli', config, root)
    await extraction.directVisit(true, false, false)
    const po = await readFile(join(root, 'src/locales/en.po'), 'utf8')
    expect(po).toContain('msgid "Hello & 😀"')
    expect(po).toContain('msgid "Hello world!"')
    expect(po).toContain('msgid "Hello {0}, {1} items!"')
    expect(po).toContain('src/Example.vue')
    const hub = await Hub.create('build', config, root)
    const result = await build({
      configFile: false,
      root,
      logLevel: 'error',
      plugins: [
        {
          name: 'wuchale-core-fixture',
          transform: { order: 'pre', handler: (code, id) => hub.transform(code, id) }
        },
        vue()
      ],
      build: {
        write: false,
        minify: false,
        lib: { entry: join(root, 'src/main.ts'), formats: ['es'] },
        rollupOptions: { external: ['vue'] }
      }
    })
    const outputs = (Array.isArray(result) ? result : [result]).flatMap(output => {
      if (!('output' in output)) throw new Error('Expected a completed fixture build')
      return output.output
    })
    const code = outputs
      .filter(output => output.type === 'chunk')
      .map(output => output.code)
      .join('\n')
    expect(code).toContain('Bonjour & 😀')
    expect(code).toContain('Salutation')
    expect(code).toContain('Il y a ')
    expect(code).not.toContain('_ctx._w_')
    expect(outputs.some(output => output.type === 'chunk' && output.isEntry)).toBe(true)
    expect(await readFile(join(root, 'src/Example.vue'), 'utf8')).toBe(source)
    expect(await readFile(join(root, 'src/Static.vue'), 'utf8')).toBe(staticSource)
    expect(await readFile(join(root, 'src/Interactive.vue'), 'utf8')).toBe(interactiveSource)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
