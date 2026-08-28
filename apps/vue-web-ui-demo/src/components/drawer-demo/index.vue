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
const draggableVisible = ref(false)
const draggableTopVisible = ref(false)
const draggableHeadlessVisible = ref(false)

// Nested 抽屉：声明式嵌套，无额外 API。后打开的是顶层，先打开的按 0.95^depth
// 缩放并向内侧平移露出阶梯式卡片边缘。
const nestedL1 = ref(false)
const nestedL2 = ref(false)
const nestedL3 = ref(false)
const nestedL4 = ref(false)

// 多宽度嵌套（500px → 360px → 260px）
const diffWidthL1 = ref(false)
const diffWidthL2 = ref(false)
const diffWidthL3 = ref(false)

// 乱序宽度嵌套（窄 300px → 宽 520px → 极窄 240px → 中宽 400px）
const randomWidthL1 = ref(false)
const randomWidthL2 = ref(false)
const randomWidthL3 = ref(false)
const randomWidthL4 = ref(false)
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
      <web-ui-button @click="cssVarsVisible = true">打开直角白底抽屉</web-ui-button>
    </div>
    <web-ui-drawer
      :open="cssVarsVisible"
      heading="直角白底抽屉"
      :style="{
        '--wui-drawer-bg': '#fff',
        '--wui-drawer-radius': '0',
        '--wui-drawer-inset': '0'
      }"
      @open-change="cssVarsVisible = $event.detail.open"
    >
      <p>通过 CSS 变量自定义背景与几何：白色背景、直角贴边（四周无间隙）。</p>
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

    <h2>拖拽关闭（draggable）</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button @click="draggableVisible = true">右侧</web-ui-button>
      <web-ui-button @click="draggableTopVisible = true">上方</web-ui-button>
      <web-ui-button @click="draggableHeadlessVisible = true">Headless 左侧</web-ui-button>
    </div>
    <p class="mb-3 text-sm text-[var(--wui-color-text-secondary)]">
      <code>draggable</code> 时抽屉内缘显示灰色胶囊 drag bar：拖拽实时跟手，拖出约 1/3 或快速甩动松手即关闭，否则弹回。
    </p>
    <web-ui-drawer
      :open="draggableVisible"
      heading="拖拽关闭"
      closable
      draggable
      @open-change="draggableVisible = $event.detail.open"
    >
      <p>抓住左缘的胶囊向右拖出即可关闭；未超过 1/3 宽度松手会弹回。</p>
    </web-ui-drawer>
    <web-ui-drawer
      :open="draggableTopVisible"
      placement="top"
      heading="上方拖拽关闭"
      draggable
      @open-change="draggableTopVisible = $event.detail.open"
    >
      <p>抓住下缘的胶囊向上拖出即可关闭。</p>
    </web-ui-drawer>
    <web-ui-drawer
      :open="draggableHeadlessVisible"
      placement="left"
      headless
      draggable
      dialog-label="Headless 拖拽抽屉"
      @open-change="draggableHeadlessVisible = $event.detail.open"
    >
      <div style="height: 100%; padding: 16px; border-radius: 0 16px 16px 0; background: white">
        <h3 style="margin: 0 0 12px">Headless 拖拽抽屉</h3>
        <p style="margin: 0; color: #666">headless 模式同样支持 drag bar，抓住右缘胶囊向左拖出关闭。</p>
      </div>
    </web-ui-drawer>

    <h2>Nested 层叠抽屉</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button @click="nestedL1 = true">等宽嵌套 (320px)</web-ui-button>
      <web-ui-button variant="secondary" @click="diffWidthL1 = true"> 级联收窄 (500px → 360px → 260px) </web-ui-button>
      <web-ui-button variant="secondary" @click="randomWidthL1 = true">
        乱序宽度交错 (300px → 520px → 240px → 400px)
      </web-ui-button>
    </div>
    <p class="mb-3 text-sm text-[var(--wui-color-text-secondary)]">
      同组件声明式嵌套即 nested：后打开的位于顶层全尺寸，下层按 0.95<sup>n</sup>
      缩放并向内侧平移露出阶梯式卡片边缘；多层宽度不同或乱序交错时，自动计算上方最大宽度进行补偿，确保所有底层的左缘均不会被上方更宽的抽屉遮挡；Escape
      与遮罩点击只作用于最顶层，逐层退出。
    </p>
    <web-ui-drawer
      :open="nestedL1"
      heading="第一层 (320px)"
      closable
      draggable
      @open-change="
        event => {
          if (event.target === event.currentTarget) nestedL1 = event.detail.open
        }
      "
    >
      <p>第一层抽屉。子层打开后本层缩小并向左偏移露出边缘卡片。</p>
      <web-ui-button slot="footer" variant="secondary" full @click="nestedL2 = true">打开第二层</web-ui-button>
      <web-ui-drawer
        :open="nestedL2"
        heading="第二层 (320px)"
        closable
        draggable
        @open-change="
          event => {
            if (event.target === event.currentTarget) nestedL2 = event.detail.open
          }
        "
      >
        <p>第二层抽屉。继续叠第三层观察连续缩放。</p>
        <web-ui-button slot="footer" variant="secondary" full @click="nestedL3 = true">打开第三层</web-ui-button>
        <web-ui-drawer
          :open="nestedL3"
          heading="第三层 (320px)"
          closable
          draggable
          @open-change="
            event => {
              if (event.target === event.currentTarget) nestedL3 = event.detail.open
            }
          "
        >
          <p>第三层抽屉。</p>
          <web-ui-button slot="footer" variant="secondary" full @click="nestedL4 = true">打开第四层</web-ui-button>
          <web-ui-drawer
            :open="nestedL4"
            heading="第四层（顶层 320px）"
            closable
            draggable
            @open-change="
              event => {
                if (event.target === event.currentTarget) nestedL4 = event.detail.open
              }
            "
          >
            <p>最顶层抽屉。Escape 或拖拽关闭后逐层回弹。</p>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>
    </web-ui-drawer>

    <!-- 多宽度 Nested Drawer -->
    <web-ui-drawer
      :open="diffWidthL1"
      heading="主信息面板 (500px)"
      :style="{ '--wui-drawer-width': '500px' }"
      closable
      draggable
      @open-change="
        event => {
          if (event.target === event.currentTarget) diffWidthL1 = event.detail.open
        }
      "
    >
      <p>宽面板（500px）。子层（360px）打开后，本层依然平滑缩放，卡片在左侧优雅露出。</p>
      <web-ui-button slot="footer" variant="secondary" full @click="diffWidthL2 = true">
        打开详情面板 (360px)
      </web-ui-button>
      <web-ui-drawer
        :open="diffWidthL2"
        heading="详情面板 (360px)"
        :style="{ '--wui-drawer-width': '360px' }"
        closable
        draggable
        @open-change="
          event => {
            if (event.target === event.currentTarget) diffWidthL2 = event.detail.open
          }
        "
      >
        <p>中等面板（360px）。可再打开子层（260px），层层收窄堆叠。</p>
        <web-ui-button slot="footer" variant="secondary" full @click="diffWidthL3 = true">
          打开确认操作面板 (260px)
        </web-ui-button>
        <web-ui-drawer
          :open="diffWidthL3"
          heading="确认面板 (260px)"
          :style="{ '--wui-drawer-width': '260px' }"
          closable
          draggable
          @open-change="
            event => {
              if (event.target === event.currentTarget) diffWidthL3 = event.detail.open
            }
          "
        >
          <p>最顶层窄面板（260px）。下层多级宽面板依次在左侧形成阶梯堆叠。</p>
        </web-ui-drawer>
      </web-ui-drawer>
    </web-ui-drawer>

    <!-- 乱序宽度 Nested Drawer (300px → 520px → 240px → 400px) -->
    <web-ui-drawer
      :open="randomWidthL1"
      heading="侧边基础面板 (300px)"
      :style="{ '--wui-drawer-width': '300px' }"
      closable
      draggable
      @open-change="
        event => {
          if (event.target === event.currentTarget) randomWidthL1 = event.detail.open
        }
      "
    >
      <p>第 1 层（窄 300px）。子层打开更宽抽屉（520px）时，本层会自动补偿向左平移，左缘依然清晰外露。</p>
      <web-ui-button slot="footer" variant="secondary" full @click="randomWidthL2 = true">
        打开大预览面板 (520px)
      </web-ui-button>
      <web-ui-drawer
        :open="randomWidthL2"
        heading="大预览面板 (520px)"
        :style="{ '--wui-drawer-width': '520px' }"
        closable
        draggable
        @open-change="
          event => {
            if (event.target === event.currentTarget) randomWidthL2 = event.detail.open
          }
        "
      >
        <p>第 2 层（超宽 520px）。铺展大卡片，可在其上打开更窄的工具栏抽屉（240px）。</p>
        <web-ui-button slot="footer" variant="secondary" full @click="randomWidthL3 = true">
          打开工具配置 (240px)
        </web-ui-button>
        <web-ui-drawer
          :open="randomWidthL3"
          heading="工具配置 (240px)"
          :style="{ '--wui-drawer-width': '240px' }"
          closable
          draggable
          @open-change="
            event => {
              if (event.target === event.currentTarget) randomWidthL3 = event.detail.open
            }
          "
        >
          <p>第 3 层（极窄 240px）。在 520px 宽卡片上方，再在其上打开顶层确认表单（400px）。</p>
          <web-ui-button slot="footer" variant="secondary" full @click="randomWidthL4 = true">
            打开确认表单 (400px)
          </web-ui-button>
          <web-ui-drawer
            :open="randomWidthL4"
            heading="确认表单 (400px 顶层)"
            :style="{ '--wui-drawer-width': '400px' }"
            closable
            draggable
            @open-change="
              event => {
                if (event.target === event.currentTarget) randomWidthL4 = event.detail.open
              }
            "
          >
            <p>第 4 层（顶层 400px）。所有下层卡片（无论宽于或窄于本层）均在左侧按层次有序排列。</p>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>
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
