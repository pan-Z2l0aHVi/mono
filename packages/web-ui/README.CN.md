# @greypan/web-ui

基于 Lit 的 Web Components，支持 React、Vue 和原生 HTML

[English](./README.md) | 简体中文

## 功能

- **Button**：带 full/primary/text/icon 变体的样式化按钮
- **BackTop**：可配置阈值和平滑滚动的回到顶部按钮
- **Layout**：带 header/sidebar/tabbar 插槽的页面布局
- **SVG Draw Lines**：带缓动控制的 SVG 线条绘制动画
- **框架兼容**：支持 React、Vue 和原生 HTML

## 安装

```bash
# npm
npm install @greypan/web-ui

# pnpm
pnpm add @greypan/web-ui

# yarn
yarn add @greypan/web-ui

# bun
bun add @greypan/web-ui
```

> 需要 `lit` 作为依赖。

## 快速开始

```html
<script type="module" src="@greypan/web-ui"></script>

<web-ui-button primary>点击我</web-ui-button>
<web-ui-button text>取消</web-ui-button>
<web-ui-button icon>
  <iconify-icon icon="lucide:plus"></iconify-icon>
</web-ui-button>
```

## API

### `<web-ui-button>`

样式化按钮组件。

| 属性      | 类型      | 默认值  | 说明       |
| --------- | --------- | ------- | ---------- |
| `full`    | `boolean` | `false` | 全宽按钮   |
| `primary` | `boolean` | `false` | 主要样式   |
| `text`    | `boolean` | `false` | 纯文本样式 |
| `icon`    | `boolean` | `false` | 纯图标模式 |

### `<web-ui-back-top>`

回到顶部按钮。

| 属性           | 类型                    | 默认值   | 说明               |
| -------------- | ----------------------- | -------- | ------------------ |
| `smooth`       | `boolean`               | `true`   | 平滑滚动动画       |
| `threshold`    | `number`                | `200`    | 显示按钮的滚动阈值 |
| `visible`      | `boolean`               | `false`  | 当前可见状态       |
| `scrollTarget` | `HTMLElement \| Window` | `window` | 滚动容器           |

**事件：**

| 事件名           | 详情                   | 说明         |
| ---------------- | ---------------------- | ------------ |
| `visible-change` | `{ visible: boolean }` | 可见状态变更 |

### `<web-ui-layout>`

带插槽的页面布局。

| 插槽      | 说明           |
| --------- | -------------- |
| `header`  | 顶部区域       |
| `sidebar` | 侧边栏区域     |
| `tabbar`  | 底部标签栏区域 |
| （默认）  | 主内容区域     |

### `<web-ui-svg-draw-lines>`

SVG 线条绘制动画组件。包裹 `<svg>` 元素并动画化 stroke-dashoffset。

| 属性       | 类型     | 默认值     | 说明             |
| ---------- | -------- | ---------- | ---------------- |
| `duration` | `number` | `1000`     | 动画时长（毫秒） |
| `easing`   | `string` | `'linear'` | CSS 缓动函数     |

```html
<web-ui-svg-draw-lines duration="2000" easing="ease-in-out">
  <svg viewBox="0 0 100 100">
    <path d="M10 10 L90 10 L90 90 L10 90 Z" fill="none" stroke="black" />
  </svg>
</web-ui-svg-draw-lines>
```
