---
component: context-menu
tag: web-ui-context-menu
---

右键上下文菜单：第一个子元素是触发区域，其余子元素是菜单项（`<web-ui-dropdown-item>` 等）。打开期间菜单是模态的，点空白只会关掉菜单。

## 示例

### 基础

在触发区域内右键即可打开，菜单从鼠标位置展开。

```react
<web-ui-context-menu>
  <div className="context-zone">在此区域右键点击</div>
  <web-ui-dropdown-item>复制</web-ui-dropdown-item>
  <web-ui-dropdown-item>粘贴</web-ui-dropdown-item>
  <web-ui-dropdown-divider></web-ui-dropdown-divider>
  <web-ui-dropdown-item disabled>删除</web-ui-dropdown-item>
</web-ui-context-menu>
```

```vue
<template>
  <web-ui-context-menu>
    <div class="context-zone">在此区域右键点击</div>
    <web-ui-dropdown-item>复制</web-ui-dropdown-item>
    <web-ui-dropdown-item>粘贴</web-ui-dropdown-item>
    <web-ui-dropdown-divider></web-ui-dropdown-divider>
    <web-ui-dropdown-item disabled>删除</web-ui-dropdown-item>
  </web-ui-context-menu>
</template>
```

### 触屏长按

`long-press` 让触屏按住 `long-press-delay` 毫秒后打开菜单，从按点向下展开；按住期间位移超过 10px 会取消。

```react
<web-ui-context-menu long-press long-press-delay={600}>
  <div className="context-zone">按住我打开菜单</div>
  <web-ui-dropdown-item>重命名</web-ui-dropdown-item>
  <web-ui-dropdown-item>移动</web-ui-dropdown-item>
</web-ui-context-menu>
```

```vue
<template>
  <web-ui-context-menu long-press :long-press-delay="600">
    <div class="context-zone">按住我打开菜单</div>
    <web-ui-dropdown-item>重命名</web-ui-dropdown-item>
    <web-ui-dropdown-item>移动</web-ui-dropdown-item>
  </web-ui-context-menu>
</template>
```

### 监听开合

`open-change` 通知菜单开与关；关闭后焦点归还给打开前持焦的元素。

```react
<web-ui-context-menu onopen-change={event => console.log(event.detail.open)}>
  <div className="context-zone">在此区域右键点击</div>
  <web-ui-dropdown-item>复制</web-ui-dropdown-item>
</web-ui-context-menu>
```

```vue
<template>
  <web-ui-context-menu @open-change="onOpenChange">
    <div class="context-zone">在此区域右键点击</div>
    <web-ui-dropdown-item>复制</web-ui-dropdown-item>
  </web-ui-context-menu>
</template>

<script setup lang="ts">
function onOpenChange(event: CustomEvent<{ open: boolean }>) {
  console.log(event.detail.open)
}
</script>
```

## API

### Props

| 名称               | 说明                                                   |
| ------------------ | ------------------------------------------------------ |
| `disabled`         | 右键与 `openAt()` 都不打开菜单，不做视觉置灰。         |
| `no-scroll-lock`   | 打开时允许背景滚动。                                   |
| `long-press`       | 触屏长按打开菜单（opt-in；鼠标始终走 `contextmenu`）。 |
| `long-press-delay` | 长按触发前需按住的时长（ms）。                         |

### Events

| 名称          | 说明                                 |
| ------------- | ------------------------------------ |
| `open-change` | 菜单开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                                     |
| --------- | ---------------------------------------- |
| `default` | 第一个元素是触发区域，其余元素是菜单项。 |
