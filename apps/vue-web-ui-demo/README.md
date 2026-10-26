# Vue Web UI Demo

这是 `@greypan/web-ui` 的 Vue 集成和预览表面，不是公共组件契约的权威来源。公共属性、slot、事件和类型以 `packages/web-ui` 的源码、README、测试和相关 ADR 为准。

## 结构

- `src/app/`：应用入口和全局布局。
- `src/components/`：仅属于 demo 的组合与展示组件。
- `src/pages/`：页面级集成表面。
- `src/stores/`：demo 的 Pinia 状态。
- `src/type-fixtures/`：Vue 事件和组件类型集成样例。
- `auto-imports.d.ts`、`typed-router.d.ts`：由 Vite plugins 派生的类型；生命周期见 [`docs/agents/build.md`](../../docs/agents/build.md)。

## Commands

在仓库根目录启动该 demo 及其 workspace 依赖的开发进程：

```bash
pnpm dev:vue-web-ui-demo
```

不要只运行包内 `pnpm dev` 来验证跨包集成；它不会编排本地依赖包的构建和监听。

## Agent 入口

修改 Vue 集成或交互前先读同目录 [`AGENTS.md`](./AGENTS.md)，再按任务读取 [`docs/agents/runtime-verification.md`](../../docs/agents/runtime-verification.md) 和 [`packages/web-ui/AGENTS.md`](../../packages/web-ui/AGENTS.md)。命名 handler 的事件类型应沿用 `WebUiEvent`，不要手写 host 类型；修改公共契约时回到 `packages/web-ui` 的文档、类型和测试。

## 语言与文案

整个现有组件站点支持 `zh-CN` / `en`，不增加语言路由。全局语言选择器与 React demo 共用 `localStorage['locale']`：合法偏好优先，再检查浏览器的中文或英文语言，其余默认英文。

壳文案在 SFC 中写中文原文，由私有 [`@greypan/wuchale-vue`](../../packages/wuchale-vue/README.md) 在 Vue 编译前转换，无须手写翻译函数、包装组件或标记注释。`wuchale.config.js` 排除生成物、测试和启动错误界面；组件技术名、Light/Dark 与语言自称保留。dev 使用 `read`，增删壳文案后在本应用目录提取并填写英文 PO：

```sh
mise exec -- pnpm exec wuchale --clean
```

PO 是入库的译文源；loader/catalog 由 wuchale 管理。`check-policy` 的 `shell-i18n-catalog` 同时检查 React 与 Vue 的空译文、消息集合和提取一致性。

正文、API、双框架源码和 Vue 运行示例来自已有 `.CN.md` / `.md`，由 md-to-comp 分别写入 `src/generated/` 与 `src/generated/en/`，共享顶层样式，不由 wuchale 二次处理。语言切换会重建运行示例，其内部交互状态可以重置；站点主题、侧栏和路由状态保留。

`src/i18n/locale.ts` 串行准备 catalog 和文档，仅在两者成功后提交当前语言、document.lang 与偏好。启动先准备检测语种再挂载；失败尝试中文，保留原偏好并提示降级，双重失败显示可重试错误。站内切换期间禁用语言选择器，失败保留当前界面并显示可访问 toast，提示刷新后重试。失败的动态 import 会被浏览器缓存，启动错误页的重试按钮也通过刷新页面重新加载模块。

构建使用 `--mode build`，匹配安装版 wuchale 的 build 判定。新增文案或 PO 更新可能重建组件或重载页面；语言切换的状态保留保证不扩展到 HMR。
