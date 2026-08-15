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
