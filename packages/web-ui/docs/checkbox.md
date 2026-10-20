---
component: checkbox
tag: web-ui-checkbox
---

单个 checkbox，声明 `role="checkbox"`，支持 Enter / Space 切换；与原生 `<form>` 集成，选中时把 `value` 提交进 `FormData`。

## 示例

### 基础

`checked` 是控件状态，默认插槽是 label 文字。

```react
<web-ui-checkbox checked={agreed} onChange={event => setAgreed(event.currentTarget.checked)}>
  我已阅读并同意服务条款
</web-ui-checkbox>
```

```vue
<template>
  <web-ui-checkbox :checked="agreed" @change="agreed = !agreed">我已阅读并同意服务条款</web-ui-checkbox>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const agreed = ref(false)
</script>
```

### 表单值

`value` 是选中时提交的值，`name` 是字段名，`required` 让原生表单校验在未选中时拦截提交。

```react
<web-ui-checkbox name="plan" value="pro" required>
  专业版
</web-ui-checkbox>
```

```vue
<template>
  <web-ui-checkbox name="plan" value="pro" required>专业版</web-ui-checkbox>
</template>
```

### checkbox 组

`<web-ui-checkbox-group>` 统一管理成员的选中与表单提交；`direction` 控制排列方向。

```react
<web-ui-checkbox-group name="fruits" value={selected} onInput={event => setSelected(event.currentTarget.value)}>
  <web-ui-checkbox value="apple">苹果</web-ui-checkbox>
  <web-ui-checkbox value="banana">香蕉</web-ui-checkbox>
  <web-ui-checkbox value="cherry" disabled>
    樱桃
  </web-ui-checkbox>
</web-ui-checkbox-group>
```

```vue
<template>
  <web-ui-checkbox-group name="fruits" :value="selected" @input="selected = $event.currentTarget.value">
    <web-ui-checkbox value="apple">苹果</web-ui-checkbox>
    <web-ui-checkbox value="banana">香蕉</web-ui-checkbox>
    <web-ui-checkbox value="cherry" disabled>樱桃</web-ui-checkbox>
  </web-ui-checkbox-group>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const selected = ref<string[]>([])
</script>
```

## API

### Props

| 名称       | 说明                 | 类型      | 默认值  |
| ---------- | -------------------- | --------- | ------- |
| `checked`  | 选中状态。           | `boolean` | `false` |
| `value`    | 选中时提交的表单值。 | `string`  | `''`    |
| `name`     | 表单字段名。         | `string`  | `''`    |
| `disabled` | 禁用状态。           | `boolean` | `false` |
| `required` | 必填校验。           | `boolean` | `false` |

### Events

| 名称     | 说明                     |
| -------- | ------------------------ |
| `input`  | 选中状态变化时触发。     |
| `change` | 用户切换选中状态时触发。 |

### Slots

| 名称      | 说明                                                   |
| --------- | ------------------------------------------------------ |
| `default` | label 文本；为空时收掉 indicator 与 label 之间的间距。 |

### 行为说明

使用 `role="checkbox"` 和 `aria-checked`。Enter/Space 键盘切换。

### 布局

宿主是 inline-flex 盒，高度由内容撑开、不继承页面行高，因此不会在 indicator 上下留出多余缝隙；`--wui-selection-control-size`（`18px`）决定 indicator 宽高，宿主与相邻文字的对齐固定为 `vertical-align: middle`。`<web-ui-radio>` 共用同一套契约。indicator 与 label 之间的 10px 归 label 所有：default slot 没画出东西时（空着，或里面只放了一个视觉隐藏的无障碍名，例如 `.sr-only` 的 span）这段间距一并收起，宿主宽度就等于 indicator。空不空按 label 盒子的渲染宽度判定，而不是按 slot 被指派了节点判定——无障碍名正是「有指派、不画盒」的那一种；也不能用 `display: none` 收掉 label，那会把这个名字从无障碍树里拿掉。

### 选中动画

对勾是 `@/icons` 里的描边资产，由嵌套的 `<web-ui-icon>` 渲染在 `<web-ui-svg-draw-lines>` 内，并带 `no-autoplay`，所以挂载时就已勾选的控件显示静态勾。勾选时线条从左侧尖端起按恒定笔速画出，时长取 `--wui-duration-trigger`（默认 160ms），在切换当下从已生效的主题解析，和 indicator 底色那条 transition 落在同一拍；取消时沿同一条路径收回到空白，而不是只淡出；主题范围为 `motion="reduced"` 时两者都跳过，两个状态直接切换。描边颜色是 `--wui-color-on-control`，经 `<web-ui-icon>` 的 `--wui-icon-color` 传下去，因为勾选后它背后就是 `--wui-color-accent`。这个结构带来两条约束：资产必须保持描边（`fill: none` + `stroke: currentColor`），换成实心 icon dash 动画照跑却什么都不画，勾会直接出现；并且它按 `<web-ui-icon>` 自己的默认 18px 渲染，宿主够不到 icon shadow root 里的 `<svg>`，因此不随 `--wui-selection-control-size` 放大。

### 未激活态

未选中 indicator 的底色取 `--wui-color-surface-control`（与中性 button 同一档控件底），深色模式下也能和 `--wui-color-page` 分辨开。触发区内任意位置（indicator、间距或右侧 slot label）被 hover 时，该底色再叠 6% 状态层。hover 只在 `(hover: hover) and (pointer: fine)` 设备上生效；没有按下态，已选中和禁用态保持各自底色。`<web-ui-radio>` 共用同一套状态。
