<script setup lang="ts">
import {
  base64ToFile,
  downloadFile,
  fileToBase64,
  getImageInfo,
  isSameFileType,
  isValidBase64
} from '@greypan/browser-kit'
import { computed, ref } from 'vue'

const SAMPLE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const base64Input = ref(SAMPLE_PNG)
const inspectResult = ref('')

const base64Valid = computed(() => isValidBase64(base64Input.value))

async function runInspection() {
  if (!base64Valid.value) {
    inspectResult.value = '输入的 Base64 字符串无效'
    return
  }
  const fileA = base64ToFile(base64Input.value, 'sample-a')
  const fileB = base64ToFile(base64Input.value, 'sample-b')
  const [roundTrip, sameType] = await Promise.all([fileToBase64(fileA), isSameFileType(fileA, fileB)])
  let dimensions = '非图片类型'
  try {
    const info = await getImageInfo(fileA)
    dimensions = `${info.width} × ${info.height}`
  } catch {
    // 非图片载荷时跳过尺寸展示
  }
  inspectResult.value = JSON.stringify(
    {
      name: fileA.name,
      type: fileA.type,
      size: fileA.size,
      dimensions,
      sameMagicNumber: sameType,
      roundTripLength: roundTrip.length
    },
    null,
    2
  )
}

function handleDownloadSample() {
  const blob = new Blob(['Hello from @greypan/browser-kit!'], { type: 'text/plain' })
  void downloadFile(blob, 'browser-kit-sample.txt')
}

void runInspection()
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <label class="flex flex-col gap-1">
      <span class="text-xs text-muted-foreground">Base64 / Data URL 输入</span>
      <textarea v-model="base64Input" rows="2" class="ui-input font-mono text-xs" />
    </label>

    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="ui-btn ui-btn-primary ui-btn-sm" @click="runInspection">校验并解析</button>
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" @click="handleDownloadSample">
        下载示例文本文件
      </button>
      <span class="font-mono text-xs text-muted-foreground">isValidBase64: {{ base64Valid }}</span>
    </div>

    <pre v-if="inspectResult" class="overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs">{{
      inspectResult
    }}</pre>
  </div>
</template>
