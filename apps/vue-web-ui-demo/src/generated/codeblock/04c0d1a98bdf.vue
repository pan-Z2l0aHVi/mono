<template>
  <web-ui-button @click="setLayer(0, true)">打开第 1 层</web-ui-button>

  <web-ui-drawer
    :open="openLayers[0]"
    page-shift
    heading="第 1 层"
    @open-change="event => event.target === event.currentTarget && setLayer(0, event.detail.open)"
  >
    <p>第 1 层偏移最多，后面每层递减。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="setLayer(1, true)">打开第 2 层</web-ui-button>

    <web-ui-drawer
      :open="openLayers[1]"
      page-shift
      heading="第 2 层"
      @open-change="event => event.target === event.currentTarget && setLayer(1, event.detail.open)"
    >
      <p>每层各贡献一段偏移量，关闭中间层后它后面的层重新排名。</p>
      <web-ui-button slot="footer" variant="secondary" full @click="setLayer(2, true)">打开第 3 层</web-ui-button>

      <web-ui-drawer
        :open="openLayers[2]"
        page-shift
        heading="第 3 层"
        @open-change="event => event.target === event.currentTarget && setLayer(2, event.detail.open)"
      >
        <p>第 3 层偏移的距离更小；层数再多，页面外移也会很快趋于稳定。</p>
        <web-ui-button slot="footer" variant="secondary" full @click="setLayer(3, true)">打开第 4 层</web-ui-button>

        <web-ui-drawer
          :open="openLayers[3]"
          page-shift
          heading="第 4 层"
          @open-change="event => event.target === event.currentTarget && setLayer(3, event.detail.open)"
        >
          <p>第 4 层偏移的距离最小。</p>
        </web-ui-drawer>
      </web-ui-drawer>
    </web-ui-drawer>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const openLayers = ref([false, false, false, false])
const setLayer = (index: number, open: boolean) => {
  openLayers.value[index] = open
}
</script>
