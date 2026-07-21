<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>

<template>
  <div>
    <h1>输入框</h1>
    <h2>基础</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input placeholder="请输入内容" />
      <web-ui-input value="已填写的内容" />
    </div>

    <h2>前缀 / 后缀</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input placeholder="搜索">
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
      <web-ui-input value="内容">
        <web-ui-icon slot="suffix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
      <web-ui-input placeholder="前后都有">
        <span slot="prefix">www.</span>
        <span slot="suffix">.com</span>
      </web-ui-input>
    </div>

    <h2>不同 type</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input type="password" placeholder="密码" />
    </div>

    <h2>禁用</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input placeholder="禁用状态" disabled />
      <web-ui-input value="禁用有值" disabled />
      <web-ui-input placeholder="禁用带图标" disabled>
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
    </div>

    <h2>可清除</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input value="有值可清除" closable />
      <web-ui-input placeholder="搜索" closable>
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
      <web-ui-input value="有值可清除" closable full
        ><span slot="prefix">www.</span><span slot="suffix">@gmail.com</span></web-ui-input
      >
    </div>

    <h2>满宽</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input full placeholder="满宽输入框" />
      <web-ui-input full value="满宽有值" closable>
        <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
      </web-ui-input>
    </div>
  </div>
</template>
