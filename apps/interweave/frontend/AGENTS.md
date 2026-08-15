# interweave-frontend 应用指令

- 这是 `apps/interweave` 的 Vue WebView 集成表面；公共组件契约以 `packages/web-ui` 为准。
- `src/components/`、`src/pages/`、`src/stores/` 和 `router.ts` 是无业务内容的前端骨架。保留其模块边界；后续实现以 `apps/interweave/docs/product.md` 和相关 ADR 为输入。
- Wails 绑定位于 `../frontend/bindings/**`，由 Wails 生成，不手工编辑；前端只能消费来自 `backend/library/` 与 `backend/native/` 的 Interweave Go Service bindings。Wails runtime bindings 不属于此业务 allowlist。修改 Go API 后先重新生成并核对消费端类型。
- `backend/remote/` 与 `backend/internal/` 是 Go 内部模块，不得为其注册 Wails Service，也不得消费其 Interweave Go Service bindings。
- 不保留泛化的 `@api/*` 或 `@bindings/*` alias。第一个公开 Service 生成后，再按实际生成路径只为 `library` 或 `native` 建立显式 alias。
- 修改前端页面、store、组件或交互后，按 `docs/agents/browser-verification.md` 在真实浏览器或 Wails 集成表面验证。
- 不在前端复制领域规则；后续 Go 侧实现统一落在 `apps/interweave/backend/`。
