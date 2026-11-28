// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/web-ui" },
  { label: 'h2', id: 'section-2', content: "14.4.0" },
  { label: 'h3', id: 'section-3', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "b940932: Add the <code>wordpress:dashboard</code> icon to the built-in icon registry." }
    ]
  },
  { label: 'h2', id: 'section-4', content: "14.3.0" },
  { label: 'h3', id: 'section-5', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "22821d7: Add <code>--wui-layout-sticky-top</code> to <code>&lt;web-ui-layout></code> so sticky sidebars and headers offset cleanly below custom application title bars." }
    ]
  },
  { label: 'h3', id: 'section-6', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "66e6c29: Release <code>&lt;web-ui-collapse></code> peek masks and glow pseudo-elements once an expansion settles open." },
    { label: 'li', content: "092fe6d: Hide the <code>prefix</code> slot while <code>&lt;web-ui-button></code> is <code>loading</code> so the spinner replaces the leading icon instead of rendering both side by side." },
    { label: 'li', content: "a050c3c: Soften the light-mode <code>--wui-shadow-glass</code> token so <code>.wui-glass</code> surfaces cast a subtler outer shadow." },
    { label: 'li', content: "5f4a9b4: Strengthen primary <code>&lt;web-ui-button></code> hover and active contrast, enable bidirectional overflow scrolling in <code>&lt;web-ui-drawer></code>, and tighten the <code>&lt;web-ui-layout></code> sidebar toggle top margin." },
    { label: 'li', content: "7df0afc: Lighten light-mode neutral surface tokens (control, track, segmented, and sidebar), soften light-mode glass outer and handle shadows, and darken the secondary button background half a step." },
    { label: 'li', content: "2dabb72: Extract the shared <code>MenuSession</code> module under <code>shared/menu-session/</code> and migrate <code>WebUiContextMenu</code> onto it, unifying multi-level submenu lifecycle, portal reconciliation, scroll lock, overlay arbitration, and keyboard/hover interactions." },
    { label: 'li', content: "af56165: Migrate <code>WebUiDropdown</code> onto <code>shared/menu-session/</code> and remove the superseded <code>shared/menu-behavior/</code> and <code>shared/menu-portal/</code> modules." }
    ]
  },
  { label: 'h2', id: 'section-7', content: "14.2.0" },
  { label: 'h3', id: 'section-8', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "1f63434: Support double-clicking the <code>&lt;web-ui-drawer></code> drag handle (<code>.wui-drawer-drag-zone</code> and <code>.wui-drawer-drag-edge</code>) when <code>fullable</code> and <code>draggable</code> are enabled to toggle between the viewport-filling full state and default size." },
    { label: 'li', content: "841a139: Add the boolean <code>no-reveal</code> attribute to <code>&lt;web-ui-theme></code> so appearance changes commit directly without triggering the circular View Transitions reveal." }
    ]
  },
  { label: 'h3', id: 'section-9', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a0ea072: Use GPU-composited <code>translate3d</code> positioning for <code>&lt;web-ui-progress></code> indicator transitions in determinate mode to avoid layout reflows on frequent updates." }
    ]
  },
  { label: 'h2', id: 'section-10', content: "14.1.1" },
  { label: 'h3', id: 'section-11', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "ce42869: Use native scrollbars on coarse-pointer devices (phones and tablets) so component scroll containers restore default platform scrollbar width and colors." }
    ]
  },
  { label: 'h2', id: 'section-12', content: "14.1.0" },
  { label: 'h3', id: 'section-13', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a626394: Add a <code>closed</code> event to <code>&lt;web-ui-dialog></code>, dispatched once after the exit animation finishes and the native dialog leaves the top layer." },
    { label: 'li', content: "f4dfec1: Add a <code>fullable</code> property to <code>&lt;web-ui-drawer></code> (requires <code>draggable</code>) so outward drags or quick flicks snap the drawer to a viewport-filling form, tune drag-to-close distance (35%) and flick velocity (350px/s) thresholds, and add <code>onDepthChange</code> to nested drawer layer stacking." }
    ]
  },
  { label: 'h3', id: 'section-14', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "f4dfec1: Fix <code>imagePreview()</code> navigating an extra image during swipe settle and ending settle early on nested transform transitions." }
    ]
  },
  { label: 'h2', id: 'section-15', content: "14.0.0" },
  { label: 'h3', id: 'section-16', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "c04b96d: Rename <code>--wui-layout-mobile-toggle-inset</code> to <code>--wui-layout-mobile-toggle-left</code> (no compatibility alias) and add <code>--wui-layout-mobile-toggle-right</code> and <code>--wui-layout-mobile-toggle-bottom</code> alongside <code>--wui-layout-mobile-toggle-top</code>." },
      { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">/* Before */</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-layout</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  --wui-layout-mobile-toggle-inset</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">12</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">px</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">;</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">/* After */</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-layout</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">  --wui-layout-mobile-toggle-left</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">12</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">px</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">;</span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "css", path: './codeblock/5dec8fd445ae.css' }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-17', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c04b96d: Lift overflow clipping on <code>&lt;web-ui-collapse></code> once the expand transition settles so focus rings, shadows, and intentional horizontal overflow remain visible." },
    { label: 'li', content: "c04b96d: Make <code>&lt;web-ui-slider></code> tick marks clickable so clicking a tick selects the nearest tick value, and expand the slider thumb pill only when a press starts directly on the thumb." }
    ]
  },
  { label: 'h3', id: 'section-18', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c04b96d: Replace the browser focus outline on the <code>&lt;web-ui-layout></code> sidebar resize handle with the 3px accent bar, and draw a theme-aware hairline ring on the <code>&lt;web-ui-slider></code> thumb for legibility on light surfaces." }
    ]
  },
  { label: 'h2', id: 'section-19', content: "13.0.0" },
  { label: 'h3', id: 'section-20', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "57f4091: Open <code>&lt;web-ui-context-menu></code> with a Space key hold and retain the ContextMenu key; remove the <code>Shift+F10</code> shortcut." },
    { label: 'li', content: "57f4091: Add <code>sport</code> mode to <code>&lt;web-ui-progress></code> and remove <code>indeterminate</code>, <code>--wui-progress-indeterminate-duration</code>, and the <code>wui-progress-indeterminate</code> keyframes." }
    ]
  },
  { label: 'h3', id: 'section-21', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "57f4091: Add a neutral control shade token and subtly cool-gray interaction states for light navigation and secondary buttons." }
    ]
  },
  { label: 'h3', id: 'section-22', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "57f4091: Keep toast notifications and portal overlays inside modal dialogs positioned relative to the viewport during drawer page-shift motion." },
    { label: 'li', content: "57f4091: Unify neutral surfaces and text around a subtly cool gray palette, restore pressed button and segmented feedback when pointers leave in WebKit, and export additional scan, stop, Finder, and navigation icons." }
    ]
  },
  { label: 'h2', id: 'section-23', content: "12.4.0" },
  { label: 'h3', id: 'section-24', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "fe802db: Add configurable component sizing for switches, badges, menu items, step buttons, and built-in clear and close buttons, and refine mobile layout and drawer geometry." }
    ]
  },
  { label: 'h3', id: 'section-25', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "fe802db: Use white foregrounds for accent actions in dark mode, adopt the CodeX check icon for checkboxes, support configurable selection control sizes, and keep dialog and drawer controls keyboard reachable." },
    { label: 'li', content: "f966cdc: Move <code>@iconify/types</code> to <code>dependencies</code> so consumers can resolve <code>IconifyIcon</code> in published type declarations." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [f966cdc]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@3.1.2" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-26', content: "12.3.0" },
  { label: 'h3', id: 'section-27', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "53fa534: Redesign <code>trigger</code> across the overlay family (<code>web-ui-tooltip</code>, <code>web-ui-popover</code>, <code>web-ui-dropdown</code>, <code>web-ui-select</code>, <code>web-ui-autocomplete</code>) on a shared <code>defineTriggerController</code> state machine (<code>click</code>, <code>hover</code>, <code>focus</code>, <code>none</code>, string-only), add <code>show-delay</code> / <code>hide-delay</code>, replace <code>web-ui-dropdown</code>'s <code>openMenu()</code> / <code>closeAll()</code> with <code>show()</code> / <code>hide()</code>, and rename <code>web-ui-select</code>'s appearance prop from <code>trigger</code> to <code>variant</code>." },
    { label: 'li', content: "53fa534: Gate automatic overlay opening on content presence across <code>autocomplete</code>, <code>select</code>, <code>dropdown</code>, <code>popover</code>, and <code>tooltip</code>." },
    { label: 'li', content: "f27a2c1: Make <code>&lt;web-ui-layout></code> <code>mobile</code> a controlled boolean property and remove <code>mobile-change</code>; change the default <code>&lt;web-ui-icon></code> size from <code>18px</code> to <code>16px</code>; default tooltip triggers to hover-only; align overlay dismissal with enabled triggers; add input autofill hints, configurable autocomplete input slots, configurable popover panel padding, and a popover link arrow-key navigation helper." },
    { label: 'li', content: "f05a76b: Add a <code>separator</code> prop to <code>&lt;web-ui-grouped-text></code> rendered via CSS generated content so copy and find keep the continuous value, and export <code>iconGallery</code> from <code>@greypan/web-ui/icons</code>." }
    ]
  },
  { label: 'h3', id: 'section-28', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "f27a2c1: Export additional icons (<code>ci:settings-future</code>, <code>lucide:house</code>, <code>lucide:shopping-cart</code>, <code>tabler:tag-plus</code>, <code>tabler:clock-plus</code>) and guard theme view-transition reveals against repeated input." },
    { label: 'li', content: "53fa534: Center <code>&lt;web-ui-grouped-text></code> separator spacing between groups and align keyboard active styling with hover for <code>web-ui-option</code> and <code>web-ui-dropdown-item</code>." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [7eefb10]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.2.0" },
        { label: 'li', content: "@greypan/browser-kit@3.1.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-29', content: "12.2.0" },
  { label: 'h3', id: 'section-30', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "009b99a: Add <code>&lt;web-ui-grouped-text></code> for visually grouping card numbers, phone numbers, and amounts via <code>letter-spacing</code> while keeping selection and clipboard copy on the original continuous string." },
    { label: 'li', content: "009b99a: Support multi-gesture <code>trigger</code> sets on <code>&lt;web-ui-popover></code> and <code>&lt;web-ui-tooltip></code>." },
    { label: 'li', content: "009b99a: Add the imperative <code>shake()</code> feedback helper and <code>page-shift</code> support on <code>&lt;web-ui-drawer></code> (also enabled on <code>&lt;web-ui-layout></code>'s mobile sidebar drawer)." }
    ]
  },
  { label: 'h3', id: 'section-31', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "009b99a: Hide <code>&lt;web-ui-autocomplete></code>'s empty dropdown panel immediately instead of fading out an empty padded strip." }
    ]
  },
  { label: 'h2', id: 'section-32', content: "12.1.0" },
  { label: 'h3', id: 'section-33', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "0e77c22: Add <code>&lt;web-ui-progress></code> for linear progress with custom ranges, optional percentage readout, ARIA synchronization, and public CSS parts." },
    { label: 'li', content: "0e77c22: Add <code>sidebar-collapsible</code> and <code>--wui-layout-viewport-height</code> to <code>&lt;web-ui-layout></code>, <code>--wui-toast-top-offset</code> to toast containers, <code>trigger=\"icon\"</code> to <code>&lt;web-ui-select></code>, and replace <code>&lt;web-ui-dialog></code>'s <code>horizontal</code> boolean with <code>footer-orientation</code> (<code>vertical</code> | <code>horizontal</code>)." },
    { label: 'li', content: "425a950: Add <code>placement</code> (default <code>bottom-start</code>) to <code>&lt;web-ui-select></code> and <code>&lt;web-ui-autocomplete></code>." },
    { label: 'li', content: "0e77c22: Make imperative spinner overlays non-modal and pointer-transparent, forward <code>aria-label</code> in <code>&lt;web-ui-segmented-trigger></code>, and export additional icons (<code>ant-design:sync-outlined</code>, <code>ic:round-menu-open</code>, Lucide, and Tabler glyphs)." }
    ]
  },
  { label: 'h3', id: 'section-34', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "0e77c22: Keep <code>&lt;web-ui-dialog></code> footer and <code>&lt;web-ui-select></code> trigger slots layout-only without child-specific sizing overrides." }
    ]
  },
  { label: 'h2', id: 'section-35', content: "12.0.0" },
  { label: 'h3', id: 'section-36', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "137c540: Remove the <code>@greypan/web-ui/scrollbars</code> and <code>@greypan/web-ui/scrollbars.css</code> subpaths and the optional <code>overlayscrollbars</code> peer dependency. Scrollbars now use native CSS via <code>--wui-scrollbar-handle</code>, mirrored onto <code>documentElement</code> by <code>&lt;web-ui-theme></code>." },
      { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">html</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> {</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">  scrollbar-color</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">: </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">var</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(</span><span style=\"--shiki-light:#E36209;--shiki-dark:#FFAB70\">--wui-scrollbar-handle</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">) </span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">transparent</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">;</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">}</span></span></code></pre>", lang: "css", path: './codeblock/1288bf0545d8.css' }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-37', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "aebf774: Trap Tab focus inside <code>&lt;web-ui-dialog></code> and <code>&lt;web-ui-drawer></code>, associate open tooltips via <code>aria-description</code>, forward <code>aria-label</code> in segmented controls, and unify built-in accessible names behind a fixed-English table with <code>aria-*</code> override props (<code>aria-close-label</code>, <code>aria-dialog-label</code>, <code>aria-clear-label</code>, <code>aria-decrease-label</code>, <code>aria-increase-label</code>, and <code>ariaLabels</code> on <code>imagePreview</code> / <code>layout</code>)." },
    { label: 'li', content: "9787a15: Remove <code>\"./package.json\"</code> from the package <code>exports</code> map." },
    { label: 'li', content: "8cb3f56: Add <code>no-sidebar</code> to <code>&lt;web-ui-layout></code> to render banner, header, content, and tabbar regions without sidebar chrome." }
    ]
  },
  { label: 'h3', id: 'section-38', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8cb3f56: Complete toast dismissal once from its panel transition or fallback and cancel pending dismissals on disconnect or re-show." },
    { label: 'li', content: "Updated dependencies [9787a15]" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [8cb3f56]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.1.0" },
        { label: 'li', content: "@greypan/browser-kit@3.1.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-39', content: "11.2.0" },
  { label: 'h3', id: 'section-40', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "be69536: Remove <code>&lt;web-ui-empty></code>'s <code>size</code> prop in favor of granular CSS custom properties (<code>--wui-empty-icon-size</code>, <code>--wui-empty-icon-color</code>, <code>--wui-empty-icon-opacity</code>, <code>--wui-empty-title-*</code>, <code>--wui-empty-description-*</code>) and switch the default glyph to inline <code>andrsrxn:inbox</code>." },
    { label: 'li', content: "be69536: Standardize disabled state on <code>disabled</code> alone: <code>&lt;web-ui-button></code> no longer delegates <code>aria-disabled</code> or blocks clicks via <code>aria-disabled=\"true\"</code>, and <code>&lt;web-ui-collapse></code> applies <code>disabled</code> directly to its trigger while dropping cross-shadow <code>aria-controls</code>." }
    ]
  },
  { label: 'h2', id: 'section-41', content: "11.1.0" },
  { label: 'h3', id: 'section-42', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "6baecc3: Export <code>@greypan/web-ui/classes.css</code> with reusable <code>.wui-glow</code> and <code>.wui-glass</code> surfaces (plus <code>--wui-glass-blur</code> and <code>--wui-glass-saturation</code>), and keep <code>&lt;web-ui-layout></code> <code>header-glow</code> flush with header edges." },
    { label: 'li', content: "fea85a3: Add a <code>color</code> property to <code>&lt;web-ui-spinner></code> defaulting to the theme secondary text color." },
    { label: 'li', content: "de69393: Add <code>--wui-color-on-danger</code> to <code>&lt;web-ui-theme></code> for badge count text." },
    { label: 'li', content: "046addb: Align dark-mode raised <code>&lt;web-ui-segmented></code> contrast and introduce <code>--wui-color-surface-segmented-track</code>." }
    ]
  },
  { label: 'h3', id: 'section-43', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "9eec040: Improve accessibility, keyboard navigation, focus restoration, and positioning across <code>input</code>, <code>textarea</code>, <code>input-number</code>, <code>radio-group</code>, <code>checkbox</code>, <code>switch</code>, <code>segmented</code>, <code>select</code>, <code>autocomplete</code>, <code>dropdown</code>, <code>dialog</code>, <code>collapse</code>, <code>slider</code>, <code>tooltip</code>, <code>toast</code>, <code>avatar</code>, <code>badge</code>, <code>back-top</code>, <code>button</code>, <code>button-group</code>, <code>editable-text</code>, <code>image-preview</code>, <code>middle-ellipsis</code>, <code>spinner</code>, and <code>svg-draw-lines</code>." }
    ]
  },
  { label: 'h2', id: 'section-44', content: "11.0.0" },
  { label: 'h3', id: 'section-45', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "2d6d7e6: Switch all built-in component accessible names and native form validation strings to English." },
    { label: 'li', content: "2d6d7e6: Redesign the <code>&lt;web-ui-slider></code> thumb as a resting circle that elongates into a capsule on press/drag; rename <code>--wui-slider-thumb-height</code> to <code>--wui-slider-thumb-thickness</code>, <code>--wui-slider-thumb-width</code> to <code>--wui-slider-thumb-length</code>, and remove <code>--wui-slider-height</code>." }
    ]
  },
  { label: 'h2', id: 'section-46', content: "10.2.1" },
  { label: 'h3', id: 'section-47', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "ed17d76: Align value clamping, <code>change</code> event emission, <code>precision</code> formatting, element-identity group selection, and keyboard activation across <code>slider</code>, <code>input</code>, <code>input-number</code>, <code>switch</code>, <code>radio-group</code>, and <code>checkbox-group</code>." }
    ]
  },
  { label: 'h2', id: 'section-48', content: "10.2.0" },
  { label: 'h3', id: 'section-49', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "3f185aa: Lower the default <code>--wui-scale-enter</code> for anchored floating panels, toasts, and image preview from <code>0.95</code> to <code>0.9</code>." }
    ]
  },
  { label: 'h3', id: 'section-50', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "3f185aa: Measure untransformed dimensions when deciding which side <code>&lt;web-ui-context-menu></code> opens a submenu on." }
    ]
  },
  { label: 'h2', id: 'section-51', content: "10.1.2" },
  { label: 'h3', id: 'section-52', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "450e918: Scope <code>&lt;web-ui-context-menu></code> item activation using <code>event.eventPhase</code> so calling <code>close()</code> inside an item callback reliably exits the top layer first." },
    { label: 'li', content: "1e2a277: Anchor the long-press trailing-event absorption window to <code>pointerup</code> rather than menu open time." }
    ]
  },
  { label: 'h2', id: 'section-53', content: "10.1.1" },
  { label: 'h3', id: 'section-54', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "f083706: Apply the blurred fade treatment to <code>&lt;web-ui-collapse></code> peek edges, style internal component scrollbars with the shared theme, remove the rounded background box behind <code>&lt;web-ui-empty></code> icons, lighten the light-mode resting scrollbar thumb, and sync <code>&lt;web-ui-segmented></code> drag indicator width with the hovered trigger." }
    ]
  },
  { label: 'h2', id: 'section-55', content: "10.1.0" },
  { label: 'h3', id: 'section-56', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "9416d30: Add the <code>@greypan/web-ui/vite</code> entry exporting <code>webUiOptimizeDeps</code> for Vite dependency pre-bundling." }
    ]
  },
  { label: 'h2', id: 'section-57', content: "10.0.0" },
  { label: 'h3', id: 'section-58', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "3adfd77: Add a <code>header</code> chrome slot to <code>&lt;web-ui-dialog></code> aligned with <code>&lt;web-ui-drawer></code> and replace the <code>body</code> escape hatch with the <code>headless</code> boolean attribute." }
    ]
  },
  { label: 'h2', id: 'section-59', content: "9.1.0" },
  { label: 'h3', id: 'section-60', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "617457a: Add <code>&lt;web-ui-middle-ellipsis></code> for single-line middle text truncation preserving head and tail characters." },
    { label: 'li', content: "617457a: Expose mobile viewport state on <code>&lt;web-ui-layout></code> and add the <code>@greypan/web-ui/scrollbars</code> subpath." }
    ]
  },
  { label: 'h3', id: 'section-61', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "617457a: Fix dark-mode <code>&lt;web-ui-context-menu></code> fallback colors, <code>&lt;web-ui-dialog></code> / <code>&lt;web-ui-drawer></code> content overflow and stray focus rings, <code>&lt;web-ui-dialog closable></code> close button offsets, Safari <code>header-glow</code> top bleed, scrollbar auto-hide delay, and input placeholder typography." }
    ]
  },
  { label: 'h2', id: 'section-62', content: "9.0.0" },
  { label: 'h3', id: 'section-63', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "3c81816: Change <code>--wui-dialog-max-height</code> to cap the dialog content area, close <code>&lt;web-ui-autocomplete></code> when filtering yields no matches, change <code>&lt;web-ui-empty></code> <code>size</code> to a pixel number (default <code>56</code>), reorganize glass custom properties by layer, and stop components from auto-registering sibling custom elements." }
    ]
  },
  { label: 'h3', id: 'section-64', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "3c81816: Add <code>commit-on-unmount</code> to <code>&lt;web-ui-editable-text></code>, <code>long-press</code> to <code>&lt;web-ui-context-menu></code>, <code>closable</code> to <code>&lt;web-ui-dialog></code>, <code>select()</code> to <code>&lt;web-ui-input></code>, <code>readonly</code> to <code>&lt;web-ui-editable-text></code>, <code>resolved-appearance</code> to <code>&lt;web-ui-theme></code>, logarithmic nested drawer peek (<code>--wui-drawer-nested-peek-base</code>), <code>--wui-layout-sidebar-toggle-width</code>, <code>--wui-button-group-divider-length</code>, and typography/spacing scale tokens on <code>&lt;web-ui-theme></code>." }
    ]
  },
  { label: 'h3', id: 'section-65', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "3c81816: Make <code>&lt;web-ui-context-menu></code> modal via native <code>&lt;dialog></code> with Floating UI positioning and safe-area clamping; fix form-associated disabled recovery, form submit/reset forwarding, drawer drag-zone header/footer yielding, scroll lock without zeroing <code>window.scrollY</code>, accent-derived <code>--wui-color-focus-ring</code>, Iconify 16x16 fallback sizing, empty label gap collapse on radio/checkbox, textarea autosize recomputation, and theme view-transition stability; remove unused <code>--wui-layer-base</code> and <code>--wui-layout-header-glow-color</code>." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [3c81816]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@3.0.1" },
        { label: 'li', content: "@greypan/browser-kit@3.0.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-66', content: "8.0.0" },
  { label: 'h3', id: 'section-67', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "62bdbec: Remove the <code>transition</code> prop from <code>&lt;web-ui-theme></code> in favor of automatic View Transitions gated by reduced-motion preferences." }
    ]
  },
  { label: 'h3', id: 'section-68', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "62bdbec: Add <code>&lt;web-ui-editable-text></code> (with <code>select()</code>), add a <code>trigger</code> slot to <code>&lt;web-ui-autocomplete></code>, mirror <code>&lt;web-ui-theme></code> <code>--wui-color-page</code> onto <code>document.documentElement</code>, and add <code>variant</code> (<code>inset</code> | <code>raised</code>) to <code>&lt;web-ui-segmented></code>." }
    ]
  },
  { label: 'h3', id: 'section-69', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "62bdbec: Keep anchored overlay panels registered through exit transitions, restore dark-mode menu/sidebar translucency, and fix theme view-transition stylesheet capture ordering." }
    ]
  },
  { label: 'h2', id: 'section-70', content: "7.0.0" },
  { label: 'h3', id: 'section-71', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "5be1ee4: Replace toast deduplication-and-drop with upsert semantics and remove <code>toast.updateMessage()</code>." }
    ]
  },
  { label: 'h3', id: 'section-72', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "5be1ee4: Align drawer drag-to-close velocity with swipe-dismiss semantics, add <code>direction</code> to <code>&lt;web-ui-radio-group></code> and <code>&lt;web-ui-checkbox-group></code>, add reverse/manual playback options to <code>&lt;web-ui-svg-draw-lines></code>, arbitrate Escape to close only the innermost overlay, and internalize theme transitions inside <code>&lt;web-ui-theme></code>." }
    ]
  },
  { label: 'h3', id: 'section-73', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "5be1ee4: Consolidate open-overlay ownership, fix modal reconciliation on DOM reattachment, refine toast hover pause and timers, align selection-control shells, and tune dialog entrance scale defaults." }
    ]
  },
  { label: 'h2', id: 'section-74', content: "6.4.0" },
  { label: 'h3', id: 'section-75', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "4151251: Align overlay motion timing and scale defaults across floating panels and expose missing motion custom properties." }
    ]
  },
  { label: 'h3', id: 'section-76', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "4151251: Flatten pressed and dragging handle shadows on <code>switch</code>, <code>segmented</code>, and <code>slider</code>." }
    ]
  },
  { label: 'h2', id: 'section-77', content: "6.3.1" },
  { label: 'h3', id: 'section-78', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "fc05655: Make <code>&lt;web-ui-svg-draw-lines></code> layout-neutral so wrapping an icon introduces no extra box height or vertical shift." }
    ]
  },
  { label: 'h2', id: 'section-79', content: "6.3.0" },
  { label: 'h3', id: 'section-80', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a00fc1b: Add imperative <code>imagePreview()</code> with pan, pinch/wheel zoom anchored at the cursor/midpoint, and opt-in presentation controls (<code>nav</code>, <code>toolbar</code>, <code>closable</code>, <code>indicator</code>, <code>swipe</code>, <code>noScrollLock</code>, <code>noBackdropClose</code>); add <code>peek</code> to <code>&lt;web-ui-collapse></code>; retire <code>--wui-duration-menu-enter/exit</code> and <code>--wui-duration-overlay-enter/exit</code> in favor of dedicated motion tokens." }
    ]
  },
  { label: 'h3', id: 'section-81', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a00fc1b: Fix iOS Safari dialog/backdrop/touch drag compatibility, prevent orphaned empty popover portals, add composition-aware overlay ownership and async positioning generation guards, add configurable dialog spacing tokens, and refine pressed glass handles." }
    ]
  },
  { label: 'h2', id: 'section-82', content: "6.1.0" },
  { label: 'h3', id: 'section-83', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "d0a9f32: Expose drawer drag zone/bar tokens (<code>--wui-drawer-drag-zone-size</code>, <code>--wui-drawer-drag-bar-thickness</code>, <code>--wui-drawer-drag-bar-length</code>), add semantic radius tokens (<code>--wui-radius-control</code>, <code>--wui-radius-menu</code>, <code>--wui-radius-overlay</code>), align observable token fallbacks, and remove the non-existent <code>./icons/*</code> subpath export." }
    ]
  },
  { label: 'h3', id: 'section-84', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "d0a9f32: Consolidate shared overlay/menu/combobox/form-association helpers and fix input focus-ring transitions." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [d0a9f32]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@3.0.0" },
        { label: 'li', content: "@greypan/js-kit@3.0.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-85', content: "6.0.0" },
  { label: 'h3', id: 'section-86', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c310d9f: Remove <code>--wui-layout-sidebar-bg</code> in favor of <code>--wui-color-surface-overlay</code>, and rename <code>&lt;web-ui-drawer></code>'s <code>request-only</code> prop to <code>controlled</code> (no alias)." }
    ]
  },
  { label: 'h3', id: 'section-87', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c310d9f: Add desktop sidebar drag-to-resize on <code>&lt;web-ui-layout></code>, <code>draggable</code> / nested stacking / <code>--wui-drawer-inset</code> on <code>&lt;web-ui-drawer></code>, <code>controlled</code> on <code>&lt;web-ui-dialog></code>, single-element two-slot <code>&lt;web-ui-collapse></code>, <code>allow-custom-value</code> and empty slot on <code>&lt;web-ui-autocomplete></code>, ghost-form borderless inputs, and unified drag gestures on <code>switch</code>, <code>segmented</code>, and <code>slider</code>." }
    ]
  },
  { label: 'h3', id: 'section-88', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c310d9f: Align shared <code>--wui-control-size</code> baseline to <code>36px</code>, resolve portal overlays inside open native dialogs with live framework rendering support, isolate <code>.wui-glass</code> inherited variables, fix drawer rebound spring <code>fill: 'both'</code>, and make hover/active backgrounds instant." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [c310d9f]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@2.2.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-89', content: "4.0.0" },
  { label: 'h3', id: 'section-90', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "1e52bc4: Refactor CSS custom property contracts with no compatibility aliases:" },
      { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">/* Selected token renames */</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">/* --wui-color-text-muted        -> --wui-color-text-secondary */</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">/* --wui-color-text-faint        -> --wui-color-text-tertiary */</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">/* --wui-focus-ring              -> --wui-color-focus-ring + --wui-focus-ring-width */</span></span>\n<span class=\"line\"><span class=\"line-number\">5</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">/* --wui-button-size             -> --wui-control-size */</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">/* --wui-shadow-pop              -> --wui-shadow-panel */</span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">/* --web-ui-back-top-*           -> --wui-back-top-* */</span></span></code></pre>", lang: "css", path: './codeblock/8722ed2d1ff0.css' }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-91', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "1e52bc4: Unify native form-associated control <code>reset()</code> and state restoration lifecycles, and derive <code>&lt;web-ui-button-group></code> child styling internally instead of injecting <code>group</code>/<code>last</code>/<code>direction</code> attributes." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [1e52bc4]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@2.0.0" },
        { label: 'li', content: "@greypan/browser-kit@2.0.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-92', content: "3.0.0" },
  { label: 'h3', id: 'section-93', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "28a8dc5: Narrow framework type integrations (remove global Vue <code>ComponentCustomProps</code> augmentation and React lowercase <code>oninput</code>/<code>onchange</code> aliases, require <code>@types/react >= 19</code> and <code>vue >= 3.5</code>, add <code>WebUiEvent&lt;Component, EventName></code>), and stop group-managed child controls (<code>checkbox</code>, <code>radio</code>, <code>segmented-trigger</code>) from bubbling duplicate <code>input</code>/<code>change</code> events outside their parent group." }
    ]
  },
  { label: 'h3', id: 'section-94', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "28a8dc5: Add <code>readonly</code> to <code>web-ui-input</code>, <code>web-ui-input-number</code>, and <code>web-ui-autocomplete</code>, and dispatch composed <code>change</code> events across shadow boundaries on form text/number controls." }
    ]
  },
  { label: 'h3', id: 'section-95', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "28a8dc5: Fix overlay width calculation and theme-scoped portal mounting for <code>select</code>, <code>autocomplete</code>, and <code>dropdown</code>." }
    ]
  },
  { label: 'h2', id: 'section-96', content: "2.1.2" },
  { label: 'h3', id: 'section-97', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "7db6d3e: Standardize custom element boolean attributes and replace default-true properties with semantic opt-out attributes." }
    ]
  },
  { label: 'h2', id: 'section-98', content: "2.1.0" },
  { label: 'h3', id: 'section-99', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "fff1c60: Fix React custom element JSX event typings to use exact event names (<code>onopen-change</code>, <code>ontoast-close</code>)." }
    ]
  },
  { label: 'h3', id: 'section-100', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "fff1c60: Propagate disabled state from <code>checkbox-group</code>, <code>radio-group</code>, and <code>segmented</code> to child controls without mutating child <code>disabled</code> properties." }
    ]
  },
  { label: 'h2', id: 'section-101', content: "2.0.0" },
  { label: 'h3', id: 'section-102', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "0a50d35: Standardize public component contracts on Pointer Events, native form association, and unified <code>input</code>/<code>change</code> events: rename <code>&lt;web-ui-switch></code> <code>open</code> to <code>checked</code>, remove <code>open-change</code> / <code>update:checked</code> / <code>value-changed</code> / <code>visible-change</code> and <code>&lt;web-ui-switch></code> <code>show()</code>/<code>close()</code>, and migrate mouse hover/down handlers to pointer events." }
    ]
  },
  { label: 'h2', id: 'section-103', content: "1.4.0" },
  { label: 'h3', id: 'section-104', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "be4008b: Replace the <code>react</code> peer dependency with <code>@types/react</code> and standardize workspace dependency externalization." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [be4008b]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.7.2" },
        { label: 'li', content: "@greypan/js-kit@1.6.2" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-105', content: "1.0.1" },
  { label: 'h3', id: 'section-106', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.0.1" }
        ]
      }
      ]
    }
    ]
  }
]

export default meta
