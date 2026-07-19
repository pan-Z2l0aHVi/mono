<route lang="json">
{
  "meta": {
    "icon": "Home"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import ButtonDemo from '@/components/button-demo/index.vue'
import DialogDemo from '@/components/dialog-demo/index.vue'
import IconDemo from '@/components/icon-demo/index.vue'
import InputDemo from '@/components/input-demo/index.vue'
import InputNumberDemo from '@/components/input-number-demo/index.vue'

useHead({
  title: () => 'Home'
})
</script>

<template>
  <div class="p-3">
    <h3>Welcome Home!</h3>
    <ButtonDemo />
    <InputDemo />
    <InputNumberDemo />
    <IconDemo />
    <DialogDemo />
  </div>
</template>
