<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>

<template>
  <div>
    <h1>input</h1>
    <h2>Basic</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input placeholder="Enter a value" />
      <web-ui-input value="Filled content" />
    </div>

    <h2>Prefix / suffix</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input placeholder="Search">
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
      <web-ui-input value="Content">
        <web-ui-icon slot="suffix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
      <web-ui-input placeholder="Both sides">
        <span slot="prefix">www.</span>
        <span slot="suffix">.com</span>
      </web-ui-input>
    </div>

    <h2>Different types</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input type="password" placeholder="Password" />
    </div>

    <h2>Disabled</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input placeholder="Disabled" disabled />
      <web-ui-input value="Disabled with value" disabled />
      <web-ui-input placeholder="Disabled with icon" disabled>
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
    </div>

    <h2>Read only</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input value="Read only with value" readonly />
      <!-- readonly 优先于 clearable：只读时清除 button 隐藏 -->
      <web-ui-input value="Read only, copyable" readonly clearable>
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
    </div>

    <h2>Clearable</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input value="Clearable when filled" clearable />
      <web-ui-input placeholder="Search" clearable>
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
      <web-ui-input value="Clearable when filled" clearable full
        ><span slot="prefix">www.</span><span slot="suffix">@gmail.com</span></web-ui-input
      >
    </div>

    <h2>Full width</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input full placeholder="Full-width input" />
      <web-ui-input full value="Full width with value" clearable>
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
    </div>

    <h2>Borderless</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input borderless placeholder="Borderless input" />
      <web-ui-input borderless value="Borderless with value" />
      <web-ui-input borderless placeholder="With icon">
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
    </div>
  </div>
</template>
