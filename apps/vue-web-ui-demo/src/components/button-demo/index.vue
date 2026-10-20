<script setup lang="ts">
import {
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronUp,
  lucideMinus,
  lucidePlus,
  lucideSearch
} from '@greypan/web-ui/icons'
</script>

<template>
  <div>
    <h1>button</h1>
    <h2>Variants</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button variant="primary">Primary</web-ui-button>
      <web-ui-button variant="secondary">Secondary</web-ui-button>
      <web-ui-button variant="ghost">Ghost</web-ui-button>
      <web-ui-button variant="danger">Danger</web-ui-button>
      <web-ui-button variant="glass">Glass</web-ui-button>
    </div>

    <h2>Custom size</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button variant="primary" size="28">Small 28</web-ui-button>
      <web-ui-button variant="primary">Default 36</web-ui-button>
      <web-ui-button variant="primary" size="48">Large 48</web-ui-button>
      <web-ui-button variant="secondary" size="32" style="--wui-button-width: 100px">32×100</web-ui-button>
      <web-ui-button variant="secondary" size="40" style="--wui-button-width: 200px">40×200</web-ui-button>
    </div>

    <h2>Disabled and loading</h2>
    <div class="mb-3 flex flex-wrap gap-2">
      <web-ui-button disabled>Disabled</web-ui-button>
      <web-ui-button variant="primary" disabled>Disabled</web-ui-button>
      <web-ui-button loading>Loading</web-ui-button>
      <web-ui-button variant="primary" loading>Loading</web-ui-button>
    </div>

    <h2>Full width</h2>
    <div class="mb-3">
      <web-ui-button full>Full Width</web-ui-button>
      <div class="my-2"></div>
      <web-ui-button full :variant="'primary'">Full Width</web-ui-button>
    </div>

    <h2>Slot</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button>
        <span slot="prefix">prefix</span>
        button
        <span slot="suffix">suffix</span>
      </web-ui-button>
      <web-ui-button>
        <svg slot="prefix" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M11 2v7H4v2h7v7h2v-7h7v-2h-7V2z" />
        </svg>
        button
      </web-ui-button>
    </div>

    <h2>icon mode</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button icon>
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="primary">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="secondary">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="ghost">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon variant="danger">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>

      <web-ui-button icon>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
        </svg>
      </web-ui-button>
    </div>

    <h2>icon + loading</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button icon :loading="true" aria-label="Loading">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon :loading="true" :variant="'primary'" aria-label="Loading">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
      <web-ui-button icon :loading="true" :disabled="true" aria-label="Disabled and loading">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      </web-ui-button>
    </div>

    <h2>button group</h2>
    <div class="mb-3 flex flex-col gap-4">
      <h3>Text only</h3>
      <web-ui-button-group>
        <web-ui-button>Tab 1</web-ui-button>
        <web-ui-button>Tab 2</web-ui-button>
        <web-ui-button>Tab 3</web-ui-button>
      </web-ui-button-group>

      <h3>Icon only</h3>
      <web-ui-button-group>
        <web-ui-button icon><web-ui-icon :icon="lucideChevronLeft"></web-ui-icon></web-ui-button>
        <web-ui-button icon><web-ui-icon :icon="lucideChevronRight"></web-ui-icon></web-ui-button>
      </web-ui-button-group>

      <h3>icon + text</h3>
      <web-ui-button-group>
        <web-ui-button>
          <web-ui-icon slot="prefix" :icon="lucideChevronLeft"></web-ui-icon>
          Previous
        </web-ui-button>
        <web-ui-button>
          Next
          <web-ui-icon slot="suffix" :icon="lucideChevronRight"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>

      <h3>Mixed content</h3>
      <web-ui-button-group>
        <web-ui-button icon><web-ui-icon :icon="lucideChevronLeft"></web-ui-icon></web-ui-button>
        <web-ui-button>Search</web-ui-button>
        <web-ui-button icon><web-ui-icon :icon="lucideSearch"></web-ui-icon></web-ui-button>
      </web-ui-button-group>

      <h3>Vertical</h3>
      <web-ui-button-group direction="vertical">
        <web-ui-button icon><web-ui-icon :icon="lucidePlus"></web-ui-icon></web-ui-button>
        <web-ui-button icon><web-ui-icon :icon="lucideMinus"></web-ui-icon></web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>
