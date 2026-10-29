// cspell:words Deuxième
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
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
  try {
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
  } catch (error) {
    await rm(root, { recursive: true, force: true })
    throw error
  }
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

it('granular/group 共用组索引，多个 catalog 的延迟提交互不串号', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'wuchale-vue-groups-')))
  let cleanup: (() => void) | undefined
  try {
    await symlink(resolve(import.meta.dirname, '../../node_modules'), join(root, 'node_modules'), 'dir')
    await mkdir(join(root, 'src/group'), { recursive: true })
    await mkdir(join(root, 'src/locales'), { recursive: true })
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    await writeFile(join(root, 'src/group/A.vue'), '<template><p>First group message</p></template>')
    await writeFile(join(root, 'src/group/B.vue'), '<template><p>Second group message</p></template>')
    await writeFile(join(root, 'src/Outside.vue'), '<template><p>Outside message</p></template>')
    await writeFile(
      join(root, 'src/locales/fr.po'),
      'msgid ""\nmsgstr ""\n"Content-Type: text/plain; charset=UTF-8\\n"\n"Language: fr\\n"\n\nmsgid "First group message"\nmsgstr "Premier groupe"\n\nmsgid "Second group message"\nmsgstr "Deuxième groupe"\n\nmsgid "Outside message"\nmsgstr "Autre groupe"\n'
    )
    const hub = await Hub.create(
      'cli',
      {
        ...defaultConfig,
        locales: ['en', 'fr'],
        adapters: { main: adapter({ loading: { granular: true, group: ['src/group/**', 'src/Outside.vue'] } }) },
        ai: null,
        logLevel: 'error'
      },
      root
    )
    await hub.directVisit(true, false, false)
    const loader = (await import(pathToFileURL(join(root, 'src/locales/main.loader.js')).href)) as Loader
    await loadLocale('en')
    let visible: string[] = []
    const runner = effect(() => {
      visible = [
        ...[loader.getRuntime(1)(0), loader.getRuntime(1)(1)].toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
        loader.getRuntime(2)(0)
      ]
    })
    cleanup = () => stop(runner)
    expect(visible).toEqual(['First group message', 'Second group message', 'Outside message'])
    await loadLocale('fr', false)
    expect(visible).toEqual(['First group message', 'Second group message', 'Outside message'])
    commitLocale('fr')
    expect(visible).toEqual(['Deuxième groupe', 'Premier groupe', 'Autre groupe'])
    const transformed = await hub.transform(
      await readFile(join(root, 'src/group/B.vue'), 'utf8'),
      join(root, 'src/group/B.vue')
    )
    expect(transformed?.code).toContain('(1)')
    await loadLocale('en')
    expect(visible).toEqual(['First group message', 'Second group message', 'Outside message'])
  } finally {
    cleanup?.()
    await rm(root, { recursive: true, force: true })
  }
})
