# Web UI Design Token Restructuring

Reorganize duration, easing, and scale tokens for better semantic clarity and consistency.

## Duration Tokens

**New tokens:**

- `--wui-duration-focus: 200ms` — input/textarea focus ring transition

**Renamed:**

- `--wui-duration-fast` → `--wui-duration-trigger` — state change transitions (button, switch, checkbox, radio)

**Split:**

- `--wui-duration-drawer: 280ms` → `--wui-duration-drawer-enter: 280ms` + `--wui-duration-drawer-exit: 240ms`
- Exit is faster than enter (consistent with overlay pattern)

**Reuse:**

- Layout sidebar transition: `--wui-duration-drawer-enter` (replaces hardcoded 250ms)
- Drawer/dialog backdrop: `--wui-duration-feedback: 120ms` (replaces hardcoded 120ms)

## Easing Tokens

**Renamed:**

- `--wui-ease-out` → `--wui-ease-enter` — element appearance/entry
- `--wui-ease-standard` → `--wui-ease-slide` — element movement/sliding

**Rationale:** Names describe usage ("enter", "slide") not curve characteristics ("ease-out"), avoiding confusion with CSS native `ease-out`.

## Scale Tokens

**Adjusted values:**

- `--wui-scale-enter: 0.97` (was 0.97) — subtler entry animation

**Rationale:** Press scale transform removed; active feedback is now purely color-based for more subtle, consistent interaction.

## Consequences

- All component CSS files must be updated to use new token names
- Reduced motion media query must include new tokens
- Breaking change for any external consumers of these tokens
