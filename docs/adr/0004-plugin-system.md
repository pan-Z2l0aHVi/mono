# ADR-0004: 插件系统

## 背景

工具库软件包（js-kit、browser-kit、test-kit）需要一种可组合的扩展机制，避免类继承，并允许功能的自由组合。

## 决策

在 `packages/js-kit/src/plugin-system/` 中使用 `definePlugin()`，提供链式 API：

```ts
definePlugin(() => setup)
  .use(pluginA)
  .use(pluginB)
  .make(options)
```

- `definePlugin` 创建插件定义
- `.use()` 组合额外的插件
- `.make()` 生成最终配置好的实例
- 选项使用 `DEFAULT_OPTIONS` + `Required<Options>` 模式

## 后果

- 插件是纯函数，易于独立测试
- 新功能以插件形式添加，而非通过类方法继承
- 内部状态通过闭包捕获，而非 `this`
- API 形态稳定：`{ use(), make(), extend() }`

## 队列能力补充（2026-08-21）

### 背景

Tracker 需要一个可持久化的待传输队列，但普通的循环消费队列与“等待消费者结果后再移除”的队列有不同的移除边界。两种能力如果各自维护调度状态，会重复实现入队、暂停、恢复、`flush()` 和持久化提交规则。

### 决策

在 `packages/js-kit/src/plugin-system/plugins/` 中并列提供 `defineQueue` 与 `defineAckQueue`，两者共享私有的 `queue-core`：

- `defineQueue` 在调用 `onConsume` 后立即移除条目，不等待消费者返回的 Promise。
- `defineAckQueue` 只有在 `onConsume` 返回的 Promise fulfilled 后才移除条目；rejection 只将当前条目标记为 failed，不阻塞后续条目。
- 两者都使用 `initialItems`、必填的 `onConsume`、可选的同步 `onPersist` 和 `onConsumeError`。
- `onPersist` 接收待处理项的浅层快照，并使用 persist-before-commit；它必须同步完成，异步 thenable 会被拒绝并使通用队列进入 persistence-blocked 状态。
- `flush()` 返回 `Promise<void>`，按调用时快照并发启动 pending/failed 项，等待本次涉及的操作；消费失败不使整个 flush reject，持久化提交失败会 reject。
- `defineLoopQueue` 直接删除，不保留兼容别名；Tracker core 使用 `defineAckQueue`，但单条传输函数继续命名为 `transport`。

“ack”只表示消费者 Promise fulfilled，不代表服务端确认、exactly-once 或远端事务提交。

### 后果

- 队列调度、状态和持久化边界集中在一个私有内核中；两个公共 plugin 只表达不同的消费确认语义。
- 通用队列遇到持久化异常时 fail-closed。Tracker 对浏览器 localStorage 的适配则明确采用 best-effort memory-only 降级，并告警一次；旧快照残留可能导致后续 at-least-once 重复发送。
- `persistenceKey` 默认使用 Tracker URL。同一 key 的多个独立 Tracker 会共享快照并可能互相覆盖，调用方必须为独立实例提供不同的稳定 key。
