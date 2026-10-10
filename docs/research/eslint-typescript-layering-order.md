# ESLint / oxlint「基础层 + TS 特化层」覆盖顺序调研

> 回答「JS 基础层（面广）+ TS 特化层（面窄）在两套配置块命中同一文件时，行业惯例的正确先后顺序是什么」。调研日期 2026-10-09。官方论断追溯 eslint.org / oxc.rs / typescript-eslint.io 与上游源码；真实仓库论断追溯 GitHub 默认分支原始文件（ref = 抓取时 HEAD，2026-10-09）。逐条标注「官方文档 / 源码事实 / 推断」。三套体系（ESLint flat config、ESLint legacy eslintrc、oxlint overrides）覆盖语义分别说明。

---

## 结论（TL;DR）

1. **行业惯例：基础层在前、特化层在后。** 无论 ESLint flat config、ESLint legacy（eslintrc）还是 oxlint，**命中同一文件的多份配置一律「后者覆盖前者」**。因此「面广的基础层」必须写在前面，「面窄的 TS 特化层」写在后面，特化层的 `off`/覆盖才能生效。typescript-eslint 官方所有示例都是 `[js.configs.recommended, tseslint.configs.recommended]` 这一顺序。

2. **typescript-eslint 把「特殊化层在后」做成了官方配置语义**：它的 `eslint-recommended` 配置官方定义就是「**use it after extending `eslint:recommended`**」，作用是「为 TS 文件关掉一批被 TypeScript 编译器取代的 core 规则」；`tseslint.configs.recommended` 会自动包含它。所以 `js.configs.recommended` 在前、`tseslint.configs.*` 在后是官方钦定形态（见 §4，含被关闭规则清单）。

3. **oxlint 官方文档只显式写了 `extends` 的「first → last，后者覆盖前者」，没有明文写多个 `overrides` 之间的先后**；但 oxlint 源码 `Config::apply_overrides` 按 `overrides` 数组顺序逐条 `insert`/`remove`，因此**后者覆盖前者是源码事实**（见 §5）。

4. **本仓库现状是反的**：`vite.config.ts` 里 override 1（TS 特化层，`files: ['**/*.{ts,tsx,vue}']`，窄）排在前、override 2（JS 基础层，`files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,vue}']`，广）排在后。按「后者覆盖前者」，override 2 的 `error` 把 override 1 的 `off` 全部盖掉，override 1 沦为死配置。修法是把**基础层整体挪到特化层之前**（顺序对调或合并），与 §4、§6 的惯例一致。

---

## 1. 问题背景

本仓库用 vite-plus（`vp`）统一工具链，lint 由 oxlint 驱动。根 `vite.config.ts` 的 `lint.overrides` 数组里有两块「面广 vs 面窄」的配置：

- **override 1**（`files: ['**/*.{ts,tsx,vue}']`，窄）：typescript-eslint 风格的 TS 特化层——把一批 ESLint core 规则设 `off`（`constructor-super`、`getter-return`、`no-dupe-keys`、`no-undef`、`no-unreachable` 等），并打开一批 `@typescript-eslint/*` 规则。
- **override 2**（`files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,vue}']`，广）：ESLint core recommended 基础层——把同一批 core 规则设 `error`（`no-undef`/`no-unused-vars`/`no-redeclare` 设 `off`）。

override 1 的 glob 是 override 2 的子集，且 override 1 排在**前面**。已实测确认 oxlint 的 override 是「后者覆盖前者」，于是 override 1 里的 `off` 全被 override 2 的 `error` 盖掉。核心待验证的问题：**业内处理「基础层 + TS 特化层」的正确先后顺序惯例是什么？** 本文把这个问题拆到三套配置体系和 8 个真实仓库上逐一核对。

---

## 2. ESLint flat config 的覆盖语义（官方原文）

