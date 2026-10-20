<script setup lang="ts">
import type { DrawerPlacement } from '@greypan/web-ui'
import { ref } from 'vue'

const drawerRef = ref()

const visible = ref(false)
const placement = ref<DrawerPlacement>('right')
const allPlacements: { label: string; value: DrawerPlacement }[] = [
  { label: 'Right', value: 'right' },
  { label: 'Left', value: 'left' },
  { label: 'Top', value: 'top' },
  { label: 'Bottom', value: 'bottom' }
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
const controlledVisible = ref(false)
const draggableVisible = ref(false)
const draggableTopVisible = ref(false)
const draggableHeadlessVisible = ref(false)

// Nested drawer：声明式嵌套，无额外 API。后打开的是顶层，先打开的按 0.95^depth
// 缩放并向内侧平移露出阶梯式卡片边缘；露边量按 A·ln(n) 递减。
const nestedL1 = ref(false)
const nestedL2 = ref(false)
const nestedL3 = ref(false)
const nestedL4 = ref(false)

const diffWidthL1 = ref(false)
const diffWidthL2 = ref(false)
const diffWidthL3 = ref(false)

const randomWidthL1 = ref(false)
const randomWidthL2 = ref(false)
const randomWidthL3 = ref(false)
const randomWidthL4 = ref(false)

const siblingL1 = ref(false)
const siblingL2 = ref(false)
const siblingL3 = ref(false)
</script>

<template>
  <div>
    <h1>drawer</h1>

    <h2>Imperative</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="drawerRef?.show()">Open</web-ui-button>
    </div>
    <web-ui-drawer ref="drawerRef" heading="Imperative drawer">
      <p>Use<code>show()</code> / <code>close()</code>Imperative control.</p>
    </web-ui-drawer>

    <h2>Declarative</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button v-for="item in allPlacements" :key="item.value" @click="openDrawer(item.value)">
        {{ item.label }}
      </web-ui-button>
    </div>
    <web-ui-drawer
      :open="visible"
      :placement="placement"
      :heading="placement + ' drawer'"
      @open-change="visible = $event.detail.open"
    >
      <p>Use<code>placement</code>Controls the direction.</p>
    </web-ui-drawer>

    <h2>Custom size</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button @click="openCustom('right')">400px wide</web-ui-button>
      <web-ui-button @click="openCustom('left')">260px wide</web-ui-button>
      <web-ui-button @click="openCustom('top')">400px tall</web-ui-button>
      <web-ui-button @click="openCustom('bottom')">160px tall</web-ui-button>
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
      <span slot="header">Custom size</span>
      <p>
        方向：<strong>{{ customPlacement }}</strong
        >，{{ isHorizontal ? 'Height' : 'Width' }}：<code>{{
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

    <h2>No header</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="noHeaderVisible = true">Open</web-ui-button>
    </div>
    <web-ui-drawer :open="noHeaderVisible" @open-change="noHeaderVisible = $event.detail.open">
      <p>Not passed<code>heading</code>and no<code>header slot</code>hides the header automatically.</p>
    </web-ui-drawer>

    <h2>Scroll lock</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="unlockedVisible = true">Open a drawer without scroll lock</web-ui-button>
    </div>
    <web-ui-drawer :open="unlockedVisible" no-scroll-lock @open-change="unlockedVisible = $event.detail.open">
      <p>Close<code>no-scroll-lock</code>leaves the background page scrollable.</p>
      <web-ui-button slot="footer" variant="secondary" full @click="unlockedVisible = false">Close</web-ui-button>
    </web-ui-drawer>

    <h2>Backdrop click does not close</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="overlayVisible = true">Open</web-ui-button>
    </div>
    <web-ui-drawer
      :open="overlayVisible"
      heading="Backdrop click does not close"
      no-backdrop-close
      @open-change="overlayVisible = $event.detail.open"
    >
      <p>Clicking the backdrop does not close the drawer; use the button instead.</p>
      <web-ui-button slot="footer" variant="secondary" full @click="overlayVisible = false">Close</web-ui-button>
    </web-ui-drawer>

    <h2>Header Slot</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="headerSlotVisible = true">Open</web-ui-button>
    </div>
    <web-ui-drawer :open="headerSlotVisible" @open-change="headerSlotVisible = $event.detail.open">
      <div slot="header" style="display: flex; gap: 8px; align-items: center; padding: 12px 20px">
        <span style="font-size: 18px; font-weight: 600">Custom</span>
        <span style="font-size: 12px; color: #999">Subtitle</span>
      </div>
      <p>Through<code>header slot</code>Custom header content.</p>
    </web-ui-drawer>

    <h2>Close button</h2>
    <div class="mb-3 flex flex-wrap gap-2 items-center">
      <web-ui-button @click="closableVisible = true">Open</web-ui-button>
      <label class="flex items-center gap-1 text-sm cursor-pointer select-none">
        <web-ui-checkbox :checked="closableState" @change="closableState = $event.target.checked" />
        显示关闭 button
      </label>
    </div>
    <web-ui-drawer
      :open="closableVisible"
      heading="Close button"
      :closable="closableState"
      @open-change="closableVisible = $event.detail.open"
    >
      <p><code>closable</code>Controls the close button, positioned apart from the header.</p>
    </web-ui-drawer>

    <h2>Footer Slot</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="footerVisible = true">Open</web-ui-button>
    </div>
    <web-ui-drawer
      :open="footerVisible"
      heading="With footer"
      closable
      @open-change="footerVisible = $event.detail.open"
    >
      <p>The footer area goes through<code>footer</code>the slot and stays pinned to the drawer bottom.</p>
      <web-ui-button slot="footer" full variant="secondary" @click="footerVisible = false">Close</web-ui-button>
    </web-ui-drawer>

    <h2>Custom CSS Vars</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="cssVarsVisible = true">Open a square white drawer</web-ui-button>
    </div>
    <web-ui-drawer
      :open="cssVarsVisible"
      heading="Square white drawer"
      :style="{
        '--wui-drawer-bg': '#fff',
        '--wui-drawer-radius': '0',
        '--wui-drawer-inset': '0'
      }"
      @open-change="cssVarsVisible = $event.detail.open"
    >
      <p>
        Customize the background and geometry with CSS variables: white background, square edges flush with the frame.
      </p>
    </web-ui-drawer>

    <h2>Controlled close request</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="controlledVisible = true">Open</web-ui-button>
    </div>
    <web-ui-drawer :open="controlledVisible" controlled @open-change="controlledVisible = $event.detail.open">
      <p>
        <code>controlled</code>Escape, the backdrop and the close button only dispatch<code>open-change</code>
        请求；Consumer 回写 <code>open</code> 后才关闭。
      </p>
    </web-ui-drawer>

    <h2>Headless mode</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="headlessVisible = true">Open</web-ui-button>
    </div>
    <web-ui-drawer
      :open="headlessVisible"
      placement="left"
      headless
      dialog-label="Headless drawer"
      @open-change="headlessVisible = $event.detail.open"
    >
      <div style="height: 100%; padding: 16px; border-radius: 0 16px 16px 0; background: white">
        <h3 style="margin: 0 0 12px">Headless drawer</h3>
        <p style="margin: 0; color: #666">
          Use<code>headless</code> 属性后，drawer 只保留 overlay 基础设施（backdrop、动画、scroll lock）， 不渲染内置
          UI。Consumer 自定义内容样式。
        </p>
      </div>
    </web-ui-drawer>

    <h2>Drag to close (draggable)</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button @click="draggableVisible = true">Right</web-ui-button>
      <web-ui-button @click="draggableTopVisible = true">Top</web-ui-button>
      <web-ui-button @click="draggableHeadlessVisible = true">Headless on the left</web-ui-button>
    </div>
    <p class="mb-3 text-sm text-(--wui-color-text-secondary)">
      <code>draggable</code> 时 drawer 内缘显示灰色胶囊 drag bar：拖拽实时跟手，拖出约 1/3
      或快速甩动松手即关闭，否则弹回。
    </p>
    <web-ui-drawer
      :open="draggableVisible"
      heading="Drag to close"
      closable
      draggable
      @open-change="draggableVisible = $event.detail.open"
    >
      <p>
        Grab the capsule on the left edge and drag it right to close; releasing before a third of the width snaps back.
      </p>
    </web-ui-drawer>
    <web-ui-drawer
      :open="draggableTopVisible"
      placement="top"
      heading="Drag from the top to close"
      draggable
      @open-change="draggableTopVisible = $event.detail.open"
    >
      <p>Grab the capsule on the bottom edge and drag it up to close.</p>
    </web-ui-drawer>
    <web-ui-drawer
      :open="draggableHeadlessVisible"
      placement="left"
      headless
      draggable
      dialog-label="Headless drag drawer"
      @open-change="draggableHeadlessVisible = $event.detail.open"
    >
      <div style="height: 100%; padding: 16px; border-radius: 0 16px 16px 0; background: white">
        <h3 style="margin: 0 0 12px">Headless drag drawer</h3>
        <p style="margin: 0; color: #666">
          The headless mode supports the drag bar too: grab the capsule on the right edge and drag it left to close.
        </p>
      </div>
    </web-ui-drawer>

    <h2>Nested stacked drawers</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button @click="nestedL1 = true">Equal-width nesting (320px)</web-ui-button>
      <web-ui-button @click="diffWidthL1 = true">Cascading narrowing (500px → 360px → 260px)</web-ui-button>
      <web-ui-button @click="randomWidthL1 = true"
        >Mixed widths out of order (300px → 520px → 240px → 400px)</web-ui-button
      >
    </div>
    <p class="mb-3 text-sm text-(--wui-color-text-secondary)">
      同组件声明式嵌套即 nested：后打开的位于顶层全尺寸，下层按 0.95<sup>n</sup>
      缩放并向内侧平移，露出阶梯式卡片边缘。露边宽度按对数曲线分配：总堆叠宽度
      <code>A·ln(n)</code
      >，单层不动，每多一层只多露一点，层数增加时不再线性膨胀。多层宽度不同或乱序交错时，自动计算上方最大宽度进行补偿，确保所有底层的左缘均不会被上方更宽的
      drawer 遮挡；Escape 与 backdrop 点击只作用于最顶层，逐层退出。
    </p>
    <web-ui-drawer
      :open="nestedL1"
      heading="Level 1 (320px)"
      closable
      draggable
      @open-change="
        event => {
          if (event.target === event.currentTarget) nestedL1 = event.detail.open
        }
      "
    >
      <p>The first drawer. Opening a child shrinks this one and shifts it left to reveal the edge of the card.</p>
      <web-ui-button slot="footer" variant="secondary" full @click="nestedL2 = true"
        >Open the second level</web-ui-button
      >
      <web-ui-drawer
        :open="nestedL2"
        heading="Level 2 (320px)"
        closable
        draggable
        @open-change="
          event => {
            if (event.target === event.currentTarget) nestedL2 = event.detail.open
          }
        "
      >
        <p>The second drawer. Stack a third to watch the continuous shrinking.</p>
        <web-ui-button slot="footer" variant="secondary" full @click="nestedL3 = true"
          >Open the third level</web-ui-button
        >
        <web-ui-drawer
          :open="nestedL3"
          heading="Level 3 (320px)"
          closable
          draggable
          @open-change="
            event => {
              if (event.target === event.currentTarget) nestedL3 = event.detail.open
            }
          "
        >
          <p>The third drawer.</p>
          <web-ui-button slot="footer" variant="secondary" full @click="nestedL4 = true"
            >Open the fourth level</web-ui-button
          >
          <web-ui-drawer
            :open="nestedL4"
            heading="Level 4 (top level, 320px)"
            closable
            draggable
            @open-change="
              event => {
                if (event.target === event.currentTarget) nestedL4 = event.detail.open
              }
            "
          >
            <p>The top drawer. Escape or drag-to-close unwinds the stack layer by layer.</p>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>
    </web-ui-drawer>

    <web-ui-drawer
      :open="diffWidthL1"
      heading="Main info panel (500px)"
      :style="{ '--wui-drawer-width': '500px' }"
      closable
      draggable
      @open-change="
        event => {
          if (event.target === event.currentTarget) diffWidthL1 = event.detail.open
        }
      "
    >
      <p>
        A wide panel (500px). When a child (360px) opens, this layer still shrinks smoothly and the card is revealed on
        the left.
      </p>
      <web-ui-button slot="footer" variant="secondary" full @click="diffWidthL2 = true">
        打开详情 panel (360px)
      </web-ui-button>
      <web-ui-drawer
        :open="diffWidthL2"
        heading="Details panel (360px)"
        :style="{ '--wui-drawer-width': '360px' }"
        closable
        draggable
        @open-change="
          event => {
            if (event.target === event.currentTarget) diffWidthL2 = event.detail.open
          }
        "
      >
        <p>A medium panel (360px). Open a child (260px) to narrow the stack further.</p>
        <web-ui-button slot="footer" variant="secondary" full @click="diffWidthL3 = true">
          打开确认操作 panel (260px)
        </web-ui-button>
        <web-ui-drawer
          :open="diffWidthL3"
          heading="Confirm panel (260px)"
          :style="{ '--wui-drawer-width': '260px' }"
          closable
          draggable
          @open-change="
            event => {
              if (event.target === event.currentTarget) diffWidthL3 = event.detail.open
            }
          "
        >
          <p>The narrow top panel (260px). The wider panels below stack in steps on the left.</p>
        </web-ui-drawer>
      </web-ui-drawer>
    </web-ui-drawer>

    <web-ui-drawer
      :open="randomWidthL1"
      heading="Side base panel (300px)"
      :style="{ '--wui-drawer-width': '300px' }"
      closable
      draggable
      @open-change="
        event => {
          if (event.target === event.currentTarget) randomWidthL1 = event.detail.open
        }
      "
    >
      <p>
        Level 1 (narrow, 300px). When a wider drawer (520px) opens, this layer shifts left to compensate and its edge
        stays clearly visible.
      </p>
      <web-ui-button slot="footer" variant="secondary" full @click="randomWidthL2 = true">
        打开大预览 panel (520px)
      </web-ui-button>
      <web-ui-drawer
        :open="randomWidthL2"
        heading="Large preview panel (520px)"
        :style="{ '--wui-drawer-width': '520px' }"
        closable
        draggable
        @open-change="
          event => {
            if (event.target === event.currentTarget) randomWidthL2 = event.detail.open
          }
        "
      >
        <p>Level 2 (very wide, 520px). It spreads a large card and can host a narrower toolbar drawer (240px).</p>
        <web-ui-button slot="footer" variant="secondary" full @click="randomWidthL3 = true">
          打开工具配置 (240px)
        </web-ui-button>
        <web-ui-drawer
          :open="randomWidthL3"
          heading="Tool settings (240px)"
          :style="{ '--wui-drawer-width': '240px' }"
          closable
          draggable
          @open-change="
            event => {
              if (event.target === event.currentTarget) randomWidthL3 = event.detail.open
            }
          "
        >
          <p>Level 3 (very narrow, 240px). Above the 520px card, it opens the top confirm form (400px).</p>
          <web-ui-button slot="footer" variant="secondary" full @click="randomWidthL4 = true">
            打开确认表单 (400px)
          </web-ui-button>
          <web-ui-drawer
            :open="randomWidthL4"
            heading="Confirm form (400px, top level)"
            :style="{ '--wui-drawer-width': '400px' }"
            closable
            draggable
            @open-change="
              event => {
                if (event.target === event.currentTarget) randomWidthL4 = event.detail.open
              }
            "
          >
            <p>Level 4 (top, 400px). Every card below — wider or narrower — lines up on the left in order.</p>
          </web-ui-drawer>
        </web-ui-drawer>
      </web-ui-drawer>
    </web-ui-drawer>

    <h2>Automatic stacking of siblings</h2>
    <p class="mb-3 text-sm text-gray-500">
      多个 drawer 在同级 DOM 挂载，依次打开后由内部 <code>defineNestedDrawerLayers</code> 自动管理层序——先开的按
      0.95^depth 缩放并向内侧偏移（偏移量按 <code>A·ln(n)</code> 对数分配），后开的全尺寸在顶层。
    </p>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="siblingL1 = true">Open drawer 1</web-ui-button>
      <web-ui-button @click="siblingL2 = true">Open drawer 2</web-ui-button>
      <web-ui-button @click="siblingL3 = true">Open drawer 3</web-ui-button>
    </div>
    <web-ui-drawer
      :open="siblingL1"
      heading="Sibling drawer 1"
      closable
      draggable
      @open-change="
        event => {
          if (event.target === event.currentTarget) siblingL1 = event.detail.open
        }
      "
    >
      <p>Level 1. Open drawers 2 and 3 in turn: this layer shrinks and shifts to reveal the card edges.</p>
    </web-ui-drawer>
    <web-ui-drawer
      :open="siblingL2"
      heading="Sibling drawer 2"
      closable
      draggable
      @open-change="
        event => {
          if (event.target === event.currentTarget) siblingL2 = event.detail.open
        }
      "
    >
      <p>Level 2. Above drawer 1 and below drawer 3.</p>
    </web-ui-drawer>
    <web-ui-drawer
      :open="siblingL3"
      heading="Sibling drawer 3"
      closable
      draggable
      @open-change="
        event => {
          if (event.target === event.currentTarget) siblingL3 = event.detail.open
        }
      "
    >
      <p>The top layer. Closing it unwinds the layers below back to full size.</p>
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
