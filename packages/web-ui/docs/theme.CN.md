# Theme

主题提供者在自己的子树内定义基础、颜色、层级、阴影与动效 token，同时是这个子树的 overlay 容器。

## Samples

### Light and dark

`appearance` 决定这一层作用域解析出哪一套颜色与阴影 token。`light` 与 `dark` 可以在同一页并存。

theme 宿主不生成盒子，也不绘制任何内容。作用域的颜色要由子元素自己应用 `--wui-color-page` 与 `--wui-color-text` 来呈现。

```tsx
const appearances = ['light', 'dark'] as const

const labels: Record<(typeof appearances)[number], string> = {
  light: '浅色作用域',
  dark: '暗色作用域'
}

export default function Demo() {
  return (
    <div className="flex flex-wrap gap-4">
      {appearances.map(item => (
        <web-ui-theme key={item} appearance={item}>
          <div className="w-64 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <p className="m-0 font-medium">{labels[item]}</p>
            <p className="m-0 mb-3 text-sm text-(--wui-color-text-secondary)">文本、次要文本与控件表面都取这一层的值</p>
            <div className="flex flex-wrap items-center gap-2">
              <web-ui-button variant="primary">主要</web-ui-button>
              <web-ui-button variant="secondary">次要</web-ui-button>
              <web-ui-switch checked></web-ui-switch>
            </div>
          </div>
        </web-ui-theme>
      ))}
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-wrap gap-4">
    <web-ui-theme v-for="item in appearances" :key="item" :appearance="item">
      <div class="w-64 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <p class="m-0 font-medium">{{ labels[item] }}</p>
        <p class="m-0 mb-3 text-sm text-(--wui-color-text-secondary)">文本、次要文本与控件表面都取这一层的值</p>
        <div class="flex flex-wrap items-center gap-2">
          <web-ui-button variant="primary">主要</web-ui-button>
          <web-ui-button variant="secondary">次要</web-ui-button>
          <web-ui-switch checked></web-ui-switch>
        </div>
      </div>
    </web-ui-theme>
  </div>
</template>

<script setup lang="ts">
const appearances = ['light', 'dark'] as const

const labels: Record<(typeof appearances)[number], string> = {
  light: '浅色作用域',
  dark: '暗色作用域'
}
</script>
```

### Switching appearance

把 `appearance` 绑定到页面状态上就是主题切换。`system` 由 `prefers-color-scheme` 解析。

开关放在同一个作用域里，只改动这一层。内层换色只影响它自己的作用域，外层外观与页面色都不受影响。这一层是否播放揭示动画，由它自己的 `motion` 决定。

```tsx
import type { ThemeAppearance } from '@greypan/web-ui'
import { useState } from 'react'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: '浅色', value: 'light' },
  { label: '暗色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

export default function Demo() {
  const [appearance, setAppearance] = useState<ThemeAppearance>('light')

  return (
    <web-ui-theme appearance="dark">
      <div className="rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <p className="m-0 mb-3 text-xs text-(--wui-color-text-secondary)">外层固定 dark，内层怎么切都动不了它</p>
        <web-ui-theme appearance={appearance}>
          <div className="w-full max-w-sm rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-(--wui-color-text-secondary)">appearance</span>
              <web-ui-segmented
                value={appearance}
                aria-label="示例作用域的外观"
                onInput={event => {
                  const next = appearances.find(item => item.value === event.currentTarget.value)
                  if (next) setAppearance(next.value)
                }}
              >
                {appearances.map(item => (
                  <web-ui-segmented-trigger key={item.value} value={item.value}>
                    {item.label}
                  </web-ui-segmented-trigger>
                ))}
              </web-ui-segmented>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <web-ui-input value="作用域内的输入框"></web-ui-input>
              <web-ui-button variant="primary">确认</web-ui-button>
            </div>
          </div>
        </web-ui-theme>
      </div>
    </web-ui-theme>
  )
}
```

```vue
<template>
  <web-ui-theme appearance="dark">
    <div class="rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <p class="m-0 mb-3 text-xs text-(--wui-color-text-secondary)">外层固定 dark，内层怎么切都动不了它</p>
      <web-ui-theme :appearance="appearance">
        <div
          class="w-full max-w-sm rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
        >
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span class="text-sm text-(--wui-color-text-secondary)">appearance</span>
            <web-ui-segmented
              :value="appearance"
              aria-label="示例作用域的外观"
              @input="pick($event.currentTarget.value)"
            >
              <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
                {{ item.label }}
              </web-ui-segmented-trigger>
            </web-ui-segmented>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <web-ui-input value="作用域内的输入框"></web-ui-input>
            <web-ui-button variant="primary">确认</web-ui-button>
          </div>
        </div>
      </web-ui-theme>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import type { ThemeAppearance } from '@greypan/web-ui'
import { ref } from 'vue'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: '浅色', value: 'light' },
  { label: '暗色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

const appearance = ref<ThemeAppearance>('light')

function pick(value: string) {
  const next = appearances.find(item => item.value === value)
  if (next) appearance.value = next.value
}
</script>
```

### Derived output

`resolved-appearance`（同时以 `resolvedAppearance` property 暴露）的值始终是 `light` 或 `dark`。显式的 `appearance` 直接透传。`system` 从 `prefers-color-scheme` 解析，并在系统深浅切换时实时更新。未设置 `appearance` 时输出默认值 `light`。

