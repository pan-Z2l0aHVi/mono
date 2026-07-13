# 依赖管理策略

## devDependencies 放置优先级

| 层级                   | 放哪                   | 示例                                                                                                                                 |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 共享工具链             | 根 `devDependencies`   | `typescript`, `turbo`, `vite`, `vite-plus`, `vue-tsc`, `cspell`, `stylelint*`, `@changesets/cli`                                     |
| Vite/rolldown 插件生态 | 根 `devDependencies`   | `@vitejs/plugin-react`, `@vitejs/plugin-vue`, `@tanstack/router-plugin`, `vite-plugin-*`, `@rolldown/plugin-babel`, `babel-plugin-*` |
| 框架私有工具           | 子包 `devDependencies` | `@testing-library/react`, `@vue/test-utils`, `@types/react`, `@types/react-dom`, `unplugin-auto-import`                              |
| 测试基础设施（包私有） | 子包 `devDependencies` | `@vitest/browser-playwright`, `playwright`                                                                                           |
| 测试基础设施（共享）   | 根 `devDependencies`   | `jsdom`, `@types/jsdom`, `msw`                                                                                                       |

**原则**：

- 跟 vite 类型系统耦合的插件一律放根 devDeps，避免 pnpm 独立解析导致类型分叉
- 跟框架绑定的测试/类型工具放对应子包 devDeps

## dependencies

运行时依赖放在对应子包的 `dependencies` 中，通过 `catalog:` 统一版本。

## peerDependencies

- 子包需要消费者自行安装的依赖用 `peerDependencies`
- 优先用 `catalog:` 引用（等价 `^` 范围）
- 需要宽松版本范围时硬编码（如 `react: ">=16"`, `vue: ">=3"`）
- 同时在子包的 `devDependencies` 中声明（本地构建/类型检查需要）
- 可选 peer dep 在 `peerDependenciesMeta` 中标记 `optional: true`

## pnpm 配置

```yaml
catalogMode: prefer
overrides:
  vite: 'catalog:'
peerDependencyRules:
  allowAny:
    - vite
  allowedVersions:
    vite: '*'
```
