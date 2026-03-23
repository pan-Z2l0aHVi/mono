<route lang="json">
{
  "meta": {
    "icon": "SVG draw lines"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

useHead({
  title: () => 'SVG draw lines'
})
</script>

<template>
  <div class="p-12px">
    <h3>SVG draw lines</h3>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v16M8 6h12M8 12h6m-6 6h10"
      />
    </svg>
    <web-ui-svg-draw-lines
      ><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v16M8 6h12M8 12h6m-6 6h10"
        /></svg
    ></web-ui-svg-draw-lines>

    <svg viewBox="0 0 100 100" width="100" height="100" fill="none" stroke="blue" stroke-width="2">
      <circle cx="50" cy="50" r="40" />
      <rect x="35" y="35" width="30" height="30" />
      <path d="M10 10L90 90" />
    </svg>
    <web-ui-svg-draw-lines
      ><svg viewBox="0 0 100 100" width="100" height="100" fill="none" stroke="blue" stroke-width="2">
        <circle cx="50" cy="50" r="40" />
        <rect x="35" y="35" width="30" height="30" />
        <path d="M10 10L90 90" /></svg
    ></web-ui-svg-draw-lines>

    <svg viewBox="0 0 24 24" width="100" height="100" fill="none" stroke="red" stroke-width="2">
      <path d="M4 4h4v4h-4z M12 4h4v4h-4z M4 12h4v4h-4z M12 12h4v4h-4z" />
    </svg>
    <web-ui-svg-draw-lines
      ><svg viewBox="0 0 24 24" width="100" height="100" fill="none" stroke="red" stroke-width="2">
        <path d="M4 4h4v4h-4z M12 4h4v4h-4z M4 12h4v4h-4z M12 12h4v4h-4z" /></svg
    ></web-ui-svg-draw-lines>
  </div>
</template>
