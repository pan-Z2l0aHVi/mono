# @greypan/app-scrollbars

> workspace 应用共用的覆盖式滚动条配置。

[English](./README.md) | 简体中文

## 提供什么

这是 workspace 应用共用的覆盖式滚动条配置。

`@greypan/web-ui` 不依赖它。Web UI 组件使用原生 CSS 滚动条和 `--wui-scrollbar-handle` token。

`overlayscrollbars` 来自 workspace catalog，因此随包提供的 CSS 与各应用使用的运行时版本一致。

## 用法

```ts
import appScrollbarsOptions from '@greypan/app-scrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react' // 或 overlayscrollbars-vue
```

导入本包时会同时加载样式表。把默认导出传给初始化 OverlayScrollbars 的位置。

```tsx
<OverlayScrollbarsComponent options={appScrollbarsOptions}>{children}</OverlayScrollbarsComponent>
```

要接管文档滚动条，初始化 `document.body`。本包还会注册 click-scroll 插件，点击轨道会滚动到点击位置。

## Token

| Token                           | 归属              | 含义                                                       |
| ------------------------------- | ----------------- | ---------------------------------------------------------- |
| `--wui-scrollbar-handle`        | `@greypan/web-ui` | 静止状态的滑块颜色，由最外层主题镜像到 `documentElement`。 |
| `--app-scrollbar-handle-hover`  | 本包              | 悬停时的滑块颜色。                                         |
| `--app-scrollbar-handle-active` | 本包              | 按下时的滑块颜色。                                         |

原生滚动条没有悬停和按下状态，因此 `web-ui` 只定义静止 token。主题通过 `web-ui-theme[resolved-appearance]` 切换三档颜色。`<body>` 下的文档滚动条通过 `html:has()` 跟随。

## API

### 默认导出

OverlayScrollbars 的 `PartialOptions`。它应用随包的滚动条样式，滚动停止 2 秒后隐藏滚动条，并让点击轨道时直接落到点击位置，不播放动画。

### `APP_SCROLLBARS_THEME`

样式类名 `os-theme-macos`。它也是默认导出中的 `scrollbars.theme` 值，并定义在随包加载的样式表中。
