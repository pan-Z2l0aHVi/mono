<script setup lang="ts">
import type { DrawerPlacement } from '@greypan/web-ui'
import { ref } from 'vue'

const drawerRef = ref()

const visible = ref(false)
const placement = ref<DrawerPlacement>('right')
const allPlacements: { label: string; value: DrawerPlacement }[] = [
  { label: '右侧', value: 'right' },
  { label: '左侧', value: 'left' },
  { label: '上方', value: 'top' },
  { label: '下方', value: 'bottom' }
]

const openDrawer = (p: DrawerPlacement) => {
  placement.value = p
  visible.value = true
}

const customVisible = ref(false)
const customPlacement = ref<DrawerPlacement>('right')
const isHorizontal = ref(false)

const openCustom = (p: DrawerPlacement) => {
  customPlacement.value = p
  isHorizontal.value = p === 'top' || p === 'bottom'
  customVisible.value = true
}

const cssVarsVisible = ref(false)

const noHeaderVisible = ref(false)
const headerSlotVisible = ref(false)

const closableState = ref(true)
const closableVisible = ref(false)
const footerVisible = ref(false)
const unlockedVisible = ref(false)
const overlayVisible = ref(false)
const headlessVisible = ref(false)
const requestOnlyVisible = ref(false)
</script>

