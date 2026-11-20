# loading-core

- 仅面向浏览器运行时；不引入框架运行时、Node-only API 或 UI 组件。
- `globalProgress` 是应用级单例；跨导航共享的状态与所有计时器归 `GlobalProgressController` 所有，不要在调用方另行复制状态机。
- `setupChunkErrorRecovery` 只有在确定整页刷新时才调用 `event.preventDefault()`；其余分支必须放行默认行为，避免 Vite 预加载缓存被毒化。
- `progress.css` 是静态资源入口，不通过 JS 注入样式；严格 CSP 环境由消费方导入该子路径。

## 词汇

**加载 token（progress token）**:
一次显式导航或异步任务的句柄；`end()` 幂等，所有并发 token 结束后进度条才收起。
_Avoid_: 进度实例、请求锁

**显式导航（explicit navigation）**:
由用户操作或路由生命周期触发的加载；与 Hover 预加载等后台行为相对，决定 chunk 失败时是否允许整页刷新。
_Avoid_: 主动加载、真实请求

**冷却窗口（reload cooldown）**:
一次自动刷新后的保护期；窗口内再次失败只提示，不刷新，避免循环重载。
_Avoid_: 刷新锁、节流
