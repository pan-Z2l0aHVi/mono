// cspell:words ceci puis
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { build } from 'vite-plus'
import { expect, it } from 'vite-plus/test'
import { defaultConfig, Hub, type Config } from 'wuchale'
import toRuntime, { type CatalogModule } from 'wuchale/runtime'

import { adapter } from '../index'

it.each([false, true])('granular=%s 通过真实 PO 提取与 Vue 构建，源文件保持不变', async granular => {
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
    const capabilitySource = await readFile(new URL('./fixtures/capabilities.vue', import.meta.url), 'utf8')
    await writeFile(join(root, 'src/Capabilities.vue'), capabilitySource)
    await writeFile(
      join(root, 'src/main.ts'),
      [
        'export { default as Example } from "./Example.vue"',
        'export { default as Static } from "./Static.vue"',
        'export { default as Interactive } from "./Interactive.vue"',
        'export { default as Capabilities } from "./Capabilities.vue"',
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
        'msgid "Hello {0} items!"',
        'msgstr "Bonjour {0} articles!"',
        '',
        'msgid "One item"',
        'msgid_plural "# items"',
        'msgstr[0] "Un article"',
        'msgstr[1] "# articles"',
        'msgstr[2] "# articles"',
        '',
        'msgid "Read <0>this</0> and <1/> now."',
        'msgstr "<1/> puis <0>ceci</0>."',
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
      adapters: { main: adapter({ loading: { granular, group: granular ? ['src/**'] : [] } }) },
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
    expect(po).toContain('msgid_plural "# items"')
    expect(po).toContain('Read <0>this</0> and <1/> now.')
    const { default: plural } = (await import(pathToFileURL(join(root, 'src/locales/plural.js')).href)) as {
      default: (n: number, candidates: string[], locale: string) => string
    }
    const catalog = (await import(
      pathToFileURL(join(root, `src/locales/.wuchale/main.${granular ? 1 : 0}.fr.compiled.js`)).href
    )) as CatalogModule
    const id = catalog.c.findIndex(item => Array.isArray(item) && item[0] === 'Un article')
    expect(id).toBeGreaterThanOrEqual(0)
    const runtime = toRuntime(catalog, 'fr')
    expect(plural(1, runtime.p(id), runtime.l)).toBe('Un article')
    expect(plural(2, runtime.p(id), runtime.l)).toBe('2 articles')
    expect(plural(1000000, runtime.p(id), runtime.l)).toBe('1000000 articles')

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
    expect(code).toContain('Bonjour ')
    expect(code).toContain('# articles')
    expect(code).toContain('ceci')
    expect(code).not.toContain('_ctx._w_')
    expect(outputs.some(output => output.type === 'chunk' && output.isEntry)).toBe(true)
    expect(await readFile(join(root, 'src/Example.vue'), 'utf8')).toBe(source)
    expect(await readFile(join(root, 'src/Static.vue'), 'utf8')).toBe(staticSource)
    expect(await readFile(join(root, 'src/Interactive.vue'), 'utf8')).toBe(interactiveSource)
    expect(await readFile(join(root, 'src/Capabilities.vue'), 'utf8')).toBe(capabilitySource)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
