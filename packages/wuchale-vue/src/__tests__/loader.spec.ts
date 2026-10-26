import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { expect, it } from 'vite-plus/test'
import { effect, stop } from 'vue'
import { defaultConfig, Hub } from 'wuchale'
import { updated } from 'wuchale/dev'
import { commitLocale, loadLocale } from 'wuchale/load-utils'
import type { CatalogModule, Runtime } from 'wuchale/runtime'

import { adapter } from '../index'

interface Loader {
  getRuntime: (loadID?: number) => Runtime
  getRuntimeRx: (loadID?: number) => Runtime
}

async function setup(direct = false) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'wuchale-vue-loader-')))
  await symlink(resolve(import.meta.dirname, '../../node_modules'), join(root, 'node_modules'), 'dir')
  await mkdir(join(root, 'src/locales'), { recursive: true })
  await writeFile(join(root, 'package.json'), '{"type":"module"}')
  await writeFile(join(root, 'src/App.vue'), '<template><p>Hello world!</p></template>')
  await writeFile(
    join(root, 'src/locales/fr.po'),
    [
      'msgid ""',
      'msgstr ""',
      '"Content-Type: text/plain; charset=UTF-8\\n"',
      '"Language: fr\\n"',
      '',
      'msgid "Hello world!"',
      'msgstr "Bonjour le monde!"',
      ''
    ].join('\n')
  )
  const hub = await Hub.create(
    'cli',
    {
      ...defaultConfig,
      locales: ['en', 'fr'],
      adapters: { main: adapter({ loading: { direct } }) },
      ai: null,
      logLevel: 'error'
    },
    root
  )
  await hub.directVisit(true, false, false)
  return root
}

it('loadLocale、延迟 commit 与 HMR 包装后的 Runtime 都能驱动 Vue effect', async () => {
  const root = await setup()
  let cleanup: (() => void) | undefined
  try {
    const loader = (await import(pathToFileURL(join(root, 'src/locales/main.loader.js')).href)) as Loader
    await loadLocale('en')
    const [, patched] = updated(
      loader.getRuntime,
      loader.getRuntimeRx,
      {
        en: [[1, 'New message']],
        fr: [[1, 'Nouveau message']]
      },
      1
    )
    let visible = ''
    const runner = effect(() => {
      visible = `${patched(0)(0)} / ${patched(0)(1)}`
    })
    cleanup = () => stop(runner)
    expect(visible).toBe('Hello world! / New message')
    await loadLocale('fr', false)
    expect(visible).toBe('Hello world! / New message')
    commitLocale('fr')
    expect(visible).toBe('Bonjour le monde! / Nouveau message')
    await loadLocale('en')
    expect(visible).toBe('Hello world! / New message')
  } finally {
    cleanup?.()
    await rm(root, { recursive: true, force: true })
  }
})

it('direct loader 的 setLocale 更新已有 Vue effect', async () => {
  const root = await setup(true)
  let cleanup: (() => void) | undefined
  try {
    const loader = (await import(pathToFileURL(join(root, 'src/locales/main.loader.js')).href)) as {
      getRuntimeRx: (catalogs: Record<string, CatalogModule>) => Runtime
      setLocale: (locale: string) => void
    }
    const catalogs = {
      en: { c: ['Hello world!'] },
      fr: { c: ['Bonjour le monde!'] }
    }
    let visible = ''
    const runner = effect(() => {
      visible = loader.getRuntimeRx(catalogs)(0)
    })
    cleanup = () => stop(runner)
    expect(visible).toBe('Hello world!')
    loader.setLocale('fr')
    expect(visible).toBe('Bonjour le monde!')
  } finally {
    cleanup?.()
    await rm(root, { recursive: true, force: true })
  }
})
