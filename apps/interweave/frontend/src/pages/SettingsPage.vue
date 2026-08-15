<script setup lang="ts">
import { lucideCopy, lucideFolderOpen, lucideRefreshCw } from '@greypan/web-ui/icons'
import { onMounted, ref } from 'vue'

import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const watchRootInput = ref('')
const copied = ref(false)

async function toggleMcp(value: boolean) {
  await settings.update({ mcpEnabled: value })
}

async function toggleRescan(value: boolean) {
  await settings.update({ rescanOnStart: value })
}

async function addWatchRoot() {
  await settings.addWatchRoot(watchRootInput.value)
  watchRootInput.value = ''
}

async function copyToken() {
  if (!settings.settings?.mcpToken) return
  await navigator.clipboard.writeText(settings.settings.mcpToken)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function onWatchRootInput(e: Event) {
  watchRootInput.value = (e.target as HTMLElement & { value: string }).value
}

function onMcpChange(e: Event) {
  void toggleMcp((e.target as HTMLElement & { checked: boolean }).checked)
}

function onRescanChange(e: Event) {
  void toggleRescan((e.target as HTMLElement & { checked: boolean }).checked)
}

onMounted(() => void settings.load())
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
    <div class="flex items-center justify-between">
      <h1 class="text-base font-semibold">设置</h1>
      <web-ui-button :loading="settings.rescanning" @click="settings.rescan()">
        <web-ui-icon :icon="lucideRefreshCw" :size="14" slot="prefix" />
        立即全量扫描
      </web-ui-button>
    </div>

    <section class="rounded-lg border border-[var(--wui-color-border)] p-4">
      <h2 class="mb-3 text-sm font-semibold">库统计</h2>
      <div v-if="settings.stats" class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div class="rounded bg-[var(--wui-color-surface)] p-2">
          <div class="text-xs text-[var(--wui-color-text-muted)]">条目</div>
          <div class="text-lg font-semibold">{{ settings.stats.itemCount }}</div>
        </div>
        <div class="rounded bg-[var(--wui-color-surface)] p-2">
          <div class="text-xs text-[var(--wui-color-text-muted)]">文件</div>
          <div class="text-lg font-semibold">{{ settings.stats.fileCount }}</div>
        </div>
        <div class="rounded bg-[var(--wui-color-surface)] p-2">
          <div class="text-xs text-[var(--wui-color-text-muted)]">链接</div>
          <div class="text-lg font-semibold">{{ settings.stats.urlCount }}</div>
        </div>
        <div class="rounded bg-[var(--wui-color-surface)] p-2">
          <div class="text-xs text-[var(--wui-color-text-muted)]">断链</div>
          <div
            class="text-lg font-semibold"
            :class="{ 'text-[var(--wui-color-danger)]': settings.stats.brokenCount > 0 }"
          >
            {{ settings.stats.brokenCount }}
          </div>
        </div>
        <div class="rounded bg-[var(--wui-color-surface)] p-2">
          <div class="text-xs text-[var(--wui-color-text-muted)]">标签</div>
          <div class="text-lg font-semibold">{{ settings.stats.tagCount }}</div>
        </div>
        <div class="rounded bg-[var(--wui-color-surface)] p-2">
          <div class="text-xs text-[var(--wui-color-text-muted)]">监听根</div>
          <div class="text-lg font-semibold">{{ settings.stats.watchRootCount }}</div>
        </div>
        <div class="rounded bg-[var(--wui-color-surface)] p-2">
          <div class="text-xs text-[var(--wui-color-text-muted)]">待修复</div>
          <div
            class="text-lg font-semibold"
            :class="{ 'text-[var(--wui-color-danger)]': settings.stats.repairOpenCount > 0 }"
          >
            {{ settings.stats.repairOpenCount }}
          </div>
        </div>
      </div>
      <p class="mt-3 text-xs text-[var(--wui-color-text-muted)]">库位置：{{ settings.settings?.libraryPath || '—' }}</p>
    </section>

    <section class="rounded-lg border border-[var(--wui-color-border)] p-4">
      <h2 class="mb-3 text-sm font-semibold">MCP 服务</h2>
      <div v-if="settings.settings" class="flex flex-col gap-2 text-sm">
        <label class="flex items-center justify-between gap-4">
          <span>启用 MCP 服务</span>
          <web-ui-switch :checked="settings.settings.mcpEnabled" aria-label="启用 MCP 服务" @change="onMcpChange" />
        </label>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[var(--wui-color-text-muted)]">服务地址</span>
          <code class="rounded bg-[var(--wui-color-surface)] px-2 py-1 text-xs">{{ settings.settings.mcpUrl }}</code>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[var(--wui-color-text-muted)]">状态</span>
          <span
            :class="{
              'text-[var(--wui-color-primary)]': settings.settings.mcpRunning,
              'text-[var(--wui-color-danger)]': !settings.settings.mcpRunning
            }"
          >
            {{ settings.settings.mcpRunning ? '运行中' : '未运行' }}
          </span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[var(--wui-color-text-muted)]">访问令牌</span>
          <div class="flex items-center gap-2">
            <code
              class="min-w-0 flex-1 truncate rounded bg-[var(--wui-color-surface)] px-2 py-1 text-xs"
              :title="settings.settings.mcpToken"
            >
              {{ settings.settings.mcpToken }}
            </code>
            <web-ui-button @click="copyToken">
              <web-ui-icon :icon="lucideCopy" :size="14" slot="prefix" />
              {{ copied ? '已复制' : '复制' }}
            </web-ui-button>
            <web-ui-button @click="settings.regenerateToken()">轮换令牌</web-ui-button>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-[var(--wui-color-border)] p-4">
      <h2 class="mb-3 text-sm font-semibold">监听根目录</h2>
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <web-ui-input
            :value="watchRootInput"
            placeholder="输入目录绝对路径"
            full
            @input="onWatchRootInput"
            @keyup.enter="addWatchRoot"
          />
          <web-ui-button variant="primary" :disabled="!watchRootInput.trim()" @click="addWatchRoot">添加</web-ui-button>
        </div>
        <div v-if="settings.watchRoots.length" class="flex flex-col gap-1">
          <div
            v-for="root in settings.watchRoots"
            :key="root.id"
            class="flex items-center gap-2 rounded bg-[var(--wui-color-surface)] px-2 py-1.5 text-sm"
          >
            <web-ui-icon :icon="lucideFolderOpen" :size="14" class="shrink-0 text-[var(--wui-color-text-muted)]" />
            <span class="min-w-0 flex-1 truncate" :title="root.path">{{ root.path }}</span>
            <span class="shrink-0 text-xs text-[var(--wui-color-text-muted)]">{{ root.itemCount }} 项</span>
            <web-ui-button variant="danger" @click="settings.removeWatchRoot(root.id)">移除</web-ui-button>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-[var(--wui-color-border)] p-4">
      <h2 class="mb-3 text-sm font-semibold">启动行为</h2>
      <label class="flex items-center justify-between gap-4 text-sm">
        <span>启动时执行全量扫描</span>
        <web-ui-switch
          :checked="!!settings.settings?.rescanOnStart"
          aria-label="启动时执行全量扫描"
          @change="toggleRescan(($event.target as HTMLElement & { checked: boolean }).checked)"
        />
      </label>
    </section>
  </div>
</template>
