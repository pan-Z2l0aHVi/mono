# Web UI Design Token 重构

重新组织 duration、easing 和 scale Design Token，以提升语义清晰度和一致性。

## Duration Token

**新增 Token：**

- `--wui-duration-focus: 200ms` — input/textarea 焦点环过渡

**重命名：**

- `--wui-duration-fast` → `--wui-duration-trigger` — 状态变更过渡（button、switch、checkbox、radio）

**拆分：**

- `--wui-duration-drawer: 280ms` → `--wui-duration-drawer-enter: 280ms` + `--wui-duration-drawer-exit: 240ms`
- 退出动画快于进入动画（与 overlay 模式保持一致）

**复用：**

- 布局侧边栏过渡：`--wui-duration-drawer-enter`（替代硬编码的 250ms）
- Drawer/dialog 背景遮罩：`--wui-duration-feedback: 120ms`（替代硬编码的 120ms）

## Easing Token

**重命名：**

- `--wui-ease-out` → `--wui-ease-enter` — 元素出现/进入
- `--wui-ease-standard` → `--wui-ease-slide` — 元素移动/滑动

**理由：** 名称描述用途（"enter"、"slide"）而非曲线特性（"ease-out"），避免与 CSS 原生 `ease-out` 混淆。

## Scale Token

**调整值：**

- `--wui-scale-enter: 0.97`（原值 0.97）— 更细腻的进入动画

**理由：** 移除了按下缩放变换；激活反馈现在完全基于颜色变化，以实现更细腻、更一致的交互体验。

## 影响

- 所有组件 CSS 文件必须更新以使用新的 Token 名称
- Reduced motion 媒体查询必须包含新的 Token
- 对任何外部使用者而言属于破坏性变更
