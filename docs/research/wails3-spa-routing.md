# Wails 3 SPA 路由研究：Hash vs History

## 结论

**当前使用 hash 路由是 Wails 3 官方推荐的最佳实践。** 不是过时，而是桌面应用的合理设计。

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

**来源**: https://v3.wails.io/guides/routing

### 2. 为什么选择 Hash 路由

官方解释：

> **Hash-based routing (#/page instead of /page) avoids conflicts with:**
>
> - The Wails runtime's internal routing
> - Native window URL handling on different platforms
> - Production assets served from non-root paths

### 3. Asset Server 的 SPA 支持

根据 Wails 3 官方文档（`asset-server.mdx`），Asset Server 的请求处理逻辑是：

> 1. Try the embedded static assets at the requested path.
> 2. **Fall back to `index.html` for SPA routing.**
> 3. Sniff content-type if the extension is unknown
> 4. Set sensible cache headers.

**关键发现**：Asset Server **确实支持 SPA fallback**，但这是在生产模式下的行为。

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

#### 生产模式（Production Mode）

```
Browser → AssetServer → Embedded FS (go:embed)
```

- 前端资产被嵌入到 Go 二进制中
- Asset Server 从嵌入的文件系统提供服务
- **支持 SPA fallback**：如果请求的文件不存在，回退到 `index.html`

### Hash 路由 vs History 路由对比

| 特性             | Hash 路由       | History 路由        |
| ---------------- | --------------- | ------------------- |
| 官方推荐         | ✅ **官方推荐** | ❌ 不推荐           |
| URL 美观度       | ⭐⭐ `/#/tags`  | ⭐⭐⭐⭐ `/tags`    |
| 跨平台兼容性     | ✅ 无需配置     | ⚠️ 需要测试         |
| Wails 运行时干扰 | ✅ 无           | ⚠️ 可能有           |
| 生产构建兼容性   | ✅ 无需配置     | ⚠️ 需要测试         |
| 桌面应用适用性   | ✅ 完美         | ✅ 可用但需额外工作 |

---

## 对于桌面应用的特殊考虑

### Hash 路由的优势

1. **官方推荐**：Wails 3 官方文档明确推荐所有框架使用 Hash 路由
2. **跨平台兼容**：避免原生窗口 URL 处理在不同平台上的差异
3. **Wails 运行时兼容**：避免与 Wails 运行时内部路由冲突
4. **零配置**：生产构建无需额外配置
5. **桌面应用特性**：URL 不会被用户手动输入或分享

### History 路由的潜在问题

1. **Wails 运行时干扰**：官方文档提到可能存在冲突
2. **跨平台差异**：不同平台的原生窗口 URL 处理可能不同
3. **生产构建配置**：需要确保 Vite 配置正确（`base: "./"`）
4. **调试复杂度**：可能出现难以追踪的路由问题

---

## 建议

### 短期（当前阶段）

**保持 hash 路由。** 理由：

- 这是 Wails 3 官方推荐的最佳实践
- 避免引入不必要的复杂性
- 桌面应用的 URL 美观度不是优先级

### 如果坚持改为 History 路由

虽然官方不推荐，但如果确实需要，需要：

1. 修改 `router.ts`：

   ```typescript
   import { createRouter, createWebHistory } from 'vue-router'
   export const router = createRouter({
     history: createWebHistory(),
     routes: [...]
   })
   ```

2. 修改 Vite 配置（`vite.config.ts`）：

   ```typescript
   export default defineConfig({
     base: './' // 确保相对路径
     // ...
   })
   ```

3. 测试所有路由在开发和生产模式下的行为

4. 特别注意：
   - Wails 运行时是否干扰路由
   - 不同平台（macOS/Windows/Linux）的行为是否一致
   - Deep link 是否正常工作

---

## 官方文档来源

1. **路由指南**: https://v3.wails.io/guides/routing
   - 明确推荐所有框架使用 Hash 路由
   - 解释了为什么 Hash 路由更适合 Wails 应用

2. **Asset Server 文档**: https://v3.wails.io/contributing/asset-server
   - 说明了 Asset Server 支持 SPA fallback
   - 解释了开发模式和生产模式的区别

---

## 最终结论

**保持 hash 路由是正确的选择。** 这不是过时的设计，而是 Wails 3 官方推荐的最佳实践。桌面应用的 URL 美观度远不如跨平台兼容性和稳定性重要。
