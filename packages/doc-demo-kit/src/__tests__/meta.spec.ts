import type { MetaNode } from '@greypan/md-to-meta'
import { describe, expect, it } from 'vite-plus/test'

import { flavorOf, FLAVORS, FLAVOR_LABELS } from '../flavor'
import { groupedMetaNodes, isFlavorPair, isHeadingLabel } from '../meta'

const fence = (lang: string): MetaNode => ({ label: 'codeblock', lang })

describe('flavor 契约', () => {
  it('tsx 归 React，vue 归 Vue，其余没有 flavor', () => {
    expect(flavorOf('tsx')).toBe('react')
    expect(flavorOf('vue')).toBe('vue')
    expect(flavorOf('bash')).toBeNull()
    expect(flavorOf('')).toBeNull()
    expect(flavorOf(undefined)).toBeNull()
  })

  it('标签与顺序是切换器的渲染事实', () => {
    expect([...FLAVORS]).toEqual(['react', 'vue'])
    expect(FLAVOR_LABELS).toEqual({ react: 'React', vue: 'Vue' })
  })
})

describe('相邻围栏配对', () => {
  it('相邻的 tsx 与 vue 围栏配成一组，其余各自一组', () => {
    const nodes: MetaNode[] = [
      { label: 'h2', content: 'Samples' },
      fence('tsx'),
      fence('vue'),
      { label: 'p', content: 'text' },
      fence('vue'),
      fence('vue')
    ]
    expect(groupedMetaNodes(nodes)).toEqual([
      [{ label: 'h2', content: 'Samples' }],
      [nodes[1], nodes[2]],
      [nodes[3]],
      [nodes[4]],
      [nodes[5]]
    ])
  })

  it('配对只在两个相邻围栏都有 flavor 且不同时成立', () => {
    expect(isFlavorPair(fence('tsx'), fence('vue'))).toBe(true)
    expect(isFlavorPair(fence('vue'), fence('tsx'))).toBe(true)
    expect(isFlavorPair(fence('tsx'), fence('bash'))).toBe(false)
    expect(isFlavorPair(fence('tsx'), fence('tsx'))).toBe(false)
    expect(isFlavorPair(fence('tsx'), undefined)).toBe(false)
    expect(isFlavorPair({ label: 'p' }, fence('vue'))).toBe(false)
  })

  it('空序列返回空分组', () => {
    expect(groupedMetaNodes([])).toEqual([])
  })
})

describe('标题分发', () => {
  it('h1 到 h6 是标题，其余不是', () => {
    expect(isHeadingLabel('h1')).toBe(true)
    expect(isHeadingLabel('h6')).toBe(true)
    expect(isHeadingLabel('p')).toBe(false)
    expect(isHeadingLabel('table')).toBe(false)
  })
})
