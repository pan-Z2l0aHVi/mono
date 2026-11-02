<template>
  <web-ui-button @click="openLevel(0)">打开四层嵌套</web-ui-button>

  <web-ui-drawer
    :open="levels[0]"
    :heading="`${titles[0]} (300px)`"
    closable
    :style="{ '--wui-drawer-width': widths[0] }"
    @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(0)"
  >
    <p>第 1 层。打开下一层后，这一层会缩放并向左让出边缘。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="openLevel(1)">打开第 2 层</web-ui-button>

    <web-ui-drawer
      :open="levels[1]"
      :heading="`${titles[1]} (280px)`"
      closable
      :style="{ '--wui-drawer-width': widths[1] }"
      @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(1)"
    >
      <p>第 2 层。层宽与上层不同，堆叠位置会自动补偿。</p>
      <web-ui-button slot="footer" variant="secondary" full @click="openLevel(2)">打开第 3 层</web-ui-button>

      <web-ui-drawer
        :open="levels[2]"
        :heading="`${titles[2]} (240px)`"
        closable
        :style="{ '--wui-drawer-width': widths[2] }"
        @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(2)"
      >
        <p>第 3 层。窄层上面再叠宽层时，左缘仍保持可见。</p>
        <web-ui-button slot="footer" variant="secondary" full @click="openLevel(3)">打开第 4 层</web-ui-button>

        <web-ui-drawer
          :open="levels[3]"
          :heading="`${titles[3]} (320px, 顶层)`"
          closable
          :style="{ '--wui-drawer-width': widths[3] }"
          @open-change="event => event.target === event.currentTarget && !event.detail.open && closeLevel(3)"
        >
          <p>第 4 层，顶层。关闭后逐层恢复原尺寸。</p>
        </web-ui-drawer>
      </web-ui-drawer>
    </web-ui-drawer>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const titles = ['概览', '详情', '设置', '确认']
const widths = ['300px', '280px', '240px', '320px']

const levels = ref([false, false, false, false])

function openLevel(index: number) {
  levels.value = levels.value.map((value, i) => (i < index ? value : i === index))
}

function closeLevel(index: number) {
  levels.value = levels.value.map((value, i) => (i < index ? value : false))
}
</script>
