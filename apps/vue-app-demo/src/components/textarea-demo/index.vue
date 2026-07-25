<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const basic = ref('')
const autosizeVal = ref('')
const disabledVal = ref('这段文字不可编辑')
const readonlyVal = ref('这段文字只读')
const limitedVal = ref('')
</script>

<template>
  <div>
    <h1>文本域</h1>

    <h2>基础</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-textarea placeholder="请输入内容" full />
      <web-ui-textarea
        :value="basic"
        placeholder="双向绑定"
        full
        @input="(e: Event) => (basic = (e.target as HTMLTextAreaElement).value)"
      />
      <div class="text-sm text-gray-500">输入值：{{ basic || '(空)' }}</div>
    </div>

    <h2>前缀 / 后缀</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-textarea placeholder="搜索">
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-textarea>
      <web-ui-textarea placeholder="带后缀">
        <span slot="suffix">/ 1000</span>
      </web-ui-textarea>
      <web-ui-textarea placeholder="前后都有" full>
        <span slot="prefix">备注：</span>
        <span slot="suffix">必填</span>
      </web-ui-textarea>
    </div>

    <h2>行数</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-textarea :rows="2" placeholder="2 行" full />
      <web-ui-textarea :rows="5" placeholder="5 行" full />
      <web-ui-textarea :rows="8" placeholder="8 行" full />
    </div>

    <h2>自动高度</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-textarea autosize placeholder="内容多了自动变高" full />
    </div>

    <h2>禁用</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-textarea :value="disabledVal" disabled full />
      <web-ui-textarea :value="readonlyVal" readonly full />
    </div>

    <h2>可清除</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-textarea value="有值可清除" clearable full />
      <web-ui-textarea placeholder="搜索" clearable full>
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-textarea>
    </div>

    <h2>字符限制</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-textarea
        :value="limitedVal"
        :maxlength="20"
        placeholder="最多 20 字"
        full
        @input="(e: Event) => (limitedVal = (e.target as HTMLTextAreaElement).value)"
      />
      <div class="text-sm text-gray-500">{{ limitedVal.length }} / 20</div>
    </div>

    <h2>必填</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-textarea :rows="4" required placeholder="必填项" full />
    </div>
  </div>
</template>
