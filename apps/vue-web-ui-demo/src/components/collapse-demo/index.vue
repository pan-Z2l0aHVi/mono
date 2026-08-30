<script setup lang="ts">
import { ref } from 'vue'

const controlledOpen = ref(false)
const nestedOpen = ref(false)
</script>

<template>
  <div>
    <h1>Collapse 折叠面板</h1>

    <h2>基础用法</h2>
    <div class="mb-3">
      <web-ui-collapse>
        <web-ui-collapse-trigger
          class="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left"
        >
          点击展开
        </web-ui-collapse-trigger>
        <web-ui-collapse-content>
          <div class="p-3">
            <p>这是折叠内容。</p>
            <p>支持任意内容：文本、表单、图片等。</p>
          </div>
        </web-ui-collapse-content>
      </web-ui-collapse>
    </div>

    <h2>受控模式</h2>
    <div class="mb-3 flex flex-col gap-2">
      <web-ui-button variant="secondary" @click="controlledOpen = !controlledOpen">
        {{ controlledOpen ? '收起' : '展开' }}
      </web-ui-button>
      <web-ui-collapse :open="controlledOpen" @open-change="controlledOpen = $event.detail.open">
        <web-ui-collapse-trigger
          class="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left"
        >
          受控触发器（当前 {{ controlledOpen ? '展开' : '收起' }}）
        </web-ui-collapse-trigger>
        <web-ui-collapse-content>
          <div class="p-3">受控模式：open 由外部状态驱动，open-change 仅在用户交互时派发。</div>
        </web-ui-collapse-content>
      </web-ui-collapse>
    </div>

    <h2>keep-mounted（保留滚动位置）</h2>
    <div class="mb-3">
      <web-ui-collapse>
        <web-ui-collapse-trigger
          class="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left"
        >
          展开长列表
        </web-ui-collapse-trigger>
        <web-ui-collapse-content keep-mounted>
          <div class="max-h-40 overflow-y-auto p-3">
            <p v-for="i in 20" :key="i">列表项 {{ i }}</p>
          </div>
        </web-ui-collapse-content>
      </web-ui-collapse>
    </div>

    <h2>水平方向</h2>
    <div class="mb-3">
      <web-ui-collapse horizontal>
        <web-ui-collapse-trigger
          class="inline-block cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2"
        >
          展开侧栏
        </web-ui-collapse-trigger>
        <web-ui-collapse-content>
          <div class="w-64 whitespace-nowrap p-3">水平展开的内容区，宽度过渡。</div>
        </web-ui-collapse-content>
      </web-ui-collapse>
    </div>

    <h2>嵌套</h2>
    <div class="mb-3">
      <web-ui-collapse :open="nestedOpen" @open-change="nestedOpen = $event.detail.open">
        <web-ui-collapse-trigger
          class="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left"
        >
          外层折叠
        </web-ui-collapse-trigger>
        <web-ui-collapse-content>
          <div class="p-3">
            <p>外层内容，内部再嵌一层：</p>
            <web-ui-collapse>
              <web-ui-collapse-trigger
                class="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-raised)] px-3 py-2 text-left"
              >
                内层折叠
              </web-ui-collapse-trigger>
              <web-ui-collapse-content>
                <div class="p-3">内层内容：外层高度会跟随内层展开自动增长。</div>
              </web-ui-collapse-content>
            </web-ui-collapse>
          </div>
        </web-ui-collapse-content>
      </web-ui-collapse>
    </div>

    <h2>禁用</h2>
    <div class="mb-3">
      <web-ui-collapse disabled>
        <web-ui-collapse-trigger
          class="block w-full cursor-pointer rounded-md bg-[var(--wui-color-surface-control)] px-3 py-2 text-left"
        >
          禁用状态触发器
        </web-ui-collapse-trigger>
        <web-ui-collapse-content>
          <div class="p-3">禁用时不可展开。</div>
        </web-ui-collapse-content>
      </web-ui-collapse>
    </div>
  </div>
</template>