theme 不派发任何事件。要观察它的变化，直接绑定这个 attribute：用 CSS 选择器或 MutationObserver 都可以。

只有组件会写入这个 attribute。外部改写会被组件恢复。

```tsx
import type { WebUiTheme } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const theme = useRef<WebUiTheme>(null)
  const [report, setReport] = useState('还没读取')

  function inspect() {
    const el = theme.current
    if (!el) return
    const derived = el.resolvedAppearance
    const tampered = derived === 'dark' ? 'light' : 'dark'
    el.setAttribute('resolved-appearance', tampered)
    setReport(`解析结果 ${derived}；外部写入 ${tampered} 之后回读到 ${el.getAttribute('resolved-appearance')}`)
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-theme ref={theme} appearance="system">
        <web-ui-button onClick={inspect}>读取并尝试改写</web-ui-button>
      </web-ui-theme>
      <output className="text-sm text-(--wui-color-text-secondary)">{report}</output>
    </div>
  )
}
```

```vue
<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-theme ref="theme" appearance="system">
      <web-ui-button @click="inspect">读取并尝试改写</web-ui-button>
    </web-ui-theme>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ report }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTheme } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const theme = useTemplateRef<WebUiTheme>('theme')
const report = ref('还没读取')

function inspect() {
  const el = theme.value
  if (!el) return
  const derived = el.resolvedAppearance
  const tampered = derived === 'dark' ? 'light' : 'dark'
  el.setAttribute('resolved-appearance', tampered)
  report.value = `解析结果 ${derived}；外部写入 ${tampered} 之后回读到 ${el.getAttribute('resolved-appearance')}`
}
</script>
```

### Nested scopes

主题可以层层嵌套，每一层解析自己的 token。内层的值覆盖外层，离开内层后回到外层的值。每一层的 `resolved-appearance` 各自输出。

`appearance` 也是每层自己的输入。改中间层只重绘中间与内层区域，改内层不会影响外侧两层。`motion` 同样按层设置，不从祖先继承，省略时默认是 `system`。

宿主不生成盒子，所以布局（这里的边框、内边距与间距）要写在作用域内的子元素上。写在 `<web-ui-theme>` 宿主上不会生效。

```tsx
import type { ThemeAppearance } from '@greypan/web-ui'
import { useState } from 'react'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: '浅色模式', value: 'light' },
  { label: '深色模式', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

export default function Demo() {
  const [outer, setOuter] = useState<ThemeAppearance>('light')
  const [middle, setMiddle] = useState<ThemeAppearance>('dark')
  const [inner, setInner] = useState<ThemeAppearance>('system')

  return (
    <web-ui-theme appearance={outer} motion="reduced">
      <div className="rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-col items-start gap-2">
          <span className="text-xs text-(--wui-color-text-secondary)">第 1 层 · reduced 动效</span>
          <web-ui-segmented
            value={outer}
            aria-label="第 1 层外观"
            onInput={event => {
              const next = appearances.find(item => item.value === event.currentTarget.value)
              if (next) setOuter(next.value)
            }}
          >
            {appearances.map(item => (
              <web-ui-segmented-trigger key={item.value} value={item.value}>
                {item.label}
              </web-ui-segmented-trigger>
            ))}
          </web-ui-segmented>
        </div>

        <web-ui-theme appearance={middle} motion="full">
          <div className="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <div className="flex flex-col items-start gap-2">
              <span className="text-xs text-(--wui-color-text-secondary)">第 2 层 · full 动效</span>
              <web-ui-segmented
                value={middle}
                aria-label="第 2 层外观"
                onInput={event => {
                  const next = appearances.find(item => item.value === event.currentTarget.value)
                  if (next) setMiddle(next.value)
                }}
              >
                {appearances.map(item => (
                  <web-ui-segmented-trigger key={item.value} value={item.value}>
                    {item.label}
                  </web-ui-segmented-trigger>
                ))}
              </web-ui-segmented>
            </div>

            <web-ui-theme appearance={inner}>
              <div className="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
                <div className="flex flex-col items-start gap-2">
                  <span className="text-xs text-(--wui-color-text-secondary)">第 3 层 · system 动效</span>
                  <web-ui-segmented
                    value={inner}
                    aria-label="第 3 层外观"
                    onInput={event => {
                      const next = appearances.find(item => item.value === event.currentTarget.value)
                      if (next) setInner(next.value)
                    }}
                  >
                    {appearances.map(item => (
                      <web-ui-segmented-trigger key={item.value} value={item.value}>
                        {item.label}
                      </web-ui-segmented-trigger>
                    ))}
                  </web-ui-segmented>
                </div>
              </div>
            </web-ui-theme>
          </div>
        </web-ui-theme>
      </div>
    </web-ui-theme>
  )
}
```

