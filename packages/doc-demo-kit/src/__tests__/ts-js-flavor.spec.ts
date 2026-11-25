import type { MetaNode } from '@greypan/md-to-meta'
import { describe, expect, it } from 'vite-plus/test'

import {
  createCodeblockController,
  createRouteExampleDocs,
  fenceGroupInfo,
  groupedMetaNodes,
  isFlavorPair,
  parseDemoId,
  searchNavigation,
  TS_JS_FLAVORS,
  tsJsFlavorOf,
  type NavSection
} from '../index'

const code = (lang: string, content: string, meta?: string): MetaNode => ({
  label: 'codeblock',
  lang,
  ...(meta ? { meta } : {}),
  content: `<pre class="shiki shiki-themes github-light github-dark mdm-code"><code>${content}</code></pre>`
})

describe('TS/JS flavor 与围栏组元数据', () => {
  it('tsJsFlavorOf 识别 ts/typescript 与 js/javascript', () => {
    expect(tsJsFlavorOf('ts')).toBe('ts')
    expect(tsJsFlavorOf('typescript')).toBe('ts')
    expect(tsJsFlavorOf('js')).toBe('js')
    expect(tsJsFlavorOf('javascript')).toBe('js')
    expect(tsJsFlavorOf('bash')).toBeNull()
  })

  it('isFlavorPair 仅允许 meta 相等或主 flavor 在前单边带 meta 配对', () => {
    const opts = { flavorOf: tsJsFlavorOf, primaryFlavor: 'ts' }
    expect(isFlavorPair(code('ts', 'a', 'demo=url'), code('js', 'b'), opts)).toBe(true)
    expect(isFlavorPair(code('ts', 'a', 'demo=url'), code('js', 'b', 'demo=url'), opts)).toBe(true)
    expect(isFlavorPair(code('ts', 'a', 'demo=url'), code('js', 'b', 'demo=other'), opts)).toBe(false)
    expect(isFlavorPair(code('ts', 'a'), code('js', 'b', 'demo=url'), opts)).toBe(false)
    expect(isFlavorPair(code('js', 'a', 'demo=url'), code('ts', 'b'), opts)).toBe(false)
  })

  it('groupedMetaNodes 保持二维数组返回，fenceGroupInfo 提取组级 demoId 与 singleFlavor', () => {
    const nodes = [
      code('ts', 'const a: number = 1', 'demo=parse-url'),
      code('js', 'const a = 1'),
      code('ts', 'type X = 1')
    ]
    const groups = groupedMetaNodes(nodes, { flavorOf: tsJsFlavorOf, primaryFlavor: 'ts' })
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveLength(2)
    expect(groups[1]).toHaveLength(1)

    const pairInfo = fenceGroupInfo(groups[0]!, tsJsFlavorOf)
    expect(pairInfo).toEqual({ meta: 'demo=parse-url', demoId: 'parse-url', singleFlavor: false })

    const singleInfo = fenceGroupInfo(groups[1]!, tsJsFlavorOf)
    expect(singleInfo).toEqual({ meta: undefined, demoId: undefined, singleFlavor: true })
    expect(parseDemoId('foo demo=my-demo bar')).toBe('my-demo')
  })

  it('createCodeblockController 支持自定义 TS/JS flavor 切换', () => {
    const nodes = [code('ts', 'const a: number = 1'), code('js', 'const a = 1')]
    const controller = createCodeblockController({
      nodes,
      nativeFlavor: 'ts',
      flavors: TS_JS_FLAVORS,
      flavorOf: tsJsFlavorOf,
      getPanel: () => null
    })
    expect(controller.getSnapshot().flavor).toBe('ts')
    expect(controller.getSnapshot().active?.lang).toBe('ts')

    controller.selectFlavor('js')
    expect(controller.getSnapshot().flavor).toBe('js')
    expect(controller.getSnapshot().active?.lang).toBe('js')

    controller.selectFlavor('vue')
    expect(controller.getSnapshot().flavor).toBe('js')
    controller.dispose()
  })

  it('createRouteExampleDocs 与 searchNavigation 支持自定义命名空间导航树', () => {
    const sections: readonly NavSection<'js-kit' | 'browser-kit'>[] = [
      { id: 'js-kit', items: [{ path: '/js-kit/shortcut', label: 'shortcut', zhName: '安全调用' }] },
      { id: 'browser-kit', items: [{ path: '/browser-kit/shortcut', label: 'shortcut', zhName: '事件监听' }] }
    ]
    const resolveDocs = createRouteExampleDocs(sections, item => item.path.replace(/^\//, ''))
    expect(resolveDocs('/js-kit/shortcut')).toEqual(['js-kit/shortcut'])
    expect(resolveDocs('/browser-kit/shortcut')).toEqual(['browser-kit/shortcut'])

    const hits = searchNavigation('事件', [], sections)
    expect(hits).toHaveLength(1)
    expect(hits[0]?.path).toBe('/browser-kit/shortcut')
  })
})
