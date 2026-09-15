# web-ui 手写 -webkit- 前缀与 lightningcss 自动前缀调研（iOS 16.4+）

> 回答「vite-plus 的 lightningcss 能否为 `*.css?inline` 导入自动生成 `-webkit-` 前缀，从而删掉 web-ui 里手写的前缀」。调研日期 2026-09-14。所有论断追溯一手来源：`@voidzero-dev/vite-plus-core@0.3.0` 源码（本仓库 `node_modules/vite`）、`lightningcss@1.33.0` 源码/README/类型声明、MDN Browser Compat Data 8.1.1、Vite 官方文档（vite.dev）；关键行为在本机实测。标注：「源码事实 / 官方文档 / 实测 / 推断」。

---

## 结论（TL;DR）

1. **能，且当前工具链已经在自动生成**。在本仓库工具链（vite-plus 0.3.0 / `@voidzero-dev/vite-plus-core` 0.3.0 / lightningcss 1.33.0）下，`*.css?inline` 导入**会经过** lightningcss 变换管线（不是绕过），并按默认 targets 自动生成 `-webkit-` 前缀。`glass.css` 里「lightningcss 对 ?inline 导入不做自动前缀，需手动写前缀版本」的注释已不准确，属于可以删除手写前缀的场景。
2. **默认 targets 恰好覆盖 iOS 16.4+**：fork 在 `css.transformer: 'lightningcss'` 时默认 targets = `ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET` = `["chrome111","edge111","firefox114","safari16.4","ios16.4"]`（注释：Baseline Widely Available on 2025-05-01）。web-ui 的 `vite.config.ts` 只设了 `css: { transformer: 'lightningcss' }`、未覆盖 targets，因此该默认值生效。
3. **实测验证**：用该 fork 的 JS API 构建一个 `?inline` 导入（内容含 `backdrop-filter`、`user-select`、`mask`、`mask-composite`、`text-size-adjust`）的产物，自动带 `-webkit-backdrop-filter`、`-webkit-user-select`、`-webkit-mask-*` 全族、`-webkit-mask-composite:xor`、`-webkit-text-size-adjust`。
4. **可以删掉手写版**（lightningcss 自动生成）：`-webkit-backdrop-filter`（14 处）、`-webkit-mask` / `-webkit-mask-composite`（glass.css）、`-webkit-text-size-adjust`（如以后出现）。
5. **必须保留手写 / 不会被自动生成**：
   - `-webkit-line-clamp` + `display:-webkit-box` + `-webkit-box-orient`（toast/style.css）：标准 `line-clamp` 属性在 iOS 16.4 不受支持，且 lightningcss 不会把标准 `line-clamp` 展开成 `-webkit-box` 技术（实测）；
   - `-webkit-user-drag`（image-preview）：非标准属性、无标准等价物，lightningcss 无从生成（但也不会删除，实测保留原样）；
   - `::-webkit-inner-spin-button` / `::-webkit-outer-spin-button`（input-number）：WebKit 私有伪元素，无标准替代。
6. **前提条件**：前缀生成依赖 `targets`——**不设 targets 时 lightningcss 不生成任何前缀**（实测）。当前默认 targets 由 vite-plus fork 注入；若未来换回 stock Vite 或自行调用 lightningcss，必须显式配置 `css.lightningcss.targets`（或 browserslist → `browserslistToTargets`）才会生成前缀。

---

## 1. `?inline` 是否经过 lightningcss（源码事实）

`@voidzero-dev/vite-plus-core@0.3.0`（即本仓库 `node_modules/vite`，`dist/vite/node/chunks/node.js`）：

- CSS 管线排除清单：`SPECIAL_QUERY_RE = /[?&](?:worker|sharedworker|raw|url)\b/` —— 只有 `?worker` / `?sharedworker` / `?raw` / `?url` 被排除，**`?inline` 不在其中**。
- `vite:css` 插件 transform filter：`{ id: { include: CSS_LANGS_RE, exclude: [commonjsProxyRE, SPECIAL_QUERY_RE] } }` → `?inline` 命中，调用 `compileCSS` → `compileLightningCSS`：`bundleAsync({ ...config.css.lightningcss, filename, projectRoot, resolver, minify, sourceMap, analyzeDependencies, cssModules })`。
- `vite:css-post` 插件对 `?inline`：serve 模式直接 `export default JSON.stringify(css)`；build 模式同（必要时再经 `minifyCSS` 走一次 lightningcss minify，targets 用 `convertTargets(config.build.cssTarget)`）。即 `?inline` 返回的是**处理过**的 CSS 字符串。

官方 Vite 文档同样表述（vite.dev/guide/features）：`?inline` 关闭的是「注入到页面」，返回的是 "the **processed** CSS string"。

## 2. 默认 targets（源码事实）

```js
// resolveCSSOptions
if (resolved.transformer === 'lightningcss') {
  resolved.lightningcss ??= {}
  resolved.lightningcss.targets ??= convertTargets(ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET)
}
// ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET（注释：Baseline Widely Available on 2025-05-01）
;['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4']
```

- `build.target` 默认 `"baseline-widely-available"`，`cssTarget = cssTarget ?? target`，所以 minify 阶段与 transform 阶段都用同一套 targets。
- 同版本 0.2.7 源码也相同，说明该注释至少在 0.2.7 起就已与工具链行为不符。

## 3. lightningcss 前缀能力（源码/README 事实，1.33.0）