```vue
<template>
  <web-ui-theme :appearance="outer" motion="reduced">
    <div class="rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="flex flex-col items-start gap-2">
        <span class="text-xs text-(--wui-color-text-secondary)">第 1 层 · reduced 动效</span>
        <web-ui-segmented :value="outer" aria-label="第 1 层外观" @input="outer = pick($event.currentTarget.value)">
          <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
            {{ item.label }}
          </web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>

      <web-ui-theme :appearance="middle" motion="full">
        <div
          class="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
        >
          <div class="flex flex-col items-start gap-2">
            <span class="text-xs text-(--wui-color-text-secondary)">第 2 层 · full 动效</span>
            <web-ui-segmented
              :value="middle"
              aria-label="第 2 层外观"
              @input="middle = pick($event.currentTarget.value)"
            >
              <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
                {{ item.label }}
              </web-ui-segmented-trigger>
            </web-ui-segmented>
          </div>

          <web-ui-theme :appearance="inner">
            <div
              class="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
            >
              <div class="flex flex-col items-start gap-2">
                <span class="text-xs text-(--wui-color-text-secondary)">第 3 层 · system 动效</span>
                <web-ui-segmented
                  :value="inner"
                  aria-label="第 3 层外观"
                  @input="inner = pick($event.currentTarget.value)"
                >
                  <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </web-ui-segmented-trigger>
                </web-ui-segmented>
              </div>
            </div>
          </web-ui-theme>
        </div>
      </web-ui-theme>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import type { ThemeAppearance } from '@greypan/web-ui'
import { ref } from 'vue'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: '浅色模式', value: 'light' },
  { label: '深色模式', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

const outer = ref<ThemeAppearance>('light')
const middle = ref<ThemeAppearance>('dark')
const inner = ref<ThemeAppearance>('system')

function pick(value: string): ThemeAppearance {
  return appearances.find(item => item.value === value)?.value ?? 'light'
}
</script>
```

### Motion presets

`motion` 设置这一层的动效模式。`reduced` 把转场时长归零，但两个无限加载循环不会停，只放慢到 `1600ms`。`full` 始终播放动效。`system` 跟随 `prefers-reduced-motion`。

`motion` 不参与 `appearance` 的解析。`isReducedMotion()` 返回这一层的判定结果。

打开 portal select 的 panel 可以直接比较进场与退场的时长。panel 挂载到这一层的 overlay 容器，使用的就是这一层的时长 token。

```tsx
import type { ThemeMotion, WebUiTheme } from '@greypan/web-ui'
import { useRef, useState } from 'react'

const motions: { label: string; value: ThemeMotion }[] = [
  { label: 'full', value: 'full' },
  { label: 'reduced', value: 'reduced' },
  { label: 'system', value: 'system' }
]

export default function Demo() {
  const theme = useRef<WebUiTheme>(null)
  const [motion, setMotion] = useState<ThemeMotion>('system')
  const [reduced, setReduced] = useState('')

  return (
    <web-ui-theme ref={theme} appearance="light" motion={motion}>
      <div className="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-(--wui-color-text-secondary)">motion</span>
          <web-ui-segmented
            value={motion}
            aria-label="示例作用域的动效模式"
            onInput={event => {
              const next = motions.find(item => item.value === event.currentTarget.value)
              if (next) setMotion(next.value)
            }}
          >
            {motions.map(item => (
              <web-ui-segmented-trigger key={item.value} value={item.value}>
                {item.label}
              </web-ui-segmented-trigger>
            ))}
          </web-ui-segmented>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <web-ui-select portal placeholder="打开看时长" aria-label="用于对比动效时长的 select">
            <web-ui-option value="enter" label="进场">
              进场
            </web-ui-option>
            <web-ui-option value="exit" label="退场">
              退场
            </web-ui-option>
          </web-ui-select>
          <web-ui-button
            variant="secondary"
            onClick={() => setReduced(`isReducedMotion() = ${String(theme.current?.isReducedMotion())}`)}
          >
            读取判定
          </web-ui-button>
          <output className="text-sm text-(--wui-color-text-secondary)">{reduced === '' ? '还没读取' : reduced}</output>
        </div>
      </div>
    </web-ui-theme>
  )
}
```

```vue
<template>
  <web-ui-theme ref="theme" appearance="light" :motion="motion">
    <div class="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-sm text-(--wui-color-text-secondary)">motion</span>
        <web-ui-segmented :value="motion" aria-label="示例作用域的动效模式" @input="pick($event.currentTarget.value)">
          <web-ui-segmented-trigger v-for="item in motions" :key="item.value" :value="item.value">
            {{ item.label }}
          </web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <web-ui-select portal placeholder="打开看时长" aria-label="用于对比动效时长的 select">
          <web-ui-option value="enter" label="进场">进场</web-ui-option>
          <web-ui-option value="exit" label="退场">退场</web-ui-option>
        </web-ui-select>
        <web-ui-button variant="secondary" @click="inspect">读取判定</web-ui-button>
        <output class="text-sm text-(--wui-color-text-secondary)">{{ reduced === '' ? '还没读取' : reduced }}</output>
      </div>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import type { ThemeMotion, WebUiTheme } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const motions: { label: string; value: ThemeMotion }[] = [
  { label: 'full', value: 'full' },
  { label: 'reduced', value: 'reduced' },
  { label: 'system', value: 'system' }
]

const theme = useTemplateRef<WebUiTheme>('theme')
const motion = ref<ThemeMotion>('system')
const reduced = ref('')

function pick(value: string) {
  const next = motions.find(item => item.value === value)
  if (next) motion.value = next.value
}

function inspect() {
  const el = theme.value
  if (!el) return
  reduced.value = `isReducedMotion() = ${String(el.isReducedMotion())}`
}
</script>
```

### Overlay root and portal

每个启用的主题同时是它自己的 overlay 容器。`getOverlayRoot()` 返回它。未设置 `appearance` 的主题不创建 overlay 容器，返回 `undefined`。

