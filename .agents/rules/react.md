# React 组件规范

## React HMR 规则（仅 `.jsx` / `.tsx` 文件）

- **禁止使用匿名 default export**：`export default () => {}` 会导致 Fast Refresh 失效
- 使用具名函数声明：`function MyComponent() {} export default MyComponent`
- 由 oxlint 的 `unicorn/no-anonymous-default-export` 规则强制执行
