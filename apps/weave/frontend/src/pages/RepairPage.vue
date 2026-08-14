<script setup lang="ts">
import type { Candidate, RepairItem } from '@bindings/weave/models'
import { lucideRefreshCw, lucideSearch, lucideWrench, lucideX } from '@greypan/web-ui/icons'
import { onMounted, ref } from 'vue'

import { useRepairStore } from '@/stores/repair'

const repair = useRepairStore()

const candidatesMap = ref(new Map<string, Candidate[]>())
const targetInput = ref('')
const busyRepairId = ref('')

async function showCandidates(item: RepairItem) {
  try {
    candidatesMap.value.set(item.id, await repair.candidates(item.id))
  } catch (err) {
    candidatesMap.value.set(item.id, [])
    console.error(err)
  }
}

async function autoRepair(item: RepairItem) {
  busyRepairId.value = item.id
  try {
    await repair.autoRepair(item.id)
  } finally {
    busyRepairId.value = ''
  }
}

async function manualRepair(item: RepairItem) {
  if (!targetInput.value.trim()) return
  busyRepairId.value = item.id
  try {
    await repair.repair(item.id, targetInput.value.trim())
    targetInput.value = ''
  } finally {
    busyRepairId.value = ''
  }
}

function dismiss(item: RepairItem) {
  void repair.dismiss(item.id)
}

function onTargetInput(e: Event) {
  targetInput.value = (e.target as HTMLElement & { value: string }).value
}

function stateLabel(state: string): string {
  if (state === 'open') return '待修复'
  if (state === 'auto_fixed') return '已自动修复'
  if (state === 'manual_fixed') return '已手动修复'
  return '已忽略'
}

onMounted(() => void repair.load())
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-4">
    <div class="flex items-center justify-between">
      <h1 class="flex items-center gap-2 text-base font-semibold">
        <web-ui-icon :icon="lucideWrench" :size="18" />
        修复中心
      </h1>
      <span class="text-xs text-[var(--wui-color-text-muted)]">
        未处理：{{ repair.openCount }} 项 · 候选查找邻近优先（原目录 → 监听根）
      </span>
    </div>

    <div v-if="repair.loading" class="py-10 text-center text-sm text-[var(--wui-color-text-muted)]">加载中…</div>
    <div v-else-if="!repair.repairs.length" class="py-16 text-center text-sm text-[var(--wui-color-text-muted)]">
      当前没有断链条目。
    </div>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="item in repair.repairs"
        :key="item.id"
        class="rounded-lg border border-[var(--wui-color-border)] bg-[var(--wui-color-surface)] p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-semibold">{{ item.itemName }}</span>
              <span
                class="rounded px-1.5 py-0.5 text-[10px]"
                :class="
                  item.state === 'open'
                    ? 'bg-[var(--wui-color-danger)]/10 text-[var(--wui-color-danger)]'
                    : 'bg-[var(--wui-color-primary)]/10 text-[var(--wui-color-primary)]'
                "
              >
                {{ stateLabel(item.state) }}
              </span>
            </div>
            <p class="mt-0.5 truncate text-xs text-[var(--wui-color-text-muted)]" :title="item.itemPath">
              {{ item.itemPath }}
            </p>
          </div>
          <div v-if="item.state === 'open'" class="flex shrink-0 gap-1">
            <web-ui-button :loading="busyRepairId === item.id" @click="autoRepair(item)">
              <web-ui-icon :icon="lucideRefreshCw" :size="14" slot="prefix" />
              自动修复
            </web-ui-button>
            <web-ui-button @click="showCandidates(item)">
              <web-ui-icon :icon="lucideSearch" :size="14" slot="prefix" />
              查找候选
            </web-ui-button>
            <web-ui-button variant="danger" @click="dismiss(item)">
              <web-ui-icon :icon="lucideX" :size="14" slot="prefix" />
              忽略
            </web-ui-button>
          </div>
        </div>

        <div v-if="candidatesMap.get(item.id)?.length" class="mt-3 flex flex-col gap-1">
          <span class="text-xs font-medium text-[var(--wui-color-text-muted)]">候选（按评分）：</span>
          <web-ui-button
            v-for="c in candidatesMap.get(item.id)"
            :key="c.path"
            variant="ghost"
            full
            @click="targetInput = c.path"
          >
            <span class="truncate" :title="c.path">{{ c.path }}</span>
            <span slot="suffix" class="shrink-0 text-[10px] text-[var(--wui-color-text-muted)]"
              >评分 {{ c.score }} · {{ c.note }}</span
            >
          </web-ui-button>
        </div>

        <div v-if="item.state === 'open'" class="mt-3 flex items-center gap-2">
          <web-ui-input
            :value="targetInput"
            placeholder="输入新的文件路径，或点击上方候选"
            full
            @input="onTargetInput"
          />
          <web-ui-button
            variant="primary"
            :disabled="!targetInput.trim()"
            :loading="busyRepairId === item.id"
            @click="manualRepair(item)"
          >
            手动修复
          </web-ui-button>
        </div>
      </div>
    </div>
  </div>
</template>