Portal 类组件没有显式容器时，会挂载到最近的启用主题的 overlay 容器，所以 panel 使用的是这一层的 token。`toast()` 不带 `target` 时优先使用根主题。

`<web-ui-dialog>` 同样能取到这一层的颜色与动效 token。

```tsx
import { toast, type WebUiButton, type WebUiTheme } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const theme = useRef<WebUiTheme>(null)
  const toastTarget = useRef<WebUiButton>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [report, setReport] = useState('还没读取')

  return (
    <web-ui-theme ref={theme} appearance="dark">
      <div className="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-wrap items-center gap-2">
          <web-ui-select portal placeholder="Portal select" aria-label="挂进作用域 overlay 容器的 select">
            <web-ui-option value="portal" label="Portal overlay">
              Portal overlay
            </web-ui-option>
            <web-ui-option value="token" label="Theme token">
              Theme token
            </web-ui-option>
          </web-ui-select>
          <web-ui-button
            ref={toastTarget}
            variant="secondary"
            onClick={() =>
              toast.info('这条 toast 挂进示例自己的 overlay 容器。', {
                heading: '作用域 toast',
                duration: 3000,
                target: toastTarget.current ?? undefined
              })
            }
          >
            显示 toast
          </web-ui-button>
          <web-ui-button variant="secondary" onClick={() => setDialogOpen(true)}>
            打开 dialog
          </web-ui-button>
          <web-ui-button
            variant="ghost"
            onClick={() =>
              setReport(
                theme.current?.getOverlayRoot() ? 'getOverlayRoot() 返回元素' : 'getOverlayRoot() 返回 undefined'
              )
            }
          >
            读取 overlay 容器
          </web-ui-button>
        </div>
        <output className="mt-2 block text-sm text-(--wui-color-text-secondary)">{report}</output>

        <web-ui-dialog
          open={dialogOpen}
          heading="作用域 dialog"
          onopen-change={event => setDialogOpen(event.detail.open)}
        >
          dialog 在原生 top layer，颜色与动效 token 仍从这一层继承。
          <web-ui-button slot="footer" variant="primary" full onClick={() => setDialogOpen(false)}>
            关闭
          </web-ui-button>
        </web-ui-dialog>
      </div>
    </web-ui-theme>
  )
}
```

```vue
<template>
  <web-ui-theme ref="theme" appearance="dark">
    <div class="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="flex flex-wrap items-center gap-2">
        <web-ui-select portal placeholder="Portal select" aria-label="挂进作用域 overlay 容器的 select">
          <web-ui-option value="portal" label="Portal overlay">Portal overlay</web-ui-option>
          <web-ui-option value="token" label="Theme token">Theme token</web-ui-option>
        </web-ui-select>
        <web-ui-button ref="toast-target" variant="secondary" @click="showToast">显示 toast</web-ui-button>
        <web-ui-button variant="secondary" @click="dialogOpen = true">打开 dialog</web-ui-button>
        <web-ui-button variant="ghost" @click="inspect">读取 overlay 容器</web-ui-button>
      </div>
      <output class="mt-2 block text-sm text-(--wui-color-text-secondary)">{{ report }}</output>

      <web-ui-dialog :open="dialogOpen" heading="作用域 dialog" @open-change="dialogOpen = $event.detail.open">
        dialog 在原生 top layer，颜色与动效 token 仍从这一层继承。
        <web-ui-button slot="footer" variant="primary" full @click="dialogOpen = false">关闭</web-ui-button>
      </web-ui-dialog>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import { toast, type WebUiButton, type WebUiTheme } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const theme = useTemplateRef<WebUiTheme>('theme')
const toastTarget = useTemplateRef<WebUiButton>('toast-target')
const dialogOpen = ref(false)
const report = ref('还没读取')

function showToast() {
  toast.info('这条 toast 挂进示例自己的 overlay 容器。', {
    heading: '作用域 toast',
    duration: 3000,
    target: toastTarget.value ?? undefined
  })
}

function inspect() {
  report.value = theme.value?.getOverlayRoot() ? 'getOverlayRoot() 返回元素' : 'getOverlayRoot() 返回 undefined'
}
</script>
```

### Overriding tokens within a scope

token 的默认值由 `<web-ui-theme>` 为自己的子树声明，所以覆盖要写在作用域内的元素上。调高 `--wui-control-size` 与 `--wui-input-width` 可以改变控件的高度与宽度。

调高 `--wui-space-4` 会改变整体间距。组件各自的覆盖 token（`--wui-button-px`、`--wui-dialog-padding` 那一类）只把这些级作为回退默认值。

`--wui-color-focus-ring` 由 `--wui-color-accent` 派生。在子元素上覆盖 accent 时，它不会跟着一起变。

```tsx
export default function Demo() {
  return (
    <web-ui-theme appearance="light">
      <div className="flex flex-wrap gap-4 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-col items-start gap-[var(--wui-space-4)]">
          <p className="m-0 text-sm text-(--wui-color-text-secondary)">作用域默认值</p>
          <web-ui-button variant="primary">确定</web-ui-button>
          <web-ui-input value="宽度与高度都取默认档"></web-ui-input>
        </div>

        <div className="flex flex-col items-start gap-[var(--wui-space-4)] [--wui-control-size:44px] [--wui-input-width:240px] [--wui-space-4:24px] [--wui-color-accent:#0f7b6c]">
          <p className="m-0 text-sm text-(--wui-color-text-secondary)">同一作用域内抬高一档</p>
          <web-ui-button variant="primary">确定</web-ui-button>
          <web-ui-input value="抬高了控件高度与宽度"></web-ui-input>
        </div>
      </div>
    </web-ui-theme>
  )
}
```