<template>
  <div>
    <h1>抽屉</h1>

    <h2>命令式</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="drawerRef?.show()">打开</web-ui-button>
    </div>
    <web-ui-drawer ref="drawerRef" heading="命令式抽屉">
      <p>使用 <code>show()</code> / <code>close()</code> 命令式控制。</p>
    </web-ui-drawer>

    <h2>声明式</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button v-for="item in allPlacements" :key="item.value" @click="openDrawer(item.value)">
        {{ item.label }}
      </web-ui-button>
    </div>
    <web-ui-drawer
      :open="visible"
      :placement="placement"
      :heading="placement + ' 抽屉'"
      @open-change="visible = $event.detail.open"
    >
      <p>使用 <code>placement</code> 控制方向。</p>
    </web-ui-drawer>

    <h2>自定义宽高</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button @click="openCustom('right')">400px 宽</web-ui-button>
      <web-ui-button @click="openCustom('left')">260px 宽</web-ui-button>
      <web-ui-button @click="openCustom('top')">400px 高</web-ui-button>
      <web-ui-button @click="openCustom('bottom')">160px 高</web-ui-button>
    </div>
    <web-ui-drawer
      :open="customVisible"
      :placement="customPlacement"
      :style="{
        '--wui-drawer-width': isHorizontal ? undefined : customPlacement === 'right' ? '400px' : '260px',
        '--wui-drawer-height': isHorizontal ? (customPlacement === 'top' ? '400px' : '160px') : undefined
      }"
      @open-change="customVisible = $event.detail.open"
    >
      <span slot="header">自定义尺寸</span>
      <p>
        方向：<strong>{{ customPlacement }}</strong
        >，{{ isHorizontal ? '高度' : '宽度' }}：<code>{{
          customPlacement === 'right'
            ? '400px'
            : customPlacement === 'left'
              ? '260px'
              : customPlacement === 'top'
                ? '400px'
                : '160px'
        }}</code>
      </p>
    </web-ui-drawer>

    <h2>无 Header</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="noHeaderVisible = true">打开</web-ui-button>
    </div>
    <web-ui-drawer :open="noHeaderVisible" @open-change="noHeaderVisible = $event.detail.open">
      <p>不传 <code>heading</code> 且无 <code>header slot</code> 时自动隐藏 header。</p>
    </web-ui-drawer>

    <h2>滚动锁定</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="unlockedVisible = true">打开不锁定滚动的抽屉</web-ui-button>
    </div>
    <web-ui-drawer :open="unlockedVisible" no-scroll-lock @open-change="unlockedVisible = $event.detail.open">
      <p>关闭 <code>no-scroll-lock</code> 后，背景页面仍可滚动。</p>
      <web-ui-button slot="footer" variant="secondary" full @click="unlockedVisible = false">关闭</web-ui-button>
    </web-ui-drawer>

    <h2>不可点击遮罩关闭</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="overlayVisible = true">打开</web-ui-button>
    </div>
    <web-ui-drawer
      :open="overlayVisible"
      heading="不可点击遮罩关闭"
      no-backdrop-close
      @open-change="overlayVisible = $event.detail.open"
    >
      <p>点击遮罩不会关闭抽屉，必须通过按钮操作。</p>
      <web-ui-button slot="footer" variant="secondary" full @click="overlayVisible = false">关闭</web-ui-button>
    </web-ui-drawer>

    <h2>Header Slot</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="headerSlotVisible = true">打开</web-ui-button>
    </div>
    <web-ui-drawer :open="headerSlotVisible" @open-change="headerSlotVisible = $event.detail.open">
      <div slot="header" style="display: flex; gap: 8px; align-items: center; padding: 12px 20px">
        <span style="font-size: 18px; font-weight: 600">自定义</span>
        <span style="font-size: 12px; color: #999">副标题</span>
      </div>
      <p>通过 <code>header slot</code> 自定义头部内容。</p>
    </web-ui-drawer>

    <h2>关闭按钮</h2>
    <div class="mb-3 flex flex-wrap gap-2 items-center">
      <web-ui-button @click="closableVisible = true">打开</web-ui-button>
      <label class="flex items-center gap-1 text-sm cursor-pointer select-none">
        <web-ui-checkbox :checked="closableState" @change="closableState = $event.target.checked" />
        显示关闭按钮
      </label>
    </div>
    <web-ui-drawer
      :open="closableVisible"
      heading="关闭按钮"
      :closable="closableState"
      @open-change="closableVisible = $event.detail.open"
    >
      <p><code>closable</code> 控制关闭按钮，独立于 header 定位。</p>
    </web-ui-drawer>

    <h2>Footer Slot</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="footerVisible = true">打开</web-ui-button>
    </div>
    <web-ui-drawer :open="footerVisible" heading="带 Footer" closable @open-change="footerVisible = $event.detail.open">
      <p>底部区域通过 <code>footer</code> slot 插入，固定在抽屉底部。</p>
      <web-ui-button slot="footer" full variant="secondary" @click="footerVisible = false">关闭</web-ui-button>
    </web-ui-drawer>

    <h2>Custom CSS Vars</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="cssVarsVisible = true">打开暗色抽屉</web-ui-button>
    </div>
    <web-ui-drawer
      :open="cssVarsVisible"
      heading="暗色抽屉"
      :style="{
        '--wui-drawer-overlay-bg': 'rgba(0, 0, 0, 0.45)',
        '--wui-drawer-bg': '#1c1c1e',
        '--wui-drawer-shadow': '0 4px 24px rgba(0, 0, 0, 0.5)',
        '--wui-drawer-width': '380px'
      }"
      @open-change="cssVarsVisible = $event.detail.open"
    >
      <p style="color: #ccc">自定义遮罩层、背景、阴影等样式。</p>
    </web-ui-drawer>

    <h2>受控关闭请求</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="requestOnlyVisible = true">打开</web-ui-button>
    </div>
    <web-ui-drawer :open="requestOnlyVisible" request-only @open-change="requestOnlyVisible = $event.detail.open">
      <p>
        <code>request-only</code> 时，Escape、遮罩和关闭按钮只派发 <code>open-change</code> 请求；Consumer 回写
        <code>open</code> 后才关闭。
      </p>
    </web-ui-drawer>

    <h2>Headless 模式</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="headlessVisible = true">打开</web-ui-button>
    </div>
    <web-ui-drawer
      :open="headlessVisible"
      placement="left"
      headless
      dialog-label="Headless 抽屉"
      @open-change="headlessVisible = $event.detail.open"
    >
      <div style="height: 100%; padding: 16px; border-radius: 0 16px 16px 0; background: white">
        <h3 style="margin: 0 0 12px">Headless 抽屉</h3>
        <p style="margin: 0; color: #666">
          使用 <code>headless</code> 属性后，抽屉只保留 overlay 基础设施（backdrop、动画、scroll lock）， 不渲染内置
          UI。Consumer 自定义内容样式。
        </p>
      </div>
    </web-ui-drawer>
  </div>
</template>

<style scoped>
h1 {
  margin: 0 0 16px;
  font-size: 24px;
  font-weight: 700;
}

h2 {
  margin: 24px 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #555;
}

code {
  padding: 1px 5px;
  border-radius: 4px;

  font-size: 13px;
  color: #d63384;

  background: rgb(0 0 0 / 0.06);
}
</style>
