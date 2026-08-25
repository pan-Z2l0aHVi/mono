<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" v-if="route.meta.prototype" />
    <web-ui-layout v-else>
      <component :is="Component" />
    </web-ui-layout>
  </RouterView>
</template>