```vue
<template>
  <web-ui-theme appearance="light">
    <div class="flex flex-wrap gap-4 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="flex flex-col items-start gap-[var(--wui-space-4)]">
        <p class="m-0 text-sm text-(--wui-color-text-secondary)">作用域默认值</p>
        <web-ui-button variant="primary">确定</web-ui-button>
        <web-ui-input value="宽度与高度都取默认档"></web-ui-input>
      </div>

      <div
        class="flex flex-col items-start gap-[var(--wui-space-4)] [--wui-control-size:44px] [--wui-input-width:240px] [--wui-space-4:24px] [--wui-color-accent:#0f7b6c]"
      >
        <p class="m-0 text-sm text-(--wui-color-text-secondary)">同一作用域内抬高一档</p>
        <web-ui-button variant="primary">确定</web-ui-button>
        <web-ui-input value="抬高了控件高度与宽度"></web-ui-input>
      </div>
    </div>
  </web-ui-theme>
</template>
```

## API

### Props

| 名称                  | 说明                                                        | 类型                           | 默认值     |
| --------------------- | ----------------------------------------------------------- | ------------------------------ | ---------- |
| `appearance`          | 配色方案：`light`、`dark` 或 `system`。                     | `ThemeAppearance \| undefined` | —          |
| `resolved-appearance` | 解析后的配色方案，只读反射输出。                            | `ResolvedThemeAppearance`      | `'light'`  |
| `motion`              | 当前嵌套主题范围的动效偏好：`full`、`reduced` 或 `system`。 | `ThemeMotion`                  | `'system'` |

### Slots

| 名称      | 说明                 |
| --------- | -------------------- |
| `default` | 主题作用域内的内容。 |

### Methods

| 名称                | 说明                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `getOverlayRoot()`  | 返回该主题的 overlay 容器；未设置 `appearance` 时返回 `undefined`。                                               |
| `isReducedMotion()` | 当前主题范围是否应减少动效：`motion` 为 `reduced` / `full` 时直接给出 `true` / `false`，`system` 时跟随系统偏好。 |

### Portal 挂载规则

每个启用的 `<web-ui-theme>` 同时是默认的作用域 overlay 容器。

Portal 类组件在未显式传入 `overlayContainer` 时，会解析到最近的启用主题的 `getOverlayRoot()`。不带 `target` 的调用优先使用根主题的 overlay 容器。

没有启用的主题提供 overlay 容器时，回退到全局默认 overlay 容器。

### 行为说明

在其子树中定义基础、颜色、层级、阴影和动效 token。`motion="system"` 跟随 `prefers-reduced-motion`。使用 `motion="reduced"` 降低当前作用域的动效，或在嵌套主题中使用 `motion="full"` 恢复默认 token。

`system` 配色模式跟随 `prefers-color-scheme`。

`resolved-appearance` 是只读的派生宿主属性（同时以 `resolvedAppearance` property 暴露）。它的值始终是 `light` 或 `dark`。显式的 `appearance` 直接透传，`appearance="system"` 从 `prefers-color-scheme` 解析，并在系统深浅切换时实时更新。

未设置 `appearance` 的主题仍是未启用状态，但解析输出使用默认值 `light`。

这个 attribute 只由组件写入，外部改动会被恢复。因此调用方可以直接把选择器或 Tailwind custom variant 绑定到 `resolved-appearance`，不必再维护第二份主题状态。

配色变化是否播放揭示动画，由当前主题范围的 `motion` 模式决定：`full` 始终播放，`reduced` 直接切换，`system` 跟随 `prefers-reduced-motion`。

根主题揭示整页。嵌套主题只揭示自己的区域。揭示方向跟随解析后的外观，深色与浅色两个方向反向播放。

以下情况都会立即应用新的 appearance，不播放揭示：浏览器不支持、作用域为 reduced-motion、时长为 0、上一次揭示尚未结束。`appearance="system"` 下的系统深浅切换不播放动画。

揭示进行中，底层页面暂时无法接收指针交互。

主题宿主不绘制任何背景。组件库不在宿主页面上画背景，嵌入方对主题子树背后的表面保留完全控制权。

### `motion` 属性

用 `motion` 表达意图。默认 `motion="system"`：系统未要求减少动态效果时播放揭示，系统要求减少动态效果时不播放。`motion="full"` 始终播放。`motion="reduced"` 直接切换，不播放任何动画。

### 根节点 page 色同步

最外层的启用主题会把当前 `--wui-color-page` 同步到 `document.documentElement`，让页面画布跟随主题，包括橡皮筋回弹露出的区域。嵌套主题保留自己的作用域，不改写 root 值。

非实时：组件不观察宿主自身的样式变化，所以运行中修改宿主上的 `--wui-color-page`（行内样式、class 或媒体查询）不会立即同步，要等下一次 theme 连接或 `appearance` 变化。

