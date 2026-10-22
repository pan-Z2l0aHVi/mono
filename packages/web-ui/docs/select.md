---
component: select
tag: web-ui-select
---

选择器下拉框：默认插槽投影 `<web-ui-option>` 候选，`trigger` 插槽可替换默认触发区域；支持键盘导航与 Portal。

## 示例

### 基础

子 `<web-ui-option>` 通过事件向父级注册，键盘支持 ArrowDown / ArrowUp / Enter / Escape。

```react
<web-ui-select aria-label="前端框架" placeholder="请选择" onChange={event => setFramework(event.currentTarget.value)}>
  <web-ui-option value="vue" label="Vue"></web-ui-option>
  <web-ui-option value="react" label="React"></web-ui-option>
  <web-ui-option value="svelte" label="Svelte"></web-ui-option>
</web-ui-select>
```

```vue
<template>
  <web-ui-select aria-label="前端框架" placeholder="请选择" @change="framework = $event.currentTarget.value">
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

### option 装饰

`<web-ui-option>` 的 `prefix` / `suffix` 插槽在 label 两侧加 icon 或后缀信息，`disabled` 项不可选。

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

### 自定义 trigger

把内容放进 `trigger` 插槽替换默认 label 与箭头，外壳与 overlay 锚点保持默认。

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

| 名称               | 说明                                           | 类型               | 默认值  |
| ------------------ | ---------------------------------------------- | ------------------ | ------- |
| `placeholder`      | 未选中时显示的占位文本。                       | `string`           | `''`    |
| `disabled`         | 禁用状态。                                     | `boolean`          | `false` |
| `required`         | 必填校验。                                     | `boolean`          | `false` |
| `portal`           | 在 theme-owned overlay root 中渲染下拉 panel。 | `boolean`          | `false` |
| `no-scroll-lock`   | 打开时不锁定页面滚动。                         | `boolean`          | `false` |
| `overlayContainer` | 显式 Portal 容器（property）。                 | `OverlayContainer` | —       |
| `name`             | 表单字段名。                                   | `string`           | `''`    |
| `aria-label`       | combobox 的 accessible name。                  | `string \| null`   | `null`  |
| `value`            | 选中值。                                       | `string`           | `''`    |

### Events

| 名称          | 说明                                        |
| ------------- | ------------------------------------------- |
| `input`       | 选中值变化时触发。                          |
| `change`      | 用户提交选择时触发。                        |
| `open-change` | 下拉 panel 开合，`detail.open` 为当前状态。 |

### Slots

| 名称      | 说明                                        |
| --------- | ------------------------------------------- |
| `trigger` | 自定义触发区域内容，替换默认 label 与箭头。 |
| `default` | 投影 `<web-ui-option>` 候选。               |

### 行为说明

子 `<web-ui-option>` 通过 `option-register` / `option-unregister` 注册。打开时，面板使用 `role="listbox"`，候选项使用 `role="option"`，当前非空 `value` 对应的 option 设为 `aria-selected="true"`，`aria-disabled` 反映禁用状态。非 Portal 模式下，键盘导航时 `aria-activedescendant` 指向当前 option；Portal 模式因 option 与 combobox 位于不同的 Shadow DOM 树中，不设置此属性。支持 ArrowDown/ArrowUp/Enter/Escape 键盘导航。

Portal panel 创建时会镜像 host 上解析后的这些变量；更新 host 后需重新打开 Portal panel 才会生效。

### CSS Custom Properties

| 名称                      | 说明                  | 默认值                             |
| ------------------------- | --------------------- | ---------------------------------- |
| `--wui-select-max-width`  | 下拉框最大宽度        | `500px`                            |
| `--wui-select-max-height` | 下拉滚动区域最大高度  | `200px`                            |
| `--wui-overlay-min-width` | 下拉框最小宽度        | `200px`                            |
| `--wui-select-bg-hover`   | Trigger 悬停背景      | `--wui-color-surface-glass-hover`  |
| `--wui-select-bg-active`  | Trigger 按下/打开背景 | `--wui-color-surface-glass-active` |
