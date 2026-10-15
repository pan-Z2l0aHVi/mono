import { fail } from './errors'
import type { SampleFlavor } from './highlight'

/** 只有显式写了 `{#id}` 锚点的示例才发组件文件；没写的仍只出高亮代码，其余 29 篇照旧可用。 */
export function isLiveSample(id: string | null): id is string {
  return id !== null
}

export function demoFileName(component: string, id: string, flavor: SampleFlavor): string {
  return `${component}--${id}.${flavor === 'react' ? 'tsx' : 'vue'}`
}

/**
 * live 示例的围栏就是会被编译执行的那份源码，所以它必须自己站得住：
 * react 侧要是一个默认导出的组件，vue 侧要是带 `<template>` 的 SFC，且模板里出现绑定时必须有带 `setup` 的 script 块。
 * 语法与属性类型的最终校验交给 app 的 `tsc`（`env.d.ts` 已注册 web-ui 的 JSX / GlobalComponents 类型），
 * 这里只挡「片段被当成文件发出」这一种形状。
 */
export function assertSelfContained(code: string, flavor: SampleFlavor, sampleTitle: string, file: string): void {
  if (!code.trim()) fail(`${file}：示例「${sampleTitle}」的 ${flavor} 代码块是空的`)
  if (flavor === 'react') {
    if (!/^export default (?:function|class|async function)/m.test(code.trim()))
      fail(
        `${file}：示例「${sampleTitle}」的 react 代码块要发成组件文件，必须以 \`export default function Demo()\` 形态自带组件包装；` +
          `用到的框架 API（如 useState）也要在这里 import`
      )
    if (code.includes('</template>'))
      fail(`${file}：示例「${sampleTitle}」的 react 代码块里出现了 </template>，看起来是 vue 的写法`)
    return
  }
  if (!/<template[\s>]/.test(code)) fail(`${file}：示例「${sampleTitle}」的 vue 代码块要发成 SFC，必须含 <template> 块`)
  const template = /<template[\s\S]*?>([\s\S]*)<\/template>/.exec(code)?.[1] ?? ''
  // 只认「一定要有个 script 才站得住」的三种形状：事件绑定、指令、插值。`:min="0"` 这种绑到字面量
  // 的动态属性不需要 script，把它也算进来会让一半静态示例凭空长出空 `<script setup>`。
  // 反过来，绑到未定义标识符（`{{ volume }}` 之外还有 `:value="volume"`）这种形状不在这里判：
  // 它由 app 自己的 `vue-tsc` 与构建兜住，`src/generated/demos/**` 不参与格式排除，见根 `vite.config.ts`。
  const needsScript = /(?:^|\s)@[\w-]+=|(?:^|\s)v-[a-z-]+?=|\{\{/.test(template)
  // `setup` 必须是独立属性：`<script data-setup>` 与 options API 的 `setup()` 都不算声明了来源。
  if (needsScript && !/<script\b[^>]*?\ssetup(?:\s|\/?>)/.test(code))
    fail(
      `${file}：示例「${sampleTitle}」的 vue 模板里有事件绑定、指令或插值，却没有带 \`setup\` 的 <script> 块声明来源；` +
        `live 示例的 vue 代码块要能独立编译成 SFC`
    )
}
