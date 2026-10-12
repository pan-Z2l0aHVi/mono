---
component: select
tag: web-ui-select
---

选择器下拉框：默认插槽投影 `<web-ui-option>` 候选，`trigger` 插槽可替换默认触发区域；支持键盘导航与 Portal。

## 示例

### 基础

子 `<web-ui-option>` 通过事件向父级注册，键盘支持 ArrowDown / ArrowUp / Enter / Escape。

```react
<web-ui-select placeholder="请选择" onChange={event => setFramework(event.currentTarget.value)}>
  <web-ui-option value="vue" label="Vue"></web-ui-option>
  <web-ui-option value="react" label="React"></web-ui-option>
  <web-ui-option value="svelte" label="Svelte"></web-ui-option>
</web-ui-select>
```

```vue
<template>
  <web-ui-select placeholder="请选择" @change="framework = $event.currentTarget.value">
    <web-ui-option value="vue" label="Vue"></web-ui-option>
    <web-ui-option value="react" label="React"></web-ui-option>
    <web-ui-option value="svelte" label="Svelte"></web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const framework = ref('')
</script>
```

### 选项装饰

`<web-ui-option>` 的 `prefix` / `suffix` 插槽在标签两侧加图标或后缀信息，`disabled` 项不可选。

```react
<web-ui-select placeholder="选择优先级">
  <web-ui-option value="high" label="高优先级">
    <span slot="prefix">🔴</span>
    <span slot="suffix">P0</span>
  </web-ui-option>
  <web-ui-option value="low" label="低优先级" disabled></web-ui-option>
</web-ui-select>
```

```vue
<template>
  <web-ui-select placeholder="选择优先级">
    <web-ui-option value="high" label="高优先级">
      <span slot="prefix">🔴</span>
      <span slot="suffix">P0</span>
    </web-ui-option>
    <web-ui-option value="low" label="低优先级" disabled></web-ui-option>
  </web-ui-select>
</template>
```

### 自定义触发器

把内容放进 `trigger` 插槽替换默认 label 与箭头，外壳与浮层锚点保持默认。

```react
<web-ui-select>
  <web-ui-icon slot="trigger" icon={lucideSettings} size={18}></web-ui-icon>
  <web-ui-option value="theme" label="主题设置"></web-ui-option>
  <web-ui-option value="lang" label="语言设置"></web-ui-option>
</web-ui-select>
```

```vue
<template>
  <web-ui-select>
    <web-ui-icon slot="trigger" :icon="lucideSettings" :size="18"></web-ui-icon>
    <web-ui-option value="theme" label="主题设置"></web-ui-option>
    <web-ui-option value="lang" label="语言设置"></web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideSettings } from '@greypan/web-ui/icons'
</script>
```

## API

### Props

| 名称               | 说明                                         |
| ------------------ | -------------------------------------------- |
| `placeholder`      | 未选中时显示的占位文本。                     |
| `disabled`         | 禁用状态。                                   |
| `required`         | 必填校验。                                   |
| `portal`           | 在 theme-owned overlay root 中渲染下拉面板。 |
| `no-scroll-lock`   | 打开时不锁定页面滚动。                       |
| `overlayContainer` | 显式 Portal 容器（property）。               |
| `name`             | 表单字段名。                                 |
| `value`            | 选中值。                                     |

### Events

| 名称          | 说明                                     |
| ------------- | ---------------------------------------- |
| `input`       | 选中值变化时触发。                       |
| `change`      | 用户提交选择时触发。                     |
| `open-change` | 下拉面板开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                                        |
| --------- | ------------------------------------------- |
| `trigger` | 自定义触发区域内容，替换默认 label 与箭头。 |
| `default` | 投影 `<web-ui-option>` 候选。               |