来源：[Configuration Files（flat config）](https://eslint.org/docs/latest/use/configure/configuration-files)，条目「Cascading Configuration Objects」；[ESLint's new config system, Part 2](https://eslint.org/blog/2022/08/new-config-system-part-2/)（eslint.org 官方博客）。

- 官方文档原文（Cascading Configuration Objects）：

  > **When more than one configuration object matches a given filename, the configuration objects are merged with later objects overriding previous objects when there is a conflict.**

- 同页说明：不带 `files` / `ignores` 的 configuration object「automatically applied to any file that is matched by any other configuration object」——即「全局默认层」也参与这套合并，且位置决定胜负。

- 官方博客（Part 2）对同一机制的描述：

  > Inside of the array, ESLint finds all config objects that match the file being linted and merges them together in much the same way that eslintrc did. The only real difference is **the merge happens from the top of the array down to the bottom** instead of using files in a directory structure.

- 同一对象内的 `extends` 也是有序数组：官方文档把 `extends` 定义为「an array of strings, configuration objects, or configuration arrays that contain additional configuration to apply」。

**结论（flat config）**：数组自前往后合并，**后面的对象在冲突时覆盖前面的**。因此「面窄的 TS 特化层」要写在「面广的基础层」之后，才不会被基础层反盖。

---

## 3. ESLint legacy（eslintrc）顺序语义

来源：[Configuration Files（v8.x eslintrc）](https://eslint.org/docs/v8.x/use/configure/configuration-files)；[archive.eslint.org · Configuration Files · Glob Pattern Overrides](https://archive.eslint.org/docs/user-guide/configuring/configuration-files)。

- `extends` 数组：官方原文

  > an array of strings where **each additional configuration extends the preceding configurations**

  即数组里靠后的 extends 在冲突时覆盖靠前的。

- `overrides`（glob 覆盖块）的先后：官方原文

  > **Glob pattern overrides have higher precedence than the regular configuration in the same config file. Multiple overrides within the same config are applied in order. That is, the last override block in a config file always has the highest precedence.**

**结论（legacy）**：与 flat config 同向——「窄 glob 的 override > 同文件里的常规配置」，且**同 config 内多个 override「最后一个优先级最高」**。因此「基础规则放常规 `rules`、TS 特化放靠后的 override」是 eslintrc 时代的自然写法。

---

## 4. typescript-eslint 官方分层惯例（含 `eslint-recommended` 关掉的规则清单）

来源：[typescript-eslint · Shared Configs](https://typescript-eslint.io/users/configs/)；源码 [`eslint-recommended-raw.ts`](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/eslint-recommended-raw.ts)。

### 4.1 官方示例一律「基础层在前、TS 特化在后」

`extends` 顺序（官方文档原文示例）：

```js
// 无类型检查
extends: [js.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic]

// 有类型检查
extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked, tseslint.configs.stylisticTypeChecked]

// 只关类型检查（utility 配置）——基础对象在前，**/*.js 的 disable 覆盖在后面的独立对象
export default defineConfig(
  { files: ['**/*.{js,ts}'], extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked], /* ... */ },
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
);
```

legacy 侧同序：`extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:@typescript-eslint/stylistic']`。

### 4.2 `eslint-recommended` 的官方定义：**after** `eslint:recommended`

官方文档原文：

> This ruleset is meant to be used **after** extending `eslint:recommended`. It disables core ESLint rules that are already checked by the TypeScript compiler. Additionally, it enables rules that promote using the more modern constructs TypeScript allows for.

官方示例顺序是 `extends: [js.configs.recommended, tseslint.configs.eslintRecommended]`（基础在前、特殊在后），并注明「This config is automatically included if you use any of the recommended configurations」——即 `tseslint.configs.recommended` 内部已经把这一步串好，写 `[js.configs.recommended, tseslint.configs.recommended]` 就等于「先上 core base，再用 TS 特化层覆盖」。

### 4.3 `eslint-recommended` 的被关闭 / 被打开规则（源码事实）

`packages/eslint-plugin/src/configs/eslint-recommended-raw.ts`（注释标明「disables rules from eslint:recommended which are already handled by TypeScript；enables rules that make sense due to TS's typechecking / transpilation」）：

- **设为 `off`（被 TS 编译器取代）**：`constructor-super`、`getter-return`、`no-class-assign`、`no-const-assign`、`no-dupe-args`、`no-dupe-class-members`、`no-dupe-keys`、`no-func-assign`、`no-import-assign`、`no-new-native-nonconstructor`、`no-new-symbol`、`no-obj-calls`、`no-redeclare`、`no-setter-return`、`no-this-before-super`、`no-undef`、`no-unreachable`、`no-unsafe-negation`、`no-with`。
- **设为 `error`（TS 允许的现代写法）**：`no-var`、`prefer-const`、`prefer-rest-params`、`prefer-spread`。
- 生效 glob（flat config / minimatch）：`['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']`；legacy glob：`['*.ts', '*.tsx', '*.mts', '*.cts']`。

> 与本仓库对照：override 1 里被设 `off` 的规则（`constructor-super`、`getter-return`、`no-dupe-keys`、`no-class-assign`、`no-const-assign`、`no-dupe-class-members`、`no-func-assign`、`no-import-assign`、`no-new-native-nonconstructor`、`no-obj-calls`、`no-setter-return`、`no-this-before-super`、`no-undef`、`no-unreachable`、`no-unsafe-negation`、`no-with`）几乎逐条对应 typescript-eslint `eslint-recommended` 的关闭清单。也就是说 override 1 想复刻的就是这个特化层——但顺序反了，导致它被基础层覆盖。

---

## 5. oxlint overrides 的顺序语义（官方依据）

来源：[Oxlint Configuration](https://oxc.rs/docs/guide/usage/linter/config.html)；[Oxlint Configuration File reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html)；源码 [`config_store.rs`](https://github.com/oxc-project/oxc/blob/main/crates/oxc_linter/src/config/config_store.rs)。

### 5.1 官方文档写了什么、没写什么

- **`extends` 的先后：官方有明文。** config-file-reference 原文：

  > The configuration files are merged **from the first to the last, with the last file overriding the previous ones**.

  config 页也写「Configs are merged from first to last, with later entries overriding earlier ones」。

- **多个 `overrides` 之间的先后：官方文档没有明说。** config 页与 reference 对 `overrides` 只有一句「Add, remove, or otherwise reconfigure rules for specific files or groups of files」，未规定命中同一文件的多个 override 谁覆盖谁。**此处属于「未找到一手文档明文」，据实说明。**

- 可作方向旁证的官方明文：CLI 的 `-A/-W/-D`「Arguments are applied from left to right」。

### 5.2 源码事实：后者覆盖前者

`crates/oxc_linter/src/config/config_store.rs` 的 `Config::apply_overrides`：先用 `self.overrides.iter().filter(|c| c.files.is_match(path) && !c.exclude_files.is_match(path))` 按**数组顺序**筛出命中文件的 override，再 `for override_config in overrides_to_apply` 逐条应用；每条规则执行

```rust
if *severity == AllowWarnDeny::Allow {
    rules.remove(rule);
} else {
    let _ = rules.remove(rule);
    rules.insert(rule.clone(), *severity);
}
```

即**同一规则被后面的 override 命中就覆盖前面**（`off`/`Allow` 会把它从表里移除）。这解释并佐证了本仓库「override 1 的 `off` 被 override 2 的 `error` 盖掉」的实测现象。

**结论（oxlint）**：语义与 ESLint flat config 同向（后者覆盖前者），只是官方文档未对 overrides 明说，属源码 + 实测事实。

---

## 6. 主流开源项目实测对比表

以下均为 GitHub 默认分支原始文件（ref = 抓取时 HEAD，2026-10-09）。

| 仓库                                                | 文件                                                                                                    | 基础层位置                                                                                                                  | 特化层位置                                                                                                                                                                              | 判定                                                                                                    | 来源                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **vuejs/core**                                      | `eslint.config.js`                                                                                      | 单一宽对象 `files: ['**/*.js','**/*.ts','**/*.tsx']` + `extends: [tseslint.configs.base]` + 自定义规则                      | 窄覆盖（`files: ['*.js']` 的 `no-unused-vars`、tests、node scripts）均排在**后面**                                                                                                      | 宽前 / 窄后                                                                                             | [raw](https://raw.githubusercontent.com/vuejs/core/main/eslint.config.js)                                                                                                                                                                                                                                                                        |
| **vitejs/vite**                                     | `eslint.config.js`                                                                                      | `eslint.configs.recommended` 在最前                                                                                         | `...tseslint.configs.recommended`、`...tseslint.configs.stylistic` 紧随其后                                                                                                             | 基础前 / TS 后                                                                                          | [raw](https://raw.githubusercontent.com/vitejs/vite/main/eslint.config.js)                                                                                                                                                                                                                                                                       |
| **typescript-eslint/typescript-eslint**（自身）     | `eslint.config.mjs`                                                                                     | `js.configs.recommended`（在 `extends` 数组首位）                                                                           | `tseslint.configs.strictTypeChecked`、`stylisticTypeChecked` 随后；`**/*.js` 的 `disableTypeChecked` 在更后                                                                             | 基础前 / TS 后 / 窄覆盖最后                                                                             | [raw](https://raw.githubusercontent.com/typescript-eslint/typescript-eslint/main/eslint.config.mjs)                                                                                                                                                                                                                                              |
| **nuxt/nuxt**（经 `@nuxt/eslint-config`）           | `packages/eslint-config/src/index.ts`、`configs/javascript.ts`、`configs/typescript.ts`                 | `index.ts` append 顺序：`javascript()` 先；`javascript.ts` = `pluginESLint.configs.recommended`（配置名 `nuxt/javascript`） | `typescript()` 后；`typescript.ts` 在 `**/*.{ts,tsx,mts,cts,vue}` 上重设 core 规则为 `off`（配置名 `nuxt/typescript/rules`）                                                            | 基础前 / TS 后                                                                                          | [index.ts](https://raw.githubusercontent.com/nuxt/eslint/main/packages/eslint-config/src/index.ts) · [javascript.ts](https://raw.githubusercontent.com/nuxt/eslint/main/packages/eslint-config/src/configs/javascript.ts) · [typescript.ts](https://raw.githubusercontent.com/nuxt/eslint/main/packages/eslint-config/src/configs/typescript.ts) |
| **TanStack/router**（经 `@tanstack/eslint-config`） | 应用 `eslint.config.js`；shared `packages/eslint-config/src/index.ts`、`javascript.ts`、`typescript.ts` | 应用侧 `...tanstackConfig` 在最前；shared 侧 `jsRules = { ...javascriptRules, ...typescriptRules, ... }`（JS 对象先展开）   | 应用侧项目 override 在 `tanstackConfig` 之后；shared 侧 `typescriptRules` 覆盖 `javascriptRules`                                                                                        | 基础前 / TS 后（同一对象内也是 JS 前、TS 后）                                                           | [router](https://raw.githubusercontent.com/TanStack/router/main/eslint.config.js) · [index.ts](https://raw.githubusercontent.com/TanStack/config/main/packages/eslint-config/src/index.ts)                                                                                                                                                       |
| **TanStack/query**                                  | `eslint.config.js`                                                                                      | `...tanstackConfig` 在最前                                                                                                  | jsdoc / cspell / vitest 等 override 在其**之后**                                                                                                                                        | 基础前 / 特化后                                                                                         | [raw](https://raw.githubusercontent.com/TanStack/query/main/eslint.config.js)                                                                                                                                                                                                                                                                    |
| **shadcn-ui/ui**                                    | `apps/v4/eslint.config.mjs`                                                                             | `...nextVitals`（`eslint-config-next/core-web-vitals`，含 next + core-web-vitals）在最前                                    | `...tseslint.configs.recommended` 随后；项目规则覆盖在**最后**                                                                                                                          | 基础前 / TS 后 / 项目覆盖最后                                                                           | [raw](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/eslint.config.mjs)                                                                                                                                                                                                                                                             |
| **antfu/eslint-config**（被大量项目复用）           | `src/factory.ts`、`configs/javascript.ts`、`configs/typescript.ts`                                      | `factory.ts`：`configs.push(..., javascript(...), ...)` 在前                                                                | `factory.ts`：`if (enableTypeScript) configs.push(typescript(...))` 在后；`javascript.ts` 用 `error` 打开 core 规则，`typescript.ts` 先 apply `eslint-recommended` 再关掉冲突 core 规则 | 基础前 / TS 后；源码注释直接写明「Registered after the TypeScript config so its override takes effect」 | [factory.ts](https://raw.githubusercontent.com/antfu/eslint-config/main/src/factory.ts) · [javascript.ts](https://raw.githubusercontent.com/antfu/eslint-config/main/src/configs/javascript.ts) · [typescript.ts](https://raw.githubusercontent.com/antfu/eslint-config/main/src/configs/typescript.ts)                                          |
| **oxc-project/oxc**（oxlint 上游自身）              | `.oxlintrc.json`                                                                                        | 顶层 `rules` + `categories`（全局基础层，对所有文件生效）                                                                   | `overrides[]` 按数组顺序叠加，窄 glob（`packages/codegen/**`、`tasks/e2e/**` 等）在后                                                                                                   | 基础前 / 特化后（与 §5 源码语义一致）                                                                   | [raw](https://raw.githubusercontent.com/oxc-project/oxc/main/oxlintrc.json)                                                                                                                                                                                                                                                                      |

补充（未能取得一手文件）：

- **vitest-dev/vitest**：根 `package.json` 显示 lint 已迁移到 oxlint（`"lint": "oxlint && oxfmt --check"`），属 oxlint 采用者；但其 oxlint 配置文件在本次抓取中**未取到**（多个候选路径均 fetch 失败），因此**无法对其 override 排列下一手判定**，不做臆测。来源：[package.json](https://raw.githubusercontent.com/vitest-dev/vitest/main/package.json)。

**表内一致结论**：8 个仓库、横跨 ESLint flat config 与 oxlint 两套体系，**全部是「面广的基础层在前、面窄的特化层在后」**；没有任何一个把窄的特化层放在宽的基础层之前。这与 §2/§3/§5 的覆盖语义（后者覆盖前者）完全自洽。

---

## 7. 结论与对本仓库的建议

### 7.1 三套体系的覆盖语义对照

| 体系                          | 「谁覆盖谁」的一手依据                                                                                                                                                                        | 关键结论                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **ESLint flat config**        | 「merged with **later objects overriding previous objects** when there is a conflict」；博客「merge from the top of the array down to the bottom」                                            | 数组越靠后越赢；特化层应写在基础层之后                |
| **ESLint legacy（eslintrc）** | 「Multiple overrides ... applied in order. **the last override block ... has the highest precedence**」；`extends` 数组「each additional configuration extends the preceding configurations」 | 同 config 内 override 最后一个最优先；extends 后者赢  |
| **oxlint overrides**          | 官方文档**未明文写 override 先后**；`extends` 明文「first → last，后者覆盖前者」；源码 `apply_overrides` 按数组顺序 `insert`/`remove`（后者覆盖前者）                                         | 语义同向「后者赢」，但 override 的先后是源码/实测事实 |

三者方向一致，**不存在「特化层放前面才对」的体系**。

### 7.2 对本仓库的建议（只给判据，不实施）

- **现状问题（源码事实 + 实测）**：`vite.config.ts` 的 override 1（TS 特化，窄 glob）在前、override 2（JS 基础，宽 glob）在后。按「后者覆盖前者」，override 2 的 `error` 覆盖 override 1 的 `off`，override 1 成为死配置：`constructor-super`、`getter-return`、`no-dupe-keys`、`no-unreachable`… 全部从 `off` 变回 `error`；override 1 里想设为 `warn`/`error` 的 `no-unused-vars`/`no-redeclare` 也被 override 2 的 `off` 反盖。
- **惯例修法**：把**基础层（宽 glob）整体前移、TS 特化层（窄 glob）后移**——即让 override 2（`js/jsx/ts/tsx/vue` 的 core recommended）排在 override 1（`ts/tsx/vue` 的 TS 特化）**之前**。这正对应 typescript-eslint 官方的 `[js.configs.recommended, tseslint.configs.recommended]`。
- **等价替代**：也可把两层并入**同一个** override 对象（先展开 core recommended、再展开 TS 特化），顺序在对象内部先基础后特化——与 TanStack shared config 的 `{ ...javascriptRules, ...typescriptRules }` 同一手法，可规避「跨 override 先后靠位置决定」的隐式耦合。
- **注意面差**：`js`/`jsx` 文件只命中基础层（override 1 的 glob 不含它们），因此对这两类文件行为不变；只有 `ts/tsx/vue` 会因顺序调整而恢复 override 1 的本意。

> 注：本调研只做结论与判据，不实施任何配置修改。调整 `vite.config.ts` 的 override 顺序属独立变更任务，需按仓库 workflow 立项，并用 `vp check` 验证调整后 override 1 的规则确实生效（例如确认 `constructor-super` 等对 `.ts` 文件恢复 `off`）。

---

## 来源

**ESLint 官方一手**

- [Configuration Files（flat config，Cascading Configuration Objects）](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint's new config system, Part 2: Introduction to flat config（2022-08-05，flat config 自顶向下合并）](https://eslint.org/blog/2022/08/new-config-system-part-2/)
- [Configuration Files（v8.x eslintrc：`extends` 数组顺序）](https://eslint.org/docs/v8.x/use/configure/configuration-files)
- [Configuration Files（archive，Glob Pattern Overrides：override 应用顺序与最高优先级）](https://archive.eslint.org/docs/user-guide/configuring/configuration-files)

**typescript-eslint 官方一手**

- [Shared Configs（`js.configs.recommended` 与 `tseslint.configs.*` 的排列顺序、`eslint-recommended` 定义、`disable-type-checked` 示例）](https://typescript-eslint.io/users/configs/)
- [源码 `packages/eslint-plugin/src/configs/eslint-recommended-raw.ts`（被关闭 / 被打开规则清单）](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/eslint-recommended-raw.ts)

**oxlint / Oxc 官方一手**

- [Oxlint Configuration（`extends` first→last；overrides 未明文规定先后）](https://oxc.rs/docs/guide/usage/linter/config.html)
- [Oxlint Configuration File reference（`extends` 合并顺序；`overrides` 字段说明）](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html)
- [源码 `crates/oxc_linter/src/config/config_store.rs`（`Config::apply_overrides` 按数组顺序 insert/remove）](https://github.com/oxc-project/oxc/blob/main/crates/oxc_linter/src/config/config_store.rs)

**真实仓库原始文件（ref = GitHub 默认分支 HEAD，抓取于 2026-10-09）**

- vuejs/core `@main`：`eslint.config.js`
- vitejs/vite `@main`：`eslint.config.js`
- typescript-eslint/typescript-eslint `@main`：`eslint.config.mjs`
- nuxt/eslint `@main`：`packages/eslint-config/src/index.ts`、`packages/eslint-config/src/configs/javascript.ts`、`packages/eslint-config/src/configs/typescript.ts`
- TanStack/router `@main`：`eslint.config.js`；TanStack/query `@main`：`eslint.config.js`；TanStack/config `@main`：`packages/eslint-config/src/index.ts`、`src/javascript.ts`、`src/typescript.ts`
- shadcn-ui/ui `@main`：`apps/v4/eslint.config.mjs`
- antfu/eslint-config `@main`：`src/factory.ts`、`src/configs/javascript.ts`、`src/configs/typescript.ts`
- oxc-project/oxc `@main`：`oxlintrc.json`（`.oxlintrc.json`）
- vitest-dev/vitest `@main`：`package.json`（`lint: oxlint && oxfmt --check`；oxlint 配置文件未取到）

**本仓库源码事实**

- 根 `vite.config.ts` 的 `lint.overrides`（override 1 = `**/*.{ts,tsx,vue}` 的 TS 特化层；override 2 = `**/*.{js,mjs,cjs,jsx,ts,tsx,vue}` 的 core recommended 基础层，且排在 override 1 之后）。