页面色需要独立于主题 appearance 变化时，在 `:root` 或 `body` 上用 `!important` 定义自己的 `--wui-color-page`；或者让页面色跟随 `appearance` 变化。

### Foundation tokens

| 名称                      | 说明                     | 默认值  |
| ------------------------- | ------------------------ | ------- |
| `--wui-input-width`       | 紧凑表单控件默认宽度     | `200px` |
| `--wui-control-size`      | 控件默认高度和方形最小宽 | `36px`  |
| `--wui-overlay-min-width` | 锚定 overlay 最小宽度    | `200px` |
| `--wui-focus-ring-width`  | Focus indicator 宽度     | `3px`   |

### 排版 token

字号按文字承担的角色命名，而不是按它在尺度中的位置。`caption` 是密集 chrome 上的小标签，`readout` 用于展示数字，无后缀的基准字号是正文，`title` 是有界卡片标题。字重按粗细命名，行高按这段文字需要的垂直留白命名。

这一族与外观无关，light 和 dark 下取值相同。

### Typography tokens

| 名称                         | 说明                                                    | 默认值 |
| ---------------------------- | ------------------------------------------------------- | ------ |
| `--wui-font-size-caption`    | 密集 chrome label（badge、toast 时间戳、menu group 头） | `12px` |
| `--wui-font-size-readout`    | 数字显示（image preview 的计数与缩放比）                | `13px` |
| `--wui-font-size`            | 正文与控件的基础字号（含控件的占位文本）                | `14px` |
| `--wui-font-size-title`      | 有界卡片标题（dialog、drawer）                          | `18px` |
| `--wui-font-weight-medium`   | 强调行内文字的中等字重                                  | `500`  |
| `--wui-font-weight-semibold` | 标题的半粗字重                                          | `600`  |
| `--wui-line-height-tight`    | 大号标题的紧行高                                        | `1.2`  |
| `--wui-line-height-snug`     | 中号标题的适中行高                                      | `1.4`  |
| `--wui-line-height-normal`   | 正文的常规行高                                          | `1.5`  |
| `--wui-line-height-relaxed`  | 长文阅读的宽松行高                                      | `1.6`  |

### 间距 token

以 4px 为基准的六级间距，止于 24px。它不替代组件各自的覆盖 token（`--wui-button-px`、`--wui-dialog-padding` 等），而是作为这些 token 的回退默认值。覆盖某一级，就会在所有使用这一级的调用点上调整密度。

这一级刻意不含 `1px`、`2px`、`6px`、`7.5px`、`10px` 和负值。它们分别是发丝线与描边、光学修正、半级耦合值和负 margin 抵消，不构成共享的间距语义。

对齐视口或宿主内容边缘的偏移量不属于这一级，即使正好是 4px 的倍数：

- `--wui-image-preview-edge-gap`
- `--wui-toast-viewport-gap`
- `--wui-layout-mobile-toggle-inset`
- `--wui-back-top-right` / `--wui-back-top-left` / `--wui-back-top-bottom`
- `--wui-drawer-inset`
- `--wui-drawer-close-right`

它们的参照是屏幕或宿主的内容边缘，而不是相邻元素之间的间距。`--wui-drawer-close-top` 是例外：它跟随 drawer 的 header padding。

由组件的 `size` prop 派生的间距也不属于这一级（例如 `<web-ui-empty>` 的 padding 与图形尺寸随 `--wui-empty-size` 缩放）。这类值跟随 `size`，直接写 px。

覆盖必须写在 `<web-ui-theme>` 作用域内。

没有主题作用域的 overlay 无法读取间距级，会回退到字面量默认值。

### Spacing tokens

| 名称            | 说明                       | 默认值 |
| --------------- | -------------------------- | ------ |
| `--wui-space-1` | 紧凑内边距（badge、menu）  | `4px`  |
| `--wui-space-2` | 控件间距、组间距、行内间距 | `8px`  |
| `--wui-space-3` | 控件水平内边距             | `12px` |
| `--wui-space-4` | 标准区块间距               | `16px` |
| `--wui-space-5` | overlay 内容内边距         | `20px` |
| `--wui-space-6` | 宽 overlay 内边距          | `24px` |

### Selection control tokens

| 名称                           | 说明                                 | 默认值               |
| ------------------------------ | ------------------------------------ | -------------------- |
| `--wui-selection-control-size` | indicator（圆点 / 方框）宽高         | `18px`               |
| `--wui-radio-group-gap`        | `<web-ui-radio-group>` 的成员间距    | `var(--wui-space-2)` |
| `--wui-checkbox-group-gap`     | `<web-ui-checkbox-group>` 的成员间距 | `var(--wui-space-2)` |

### Radius tokens

| 名称                   | 说明                                                 | 默认值                 |
| ---------------------- | ---------------------------------------------------- | ---------------------- |
| `--wui-radius-control` | 小型控件的胶囊圆角（button、input、switch、option…） | `calc(infinity * 1px)` |
| `--wui-radius-menu`    | menu/Popover 浮动 panel、多行 textarea 与 toast      | `18px`                 |
| `--wui-radius-overlay` | 大型覆盖层：dialog、drawer、layout sidebar           | `28px`                 |

### Layer tokens

