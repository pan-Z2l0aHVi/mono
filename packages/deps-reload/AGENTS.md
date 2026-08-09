# deps-reload 包指令

- 该插件只用于开发期：监听本地 workspace 包的 `dist/` 变化并触发整页刷新，不得把它当作生产构建行为。
- 运行时依赖 Node >=20.11 提供的 `import.meta.dirname`；修改目录定位或 watcher 生命周期时先核对源码与相关测试。
