<script setup lang="ts">
import { ref } from 'vue'

import { GreetService } from '../bindings/github.com/pan-Z2l0aHVi/mono/apps/wails-starter'

const name = ref('')
const greeting = ref('')

async function greet() {
  greeting.value = await GreetService.Greet(name.value.trim() || 'World')
}
</script>

<template>
  <web-ui-theme appearance="system">
    <main class="min-h-screen bg-[var(--wui-color-page)] p-8 text-[var(--wui-color-text)]">
      <section class="mx-auto flex w-full max-w-120 flex-col gap-5 pt-12">
        <h1 class="text-2xl font-semibold">Wails Starter</h1>
        <div class="flex gap-3">
          <input
            v-model="name"
            class="min-w-0 flex-1 border border-[var(--wui-color-border)] bg-[var(--wui-color-surface)] px-3 py-2"
            placeholder="Name"
            @keyup.enter="greet"
          />
          <web-ui-button @click="greet">Greet</web-ui-button>
        </div>
        <output v-if="greeting" class="text-sm text-[var(--wui-color-text-muted)]">{{ greeting }}</output>
      </section>
    </main>
  </web-ui-theme>
</template>
