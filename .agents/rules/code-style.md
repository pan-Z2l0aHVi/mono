# 代码风格规范

## 工具说明

- **Lint & fmt**：由 `vite-plus` 集成的 oxc 工具链（lint + fmt），规则名与 ESLint/Prettier 不同，需查 oxc 文档

## 命名约定

- 文件名：kebab-case（如 `offline-queue.ts`）
- 类型/接口：PascalCase（如 `Options`, `Config`）
- 函数/变量：camelCase（如 `ensureQueue`, `retrying`）
- 常量：UPPER_SNAKE_CASE（如 `DEFAULT_OPTIONS`）
- 布尔变量：`is`/`has`/`can` 前缀（如 `isReady`, `hasPermission`, `canEdit`）

## 架构范式

- 底层代码优先使用函数插件组合模式（参考 `packages/js-kit/src/plugin-system/index.ts`）
- 通过插件机制实现可扩展性，而非继承或类体系

### 插件 Options 规范

插件的配置参数遵循以下约定：

- 可选字段必须在 `DEFAULT_OPTIONS` 中提供默认值，回调类参数默认 `() => {}`
- 通过 `Required<Options>` 生成内部 `Config` 类型，确保运行时所有字段都有值

```ts
interface Options {
  foo?: string
  bar?: number
}
type Config = Required<Options>

const DEFAULT_OPTIONS = {
  foo: 'default',
  bar: 42
}

export function defineXxx(options: Options) {
  return definePlugin(() => {
    const config = { ...DEFAULT_OPTIONS, ...options } as Config
    // ...
  })
}
```

## 函数风格

- 优先使用函数式风格（纯函数、组合）
- 避免类，除非有明确的状态管理需求
- 异步函数使用 `async/await`，避免 `.then()` 链

## 注释规范

- 注释只解释 **为什么**，不解释 **是什么**
- 避免冗余注释（代码已经很清楚的不需要注释）
- 使用中文注释，技术术语可保留英文
- JSDoc 用于公共 API，说明参数、返回值、异常

## 类型安全

- 严格 TypeScript，避免 `any`
- 使用泛型保持类型推导
- Mock 函数需要类型参数：`vi.fn<Type>()`
- Response 等类型需要显式断言：`as Response`
- 返回 `void` 的函数不需要显式声明返回类型（TS 自动推导）
- 类型定义和参数类型中的 `void` 保留（如 `type Fn = () => void`）

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

## 代码验证

- **完成代码改动后，必须先执行 `pnpm run check:code`**（format + lint + type-check），自动修复格式问题并确保无类型错误，再向用户汇报完成
