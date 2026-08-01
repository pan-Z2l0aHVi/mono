<script setup lang="ts">
import {
  lucideImage,
  lucideUser,
  lucideSettings,
  lucideGlobe,
  lucideBell,
  lucideMail,
  lucideSearch,
  lucideStar
} from '@greypan/web-ui/icons'
import { ref, watch } from 'vue'

const selected = ref('')
const framework = ref('vue')

function handleChange(event: Event) {
  selected.value = (event.currentTarget as HTMLElement & { value: string }).value
}

// 图标 trigger 演示：trigger 图标跟随选中项变化
const iconOptions = [
  { value: 'notifications', icon: lucideBell, label: '通知' },
  { value: 'messages', icon: lucideMail, label: '消息' },
  { value: 'search', icon: lucideSearch, label: '搜索' },
  { value: 'starred', icon: lucideStar, label: '收藏' }
]
const selectedIconValue = ref('notifications')
const currentIcon = ref(lucideBell)

watch(
  selectedIconValue,
  val => {
    const opt = iconOptions.find(o => o.value === val)
    if (opt) currentIcon.value = opt.icon
  },
  { immediate: true }
)
</script>

<template>
  <div>
    <h1>下拉选择</h1>
    <h2>基础</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select placeholder="请选择">
        <web-ui-option value="vue" label="Vue"></web-ui-option>
        <web-ui-option value="react" label="React"></web-ui-option>
        <web-ui-option value="svelte" label="Svelte"></web-ui-option>
      </web-ui-select>
    </div>

    <h2>v-model 绑定</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select v-model="framework" placeholder="已选框架">
        <web-ui-option value="vue" label="Vue"></web-ui-option>
        <web-ui-option value="react" label="React"></web-ui-option>
        <web-ui-option value="svelte" label="Svelte"></web-ui-option>
      </web-ui-select>
      <div>选中值：{{ framework || '无' }}</div>
    </div>

    <h2>change 事件</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select placeholder="选择后触发 change" @change="handleChange">
        <web-ui-option value="a" label="Option A"></web-ui-option>
        <web-ui-option value="b" label="Option B"></web-ui-option>
        <web-ui-option value="c" label="Option C"></web-ui-option>
      </web-ui-select>
      <div>selected：{{ selected || '无' }}</div>
    </div>

    <h2>自定义 Trigger</h2>
    <p class="mb-2 text-sm text-[var(--wui-color-text-muted)]">
      通过 <code>slot="trigger"</code> 自定义触发区域内容，外壳和箭头保持默认。
    </p>
    <div class="mb-3 flex flex-wrap items-end gap-3">
      <web-ui-select>
        <web-ui-icon slot="trigger" :icon="lucideImage" :size="20"></web-ui-icon>
        <web-ui-option value="photo" label="Photo"></web-ui-option>
        <web-ui-option value="video" label="Video"></web-ui-option>
        <web-ui-option value="document" label="Document"></web-ui-option>
      </web-ui-select>

      <web-ui-select>
        <div slot="trigger" class="flex items-center gap-1.5">
          <web-ui-icon :icon="lucideUser" :size="18"></web-ui-icon>
          <span class="text-sm">用户</span>
        </div>
        <web-ui-option value="admin" label="管理员"></web-ui-option>
        <web-ui-option value="editor" label="编辑"></web-ui-option>
        <web-ui-option value="viewer" label="访客"></web-ui-option>
      </web-ui-select>

      <web-ui-select>
        <div slot="trigger" class="flex items-center gap-1.5">
          <web-ui-icon :icon="lucideGlobe" :size="18"></web-ui-icon>
          <span class="text-sm">语言</span>
        </div>
        <web-ui-option value="zh" label="中文"></web-ui-option>
        <web-ui-option value="en" label="English"></web-ui-option>
        <web-ui-option value="ja" label="日本語"></web-ui-option>
      </web-ui-select>

      <web-ui-select>
        <web-ui-icon slot="trigger" :icon="lucideSettings" :size="16"></web-ui-icon>
        <web-ui-option value="theme" label="主题设置"></web-ui-option>
        <web-ui-option value="lang" label="语言设置"></web-ui-option>
        <web-ui-option value="reset" label="重置"></web-ui-option>
      </web-ui-select>
    </div>

    <h3>响应式图标 Trigger</h3>
    <p class="mb-2 text-sm text-[var(--wui-color-text-muted)]">
      trigger 为纯图标，选中后 trigger 图标跟随选项的 prefix 图标同步更新。
    </p>
    <div class="mb-3 flex flex-wrap items-end gap-3">
      <web-ui-select v-model="selectedIconValue">
        <web-ui-icon slot="trigger" :icon="currentIcon" :size="20"></web-ui-icon>
        <web-ui-option v-for="opt in iconOptions" :key="opt.value" :value="opt.value" :label="opt.label">
          <web-ui-icon slot="prefix" :icon="opt.icon" :size="16"></web-ui-icon>
        </web-ui-option>
      </web-ui-select>
      <div class="text-sm text-[var(--wui-color-text-muted)]">选中值：{{ selectedIconValue }}</div>
    </div>

    <h2>Option 前后缀</h2>
    <p class="mb-2 text-sm text-[var(--wui-color-text-muted)]">
      通过 <code>slot="prefix"</code> / <code>slot="suffix"</code> 装饰选项，通过 <code>label</code> 属性设置选项文本。
      布局：check → prefix → label → suffix
    </p>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select placeholder="选择优先级">
        <web-ui-option value="high" label="高优先级">
          <span slot="prefix">🔴</span>
          <span slot="suffix" class="text-xs text-[var(--wui-color-text-muted)]">P0</span>
        </web-ui-option>
        <web-ui-option value="mid" label="中优先级">
          <span slot="prefix">🟡</span>
          <span slot="suffix" class="text-xs text-[var(--wui-color-text-muted)]">P1</span>
        </web-ui-option>
        <web-ui-option value="low" label="低优先级">
          <span slot="prefix">🟢</span>
          <span slot="suffix" class="text-xs text-[var(--wui-color-text-muted)]">P2</span>
        </web-ui-option>
      </web-ui-select>

      <web-ui-select placeholder="选择国家">
        <web-ui-option value="cn" label="中国">
          <span slot="prefix">🇨🇳</span>
          <span slot="suffix" class="text-xs text-[var(--wui-color-text-muted)]">+86</span>
        </web-ui-option>
        <web-ui-option value="us" label="美国">
          <span slot="prefix">🇺🇸</span>
          <span slot="suffix" class="text-xs text-[var(--wui-color-text-muted)]">+1</span>
        </web-ui-option>
        <web-ui-option value="jp" label="日本">
          <span slot="prefix">🇯🇵</span>
          <span slot="suffix" class="text-xs text-[var(--wui-color-text-muted)]">+81</span>
        </web-ui-option>
      </web-ui-select>

      <web-ui-select placeholder="纯 suffix">
        <web-ui-option value="vue" label="Vue">
          <span slot="suffix" class="text-xs text-[var(--wui-color-text-muted)]">v3.4</span>
        </web-ui-option>
        <web-ui-option value="react" label="React">
          <span slot="suffix" class="text-xs text-[var(--wui-color-text-muted)]">v19</span>
        </web-ui-option>
        <web-ui-option value="svelte" label="Svelte">
          <span slot="suffix" class="text-xs text-[var(--wui-color-text-muted)]">v5</span>
        </web-ui-option>
      </web-ui-select>
    </div>

    <h2>禁用选项</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select placeholder="部分禁用">
        <web-ui-option value="a" label="可用选项 A"></web-ui-option>
        <web-ui-option value="b" label="禁用选项 B" disabled></web-ui-option>
        <web-ui-option value="c" label="可用选项 C"></web-ui-option>
      </web-ui-select>
    </div>

    <h2>Portal</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select portal placeholder="Portal 选择">
        <web-ui-option value="a" label="Option A"></web-ui-option>
        <web-ui-option value="b" label="Option B"></web-ui-option>
      </web-ui-select>
    </div>

    <h2>滚动锁定</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select no-scroll-lock placeholder="打开时不锁定页面滚动">
        <web-ui-option value="a" label="Option A"></web-ui-option>
        <web-ui-option value="b" label="Option B"></web-ui-option>
      </web-ui-select>
    </div>

    <h2>禁用</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-select placeholder="禁用状态" disabled>
        <web-ui-option value="a" label="Option A"></web-ui-option>
      </web-ui-select>
    </div>
  </div>
</template>