| 名称                         | 说明            | 默认值 |
| ---------------------------- | --------------- | ------ |
| `--wui-layer-inline-overlay` | 组件内 overlay  | `10`   |
| `--wui-layer-header`         | 页面 Header     | `100`  |
| `--wui-layer-auxiliary`      | 悬浮工具控件    | `200`  |
| `--wui-layer-banner`         | Banner          | `300`  |
| `--wui-layer-tabbar`         | Tab Bar         | `400`  |
| `--wui-layer-sidebar`        | 侧边栏          | `500`  |
| `--wui-layer-menu`           | menu/浮动 panel | `1000` |
| `--wui-layer-menu-nested`    | 嵌套 menu       | `1100` |
| `--wui-layer-toast`          | Toast           | `2000` |
| `--wui-layer-loading`        | 加载提示        | `3000` |

### 动效 token

duration 默认值：

- `--wui-duration-press: 80ms`
- `--wui-duration-feedback: 100ms`
- `--wui-duration-trigger: 160ms`
- `--wui-duration-focus: 200ms`
- `--wui-duration-float-enter: 240ms`
- `--wui-duration-float-exit: 160ms`
- `--wui-duration-dialog-enter: 320ms`
- `--wui-duration-dialog-exit: 260ms`
- `--wui-duration-drawer-enter: 280ms`
- `--wui-duration-drawer-exit: 240ms`
- `--wui-duration-drawer-nested: 450ms`
- `--wui-duration-toast-enter: 280ms`
- `--wui-duration-toast-exit: 200ms`
- `--wui-duration-collapse-enter: 200ms`
- `--wui-duration-collapse-exit: 160ms`
- `--wui-duration-layout: 200ms`
- `--wui-duration-swipe-settle: 220ms`（image-preview 轮播回位）
- `--wui-duration-spin: 600ms`（icon 旋转）
- `--wui-duration-spinner: 800ms`（spinner 叶片追光）
- `--wui-theme-transition-duration: 500ms`（主题配色揭示）

Easing token：

- `--wui-ease-enter`
- `--wui-ease-dialog`（`cubic-bezier(0.2, 0, 0, 1)`）
- `--wui-ease-slide`
- `--wui-ease-float`（`cubic-bezier(0.4, 0.38, 0.2, 1)`，锚定浮动 panel 专用的无回弹弹簧拟合曲线）
- `--wui-ease-swipe`（`cubic-bezier(0.32, 0.72, 0, 1)`，轮播回位的减速收尾）
- `--wui-theme-transition-easing: ease-in`

进入缩放是 `--wui-scale-enter: 0.9`，浮动 panel 与 image-preview 的图片舞台层由小到大展开。dialog 使用 `--wui-dialog-scale-enter: 1.1`，从大到小收缩入场，退场反向播放。

`motion="reduced"` 下所有转场时长归零，轮播回位也一并归零。两个无限加载循环只放慢，不会停（`--wui-duration-spin` / `--wui-duration-spinner`：`600ms` / `800ms` → `1600ms`）。加载指示冻结会让人以为界面卡死。

hover 与 active 的背景反馈即时切换，没有过渡动画。选中态、按压与 focus 使用带时长的过渡，在减少动态效果时同样归零。

### Color tokens