- README：「Vendor prefixing – Lightning CSS accepts a list of browser targets, and automatically adds (and removes) vendor prefixes.」「Browserslist configuration – … opt-in browserslist configuration discovery …」。
- `TransformOptions`（`node/index.d.ts`）只有 `targets?: Targets`、`include?: number`、`exclude?: number`，**没有 `browserslist` 选项**；要接 browserslist 必须用 `browserslistToTargets(browserslist(...))` 转成 `Targets`。
- `Features.VendorPrefixes = 262144`；默认 include 开启（实测：设 targets 即出前缀）。

## 4. 实测（2026-09-14，本机 darwin-arm64）

用本仓库 `node_modules/vite`（fork）JS API `build({ css: { transformer: 'lightningcss' }, build: { lib: ... } })` 构建：

```css
/* style.css（仅标准属性 + 一处手写 line-clamp 技术） */
.a {
  backdrop-filter: blur(4px) saturate(160%);
  user-select: none;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  text-size-adjust: 100%;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
```

产物（`?inline` 字符串）自动包含：

- `-webkit-backdrop-filter:blur(4px)saturate(160%)` + 无前缀 `backdrop-filter`
- `-webkit-user-select:none` + `user-select:none`
- `-webkit-mask-composite:xor` + `mask-composite:exclude`
- `-webkit-mask-image/-webkit-mask-position/-webkit-mask-size/-webkit-mask-repeat/-webkit-mask-clip/-webkit-mask-origin/-webkit-mask-source-type` + 对应无前缀族
- `-webkit-text-size-adjust:100%;-moz-text-size-adjust:100%;text-size-adjust:100%`
- 手写 `-webkit-line-clamp:2`、`-webkit-box-orient:vertical`、`display:-webkit-box` 原样保留

直接 lightningcss 对照（同版本）：

- **无 `targets`** → 不生成任何前缀（`backdrop-filter` 等保持无前缀输出）。
- `line-clamp: 2`（标准属性）+ ios16.4 targets → **不展开**为 `-webkit-box` 技术，输出仍为 `line-clamp: 2`。
- `-webkit-user-drag: none` + ios16.4 targets → 原样保留（不会删除）。

## 5. 浏览器兼容事实（MDN Browser Compat Data 8.1.1）

| 属性                | Safari / iOS Safari                                                                   | 对 iOS 16.4 的结论                                   |
| ------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `backdrop-filter`   | 无前缀 18.0 才支持；`-webkit-backdrop-filter` 自 9.0                                  | **必须带前缀**，lightningcss 自动生成                |
| `user-select`       | Safari 只有 `-webkit-user-select`（3.0+）                                             | **必须带前缀**，lightningcss 自动生成                |
| `mask-composite`    | 无前缀 15.4+（关键字不同）；`-webkit-mask-composite` 为旧语法                         | 两条都生成，正确                                     |
| `line-clamp`        | 无前缀 `line-clamp` 仅 Safari preview/TP；稳定版只有 `-webkit-line-clamp`（iOS 4.2+） | **必须用 -webkit box 技术**，lightningcss 不自动展开 |
| `text-size-adjust`  | Safari 桌面不支持；iOS 只有 `-webkit-text-size-adjust`（1.0+）                        | **必须带前缀**，lightningcss 自动生成                |
| `-webkit-user-drag` | 非标准属性（BCD 无条目）                                                              | 无标准等价物，保留手写                               |

## 6. 对 web-ui 的具体建议

当前手写 `-webkit-` 清单（`packages/web-ui/src`）：

| 位置                                                                                                                                  | 手写属性                                                          | 建议                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `assets/glass.css`、`assets/overlay-motion.css`、`components/{toast,dialog,segmented,input,textarea,autocomplete}/style.css` 等 14 处 | `-webkit-backdrop-filter`                                         | 删除，lightningcss 自动生成                                                    |
| `assets/glass.css`（`.wui-glass::before`）                                                                                            | `-webkit-mask`、`-webkit-mask-composite`                          | 删除，自动生成（实测含 `-webkit-mask-image`、`-webkit-mask-composite:xor` 等） |
| `components/toast/style.css`                                                                                                          | `-webkit-line-clamp`、`-webkit-box-orient`、`display:-webkit-box` | 保留（无自动生成来源）                                                         |
| `components/image-preview/style.css`                                                                                                  | `-webkit-user-drag: none`                                         | 保留（非标准属性）                                                             |
| `components/input-number/style.css`                                                                                                   | `::-webkit-inner-spin-button`、`::-webkit-outer-spin-button`      | 保留（WebKit 私有伪元素）                                                      |

删除手写前缀时，同步移除相邻的 `stylelint-disable-next-line property-no-vendor-prefix` 注释（`property-no-vendor-prefix` 由 `stylelint-config-standard` 开启，`packages/web-ui/.stylelintrc.json` 未覆盖该规则）。

另外：`?inline` 在 dev server（serve）模式同样经过 `compileCSS` → lightningcss（`vite:css` 的 transform 在 serve/build 共用），所以 dev 下也带前缀，行为一致。

## 7. 风险与边界（推断 + 官方文档）

- 前缀自动生成的**前提是 targets 被设置**。本仓库靠 vite-plus fork 注入默认 targets；**stock Vite 或独立 lightningcss 调用没有这个默认**（实测无 targets 无前缀）。建议在 web-ui 的 `vite.config.ts` 显式写 `css.lightningcss.targets`（或确认 fork 默认即可），避免升级/换工具链后前缀静默消失。
- `?inline` 返回「已处理」的 CSS 字符串（官方文档），因此删除手写前缀后产物大小会略减，运行时注入 shadow DOM 的行为不变（推断：前缀字符串已内联，不影响 Lit `unsafeCSS`/adoptedStyleSheets 路径）。
- 本调研未改动生产代码；实施删除手写前缀属另一变更任务，需按仓库 workflow 独立立项并做浏览器验证（iOS 16.4 / Safari 真实浏览器）。
