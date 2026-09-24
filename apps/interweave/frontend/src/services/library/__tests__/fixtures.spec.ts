import { describe, expect, it } from 'vite-plus/test'

import { createFixtureLibraryRuntime } from '../fixtures'

describe('fixture LibraryRuntime', () => {
  it('提供可搜索的初始资源并隔离返回快照', async () => {
    const runtime = createFixtureLibraryRuntime()
    const resources = await runtime.listResources()

    expect(resources.length).toBeGreaterThan(4)
    expect(resources[0].kind).toBe('document')
    expect(resources[0].size_bytes).toBe(2_400_000)
    expect(new Set(resources.map(item => item.kind))).toEqual(
      new Set(['document', 'image', 'video', 'audio', 'web', 'json'])
    )
    expect(resources.some(item => !item.sources.every(source => source.available))).toBe(true)
    resources[0].title = 'mutated'
    expect((await runtime.listResources())[0].title).not.toBe('mutated')
  })

  it('贯通添加、重命名、标签、刷新和删除', async () => {
    const runtime = createFixtureLibraryRuntime()
    const created = await runtime.addURLResource('https://example.com/new-resource')
    const renamed = await runtime.updateResourceTitle(created.id, '  New title  ')
    expect(renamed.title).toBe('New title')

    const tag = await runtime.addTag(created.id, '  research  ')
    expect((await runtime.getResource(created.id)).tags.map(item => item.name)).toEqual(['research'])
    await runtime.removeTag(created.id, tag.id)
    expect((await runtime.getResource(created.id)).tags).toEqual([])

    const unavailable = (await runtime.listResources()).find(
      item => item.sources[0].type === 'url' && !item.sources[0].available
    )!
    await runtime.refreshURLSource(unavailable.sources[0].id)
    expect((await runtime.getResource(unavailable.id)).sources[0].available).toBe(true)

    const unavailableFile = (await runtime.listResources()).find(
      item => item.sources[0].type === 'file' && !item.sources[0].available
    )!
    const originalLocation = unavailableFile.sources[0].location
    await runtime.refreshFileSource(unavailableFile.sources[0].id)
    const refreshed = await runtime.getResource(unavailableFile.id)
    expect(refreshed.sources[0].location).toBe(originalLocation)
    expect(refreshed.sources[0].available).toBe(true)
    expect(refreshed.size_bytes).toBe(2_400_000)

    const replacementPath = '/Users/demo/Documents/recovered-archive.pdf'
    const replaced = await runtime.replaceFileSource(refreshed.sources[0].id, replacementPath)
    const recovered = await runtime.getResource(refreshed.id)
    expect(replaced.location).toBe(replacementPath)
    expect(recovered.sources[0].location).toBe(replacementPath)
    expect(recovered.kind).toBe('document')

    await runtime.deleteResource(created.id)
    await expect(runtime.getResource(created.id)).rejects.toThrow('Resource 不存在')
  })
})
