# @greypan/app-scrollbars

> workspace 内 app 共用的 OverlayScrollbars 配置与 macOS 主题

[English](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/app-scrollbars/README.md) | 简体中文

## 定位

这是私有的应用基础设施，不是公共包。它承载 app 级的覆盖式 scrollbar 行为与 macOS 主题，让这份配置只有一份，
而不是每个 app 各维护一份。

`@greypan/web-ui` 不依赖本包。组件内部的滚动容器使用原生 CSS 与 `web-ui-theme` 提供的
`--wui-scrollbar-handle`。

`overlayscrollbars` 走 workspace catalog，因此这里打包的结构样式与各 app 使用的运行时实例保持同一版本。

## 用法

```ts
import appScrollbarsOptions from '@greypan/app-scrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue' // 或 overlayscrollbars-react
```

导入本包会同时加载它的样式表，不需要再记第二行 import。把默认导出的 options 传给初始化 OverlayScrollbars 的地方：

```vue
<OverlayScrollbarsComponent :options="appScrollbarsOptions">{children}</OverlayScrollbarsComponent>
```

要接管文档 scrollbar、而不是某个容器时，初始化 `document.body`。导入本包时会同时注册 click-scroll 插件，
track 点击会立即滚动到点击处。

## Token

| Token                           | 归属              | 含义                                                  |
| ------------------------------- | ----------------- | ----------------------------------------------------- |
| `--wui-scrollbar-handle`        | `@greypan/web-ui` | 静止档 thumb 色；由最外层主题镜像到 `documentElement` |
| `--app-scrollbar-handle-hover`  | 本包              | hover 时的 thumb 色                                   |
| `--app-scrollbar-handle-active` | 本包              | 按下时的 thumb 色                                     |

原生 scrollbar 没有 hover / active 状态，所以 `web-ui` 刻意不定义这两档；只有覆盖式 scrollbar 需要它们。
三档都跟随 `web-ui-theme[resolved-appearance]` 切换，`<body>` 下的文档级 scrollbar 由 `html:has()` 覆盖。

## API

### 默认导出

OverlayScrollbars 的 `PartialOptions`（`satisfies PartialOptions`）：macOS 主题、滚动时出现并在 2s 后自动
隐去、点击 track 直接落到点击位置且不播动画。

### `APP_SCROLLBARS_THEME`

主题类名（`os-theme-macos`），即默认导出里 `scrollbars.theme` 的值，也定义在随包加载的样式表中。
