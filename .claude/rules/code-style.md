# 代码风格规范

## 命名约定

- 文件名：kebab-case（如 `offline-queue.ts`）
- 类型/接口：PascalCase（如 `Options`, `Config`）
- 函数/变量：camelCase（如 `ensureQueue`, `retrying`）
- 常量：UPPER_SNAKE_CASE（如 `DEFAULT_OPTIONS`）
- 布尔变量：`is`/`has`/`can` 前缀（如 `queueReady`）

## 架构范式

- 底层代码优先使用函数插件组合模式（参考 `js-kit/src/plugin/index.ts`）
- 通过插件机制实现可扩展性，而非继承或类体系

## 函数风格

- 优先使用函数式风格（纯函数、组合）
- 避免类，除非有明确的状态管理需求
- 异步函数使用 `async/await`，避免 `.then()` 链

## 依赖管理

- 优先使用 monorepo 已有的工具库（`@greypan/js-kit`, `@greypan/browser-kit` 等）
- 引入第三方依赖前必须经人工确认，不得自行添加

## 注释规范

- 注释解释 **为什么**，不解释 **是什么**
- 使用中文注释，技术术语可保留英文
- JSDoc 用于公共 API，说明参数、返回值、异常
- 避免冗余注释（代码已经很清楚的不需要注释）

## 类型安全

- 严格 TypeScript，避免 `any`
- 使用泛型保持类型推导
- Mock 函数需要类型参数：`vi.fn<Type>()`
- Response 等类型需要显式断言：`as Response`

## 导入顺序

自动排序由 formatter 处理，手动组织时按以下顺序：

1. Node 内置模块（`node:path`, `node:fs`）
2. 第三方库（`@greypan/js-kit`, `idb-keyval`, `remeda`）
3. 内部模块（`@/shortcut`, `../plugins/core`）
4. 父级模块（`../../utils`）
5. 同级模块（`./helper`）
6. 类型导入（`type { ... }`）

## 错误处理

- 降级逻辑必须有注释说明
- 不要吞掉错误，除非有明确理由

## 代码组织

- 每个文件一个主要功能
- 内部辅助函数放在导出函数之后
- 类型定义放在文件顶部或单独的类型文件
