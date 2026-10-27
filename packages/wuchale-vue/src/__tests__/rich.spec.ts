// cspell:words ceci puis
// @vitest-environment jsdom
import { expect, it, vi } from 'vite-plus/test'
import { createApp, defineComponent, h, nextTick, ref, shallowRef } from 'vue'
import { compileTranslation } from 'wuchale/compiler'
import toRuntime from 'wuchale/runtime'

import { component, transform } from './helpers'

it('整句重排原生链接与内联组件，保留事件、动态属性和组件状态', async () => {
  const result = await transform(
    '<script setup>import {ref} from "vue"\nconst href="/guide"; const hits=ref(0)</script><template><div><p>Read <a :href="href" @click.prevent="hits++">this</a> and <Counter/> now.</p><output>{{ hits }}</output></div></template>'
  )
  expect(result.bodies).toEqual(['Read <0>this</0> and <1/> now.'])
  expect(result.warn).not.toHaveBeenCalled()
  const current = shallowRef(toRuntime({ c: [compileTranslation('Read <0>this</0> and <1/> now.')] }, 'en'))
  const Counter = defineComponent({
    setup() {
      const count = ref(0)
      return () => h('button', { onClick: () => count.value++ }, `count ${count.value}`)
    }
  })
  const app = createApp(component(result.compiled, [], 'en', () => current.value))
  app.component('Counter', Counter)
  const root = document.createElement('div')
  document.body.append(root)
  app.mount(root)
  try {
    const button = root.querySelector('button')!
    button.click()
    root.querySelector('a')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await nextTick()
    expect(button.textContent).toBe('count 1')
    expect(root.querySelector('output')!.textContent).toBe('1')
    current.value = toRuntime({ c: [compileTranslation('<1/> puis <0>ceci</0>.')] }, 'fr')
    await nextTick()
    expect(root.querySelector('p')!.textContent).toBe('count 1 puis ceci.')
    expect(root.querySelector('button')).toBe(button)
    expect(root.querySelector('a')!.getAttribute('href')).toBe('/guide')
    root.querySelector('a')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await nextTick()
    expect(root.querySelector('output')!.textContent).toBe('2')
  } finally {
    app.unmount()
    root.remove()
  }
})

it.each(['v-if="true"', 'v-for="x in 2"', 'v-slot="props"'])('含 %s 的整句安全跳过', async directive => {
  const source = `<script setup>const n = 0</script><template><p>Read <Card ${directive}>this</Card> now.</p></template>`
  const result = await transform(source)
  expect(result.bodies).toEqual([])
  expect(result.code).toBe(source)
  expect(result.warn).toHaveBeenCalled()
})

it('译文跨父节点移动占位节点时警告并保留源结构', async () => {
  const result = await transform(
    '<script setup>const n=0</script><template><p>Read <span>inside <Counter/></span> now.</p></template>'
  )
  const current = shallowRef(toRuntime({ c: [compileTranslation('Read <0>inside <1/></0> now.')] }, 'en'))
  const app = createApp(component(result.compiled, [], 'en', () => current.value))
  app.component(
    'Counter',
    defineComponent({
      setup() {
        const count = ref(0)
        return () => h('button', { onClick: () => count.value++ }, String(count.value))
      }
    })
  )
  const root = document.createElement('div')
  app.mount(root)
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const button = root.querySelector('button')!
    button.click()
    await nextTick()
    current.value = toRuntime({ c: [compileTranslation('<1/> puis <0>dedans</0>.')] }, 'fr')
    await nextTick()
    expect(warning).toHaveBeenCalled()
    expect(root.querySelector('p')!.textContent).toBe('Read inside 1 now.')
    expect(root.querySelector('button')).toBe(button)
  } finally {
    app.unmount()
    warning.mockRestore()
  }
})

it('富文本内外的文案属性继续参与提取，不丢失原属性', async () => {
  const result = await transform(
    '<script setup>const href="/guide"</script><template><p title="Help text">Read <a :href="href" title="Guide link">this</a> now.</p></template>'
  )
  expect(result.bodies).toEqual(expect.arrayContaining(['Read <0>this</0> now.', 'Help text', 'Guide link']))
  expect(result.warn).not.toHaveBeenCalled()
})

it('保留 Symbol key，不在生成的 key 中强制字符串化', async () => {
  const result = await transform(
    '<script setup>const token=Symbol()</script><template><p>Read <a :key="token">this</a> now.</p></template>'
  )
  const app = createApp(component(result.compiled, ['Read <0>this</0> now.']))
  const root = document.createElement('div')
  try {
    expect(() => app.mount(root)).not.toThrow()
    expect(root.textContent).toBe('Read this now.')
  } finally {
    app.unmount()
  }
})

it.each(['Transition', 'TransitionGroup', 'KeepAlive', 'Teleport', 'Suspense'])(
  '复杂内建 %s 整句跳过并警告',
  async tag => {
    const source = `<script setup>const n=0</script><template><p>Read <${tag}><span>this</span></${tag}> now.</p></template>`
    const result = await transform(source)
    expect(result.bodies).toEqual([])
    expect(result.code).toBe(source)
    expect(result.warn).toHaveBeenCalled()
  }
)

it('数值与字符串 key 仍是不同身份，源码改变 key 时正常重挂', async () => {
  const result = await transform(
    '<script setup>import { ref } from "vue"\nconst token=ref(1)</script><template><p>Read <a :key="token" @click="token=String(token)">this</a> now.</p></template>'
  )
  const app = createApp(component(result.compiled, ['Read <0>this</0> now.']))
  const root = document.createElement('div')
  app.mount(root)
  try {
    const link = root.querySelector('a')!
    link.dispatchEvent(new MouseEvent('click'))
    await nextTick()
    expect(root.querySelector('a')).not.toBe(link)
    expect(root.textContent).toBe('Read this now.')
  } finally {
    app.unmount()
  }
})
