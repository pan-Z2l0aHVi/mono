<!-- corpus-status: reference -->

# Wails 3 SPA 路由研究：Hash vs History

> 状态：非权威参考（时点性研究）。结论以现行 ADR、源码与测试为准。
> 文中行号、实测数值与「当前实现」类描述均为写作时点，不随实现同步；现行权威见所引 ADR、源码与测试。

## 结论

当前使用 hash 路由符合 Wails 3 官方推荐，是桌面应用的合理设计，不是过时选择。（2026-10-30 核验：现行 hash 路由证据见 `apps/interweave/frontend/src/main.ts:13`）

---

## 官方文档依据

### 1. Wails 3 官方路由指南

> **Hash mode uses the URL hash to render different views, avoiding issues with the Wails runtime interfering with routing by using the hash-based URL format.**

官方明确推荐 Vue 使用 Hash Mode：

```javascript
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    //...
  ]
})
```

来源：<https://v3.wails.io/guides/routing>

（2026-10-30 核验：上面引文与示例代码只出现 Vue/`vue-router`；本篇下文两处「明确推荐**所有框架**使用 Hash 路由」是正文的强化表述，与本节引文范围不一致。外部文档本身属时点内容，未复核。）

### 2. 为什么选择 Hash 路由

官方解释：

> **Hash-based routing (#/page instead of /page) avoids conflicts with:**
>
> - The Wails runtime's internal routing
> - Native window URL handling on different platforms
> - Production assets served from non-root paths

### 3. Asset Server 的 SPA 支持

根据 Wails 3 官方文档（`asset-server.mdx`，即文末来源 2 的 <https://v3.wails.io/contributing/asset-server>，两处写法在此统一），Asset Server 的请求处理逻辑是：

> 1. Try the embedded static assets at the requested path.
> 2. **Fall back to `index.html` for SPA routing.**
> 3. Sniff content-type if the extension is unknown
> 4. Set sensible cache headers.

Asset Server 支持 SPA fallback，但这是生产模式下的行为。

---

## 技术分析

### Wails 3 Asset Server 工作原理

#### 开发模式（Dev Mode）

```
Browser → AssetServer → Vite Dev Server (via FRONTEND_DEVSERVER_URL)
```

- 开发模式下，Wails 3 会启动 Vite dev server
- Asset Server 反向代理到 Vite dev server
- Vite 本身支持 SPA fallback，所以开发模式下 history 路由也能工作

（2026-10-30 核验：本节是上游 Wails 3 的行为描述，未在本仓复验。本仓的 dev 入口是 `wails3 dev`（`apps/interweave/package.json`）与 `Taskfile.yml:36` 的 `wails3 dev -config ./build/config.yml -port {{.VITE_PORT}}`；Go 侧 `apps/interweave/main.go:25-26` 用 `//go:embed all:frontend/dist` 承载前端资产。）

#### 生产模式（Production Mode）

```
Browser → AssetServer → Embedded FS (go:embed)
```

- 前端资产被嵌入到 Go 二进制中
- Asset Server 从嵌入的文件系统提供服务
- 支持 SPA fallback：如果请求的文件不存在，回退到 `index.html`

### Hash 路由 vs History 路由对比

| 特性             | Hash 路由 | History 路由     |
| ---------------- | --------- | ---------------- |
| 官方推荐         | 是        | 否               |
| URL 美观度       | `/#/tags` | `/tags`          |
| 跨平台兼容性     | 无需配置  | 需要测试         |
| Wails 运行时干扰 | 无        | 可能有           |
| 生产构建兼容性   | 无需配置  | 需要测试         |
| 桌面应用适用性   | 完全契合  | 可用但需额外工作 |

---

## 对于桌面应用的特殊考虑

### Hash 路由的优势

1. 官方推荐：Wails 3 官方文档明确推荐所有框架使用 Hash 路由（2026-10-30 核验：官方引文只出现 Vue/`vue-router`，见上文「Wails 3 官方路由指南」一节；「所有框架」是本文的强化表述）
2. 跨平台兼容：避免原生窗口 URL 处理在不同平台上的差异
3. Wails 运行时兼容：避免与 Wails 运行时内部路由冲突
4. 零配置：生产构建无需额外配置
5. 桌面应用特性：URL 不会被用户手动输入或分享

### History 路由的潜在问题

1. Wails 运行时干扰：官方文档提到可能存在冲突
2. 跨平台差异：不同平台的原生窗口 URL 处理可能不同
3. 生产构建配置：需要确保 Vite 配置正确（`base: "./"`）（2026-10-30 核验：`apps/interweave/frontend/vite.config.ts` 里没有任何 `base:` 设置；本仓走 hash 路由而不是相对 base，这条「必需配置」不是本仓现状）
4. 调试复杂度：可能出现难以追踪的路由问题

---

## 建议

短期保持 hash 路由：它是 Wails 3 官方推荐的最佳实践，避免引入不必要的复杂性，而桌面应用的 URL 美观度不是优先级。（2026-10-30 核验：现行仍是 hash 路由，见 `apps/interweave/frontend/src/main.ts:13`；「官方推荐」的范围同上，只覆盖 Vue/`vue-router`）

如果确需改为 History 路由：

1. 修改路由入口（本仓没有 `router.ts`；路由实际在 `apps/interweave/frontend/src/main.ts:12-21`）：

   ```typescript
   import { createRouter, createWebHistory } from 'vue-router'
   export const router = createRouter({
     history: createWebHistory(),
     routes: [...]
   })
   ```

   （2026-10-30 核验：本仓的 file-based 路由表由 `vue-router/vite` 从 `src/pages/**` 生成，`apps/interweave/frontend/src/main.ts:5` 取到 `routes` 后经 `:19` 的 `...routes` 展开进 `main.ts:14-20` 那个手写字面量数组（同级还写着 `/`→`/library` 的 redirect），所以「不再手写」只对表体成立、数组本身仍在 `main.ts` 里；插件配置在 `apps/interweave/frontend/vite.config.ts:13,92`，该约定另记于 `apps/interweave/AGENTS.md:9`，`typed-router.d.ts` 受版本控制。改 history 只需把 `createWebHashHistory()`（`main.ts:13`）换成 `createWebHistory()` 这一行、`...routes` 保持生成；像上面那样整段手写 `routes: [...]` 会覆盖 file-based 路由表。切换时还要保留 `apps/interweave/frontend/src/main.ts:23-25` 的 `handleHotUpdate(router)`。）

2. 修改 Vite 配置（`apps/interweave/frontend/vite.config.ts`）：

   ```typescript
   export default defineConfig({
     base: './' // 确保相对路径
     // ...
   })
   ```

3. 测试所有路由在开发和生产模式下的行为
4. 特别注意：Wails 运行时是否干扰路由；macOS/Windows/Linux 行为是否一致；deep link 是否正常工作

---

## 官方文档来源

1. 路由指南：<https://v3.wails.io/guides/routing>——明确推荐所有框架使用 Hash 路由，并解释为什么 Hash 路由更适合 Wails 应用（2026-10-30 核验：「所有框架」是正文的强化表述，本篇引文只出现 Vue/`vue-router`；外部链接与其内容属写作时点，未复核）
2. Asset Server 文档：<https://v3.wails.io/contributing/asset-server>——说明 Asset Server 支持 SPA fallback，以及开发模式和生产模式的区别（即正文「Asset Server 的 SPA 支持」一节写作 `asset-server.mdx` 的那篇，两处写法已统一到本 URL；外部链接属写作时点，未复核）
