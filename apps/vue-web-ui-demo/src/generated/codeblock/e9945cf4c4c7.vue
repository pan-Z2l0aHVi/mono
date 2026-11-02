<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete value="Vue" disabled placeholder="禁用">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
    <web-ui-autocomplete value="Vue" readonly placeholder="只读">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
  </div>
</template>

<script setup lang="ts">
const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
</script>