| 名称                                  | 说明                                               | 浅色默认值                                                              | 深色默认值                                                                            |
| ------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `--wui-color-page`                    | 页面背景                                           | `#fff`                                                                  | `#242628`                                                                             |
| `--wui-color-surface`                 | 普通表面                                           | `#fff`                                                                  | `#2c2c2e`                                                                             |
| `--wui-color-surface-raised`          | 抬升表面                                           | `#f2f2f7`                                                               | `#2c2c2e`                                                                             |
| `--wui-color-surface-control`         | 中性可交互控件表面                                 | `#dfdfdf`                                                               | `#3a3a3c`                                                                             |
| `--wui-color-surface-track`           | Slider/Switch track 表面                           | `#e5e5ea`                                                               | `#444446`                                                                             |
| `--wui-color-surface-menu`            | Menu 和浮动 panel 表面                             | `rgb(250 250 250 / 0.76)`                                               | `rgb(49 48 50 / 0.74)`                                                                |
| `--wui-color-surface-glass`           | 液态玻璃表面                                       | `rgb(250 250 250 / 0.34)`                                               | `rgb(44 44 46 / 0.42)`                                                                |
| `--wui-color-surface-glass-hover`     | Glass 完整悬停背景                                 | `color-mix(... text 6%, surface-glass)`                                 | `color-mix(... text 6%, surface-glass)`                                               |
| `--wui-color-surface-glass-active`    | Glass 完整按下背景                                 | `color-mix(... text 15%, surface-glass)`                                | `color-mix(... text 15%, surface-glass)`                                              |
| `--wui-color-surface-overlay`         | 半透明 overlay 表面                                | `rgb(248 248 248 / 0.92)`                                               | `rgb(32 34 34 / 0.92)`                                                                |
| `--wui-color-surface-sidebar`         | 侧边栏 panel 表面                                  | `rgb(233 233 233 / 0.82)`                                               | `rgb(44 44 46 / 0.8)`                                                                 |
| `--wui-color-surface-segmented`       | Segmented 凹变种 indicator 表面（与 control 同级） | `#dfdfdf`                                                               | `#3a3a3c`                                                                             |
| `--wui-color-surface-segmented-track` | Segmented 凸变种 track 表面                        | `#e5e5ea`                                                               | `#17191a`                                                                             |
| `--wui-color-surface-selected`        | 选中面（凸变种 indicator，与 page 同色）           | `#fff`                                                                  | `#242628`                                                                             |
| `--wui-color-text`                    | 主要文本                                           | `#1b1b1b`                                                               | `#e9eaea`                                                                             |
| `--wui-color-text-secondary`          | 次要文本                                           | `#6a6a6a`                                                               | `#a1a1a6`                                                                             |
| `--wui-color-text-tertiary`           | 三级文本和弱意图 icon                              | `color-mix(in srgb, var(--wui-color-text) 35%, transparent)`            | `color-mix(in srgb, var(--wui-color-text) 42%, transparent)`                          |
| `--wui-color-text-disabled`           | 禁用态前景文本                                     | `color-mix(in srgb, var(--wui-color-text) 32%, transparent)`            | `color-mix(in srgb, var(--wui-color-text) 38%, transparent)`                          |
| `--wui-color-state-layer-hover`       | 透明悬停层                                         | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`             | `color-mix(in srgb, var(--wui-color-text) 6%, transparent)`                           |
| `--wui-color-state-layer-active`      | 透明按下层                                         | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)`            | `color-mix(in srgb, var(--wui-color-text) 15%, transparent)`                          |
| `--wui-color-border`                  | 常规边框和 divider                                 | `rgb(0 0 0 / 0.1)`                                                      | `rgb(255 255 255 / 0.14)`                                                             |
| `--wui-color-glass-highlight`         | 表面 inset 高光                                    | `rgb(255 255 255 / 0.9)`                                                | `rgb(255 255 255 / 0.1)`                                                              |
| `--wui-color-glass-ring`              | 1px 描边环底色                                     | `rgb(0 0 0 / 0.05)`                                                     | `rgb(255 255 255 / 0.05)`                                                             |
| `--wui-color-glass-ring-sheen`        | 描边环角落受光光泽                                 | `rgb(255 255 255 / 0.5)`                                                | `rgb(255 255 255 / 0.2)`                                                              |
| `--wui-color-glass-ring-shade`        | 描边环角落背光压暗                                 | `rgb(0 0 0 / 0.03)`                                                     | `rgb(0 0 0 / 0.5)`                                                                    |
| `--wui-color-accent`                  | Accent 和输入焦点边框                              | `#0071e3`                                                               | `#0a84ff`                                                                             |
| `--wui-color-on-accent`               | Accent 上的前景色                                  | `#fff`                                                                  | `#000`                                                                                |
| `--wui-color-on-danger`               | `danger` 背景上的前景色                            | `#fff`                                                                  | `#000`                                                                                |
| `--wui-color-on-control`              | 控件内芯前景色                                     | `#fff`                                                                  | `#f2f2f7`                                                                             |
| `--wui-color-success`                 | 成功                                               | `#16a34a`                                                               | `#30d158`                                                                             |
| `--wui-color-warning`                 | 警告                                               | `#d97706`                                                               | `#ff9f0a`                                                                             |
| `--wui-color-danger`                  | 危险                                               | `#dc2626`                                                               | `#ff453a`                                                                             |
| `--wui-color-info`                    | 信息                                               | `#2563eb`                                                               | `#64d2ff`                                                                             |
| `--wui-color-backdrop`                | Modal backdrop                                     | `rgb(0 0 0 / 0.12)`                                                     | `rgb(0 0 0 / 0.48)`                                                                   |
| `--wui-color-focus-ring`              | Focus indicator 颜色，由 accent 派生               | `color-mix(in srgb, var(--wui-color-accent, #0071e3) 40%, transparent)` | `color-mix(in srgb, var(--wui-color-accent, #0a84ff) 62%, var(--wui-color-text) 38%)` |
| `--wui-scrollbar-handle`              | 原生 scrollbar 的 thumb 颜色                       | `rgb(0 0 0 / 0.39)`                                                     | `rgb(255 255 255 / 0.5)`                                                              |

### Shadow tokens

| 名称                   | 说明                | 浅色默认值                       | 深色默认值                      |
| ---------------------- | ------------------- | -------------------------------- | ------------------------------- |
| `--wui-shadow-overlay` | Modal/Drawer 阴影   | `2px 16px 40px rgb(0 0 0 / 0.4)` | `0 18px 48px rgb(0 0 0 / 0.48)` |
| `--wui-shadow-panel`   | 小型浮动 panel 阴影 | `0 3px 9px rgb(0 0 0 / 0.27)`    | `0 4px 16px rgb(0 0 0 / 0.32)`  |
| `--wui-shadow-glass`   | 液态玻璃基础阴影    | 四层扩散阴影                     | `0 8px 24px rgb(0 0 0 / 0.08)`  |

### 玻璃效果 token

`--wui-glass-brightness` 浅色模式为 `1.06`，深色模式为 `1.02`。

`--wui-glass-corner-radius` 默认值为 `32px`。非 pill 玻璃表面会用自身的语义圆角覆盖它（`--wui-radius-menu` / `--wui-radius-overlay`，drawer 为 `--wui-drawer-radius`），这样对角描边的光影会跟随 token 覆盖一起变化。

pill 控件是例外：光影渐变需要物理尺寸，所以继续使用由控件实际尺寸推导出的有限圆角值。

### `--wui-internal-*`

以 `--wui-internal-*` 为前缀的变量是不属于公共 token API，调用方不应覆盖。
