// 本文件由 @greypan/md-to-meta 生成，请勿手动编辑。
// 来源：markdown —— meta 是文档结构的直接投影，不含任何业务含义。
// 重新生成：跑一次宿主构建（生成挂在 md-to-meta 的 Vite 插件上）。

const meta = [
  { label: 'h1', id: 'section-1', content: "@greypan/web-ui" },
  { label: 'h2', id: 'section-2', content: "12.0.1" },
  { label: 'h3', id: 'section-3', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "334a2df: Point the dangling ADR numbers in collapse/drawer/overlay/group-management comments at ADRs that resolve today, or drop them; the doc comments shipped in the generated <code>.d.ts</code> change with it." }
    ]
  },
  { label: 'h2', id: 'section-4', content: "12.0.0" },
  { label: 'h3', id: 'section-5', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "137c540: Remove the <code>@greypan/web-ui/scrollbars</code> and <code>@greypan/web-ui/scrollbars.css</code> subpaths and the optional <code>overlayscrollbars</code> peer dependency. Scrollbars are native CSS now: <code>web-ui-theme</code> exposes <code>--wui-scrollbar-handle</code>, components read it inside their shadow roots through <code>scrollbar-color</code> / <code>scrollbar-width</code>, and the outermost theme mirrors the token to <code>documentElement</code> so <code>html { scrollbar-color: var(--wui-scrollbar-handle) transparent }</code> themes the document scroll container." }
    ]
  },
  { label: 'h3', id: 'section-6', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "aebf774: Keep the dialog and drawer Tab loop inside the dialog instead of letting focus wrap to <code>&lt;body></code>.\nAssociate an open tooltip with its trigger through <code>aria-description</code>.\nForward <code>aria-label</code> to the segmented control's internal listbox.\nUnify the built-in accessible names behind one fixed-English fallback table with <code>aria</code>-prefixed override props (ADR-0029):" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Every icon-only control now has an accessible name: the hardcoded English literals in <code>badge</code>, <code>image-preview</code> and <code>textarea</code> move into the shared table, joining <code>dialog</code>, <code>drawer</code>, <code>input</code>, <code>input-number</code>, <code>back-top</code> and <code>layout</code>." },
        { label: 'li', content: "The fallback no longer follows the document <code>lang</code>, and the <code>LocaleController</code> observer is gone. Pages that need another language set the override props: <code>aria-close-label</code> / <code>aria-dialog-label</code> (dialog, drawer), <code>aria-clear-label</code> (input, textarea), <code>aria-decrease-label</code> / <code>aria-increase-label</code> (input-number), and the host <code>aria-label</code> (back-top, badge — the latter with <code>{count}</code> interpolation across its dot / count / zero states)." },
        { label: 'li', content: "<code>image-preview</code> takes an <code>ariaLabels</code> option covering close / previousImage / nextImage / zoomIn / zoomOut / resetZoom; <code>layout</code> takes an <code>ariaLabels</code> property covering collapseSidebar / expandSidebar / resizeSidebar / openNavigationMenu / mainNavigation." },
        { label: 'li', content: "<code>close-label</code>, <code>clear-label</code>, <code>decrease-label</code> and <code>increase-label</code> were added in this release and ship under their <code>aria-</code>-prefixed names directly." },
        { label: 'li', content: "<code>dialog-label</code> (shipping since 11.1.0) is renamed to <code>aria-dialog-label</code>; the old attribute stays as a deprecated alias that forwards to the new property, to be removed in the next major." }
        ]
      }
      ]
    },
    { label: 'li', content: "9787a15: 移除各包 <code>exports</code> 里的 <code>\"./package.json\"</code>。仓库内没有任何消费方；这一项只为按包名读元数据重新放开入口，留着会让后来者把它当成必需项。唯一需要读 manifest 的 <code>check-md-to-comp-artifacts</code> 改为按仓库路径读取。已发布包按 minor 处理：升级后经包名解析元数据会报 <code>ERR_PACKAGE_PATH_NOT_EXPORTED</code>，目前没有已知的外部消费者。" },
    { label: 'li', content: "8cb3f56: Add <code>no-sidebar</code> to <code>web-ui-layout</code>: when set, the component renders no desktop aside, collapse Toggle, resize handle, mobile header Toggle, or Drawer, leaving the banner, header, content, and tabbar regions only. The <code>sidebar</code> slot is not rendered while consumer nodes stay in the light DOM." }
    ]
  },
  { label: 'h3', id: 'section-7', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "8cb3f56: Release offline, page-exit, and page-error listeners through a composable, idempotent tracker stop method." },
      { label: 'p', content: "Complete toast dismissal once from its panel transition or fallback, and cancel pending dismissal when disconnected or shown again." }
      ]
    },
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
  { label: 'h2', id: 'section-8', content: "11.2.0" },
  { label: 'h3', id: 'section-9', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "be69536: <code>web-ui-empty</code> drops its <code>size</code> prop and hands the whole layout to CSS variables." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>size</code> is gone. It was the only JS knob and drove four unrelated channels at once (glyph, <code>min-height</code>, padding, and both font sizes). Each channel now has its own variable: <code>--wui-empty-icon-size</code>, <code>--wui-empty-icon-color</code>, <code>--wui-empty-icon-opacity</code>, <code>--wui-empty-title-font-size</code>, <code>--wui-empty-title-color</code>, <code>--wui-empty-description-font-size</code> and <code>--wui-empty-description-color</code>, alongside the already public <code>--wui-empty-min-height</code>, <code>--wui-empty-padding</code>, <code>--wui-empty-content-width</code>, <code>--wui-empty-title-margin-top</code> and <code>--wui-empty-action-margin-top</code>. The defaults are the old 56 slot: 40px glyph, 240px <code>min-height</code>, <code>32px 24px</code> padding, 16px / 14px type. A leftover <code>size</code> attribute renders nothing." },
        { label: 'li', content: "The default glyph is now <code>andrsrxn:inbox</code> instead of <code>lucide:inbox</code>, drawn as a plain <code>svg</code> inside the icon box rather than a <code>web-ui-icon</code> element. <code>web-ui-icon</code> takes its edge length from a JS property, which a CSS variable cannot reach, and the empty glyph is a fixed asset that does not need that indirection. The asset paints with <code>currentColor</code>, so <code>--wui-empty-icon-color</code> reaches it." },
        { label: 'li', content: "Colour and weight are now two variables instead of one. <code>--wui-empty-icon-color</code> takes a plain, opaque colour (default <code>--wui-color-text-secondary</code>) and <code>--wui-empty-icon-opacity</code> (default <code>0.75</code>) dims the glyph as a group. They cannot be folded into a single alpha colour: a line glyph's strokes genuinely overlap at corners, line ends and across the tinted fill, so an alpha colour composites twice there and the corners come out visibly darker. Group opacity applies once, after the glyph is flattened. Set <code>--wui-empty-icon-opacity: 1</code> for the full-strength colour." },
        { label: 'li', content: "Migrating an old <code>size</code>: <code>40</code> becomes <code>--wui-empty-icon-size: 29px</code> with <code>--wui-empty-min-height: 171px</code>, <code>--wui-empty-padding: 23px 17px</code>, title 14px and description 13px; <code>56</code> is the default; <code>72</code> becomes <code>51px</code> / <code>309px</code> / <code>41px 31px</code> with 16px / 14px type. The docs keep the full table." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "be69536: <code>disabled</code> 成为唯一的禁用入口，<code>aria-disabled</code> 不再参与任何行为：" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>web-ui-button</code> 不再委派 <code>aria-disabled</code> 到内部原生 button，也不再因 <code>aria-disabled=\"true\"</code> 阻断 click / 表单动作。「看起来禁用但仍可聚焦」的语义移除，需要禁用请用 <code>disabled</code>（内部 button 真的禁用、退出 tab 序列）。" },
        { label: 'li', content: "<code>web-ui-collapse</code> 的 <code>disabled</code> 改为给 trigger 元素加 <code>disabled</code>（取消禁用时还原），替代原来的 <code>aria-disabled</code> 回写——后者在 <code>&lt;web-ui-button></code> 上只落在宿主，属性不跨 shadow 转发，AT 读不到。" },
        { label: 'li', content: "<code>web-ui-collapse</code> 不再向 trigger 回写 <code>aria-controls</code>：目标 id 在组件 shadow root 内，IDREF 跨 shadow root 不解析，写出去等同悬空引用。展开关系只由 <code>aria-expanded</code> 表达，内容 track 也不再生成无引用的 id。" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-10', content: "11.1.0" },
  { label: 'h3', id: 'section-11', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "046addb: Give the dark <code>segmented</code> raised indicator the invariant light already has — the resting chip is the page colour, floating in a track that sinks one step below it — instead of the brighter gray it shipped with. <code>--wui-color-surface-selected</code> therefore moves from <code>#5c5c5e</code> to <code>#242628</code> in dark, the same value as <code>--wui-color-page</code> there, and the convex track gets its own token, <code>--wui-color-surface-segmented-track</code> (<code>#e5e5ea</code> in light, <code>#17191a</code> in dark), opened below the page rather than above it; <code>--wui-color-surface-segmented</code> keeps naming the inset indicator face. The convex reading survives because the chip stays lighter than the track in both appearances (WCAG luminance ratio 1.26:1 in light, 1.16:1 in dark), and the two variants no longer collapse onto one gray pair in dark: <code>inset</code> keeps its pressed-in <code>#3a3a3c</code> chip on a <code>#2c2c2e</code> track. Because the chip is pinned to the page tier rather than to whatever container holds it, a raised segmented placed on a <code>--wui-color-surface</code> card reads one step darker than that card in dark." },
      { label: 'p', content: "Dark had the inset chip on the neutral control tier already; light did not. <code>--wui-color-surface-segmented</code> light default moves from <code>#e5e5ea</code> to <code>#dfdfdf</code>, so in both appearances the resting inset chip is the same face a <code>secondary</code> button uses (<code>--wui-color-surface-control</code>). The two variants now each pin one tier — <code>raised</code> to the page, <code>inset</code> to the control surface — and a spec asserts each equality against a live probe of the referenced token rather than a colour literal." },
      { label: 'p', content: "Generated Markdown body text follows <code>--wui-font-size</code> instead of Notion's hard-coded pixel sizes, and tables take that size by inheritance, so a documentation page is no longer set larger than the components it documents." },
      { label: 'p', content: "Every generated code block now carries a line-number gutter. <code>@greypan/md-to-comp</code> runs shiki's own <code>transformerRenderLineNumber</code> in the same <code>codeToHtml</code> pass that highlights the code, so the numbers come from the highlighter rather than from a CSS counter, and a line the gutter numbers is the line the reader can quote back. The generated <code>examples.css</code> styles the slot — <code>user-select: none</code>, a right-aligned column as wide as three digits, held at 45% of the surrounding colour in both appearances — so it neither joins a text selection nor competes with the code for attention. Injecting that text is the one exception to \"the fence and the rendered block are the same bytes\": the generator's round-trip self-check and both demos' visible-text assertions strip the gutter span before comparing, and the copy button clones the <code>&lt;pre></code>, drops those spans and writes the fence verbatim, so the clipboard still gets runnable source." },
      { label: 'p', content: "An empty default-value cell in an API table is a <code>—</code> placeholder meaning \"this member has no default\", which is prose about the row rather than a literal a reader could write, so the corpus no longer wraps it in backticks and the demos render only real literals as inline code." }
      ]
    },
    { label: 'li', content: "de69393: Add a <code>--wui-color-on-danger</code> theme token for badge count text in both themes." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "6baecc3: Keep <code>web-ui-layout</code>'s <code>header-glow</code> layers from spilling horizontally, and restore the former natural blur fade with a shorter tail. The blur layer now fades over 36px and extends 24px below the header instead of 30px, reaching the same ~0.67 alpha at the edge of the default 52px header as the previous 30px offset while covering less content; taller headers keep that edge strength instead of fading further under the old percentage mask. Both pseudo-elements stay flush with the header's left and right edges, so the backdrop sample no longer paints vertical dark bands on narrow viewports." },
      { label: 'p', content: "Add <code>@greypan/web-ui/classes.css</code>: a reusable <code>.wui-glow</code> layer that can be applied to any box (cards included), with tokens for gradient presence and direction, colour, blur radius, overhang and fade length. The same stylesheet exports the existing <code>.wui-glass</code> surface, now with <code>--wui-glass-blur</code> and <code>--wui-glass-saturation</code> tokens so the backdrop recipe can be tuned without rewriting <code>backdrop-filter</code>. <code>header-glow</code> and collapse's peek edge use the same stylesheet internally, and the demo home cards now use the <code>.wui-glass</code> surface." }
      ]
    },
    { label: 'li', content: "fea85a3: Add a <code>color</code> property to <code>web-ui-spinner</code> and make its default follow the theme text-secondary color." }
    ]
  },
  { label: 'h3', id: 'section-12', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "9eec040: Hide clear buttons in disabled input and textarea components." },
    { label: 'li', content: "e15289b: Restore focus to the parent item when ArrowLeft closes a dropdown submenu." },
    { label: 'li', content: "6648b13: Defer slider value updates until a track tap completes or drag intent is accepted. Cancel cross-axis movement as soon as it crosses the gesture threshold and dominates." },
    { label: 'li', content: "5d047d3: Use theme-aware colors for avatar fallbacks." },
    { label: 'li', content: "1738c7e: Give back-top buttons an accessible default name and working token-based focus ring." },
    { label: 'li', content: "8deb266: Respect reduced-motion preferences in back-top scrolling." },
    { label: 'li', content: "c54fd58: Fix badge overlays for plain text in its default slot." },
    { label: 'li', content: "cec5e97: Improve default accent text contrast in light and dark themes." },
    { label: 'li', content: "395cb7e: Fix immediate keyboard tooltip display for shadow DOM triggers." },
    { label: 'li', content: "c3a6fd1: Block pointer interaction and page scrolling while the imperative spinner overlay is open." },
    { label: 'li', content: "c790a22: Improve segmented label contrast on selected indicators." },
    { label: 'li', content: "1843927: Add keyboard navigation and roving tabindex to radio groups." },
    { label: 'li', content: "f96acc7: Scale button group member buttons with <code>--wui-control-size</code>; vertical tracks expand to fit their widest member." },
    { label: 'li', content: "69b34cd: Allow <code>web-ui-button</code> size values to use CSS lengths such as <code>px</code> and <code>rem</code> while keeping bare numbers in pixels." },
    { label: 'li', content: "f9fed85: Add arrow-key navigation and roving tabindex to segmented controls." },
    { label: 'li', content: "85417bd: Hide closed dialogs from layout, hit testing, and keyboard navigation." },
    { label: 'li', content: "765f4b0: Expose <code>aria-expanded</code> and <code>aria-disabled</code> on the native button inside <code>&lt;web-ui-button></code> when it is used as a collapse trigger. Keep <code>aria-controls</code> on the host because its IDREF cannot resolve across shadow roots; <code>aria-disabled=\"true\"</code> also suppresses button activation." },
    { label: 'li', content: "b78432b: Expose <code>horizontal</code> as a reflected Boolean property on <code>web-ui-dialog</code> so dynamic bindings update the footer layout." },
    { label: 'li', content: "c3bee8e: Close dropdown menus when focus leaves them and move focus to the adjacent page control on Tab." },
    { label: 'li', content: "053f053: Preserve the final line box for editable text values ending with a newline." },
    { label: 'li', content: "5b1b9b4: Fix vertical button groups so the glass track expands to fit the widest button." },
    { label: 'li', content: "9db0265: Restore the focus ring when keyboard navigation follows pointer input." },
    { label: 'li', content: "7b54ba5: Fix horizontal collapse peek clipping so it preserves the content's natural height." },
    { label: 'li', content: "eb3594d: Forward <code>aria-label</code> and <code>aria-labelledby</code> from <code>web-ui-input-number</code> to its native number input." },
    { label: 'li', content: "aa6fcf5: Infer input-number rounding precision from fractional step values when precision is omitted." },
    { label: 'li', content: "9014b4a: Keep the active autocomplete option visible during keyboard navigation." },
    { label: 'li', content: "d326d03: Fix image preview loop rendering so a single image is shown only once." },
    { label: 'li', content: "e517a4f: Keep dropdown submenus within the viewport on narrow screens." },
    { label: 'li', content: "527ec9c: Omit <code>aria-hidden</code> from non-decorative avatars." },
    { label: 'li', content: "1b82461: Fix back-top alignment in custom scroll containers." },
    { label: 'li', content: "b428a73: Fix dropdown focus restoration and stale <code>aria-controls</code> after closing." },
    { label: 'li', content: "da5ffa8: Fix disabled opacity for input controls so text, icons, and control surfaces fade consistently." },
    { label: 'li', content: "d45da09: Restore themed internal scrollbars in select and autocomplete portal panels." },
    { label: 'li', content: "db6879a: Keep toast close buttons visible and interactive for coarse pointers." },
    { label: 'li', content: "b548de9: Recalculate middle ellipsis output when font metrics change so truncated text stays within the available width." },
    { label: 'li', content: "4d01bf5: Fix initial segmented selection so upgraded triggers expose the correct checked and accessible selected state." },
    { label: 'li', content: "a53f0c6: Forward host <code>aria-label</code> to the <code>web-ui-select</code> combobox trigger." },
    { label: 'li', content: "9748689: Fix select keyboard support for opening, Home/End navigation, and typeahead." },
    { label: 'li', content: "8fe5d2f: Expose select option roles and synchronized ARIA selection and disabled states." },
    { label: 'li', content: "e0ac1f5: Fix accessible naming for <code>web-ui-slider</code> by forwarding host <code>aria-label</code> and <code>aria-labelledby</code> attributes to its internal slider. Sliders no longer receive a shared default name, so consumers should provide a distinguishable name for every instance." },
    { label: 'li', content: "9949f0d: Close open tooltips when they become disabled." },
    { label: 'li', content: "7094b03: Render switch child text as a visible label and expose switch semantics on the host." },
    { label: 'li', content: "8288ef3: Keep SVG draw offsets within the dash range when easing curves overshoot." },
    { label: 'li', content: "58b57e3: The svg-draw-lines duration-easing demos called <code>replay()</code> without handling the returned promise, which the corpus lint flags as a floating promise. The three <code>replayAll</code> fences now discard it with <code>void</code>, and the generated demo files were regenerated from the corrected corpus. No runtime behavior change." },
    { label: 'li', content: "f33e475: Keep imperative spinner overlays within the active theme scope." },
    { label: 'li', content: "4cc003c: Scale square avatar corner radii with avatar size." },
    { label: 'li', content: "62bb498: Let pointer events pass through decorative badge indicators to slotted content." },
    { label: 'li', content: "767ca49: Move radio and checkbox ARIA semantics off label elements." },
    { label: 'li', content: "893f76a: Add radiogroup semantics, accessible naming, and arrow-key navigation to radio groups." }
    ]
  },
  { label: 'h2', id: 'section-13', content: "11.0.0" },
  { label: 'h3', id: 'section-14', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "2d6d7e6: The built-in user-visible strings of the components are now English. They are the accessible names of the internal controls (the slider track, the dialog and drawer close buttons, the input and textarea clear buttons, the context menu panel, the image preview controls, the spinner, the badge counter, the layout sidebar controls and the toast close button) and the messages the components hand to the browser's native form validation." },
      { label: 'p', content: "A Chinese page embedding these components now reads English accessible names and sees English in the browser's validation bubble (\"Select this option\" instead of \"请选择此项\"). The components offer no way to override those strings, so a page that needs another language has to replace the affected internals itself." },
      { label: 'p', content: "The slider thumb shape and its size tokens change in the same release, see the other changeset." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "2d6d7e6: Change the <code>&lt;web-ui-slider></code> thumb shape. It is now a circle at rest and elongates into a capsule along the track while pressed or dragging, matching the switch thumb recipe. A vertical slider elongates in the height direction instead of the width direction." },
      { label: 'p', content: "The public size tokens are renamed to match what they now control, with no compatibility layer for the old names:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>--wui-slider-thumb-height</code> becomes <code>--wui-slider-thumb-thickness</code> (the thumb's thickness, and the resting circle's diameter)." },
        { label: 'li', content: "<code>--wui-slider-thumb-width</code> becomes <code>--wui-slider-thumb-length</code> (the capsule's long edge along the track, used while pressed or dragging)." },
        { label: 'li', content: "<code>--wui-slider-height</code> is removed. It never controlled the slider's height — that is <code>--wui-slider-vertical-height</code> — but the track's thickness, which <code>--wui-slider-track-size</code> already names." }
        ]
      },
      { label: 'p', content: "Set the new names instead: <code>--wui-slider-thumb-thickness</code> and <code>--wui-slider-thumb-length</code> on the slider, and <code>--wui-slider-track-size</code> for the track." }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-15', content: "10.2.1" },
  { label: 'h3', id: 'section-16', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "ed17d76: fix(web-ui): align the value model of slider, input, input-number, switch and the groups" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "slider clamps again after rounding, so <code>max=100</code> with <code>step=15</code> no longer yields <code>105</code>." },
        { label: 'li', content: "input emits <code>change</code> when the clear button empties the field, matching a manual clear." },
        { label: 'li', content: "input-number keeps the raw value and applies <code>precision</code> in the <code>value</code> getter, and restores the\nlast valid value when an edit is left empty or out of range on blur." },
        { label: 'li', content: "radio-group and checkbox-group decide selection by element identity, so duplicate values no longer\nselect the wrong member; a member is pruned only after it has actually disappeared." },
        { label: 'li', content: "switch follows the native input activation path and handles <code>Enter</code> as well as <code>Space</code>." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-17', content: "10.2.0" },
  { label: 'h3', id: 'section-18', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "3f185aa: Lower the enter scale of anchored floating panels (popover, menu, dropdown, select, tooltip, autocomplete), toast, and the image-preview stage from <code>0.95</code> to <code>0.9</code>." },
      { label: 'p', content: "<code>--wui-scale-enter</code> now defaults to <code>0.9</code>, and every component fallback that references it follows. Reduced motion is unaffected: the token still resolves to <code>1</code> there. Dialog enter scale is untouched; it keeps its own <code>--wui-dialog-scale-enter: 1.1</code>." }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-19', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "3f185aa: Fix which side <code>&lt;web-ui-context-menu></code> opens a submenu on. The left/right decision read the panel's <code>getBoundingClientRect()</code> width, but the panel is always measured before it has animated into place, while its presence <code>transform: scale(var(--wui-scale-enter))</code> is still applied — so the reading was a fraction of the real width, and a submenu that did not fit to the right could be judged as fitting and open on the wrong side. Both the fresh-open path and the reopen-while-closing path were affected." }
    ]
  },
  { label: 'h2', id: 'section-20', content: "10.1.2" },
  { label: 'h3', id: 'section-21', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "450e918: fix(context-menu): 「menu item 激活」的作用域改用事件自身的 <code>eventPhase</code> 判定，让 menu item 回调里的 <code>close()</code> 稳定提前出顶层" },
      { label: 'p', content: "<code>close()</code> 要提前把 scrim 撤出 top layer 的条件有两个：<code>_closeSource === 'menu-item'</code>（组件自己在冒泡阶段关），\n以及「消费方在自己的 menu item 回调里同步调了 <code>close()</code>」——后者 <code>_closeSource</code> 还是 <code>'default'</code>。后者原先用一个\n布尔标志在 panel 的<strong>捕获阶段</strong>置位，再用<strong>微任务</strong>复位，理由是「捕获与冒泡在同一个任务里跑完，微任务检查点在它们之后」。" },
      { label: 'p', content: "这个前提在真实输入下不成立：可信事件由浏览器任务派发，<strong>每个监听器返回后</strong>都做一次微任务检查点，\n于是捕获阶段排的微任务在条目自己的监听器（消费方调 <code>close()</code> 的地方）<strong>之前</strong>就跑掉了。标志到 <code>close()</code> 时\n已是 false，scrim 留在 top layer 里不退，模态期间整份文档是 inert 的，消费方紧接着送进编辑器的焦点被浏览器\n静默丢弃。合成 <code>element.click()</code> 的派发发生在脚本调用栈里、检查点被推迟，所以旧用例用合成点击拿不到这条缺陷。" },
      { label: 'p', content: "改法是不再近似「派发什么时候结束」：捕获阶段记下<strong>那次事件对象</strong>，<code>close()</code> 判 <code>eventPhase !== 0</code>\n（DOM 规范：派发结束后由 terminating 步骤置回 NONE）。作用域精确等于那一次派发，既不需要定时器，\n也不依赖微任务检查点的位置。副作用面不变：勾选型条目 <code>stopPropagation()</code> 之后 menu 留着，\n随后的 Escape / 点外面 / 程序式 <code>close()</code> 仍判定为「非 menu item 激活」，保留 dialog 默认的焦点归还。" }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "9ea3c49: chore: add Go cache probe to share persistent cache across contexts" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: ".mise.toml: GOCACHE now probes default cache directories (macOS ~/Library/Caches/go-build, Linux ~/.cache/go-build) at runtime; falls back to $TMPDIR/greypan/go-build only when write fails" },
        { label: 'li', content: "herdr pane, claude/opencode threads, and manual shell now share the same persistent Go build cache (~800 MB)" },
        { label: 'li', content: "codex threads hit fallback as designed (sandbox only allows worktree + /tmp writes), no regression" },
        { label: 'li', content: "CI unaffected: no HERDR_ENV means template renders empty, Go uses platform default" }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "1e2a277: fix(web-ui): 长按补发事件窗口改以手势结束为起点，并让 hit-test 类 spec 等布局定版" },
      { label: 'p', content: "两件事都只影响「负载下量到的几何不是终态」这一类 flaky：" },
      {
        label: 'ol',
        children: [
        { label: 'li', content: "<code>context-menu</code> 长按开 menu 后吸收引擎补发 <code>contextmenu</code> / <code>click</code> 的窗口，起点从\n<strong>menu 打开时刻</strong>改到<strong>手势结束（pointerup）时刻</strong>。补发事件由引擎在 touchend 处理时\n生成，与那次 pointerup 同属一个输入批处理（实测 click 的 <code>timeStamp</code> 与 pointerup 的\n处理时刻相差 ≤3ms）；而主线程被长任务占住时，touchend 的处理能比 menu 打开晚 1s 以上\n（实测 1325ms）。以打开时刻为起点，1000ms 的兜底上限会被那段延迟挤爆——补发 click\n落到窗口外，被当成用户真实点击把<strong>同一次长按刚打开</strong>的 menu 关掉。窗口的两条硬边界\n（下一次 <code>pointerdown</code>、menu 关闭）不变，只把起点换成与补发事件同源的那个时刻。" },
        { label: 'li', content: "指向 shadow DOM 的命中测试 spec 原先只等比 dialog 矩形两次相等，两个方向都不够：\n进场过渡的进度只在渲染步进里推进，<code>getBoundingClientRect()</code> 的强制重算不推它，于是\n「相等」也可以意味着过渡还没起跑（量到的是闭合位矩形，胶囊整个在视口外，\n<code>elementFromPoint</code> 返回 null）；而 header / footer 的让位量由 <code>ResizeObserver</code> 写回\n宿主样式，移动的是 drag zone / drag edge 而不是 dialog 矩形。<code>drag-bar-edge-inset</code>、\n<code>header-drag-surface</code> 与 <code>long-press</code> 三个 spec 改用共享的\n<code>waitForSettledLayout()</code>：等过渡跑完 → 抽干一次 ResizeObserver 批次 → 再等一帧让\n写回的样式进入布局 → 连续若干帧矩形真的不再变化。断言一字未改，改的只是取样前的等待。" }
        ]
      },
      { label: 'p', content: "负载下的复现率（两个 web-ui browser suite 并发 + CPU 满载）：修前 12 次聚焦运行里\n6 条失败（涉及 4 个用例），修后 24 次聚焦运行与 16 次全量 suite 运行 0 失败。" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-22', content: "10.1.1" },
  { label: 'h3', id: 'section-23', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "f083706: feat(collapse): peek 的裁剪边缘改用与 layout header 同一套晕染——渐隐之外叠一层真实的背景模糊" },
      { label: 'p', content: "peek 的裁剪边缘此前只有一条 <code>mask-image</code> alpha 渐变：被裁掉一半的内容是<strong>变透明</strong>而不是被拿掉，\n轮廓仍然锐利，读起来像贴了张半透明胶片。layout header 的晕染（<code>layout/style.css</code> 的\n<code>header::before</code> / <code>::after</code>）用的是 <code>backdrop-filter</code> 把背后的画面真的糊掉，两处观感不一致\n（issue #221）。" },
      { label: 'p', content: "改法是给同一条渐变带补一层伪元素晕染：<code>backdrop-filter: blur()</code> 叠在 inner 上，由本盒自己的\n<code>mask-image</code> 沿带子调制强度（带子起点 0 → 后半段满强度 → 裁剪边缘前回到 0；起点不为 0 会留下一条\n「突然开始模糊」的接缝，末端不为 0 会一路糊到裁剪边界）。渐变本身与各项 <code>--wui-collapse-peek-edge-*</code>\n调优口径一律不动，展开态活动长度为 0 时色标塌缩、末位色标全透明，这一层自然什么都不画。" },
      { label: 'p', content: "新增 <code>--wui-collapse-peek-edge-blur</code>（默认 <code>4px</code>，与 header 一致）调半径。" },
      { label: 'p', content: "<code>--wui-collapse-peek-edge-active</code> 的注册由 <code>inherits: false</code> 改为 <code>true</code>：伪元素读同一个值，\n继承为 false 时它读到的是 <code>initialValue</code> 0px，mask 塌缩、模糊层静默消失而其余渲染一切照旧。" }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "56a2290: 组件内部的 scrollbar 接上整页同一套 macOS scrollbar 主题，且不额外引入 scrollbar 依赖（#225）。" },
      { label: 'p', content: "<code>web-ui-theme</code> 的外观分支、<code>.os-theme-macos</code> 主题都活在文档层：<code>.os-scrollbar</code> 的结构样式是\n文档级选择器，shadow root 永远匹配不到，所以组件内部的滚动容器此前一直是浏览器默认 scrollbar。\n本次给这些容器加一个 <code>.wui-scroll</code> 工具类，在组件自己的 shadow 里 adopted 一份只读继承 token 的\n样式：<code>scrollbar-color: var(--wui-scrollbar-handle, rgb(0 0 0 / 0.39)) transparent</code> +\n<code>scrollbar-width: thin</code>。自定义属性跨 shadow 边界继承，颜色因此与整页的覆盖式 scrollbar 同源；\n样式只 adopted 进各组件的 shadow，不落文档层。覆盖 select、autocomplete、menu overlay\n（dropdown / context-menu，含 portal 与 top layer 两种容器）、dialog 的 <code>.desc</code> 与 headless 内容区、\ndrawer 内容区、toast 容器。" },
      { label: 'p', content: "<strong>结论：用纯 CSS，不引入 OverlayScrollbars，也不删除既有依赖。</strong> 库继续服务文档/应用级 scrollbar\n（它是唯一能做出「可见 + 自动隐藏 + 零布局宽度」覆盖式 scrollbar 的东西），但把库初始化进每个\nshadow root 需要用 JS 重建每一条 scrollbar，超出 issue「组件不必引入第三方依赖」的范围。" },
      { label: 'p', content: "<strong>为什么不用 <code>::-webkit-scrollbar</code>：</strong> 它是纯 CSS 里唯一能拿到 macOS 几何（细 thumb、圆角）的手段，\n但一旦声明，引擎就会放弃平台自带的覆盖式 scrollbar，改用经典 scrollbar 并固定占一条布局宽度。实测\n（macOS Chromium，<code>width: 7px</code>）：同尺寸容器的 <code>offsetWidth - clientWidth</code> 从 0 变成 7，直接违反\nissue 的第 (1) 条「不占用宽度」。<code>scrollbar-color</code> / <code>scrollbar-width</code> 不触发这个切换——覆盖式\n平台上 scrollbar 保持零宽覆盖，经典平台上才按它们上色、收窄。" },
      { label: 'p', content: "<strong>未覆盖的既有缺口（沿用 #233 已记录的两条，本次不扩大也不修复）：</strong> (a) <code>var()</code> 回退值恒为黑 thumb，\n无任何 <code>web-ui-theme</code> 的深色页面在组件内部同样拿到黑 thumb——与整页 <code>.os-theme-macos</code> 一致，属同\n一条既有缺口；正确的修法是在主题 token 层给出跟随外观的回退，会改变文档级 <code>scrollbars.css</code> 对库\n路径的既有行为，超出本 issue 的组件内部范围。(b) 只覆写 <code>--wui-scrollbar-handle</code> 的消费方在**\n库路径**上悬停档只 +0.01：本条只涉及 <code>.os-theme-macos</code> 的 hover/active 字面量，<code>scrollbar-color</code>\n没有悬停态，组件内部路径不受影响，故一并保持原样。" },
      { label: 'p', content: "新增 <code>src/scrollbars/__tests__/internal-scrollbars.browser.spec.ts</code>：在真实浏览器里量 dialog\n内容区的计算 <code>scrollbar-color</code> 随 <code>web-ui-theme</code> 的浅/深外观切换，并断言 scrollbar 不占布局宽度\n（<code>offsetWidth - clientWidth === 0</code>）。<code>scrollbars.spec.ts</code> 追加源码形状断言：走 <code>var()</code> 读 token、\n<code>scrollbar-width: thin</code>、且<strong>不出现</strong> <code>::-webkit-scrollbar</code>（这条是承重的，变异已验证）。" }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "fe86e28: fix(context-menu): menu item 回调里自行 close() 时也让 scrim 提前出顶层，保住消费方的焦点转移" },
      { label: 'p', content: "<code>close()</code> 判定「要不要立刻让 scrim 退出 top layer」时只读 <code>_closeSource</code>，而那个标志由 panel 上的\n<code>_onMenuClick</code> 在<strong>冒泡</strong>阶段置位。消费方在自己的 menu item 回调里直接调 <code>close()</code> 时，回调挂在条目上、\n先跑，<code>close()</code> 看到的仍是 <code>'default'</code>：scrim 留在 top layer 里不退，模态期间整份文档是 inert 的，\n消费方紧接着送进编辑器的焦点被浏览器静默丢弃。" },
      { label: 'p', content: "现象是「触发重命名后焦点停在 menu item 上，编辑器根本没进编辑态」（interweave 资源列表 issue #220）。\n本仓已有一条用例守着同一根因的另一种落点（回调不自己关 menu 时，UA 归还焦点会 blur 掉编辑器并提交\n未改动的标题），但它盖不到这条路径。" },
      { label: 'p', content: "改法是新增一次性标志 <code>_menuItemActivated</code>：panel 在<strong>捕获阶段</strong>记下「可激活的 menu item 被点了」，\n<code>close()</code> 的判定把它与 <code>_closeSource</code> 并列。判据复用 <code>getMenuItemFromEvent</code> 并排除 disabled 与\nsubmenu item，与 <code>_onMenuClick</code> 同源。" },
      { label: 'p', content: "标志的作用域是<strong>一次事件派发</strong>，在微任务检查点复位：捕获阶段与冒泡阶段（关闭动作发生在那里）\n都在同一个任务内跑完，需要它判定的两条路径都赶得上；而「点了 menu item 但 menu 没关」（消费方在自己\n的条目回调里 <code>stopPropagation()</code>）必然跨过检查点，标志已被清掉，不会让后续的 Escape / 点外面 /\n程序式关闭被误判成 menu item 激活。那三种关闭的语义不变，仍保留 dialog 默认效果。" }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ac5e2e4: feat(empty): 空态 icon 改为纯图形，去掉身后的圆角矩形底面" },
      { label: 'p', content: "icon 区原本把 <code>--wui-color-surface-track</code> 画成一个 <code>border-radius: 18px</code> 的圆角矩形托底，\n图形浮在上面。issue #230 要求去掉那层底面：盒只留占位与居中，图形直接坐在它背后那张\n表面上，浅色与深色皆然。" },
      { label: 'p', content: "盒本身、<code>--wui-empty-icon-size</code> 与 <code>size</code> 的度量派生、slot 与 property 一概未动——本次只\n删了 <code>.empty-icon</code> 的 <code>background-color</code>、<code>box-shadow</code> 与 <code>border-radius</code> 三条声明。圆角随\n底面一同失去作用对象，所以 <code>--wui-internal-empty-icon-radius</code>（内部 token，未在 README 的\n公开表里）不再被消费；<code>apps/interweave</code> 的 <code>AddDialog.vue</code> 仍在覆写它，那条覆写从此无效但\n无害，留给那条链按自己的取舍清理。" },
      { label: 'p', content: "图形色沿用 <code>--wui-color-text-secondary</code>：无底面时字形是这一区唯一的图形元素，\n<code>--wui-color-text-tertiary</code> 在浅色 page 上对比度不足 3:1。新增浏览器用例钉住「icon 盒背景\n透明」与「图形与其背后表面 WCAG 对比度 ≥ 3:1」两条关系，两种 appearance 各跑一遍。" }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ad38525: Lighten the resting scrollbar thumb in light appearance so it matches the measured macOS overlay\nscrollbar, and stop the page-level scrollbars from ignoring that lightness (#216)." },
      { label: 'p', content: "The resting thumb was 50% black, which renders <code>rgb(128,128,128)</code> over the <code>#fff</code> page surface. A\nnative macOS overlay scrollbar sampled at full opacity reads <code>rgb(155,155,155)</code> on white. The light\nbranch now derives its alpha from that measurement, <code>(255 - 155) / 255 ≈ 0.39</code>, so it renders\n<code>rgb(156,156,156)</code> — one 8-bit step from the platform, where it used to be 27 steps darker." },
      { label: 'p', content: "The value had to change in <strong>both</strong> places it is written, and that is not redundancy. A\n<code>.os-scrollbar</code> mounted on <code>document.body</code> — the page-level scrollbars of interweave and both demo\nsites, the ones the issue is about — sits outside <code>web-ui-theme</code>, so\n<code>web-ui-theme[resolved-appearance='light']</code> never matches it and <code>html:has()</code> only covers the dark\nside. Such a scrollbar resolves the fallback literal inside <code>var()</code> on <code>.os-theme-macos</code>. Writing the\nnew value in the theme branch alone would have left exactly those scrollbars at 0.5." },
      { label: 'p', content: "The dark branch is deliberately untouched. To be precise about its direction: it is <strong>darker</strong> than\nthe platform, not lighter. Measured the same way, a native dark-mode knob on a dark surface reads\n<code>rgb(154,154,154)</code>, which is <code>(154 - 30) / (255 - 30) ≈ 0.55</code> in alpha terms, and the 0.5 used here\nrenders about <code>rgb(146,147,148)</code> over the current dark page token <code>#242628</code>. Bringing the dark thumb\nup to the platform is a separate request that #216 does not make, so it is left as it was and called\nout as follow-up work rather than described as already being on the safe side." },
      { label: 'p', content: "One gap is worth stating plainly because this change touches it: the <code>var()</code> fallback only ever\nproduces a <strong>black</strong> thumb. A document with no <code>web-ui-theme</code> at all therefore gets a black thumb on\na dark page — about <code>rgb(22,23,24)</code> over <code>#242628</code> — because the dark side has no fallback of its\nown and relies on <code>html:has()</code> inheritance. That is pre-existing and not a regression, and the new\nbyte-identity assertion now pins the fallback to the light branch permanently, so it is recorded here\nrather than left implicit." },
      { label: 'p', content: "<code>hover</code> and <code>active</code> keep the same absolute ladder steps (+0.12 / +0.24) above the new resting value,\nso \"pressed is darker than hovered is darker than at rest\" still holds in both appearances." },
      { label: 'p', content: "New assertions in <code>src/scrollbars/__tests__/scrollbars.spec.ts</code> cover the six things that could break\nsilently: that the light thumb is a <em>black</em> thumb and the dark thumb a <em>white</em> one (a white light-mode\nthumb renders as pure white and makes the whole scrollbar vanish on a <code>#fff</code> page); that the theme\nblock reads its colours through <code>var()</code> rather than literals, which is the only mechanism that crosses\na shadow-root boundary; that the resting light thumb is not deeper than the measured platform value;\nthat the three states stay <em>distinguishable on the rendered surface</em> in both appearances, not merely\nordered in alpha; that the dark branch's three values are untouched; and that the <code>.os-theme-macos</code>\nfallbacks stay byte-identical to the light branch. Every one of those was proven load-bearing by\nmutation before landing." },
      { label: 'p', content: "Consumers that import <code>@greypan/web-ui/scrollbars.css</code> and do not set <code>--wui-scrollbar-*</code> themselves\nsee only the lighter light-mode thumb. A consumer that sets only <code>--wui-scrollbar-handle</code> should note\nthat hover and active fall back to the ladder <code>+0.12 / +0.24</code> above whatever it sets, so a consumer\nstill overriding just the resting value at <code>0.5</code> now gets a hover only <code>+0.01</code> above it instead of\n<code>+0.12</code> — set the other two explicitly if the wider ladder matters. Nothing about the scrollbar\ngeometry, auto-hide timing, or click behavior changed." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "1446561: fix(segmented): 拖拽时 indicator 宽度跟随当前 hover 的 trigger" },
      { label: 'p', content: "#222：<code>handlePointerDown</code> 的 <code>onMove</code> 把 <code>--indicator-width</code> 钉在按下那一项的宽度上，\n拖完整段都写同一个 <code>initialWidth</code>。trigger 宽度不等是常态（interweave 设置 dialog 顶部\n即此形——截图里三项宽度明显不同），于是 thumb 滑过更宽的那项时仍然保持窄宽，与它滑过的那项\n始终对不齐，松手才在 <code>_updateIndicator</code> 里一次性跳到新宽度。" },
      { label: 'p', content: "改法是把拖拽的几何收进一个 <code>frameAt(deltaX)</code>：thumb<strong>中心</strong>跟手（<code>initialCenter + deltaX</code>），\n宽度取「离 thumb 中心最近的可用 trigger」的宽度，left 由中心减半宽反推。宽度跟着变之后\n<code>maxLeft</code> 必须换成 <code>trackRight − width</code>，否则更宽的 thumb 会被钳在按初始宽度算出的位置上、\n从 track 右端探出去。" },
      { label: 'p', content: "取「离 thumb 中心最近」而不是「离指针最近」，是为了与松手吸附用同一个判据：拖拽中预览到的\n宽度就是松手会落到的那一项，不会在松手时二次变形；抓在边缘时宽度按抓取偏移滞后，与位置\n的滞后同源。" },
      { label: 'p', content: "等宽 trigger 下 <code>width</code> 恒为 <code>initialWidth</code>，<code>initialCenter + deltaX − initialWidth/2</code>\n恒等于原来的 <code>initialLeft + deltaX</code>，行为逐字不变。" }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-24', content: "10.1.0" },
  { label: 'h3', id: 'section-25', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "9416d30: Add a <code>@greypan/web-ui/vite</code> entry point. It exports <code>webUiOptimizeDeps</code>, the list of web-ui runtime\ndependencies an app must merge into <code>optimizeDeps.include</code> when its dependency scanner cannot follow the\ncomponent graph, such as file-based routing or <code>import.meta.glob</code>. The list moves out of consumer Vite\nconfigs, so adding a web-ui runtime dependency no longer means editing every app." },
      { label: 'p', content: "Switch the interweave frontend to file-based routing through <code>vue-router/vite</code>: pages move to\n<code>src/pages/&lt;name>/index.vue</code>, the generated route table replaces the hand-written router, and the new\nvirtual route module is covered by the exported list above. Reorder side-effect imports across the\nrepository to match the updated root <code>vite.config.ts</code> import-sorting rule, and externalize\n<code>@floating-ui/dom</code> from the <code>@greypan/web-ui</code> bundle." }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-26', content: "10.0.0" },
  { label: 'h3', id: 'section-27', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "3adfd77: <code>&lt;web-ui-dialog></code> gets a real chrome band named <code>header</code>, aligned with <code>&lt;web-ui-drawer></code>, its escape hatch becomes the same <code>headless</code> mechanism the drawer already uses, and its content area no longer reserves padding outside the scroll container." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<strong>Breaking: the <code>title</code> slot is now <code>header</code>.</strong> Migration: <code>slot=\"title\"</code> → <code>slot=\"header\"</code>. There is no alias." },
        { label: 'li', content: "<strong>Breaking: the <code>body</code> mode-switch slot is gone; the escape hatch is now the <code>headless</code> boolean attribute.</strong> <code>slot=\"body\"</code> used to replace the whole card with a single scroll layer. Dialog now matches <code>&lt;web-ui-drawer></code>: add <code>headless</code> to the element and leave your content in the <strong>default slot</strong>. Migration: drop <code>slot=\"body\"</code>, add <code>headless</code> to <code>&lt;web-ui-dialog></code>, keep the content (no slot attribute). There is no <code>content</code> slot and no alias. <code>&lt;web-ui-dialog headless>&lt;section>…&lt;/section>&lt;/web-ui-dialog></code> renders <code>.wui-dialog-content</code> as the card's only scroll layer, with just the close button beside it — the <code>header</code> band, <code>.desc</code> and <code>footer</code> are not rendered. The <code>default</code> slot is rendered exactly once: inside <code>.desc</code> in the default mode, inside <code>.wui-dialog-content</code> under <code>headless</code>." },
        { label: 'li', content: "<strong>New <code>header</code> slot + <code>heading</code> attribute.</strong> The band carries the title typography (<code>18px</code> / semibold), wraps with flex / <code>space-between</code> (so it can hold a whole toolbar, not just a title) and hides when neither the slot nor <code>heading</code> is present. The <code>heading</code> attribute is the fallback: the slot wins whenever it has assigned elements, otherwise a non-empty <code>heading</code> renders <code>.wui-dialog-heading</code>. <code>headless</code> renders no band and ignores <code>heading</code>." },
        { label: 'li', content: "<strong>New <code>dialog-label</code> attribute, plus an accessible-name contract.</strong> The internal native <code>&lt;dialog></code> now takes <code>aria-label</code> from <code>dialog-label</code> when set, and otherwise — in the default mode with a visible <code>header</code> band — <code>aria-labelledby=\"wui-dialog-heading\"</code> pointing at that band. Because <code>headless</code> renders no built-in title, <strong><code>headless</code> consumers must supply the accessible name</strong> (<code>dialog-label</code>, or their own labelled element), exactly as <code>&lt;web-ui-drawer></code> requires." },
        {
          label: 'li',
          children: [
          { label: 'p', content: "<strong>Breaking: the content area's scroll port is flush with the card edge.</strong> The card's inline padding moved into the regions, so the scroll container's edge (and therefore the scrollbar) coincides with the card's inner edge, matching <code>headless</code> mode and the drawer. Two public tokens change semantics accordingly:" },
          {
            label: 'ul',
            children: [
            { label: 'li', content: "<code>--wui-dialog-padding</code> now only sets the card's <strong>block</strong> padding; its inline component no longer applies. Use the new <code>--wui-dialog-inline-padding</code> (default <code>24px</code>) for the horizontal padding of the <code>header</code> band, the content area and the footer." },
            { label: 'li', content: "<code>--wui-dialog-desc-focus-padding</code> now only reserves focus-ring room on the <strong>block</strong> axis; the horizontal ring room comes from <code>--wui-dialog-inline-padding</code> (which is far larger than the <code>5px</code> ring)." }
            ]
          }
          ]
        }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-28', content: "9.1.0" },
  { label: 'h3', id: 'section-29', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "617457a: <code>&lt;web-ui-layout></code> exposes the mobile-viewport state it renders by, so consumers no longer keep a breakpoint of their own." },
      { label: 'p', content: "<strong>New API.</strong> <code>mobile</code> is a <strong>derived, read-only</strong> member: a getter-backed property, a reflected <code>mobile</code> attribute, and a <code>mobile-change</code> (<code>CustomEvent&lt;{ mobile: boolean }></code>) notification that fires once per crossing, including the connect-time evaluation when the element mounts on a narrow viewport. It is not an input — the property is read-only (assignments take no effect and throw for strict-mode callers) and setting the attribute is reverted in the same reaction, value included, with no event for either. Read <code>layout.mobile</code> for the current value and subscribe to <code>mobile-change</code> for updates; CSS can target <code>web-ui-layout[mobile]</code>." },
      { label: 'p', content: "<strong>Consuming it.</strong> The layout re-renders in a microtask, so a consumer that reacts on a scheduler macrotask reads the old value while the new tree is already on screen. Vue is fine with a template <code>@mobile-change</code> binding (listeners are attached before insertion and flush in a microtask); React needs the element through a ref, the value read and subscribed inside <code>useLayoutEffect</code>, and the write-back wrapped in <code>flushSync</code>. Without that, the layout's React demo rendered the drawer with a stale consumer width for a frame on every crossing into mobile — measured at 2 of 221 sampled frames, zero after the fix." },
      { label: 'p', content: "<strong>Timing change.</strong> The judgement moved from <code>window.innerWidth &lt;= 640</code> plus a 100 ms <code>resize</code> debounce to <code>matchMedia('(width &lt;= 640px)')</code> — the same condition as the layout's own <code>@media (width &lt;= 640px)</code>. The tree switch, that CSS rule and <code>mobile</code> now flip at the same instant. Previously the layout could keep rendering the desktop tree for up to 100 ms after the CSS had hidden the aside, during which the sidebar disappeared entirely, and crossing back showed the drawer alone for the same window. Same-side viewport changes no longer recompute anything." },
      { label: 'p', content: "The breakpoint literal still appears four times (layout and drawer, TS and CSS): a media query cannot read a custom property, so it cannot be single-sourced. <code>components/drawer/__tests__/breakpoint-parity.spec.ts</code> guards their equality." },
      { label: 'p', content: "<strong>App CSS follows the same attribute.</strong> The three apps declare a Tailwind v4 custom variant on <code>web-ui-layout[mobile]</code>, so the mobile side of the 640 boundary is written once instead of once per breakpoint utility:" },
      { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">@custom-variant</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> mobile (&#x26;:where(web-ui-layout[mobile], web-ui-layout[mobile] *));</span></span></code></pre>", lang: "css", path: './codeblock/15121fd7ac28.css' },
      { label: 'p', content: "Every <code>max-[640px]:</code> (plus Interweave's single <code>max-sm:</code>) becomes <code>mobile:</code>. The min-width side does <strong>not</strong> follow, and that is a measured result rather than an omission: replacing the demos' <code>sm:</code> with a <code>desktop:</code> variant (and even with the media form <code>@media (width > 640px)</code>) silently overrode <code>md:</code> and <code>lg:</code>, because Tailwind v4 emits <code>@custom-variant</code> rules after the theme breakpoints and <code>:where()</code> keeps the specificity tied — so the later rule wins, and <code>desktop:grid-cols-4</code> flattened the home page to 2 columns at every width (baseline 3) and the svg demo to 3 (baseline 5). <code>sm:</code> and the demos' <code>--breakpoint-sm</code> token therefore stay, and the trap is documented in all three <code>global.css</code> files with those numbers. Two further costs: the variant only reaches nodes inside the layout subtree (overlay content portaled to <code>document.body</code> — menus, popover, tooltip, select, autocomplete, image-preview, toast — must keep using media queries; no such node uses it today), and breakpoints the layout does not model (<code>md:</code>, <code>lg:</code>, <code>xl:</code>, <code>max-[900px]:</code>) stay media queries." },
      { label: 'p', content: "In the Interweave frontend the shell consumes the new event, provides the value to the page, and the page's drawers and dialogs read it from there; the local <code>useMediaQuery</code> composable is gone. Decision record: <code>docs/adr/0023-layout-exposes-derived-mobile-viewport-state.md</code>." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "617457a: 新增 <code>&lt;web-ui-middle-ellipsis></code>：单行中间省略，保留首尾、丢掉中间（<code>very-long-file-…-abcdefghij.txt</code>），补上 <code>text-overflow: ellipsis</code> 只能保住头部的那块缺口。" },
      { label: 'p', content: "属性 <code>text</code> / <code>marker</code> / <code>marker-position</code>。<code>marker-position</code> 与 CSSWG css-overflow-5 的 <code>text-overflow: ellipsis &lt;length-percentage></code> 同向（<code>0</code> 贴行末、<code>100</code> 贴行首、默认 <code>50</code> 居中），将来该特性落地时消费方的取值可以直接搬过去。切点只落在字素簇边界上，代理对、组合符序列与 ZWJ emoji 不会被劈开；容器尺寸变化后重算。" },
      { label: 'p', content: "使用条件与 <code>text-overflow: ellipsis</code> 相同：单行，且有确定行内尺寸。" },
      { label: 'p', content: "已知限制：元素里装的是屏幕上那串，因此选中复制拿到的是截断后的文本（原文经 <code>title</code> 提供）；宿主需为 <code>direction: ltr</code>。可行性与方案对比见 <code>docs/research/web-ui-middle-ellipsis-261007.md</code>。" }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "617457a: Add the <code>@greypan/web-ui/scrollbars</code> subpath. It exports <code>webUiScrollbarsOptions</code> (macOS-aligned OverlayScrollbars options: auto-hide while scrolling, track click-to-scroll) and <code>WEB_UI_SCROLLBARS_THEME</code>, and registers the <code>ClickScrollPlugin</code> the options depend on. <code>@greypan/web-ui/scrollbars.css</code> carries the theme together with the library's structural styles in one stylesheet." },
      { label: 'p', content: "Minor rather than major: the two new export entries and the widened <code>sideEffects</code> list are additive, and the new <code>overlayscrollbars</code> peer is optional (<code>peerDependenciesMeta.optional</code>), so no existing consumer's install or import changes." }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-30', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "617457a: Fix the <code>&lt;web-ui-context-menu></code> modal panel rendering with light fallback colors under a dark appearance." },
      { label: 'p', content: "The scrim <code>&lt;dialog></code> was appended to <code>document.body</code>, but <code>&lt;web-ui-theme></code> writes <code>--wui-color-*</code> on its own <code>:host</code> and <code>document.body</code> is that host's <strong>parent</strong> — custom properties only inherit downwards, so the scrim and the panel mounted inside it both fell back to the light literals baked into <code>var(--wui-color-*, …)</code>. The scrim now mounts into the nearest theme's overlay root, the same path dropdown / select / popover already resolve, so the menu picks up the theme-scoped tokens and follows appearance changes while it is open. Without a theme scope the scrim still mounts on <code>document.body</code>, exactly as before." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "617457a: Fix two ways short and tall content could be lost inside <code>&lt;web-ui-dialog></code> / <code>&lt;web-ui-drawer></code>:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<strong><code>&lt;web-ui-dialog></code> <code>body</code> mode scrolls.</strong> With a <code>slot=\"body\"</code> child the card sized itself to its content and spilled out of the <code>dialog</code> box, which stays <code>overflow: visible</code> so the glass shadow is not clipped — everything past the fold ended up off-screen and unreachable, because no element was a scroll container. The <code>body</code> slot is now wrapped in <code>.wui-dialog-content</code>, the card keeps sizing to its content when the content fits and is otherwise bounded by the same literal <code>100vh</code> / <code>100dvh</code> backstop it already had, and the body content scrolls inside it. The built-in close button keeps its <code>--wui-dialog-close-top</code> / <code>--wui-dialog-close-right</code> offset while that content scrolls. <code>--wui-dialog-max-height</code> still caps <code>.desc</code> only, as documented." },
        { label: 'li', content: "<strong><code>&lt;web-ui-drawer placement=\"top|bottom\"></code> honours <code>--wui-drawer-height</code>.</strong> A later <code>height: auto</code> in the floating-card block overrode the placement's height, so a vertical drawer collapsed to its content height instead of the documented <code>300px</code> and <code>.wui-drawer-content</code> never got the bounded box <code>flex: 1</code> needs to shrink into — tall content overflowed the panel and could not be scrolled to. The placement height is declared again where it belongs; side placements and headless drawers behave exactly as before." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "617457a: Adjust the default offsets of the built-in close button of <code>&lt;web-ui-dialog closable></code>, and fix its unequal distances from the card's top and right edges in title mode." },
      { label: 'p', content: "The published <code>--wui-dialog-close-top</code> / <code>--wui-dialog-close-right</code> tokens now default to <code>20px</code> instead of <code>16px</code> in both content modes. The defaults are literals rather than <code>--wui-space-*</code> fallbacks, so a themed spacing change no longer moves the dialog close button; consumers that relied on that coupling should set either close token explicitly. The drawer close offsets remain at <code>16px</code>." },
      { label: 'p', content: "In title mode the button was previously a <code>flex</code> item inside <code>.title-row</code>, so its offsets came from the card's padding — <code>20px</code> from the top, <code>24px</code> from the right by default. Both content modes now share one absolutely-positioned rule, so the tokens apply in either mode and the defaults are equal. The title reserves room from the same resolved right offset, so a long title no longer runs under the button." }
      ]
    },
    { label: 'li', content: "617457a: Fix <code>web-ui-layout</code>'s <code>header-glow</code> bleeding the colour above the top of the page into the header's top edge in Safari. The blur layer no longer extends above the header box (WebKit samples the backdrop outside the viewport, so that overhang pulled the browser's own dark chrome — or content scrolled above the viewport — into the header), and its mask stop is adjusted so the feather below the header stays equivalent." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "b407aeb: Stop <code>&lt;web-ui-dialog></code> and <code>&lt;web-ui-drawer></code> from painting a stray focus ring around the panel." },
      { label: 'p', content: "Chromium treats a scrollable container as keyboard-focusable, so a dialog / drawer whose content area overflows and holds nothing focusable makes the browser's dialog-focusing steps land on that scroll container. The UA then paints its default blue ring (<code>outline: auto</code>, <code>-webkit-focus-ring-color</code>) on it, which does not match the library's <code>--wui-focus-ring-*</code> ring. The modal-surface focus policy now lives in one shared stylesheet (<code>assets/modal-surface.css</code>) that suppresses the ring on the <code>&lt;dialog></code> shell and on the panel scroll containers (<code>.desc</code>, <code>.wui-dialog-content</code>, <code>.wui-drawer-content</code>); the context-menu scrim applies the same policy in its own injected stylesheet." }
      ]
    },
    { label: 'li', content: "617457a: Shorten the shared scrollbar auto-hide delay and make track clicks land instantly. <code>webUiScrollbarsOptions</code> now hides the scrollbars 2000ms after scrolling stops (was 2500ms), and its <code>clickScroll</code> resolution gains <code>clickScrollDuration: 0</code>, dropping OverlayScrollbars' default 200ms ease so a track click jumps straight to the clicked position instead of animating there (the animation stuttered on the virtualized resource list)." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "617457a: Text controls pin their placeholder typography to the control itself instead of leaving it to engine inheritance, so placeholder text cannot drift from the control it belongs to:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>&lt;web-ui-input></code>, <code>&lt;web-ui-textarea></code>, <code>&lt;web-ui-input-number></code> and <code>&lt;web-ui-autocomplete></code> keep their placeholder in step with <code>--wui-font-size</code>, including the <code>max(16px, …)</code> clamp that coarse pointers apply to the control — declaring a separate <code>font-size</code> on the placeholder would have bypassed that clamp." },
        { label: 'li', content: "<code>&lt;input></code>'s placeholder line height now matches the control instead of resolving to <code>normal</code>. <code>&lt;textarea></code>'s already did." },
        { label: 'li', content: "<code>&lt;web-ui-input-number></code>'s placeholder consumes <code>--wui-color-text-secondary</code> like the rest of the family; it previously fell back to the user-agent colour." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-31', content: "9.0.0" },
  { label: 'h3', id: 'section-32', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: <strong>Semantic change to a public custom property.</strong> <code>--wui-dialog-max-height</code> now caps the dialog's <strong>content area</strong> (<code>.desc</code>), not the whole card. A host that sets it to <code>560px</code> and changes nothing else will now render a card up to <code>560px</code> plus its own chrome tall. A host that keeps subtracting chrome from its own inner <code>height</code> does not break — the content area's own cap catches the overflow — but it does not get the fix either, because that inner height expression stays the binding constraint and the card keeps rendering taller than the height it declares. Both cases want the same one-time conversion." },
      { label: 'p', content: "<strong>What moved.</strong> The cap used to sit on the <code>&lt;dialog></code> element, and <code>.desc</code> carried neither a cap nor <code>overflow</code>. Content that exceeded the cap pushed the card out of the dialog box instead of scrolling, so the only element that could scroll was an inner box the host sized itself. The cap now sits on <code>.desc</code>, which is a scroll container, while the <code>&lt;dialog></code> element keeps a literal <code>100vh</code> / <code>100dvh</code> backstop that only catches the case where the viewport is too short for chrome plus the cap. The title row and the footer are again sized purely by their content, so chrome can vary without dragging the content area's geometry along with it." },
      { label: 'p', content: "<strong>How to convert.</strong> Subtract your own measured chrome from the token: card padding, title row, gaps, footer. That number is a property of your dialog's own content, not of the component, so no single value is right for every host — the three dialogs in the Interweave frontend measure <code>141.59</code>, <code>141.59</code> and <code>105.59</code>. The subtracted value is a <strong>content-area budget, not a fixed whole-card height</strong>: the card still grows with its own chrome. When <code>--wui-control-size</code> grows on coarse pointers, the content area stays exactly at the token while the card grows with the footer (measured: content area 270 → 270, card 412 → 416). Once converted, an inner element can use the token directly as its <code>height</code> and no longer needs its own chrome arithmetic." },
      { label: 'p', content: "Measured effect on the Interweave frontend, converted in this same release: <code>AddDialog</code> and <code>RestoreDialog</code> become roughly 34px shorter than they were. Their old constant of <code>108</code> was simply wrong — the real chrome is <code>141.59</code> — so those two dialogs had been rendering about 34px taller than the height they declared, and now match it. <code>SettingsDialog</code> is visually unchanged: its constant of <code>106</code> was already correct." },
      { label: 'p', content: "The token's own default still has two fallback tiers, now stated as such in both READMEs: the base <code>.desc</code> rule falls back to <code>90vh</code>, and the <code>@supports (height: 100dvh)</code> enhancement falls back to <code>min(90vh, 90dvh)</code>. An engine without <code>dvh</code> support only ever gets <code>90vh</code>. Note that headless Chromium reports <code>vh</code> and <code>dvh</code> as equal, so no computed-style assertion in the test suite can tell the two tiers apart." },
      { label: 'p', content: "<code>--wui-dialog-desc-focus-padding</code> is new and defaults to <code>6px</code>. <code>.desc</code> is now a scroll container and, because one axis must be non-<code>visible</code>, a clip box as well — so a control flush against any of its four edges would have its focus ring clipped by the padding box. The margin covers all four axes, and paired negative margins on the other three sides take the same amount back out of the surrounding spacing, so introducing the token moves neither the chrome height, the card height, nor the width available to the host's inner content. <code>--wui-dialog-desc-gap</code> is now floored: the bottom margin clamps at <code>0</code> rather than going negative when a host sets the gap below this token." },
      { label: 'p', content: "<strong>Body mode</strong> (<code>slot=\"body\"</code>, no <code>.desc</code>) keeps its <strong>card size</strong> unchanged. Its position is not guaranteed: the <code>&lt;dialog></code> box backstop tightened from <code>min(90vh, 90dvh)</code> to a literal <code>100vh</code>, and a modal dialog is centred on its own box with the card drawn from the box top, so a taller box moves the card up within the viewport. Measured on Chromium and WebKit: 0px when the content is far shorter than the viewport — which is what both demos happen to do, and which is a coincidence rather than a guarantee — up to 52px / 102px as the content approaches the viewport height, and around 25–27px in the mid-range — the exact figure there moves with the fractional viewport height, so treat it as a range rather than a constant." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Close <code>web-ui-autocomplete</code> when filtering produces no matching options, and reopen it when matches return. <code>allow-custom-value</code> still submits an unmatched value with Enter." },
      { label: 'p', content: "<strong>Breaking removal:</strong> the public <code>empty</code> slot and its empty-state UI have been removed. Remove <code>&lt;div slot=\"empty\">…&lt;/div></code> from consumers; zero matches now leave the dropdown closed without rendering a panel." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Change <code>web-ui-empty</code>'s <code>size</code> from the <code>'small' | 'medium' | 'large'</code> enum to a <code>number</code> in px, defaulting to <code>56</code>. Like <code>&lt;web-ui-button></code>'s <code>size</code> it is a px length, but where button keeps a <code>string</code> property, <code>web-ui-empty</code> now takes a plain <code>number</code>. It is the one knob for the whole placeholder: it drives the icon container, <code>min-height</code>, padding, and the title/description font size, so a large icon no longer sits in medium-sized whitespace. The default glyph is <code>round(size * 3 / 7)</code> and the internal <code>--wui-internal-empty-icon-radius</code> default moves from <code>16px</code> to <code>18px</code>." },
      { label: 'p', content: "<strong>Breaking changes:</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "The exported <code>EmptySize</code> type is removed; the attribute is a plain number. Values that are not finite positive numbers (<code>NaN</code>, <code>±Infinity</code>, <code>0</code>, negatives) fall back to the default <code>56</code> instead of the old <code>'medium'</code>." },
        { label: 'li', content: "The <code>:host([size='small'])</code> and <code>:host([size='large'])</code> rules are gone; <code>size</code> is now the single source. The derived values are <code>min-height: round(size * 30 / 7)</code>, <code>padding-block: round(size * 4 / 7)</code>, and <code>padding-inline: round(size * 3 / 7)</code>, which keeps the default <code>56</code> on exactly the former <code>medium</code> metrics (<code>240px</code>, <code>32px 24px</code>) while <code>40</code> and <code>72</code> get <code>171px</code> / <code>23px 17px</code> and <code>309px</code> / <code>41px 31px</code>. Font size is one step rather than a scale: below <code>56</code> it is <code>14px</code> / <code>13px</code>, and from <code>56</code> up it is <code>16px</code> / <code>14px</code>, so a bigger placeholder reads through its whitespace rather than through bigger text." },
        { label: 'li', content: "Every <code>--wui-empty-*</code> custom property still overrides what <code>size</code> derives, including the two font sizes, which are now overridable per instance without giving up the scale. Section margins and content width never followed the old tiers and still do not follow <code>size</code>." }
        ]
      },
      { label: 'p', content: "<strong>Migration:</strong> <code>small</code> → <code>40</code>, <code>medium</code> → <code>56</code>, <code>large</code> → <code>72</code>. The old tiers were hand-tuned, so the ratios land near them rather than reproducing them — <code>small</code> used to be <code>160px</code> tall with <code>20px 16px</code> padding and <code>large</code> used to be <code>320px</code> with <code>48px 32px</code>. An invalid <code>size</code> now falls back to <code>56</code> for the whole metric set, not just for the icon box." },
      { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- before --></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-empty</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"large\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> title</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"No results\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-empty</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- after --></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-empty</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"72\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> title</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"No results\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-empty</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "html", path: './codeblock/e674dfbb9b23.html' },
      { label: 'p', content: "The generated React and Vue types declare <code>size</code> as <code>number</code>, so pass a number rather than a string attribute in those frameworks — a static <code>size=\"72\"</code> fails type checking." },
      { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-empty</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> size</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">{</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">72</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">} </span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">title</span><span style=\"--shiki-light:#D73A49;--shiki-dark:#F97583\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"No results\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">web-ui-empty</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "tsx", path: './codeblock/ad9838a3d659.tsx', load: () => import('./codeblock/ad9838a3d659.tsx') },
      { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-empty</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> :</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">size</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"</span><span style=\"--shiki-light:#005CC5;--shiki-dark:#79B8FF\">72</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> title</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"No results\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-empty</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "vue", path: './codeblock/f8941342c4a9.vue' }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Group the glass tokens by the layer that paints them, and give the light scheme a real base tint for the 1px glass ring." },
      { label: 'p', content: "<strong>Breaking renames:</strong> three public custom properties on <code>&lt;web-ui-theme></code> are renamed. No compatibility aliases are kept." },
      {
        label: 'table',
        children: [
        {
          label: 'tr',
          children: [
          { label: 'th', content: "Before" },
          { label: 'th', content: "After" },
          { label: 'th', content: "Layer" }
          ]
        },
        {
          label: 'tr',
          children: [
          { label: 'td', content: "<code>--wui-color-glass-border</code>" },
          { label: 'td', content: "<code>--wui-color-glass-ring</code>" },
          { label: 'td', content: "base tint of the 1px ring" }
          ]
        },
        {
          label: 'tr',
          children: [
          { label: 'td', content: "<code>--wui-color-glass-corner</code>" },
          { label: 'td', content: "<code>--wui-color-glass-ring-sheen</code>" },
          { label: 'td', content: "corner sheen, painted on the ring" }
          ]
        },
        {
          label: 'tr',
          children: [
          { label: 'td', content: "<code>--wui-color-glass-shade</code>" },
          { label: 'td', content: "<code>--wui-color-glass-ring-shade</code>" },
          { label: 'td', content: "corner shade, painted on the ring" }
          ]
        }
        ]
      },
      { label: 'p', content: "<code>--wui-color-glass-highlight</code> is unchanged and stays out of the <code>ring</code> group: it is an inset <code>box-shadow</code> on the element itself, not part of the ring that <code>.wui-glass::before</code> masks out." },
      { label: 'p', content: "<strong>Visual change, light scheme only:</strong> <code>--wui-color-glass-ring</code> was <code>transparent</code> and is now <code>rgb(0 0 0 / 0.05)</code>, so every glass surface in the light scheme gains a subtle but real 1px outline. This is a restyle, not an invisible gap fix. Measured against a ring-free baseline of the same box, the maximum delta of the light-scheme ring goes from 4–7/255 to 13–17/255; the exact figures move with each surface's size and corner radius. The part that was genuinely missing is the edge midpoint: with the old transparent base, any edge longer than about <code>3R</code> (<code>R</code> being that surface's <code>--wui-glass-corner-radius</code>) had a stretch that matched the ring-free baseline pixel for pixel — a delta of exactly 0 — and it now reads 13/255. The dark scheme already used <code>rgb(255 255 255 / 0.05)</code> and is unchanged, as are <code>--wui-color-glass-ring-sheen</code> and <code>--wui-color-glass-ring-shade</code> in both schemes." },
      { label: 'p', content: "The base layer is load-bearing rather than decorative. The ring is a <code>background-color</code> base with four corner-anchored <code>radial-gradient</code>s on top; the radials use a fixed radius (<code>2R</code> for sheen, <code>R</code> for shade, where <code>R</code> is <code>--wui-glass-corner-radius</code>), so any edge longer than about <code>3R</code> leaves a stretch that no radial covers. With a transparent base nothing painted that stretch. How much of the ring this affects depends on the surface's aspect ratio, since <code>R</code> is driven by each component's own radius." },
      { label: 'p', content: "The same value is now also the literal fallback in <code>glass.css</code>, so a <code>&lt;web-ui-theme></code> without <code>appearance</code> — or no theme at all — keeps the ring closed. Every other glass token in that file already falls back to its light-scheme value; this one was the sole exception." },
      { label: 'p', content: "To make the light ring lighter, lower <code>--wui-color-glass-ring</code> rather than setting it back to <code>transparent</code>, and keep it above the shade alpha (<code>0.03</code>) so the edge midpoint does not fall below the corner shading." },
      { label: 'p', content: "Consumers that read or override the three old names must update them before upgrading. No workspace in this repository overrides any of the four tokens." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: <strong>Breaking:</strong> a component no longer registers its siblings. Ten imports that only pulled in\nchild elements are gone, so importing a parent on its own no longer registers the children a\nconsumer writes inside it." },
      { label: 'p', content: "A component imported a sibling only when its own template rendered that tag. <code>web-ui-select</code>\nand <code>web-ui-autocomplete</code> render just a trigger and a slot, <code>web-ui-button-group</code> and\n<code>web-ui-dialog</code> render only slots, and <code>web-ui-dropdown</code> and <code>web-ui-context-menu</code> query the\n<code>web-ui-dropdown-*</code> children a consumer writes into them but never create one. The child\nelements were always the consumer's to provide, so these imports were dead weight that also\ncarried a misleading note about tree-shaking. The build sets <code>preserveModules: true</code> and lists\n<code>./src/components/**</code> and <code>./dist/components/**</code> in <code>sideEffects</code>, so the module graph is never\ntree-shaken in the first place." },
      { label: 'p', content: "Migration — import the children alongside the parent:" },
      { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> import '@greypan/web-ui/components/dropdown'</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">+import '@greypan/web-ui/components/dropdown-item'</span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">+import '@greypan/web-ui/components/dropdown-header'</span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">+import '@greypan/web-ui/components/dropdown-divider'</span></span></code></pre>", lang: "diff", path: './codeblock/46d08cd79a23.diff' },
      { label: 'p', content: "The same applies to <code>web-ui-select</code> and <code>web-ui-autocomplete</code>, which need\n<code>@greypan/web-ui/components/option</code>, and to <code>web-ui-button-group</code> and <code>web-ui-dialog</code>, which need\n<code>@greypan/web-ui/components/button</code>. A subpath import registers only the component it names." },
      { label: 'p', content: "Both documented consumption paths are unaffected: the <code>@greypan/web-ui</code> barrel still registers\nevery component, and <code>unplugin-web-components</code> still emits one import per literal <code>&lt;web-ui-*></code>\ntag it finds, so a template that writes <code>&lt;web-ui-option></code> keeps resolving it on its own." }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-33', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Add <code>commit-on-unmount</code> to <code>web-ui-editable-text</code> so an open editing session can end by committing when the element is unmounted." },
      { label: 'p', content: "Measured on Chromium and WebKit while scoping this, and the two engines <strong>disagree</strong> — which is the reason the property is worth having:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Chromium dispatches <code>blur</code> on the editing layer when a component being edited is removed, so a plain commit already happens today. <code>blur</code> and the <code>change</code> it triggers land synchronously <em>after</em> the unmount callback has run, so the commit arrives after whatever state the caller updates in response to the removal." },
        { label: 'li', content: "WebKit (Safari, iOS) dispatches no <code>blur</code> at all: with the default <code>false</code> nothing is committed and the draft is dropped along with the element." },
        { label: 'li', content: "Gecko (Firefox) is unverified — no Firefox build would start on the machine this was measured on, so nothing is claimed for it. Treat it as unknown rather than as matching either engine above." }
        ]
      },
      { label: 'p', content: "With <code>commit-on-unmount</code> set, the unmount itself ends an open session by committing — the draft becomes the new value, edit mode exits, and <code>change</code> is dispatched exactly once, reusing the same <code>_commitEditing</code> path as <code>Enter</code> and <code>blur</code> rather than introducing a third commit semantic. On Safari and iOS this is the only thing that preserves the draft; in Chromium it moves the commit ahead of the removal-driven <code>blur</code>, which then early-exits because edit mode is already off, so the two sources still yield exactly one <code>change</code>." },
      { label: 'p', content: "Two deliberate differences from the <code>blur</code> path: an unmount carries no user intent, so the commit only fires when the draft really differs from the baseline captured when editing began (no empty <code>change</code>); and a <code>disabled</code> or <code>readonly</code> element dispatches no commit, matching <code>_onBlur</code>. An existing draft is treated differently in those two states — under <code>disabled</code> it stays on the element, while under <code>readonly</code> it is genuinely lost, because <code>readonly</code> does not retract earlier input and no <code>blur</code> remains at unmount to commit it. That path is reachable (enter editing while editable, type, flip to <code>readonly</code>, unmount) and is not treated as a cancel, since cancelling means restoring the baseline and there is no focus or host to hand a result to at unmount; the user sees their typing disappear with neither <code>change</code> nor <code>cancel</code>." },
      { label: 'p', content: "The commit fires from the unmount callback, so <code>change</code> travels the composed path and reaches listeners on the component or any ancestor, including ancestors being unmounted in the same turn: dispatching does not require an ancestor to still be in the document. Listeners must not assume the component is still connected. This reach does not extend to an unmount React drives from its own render, which never reaches React's delegated event root — the same caveat that already applies to <code>cancel</code>. Setting <code>display: none</code> on an ancestor is not a removal and is not covered." },
      { label: 'p', content: "No new event type is introduced and the existing <code>change</code> / <code>cancel</code> signatures are untouched." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Add <code>--wui-button-group-divider-length</code> to <code>&lt;web-ui-button-group></code>. The divider between adjacent grouped buttons was a fixed 24px line with no way for a consumer to reach it — it lives in the child button's shadow root and that span is not exposed as a part — so the only alternative was dropping the group entirely and losing the shared glass pill." },
      { label: 'p', content: "The token sets the divider's long edge and defaults to 20px, so every grouped button pair gets a shorter rule than the 24px line it drew before; its cross axis stays 1px. Because it drives the long edge rather than a fixed axis, one value works for both <code>direction=\"horizontal\"</code> and <code>direction=\"vertical\"</code>." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: feat(web-ui): draw the checkbox checkmark from akar-icons:check" },
      { label: 'p', content: "<code>&lt;web-ui-checkbox></code> now strokes <code>akar-icons:check</code> where it drew <code>tabler:check</code>. Both are\nround-capped 24-unit glyphs with <code>stroke-width=\"2\"</code>, so the render path is untouched; what\nchanges is the geometry — <code>m4 12l6 6L20 6</code> starts its tail a unit further left and lifts the\ntip a unit higher than <code>m5 12l5 5L20 7</code>, which reads as a longer, more open tick inside the\n18px indicator." },
      { label: 'p', content: "The swap keeps the precondition the draw animation depends on: the asset stays <code>fill: none</code> +\n<code>stroke: currentColor</code>, so <code>&lt;web-ui-svg-draw-lines></code> animates a stroke instead of revealing a\nsolid mark. <code>checkbox.motion.browser.spec.ts</code>, which pins that, still passes." },
      { label: 'p', content: "<code>@greypan/web-ui/icons</code> loses <code>tablerCheck</code> and gains <code>akarIconsCheck</code>. <code>tablerCheck</code> was added\non this unreleased line and never shipped, so no published consumer sees a removal, and\n<code>@iconify-json/tabler</code> stays a devDependency for <code>tabler:sort-ascending-letters</code>. The new\ndevDependency <code>@iconify-json/akar-icons</code> (catalog <code>^1.2.7</code>) is only read by the generator at\nbuild time — icon bodies are inlined into the emitted modules, so nothing extra lands in the\npublished bundle." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: feat(web-ui): render the checkbox checkmark as an icon asset" },
      { label: 'p', content: "<code>&lt;web-ui-checkbox></code> drew its checkmark from a path the component carried itself. It now renders a stroked check from <code>@/icons</code> through a nested <code>&lt;web-ui-icon></code>, inside the same <code>&lt;web-ui-svg-draw-lines></code> wrapper, so the indicator is an asset like every other glyph in the library rather than a hand-held exception. The draw-in and retract, the <code>--wui-duration-trigger</code> timing and the <code>motion=\"reduced\"</code> bypass all keep working: <code>&lt;web-ui-svg-draw-lines></code> reaches geometry inside nested open shadow roots, and the check's color arrives through <code>&lt;web-ui-icon></code>'s <code>--wui-icon-color</code>, set to <code>--wui-color-on-control</code> — the token radio's dot and switch's thumb use — so it stays legible on the accent-filled indicator." },
      { label: 'p', content: "Two visible consequences. The stroke weight follows the asset (<code>stroke-width=\"2\"</code> on a 24-unit canvas, previously 3), so the check is a step thinner. And it renders at <code>&lt;web-ui-icon></code>'s own default 18px: the host cannot reach the <code>&lt;svg></code> inside the icon's shadow root, so enlarging <code>--wui-selection-control-size</code> now grows the indicator box without scaling the check inside it." },
      { label: 'p', content: "The asset has to stay stroked (<code>fill: none</code> + <code>stroke: currentColor</code>). A solid icon is a silent failure here — <code>&lt;web-ui-svg-draw-lines></code> animates <code>stroke-dashoffset</code>, which affects only stroke painting, so the animation runs to completion while the check simply appears. <code>checkbox.motion.browser.spec.ts</code> now pins <code>fill: none</code> and the on-control stroke to keep that precondition from regressing, and both checkbox motion specs observe the icon's nested shadow root, since <code>ShadowRoot.getAnimations()</code> does not cross into it." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Add an opt-in <code>long-press</code> attribute to <code>&lt;web-ui-context-menu></code> so touch users can open the menu without a right-click. It is touch-only by design: a pointer with <code>pointerType === 'touch'</code> held for <code>long-press-delay</code> (default <code>500</code> ms, matching the platform long press) opens the menu at the press point, through the same <code>_openAt</code> path a right-click uses. Holding while moving more than 10px cancels it, so a scroll never opens a menu. Without the attribute nothing changes." },
      { label: 'p', content: "Absorbing the browser's follow-up events is the part that is easy to get wrong. Once the long press opens the menu, the engine still reports that same hold as a native gesture and emits a <code>contextmenu</code> (which would reopen) and, after <code>touchend</code>, a synthesised <code>click</code> (which would immediately light-dismiss the menu the long press just opened). Both are swallowed inside a short window that closes on the next <code>pointerdown</code>, so a genuine later right-click or click is unaffected." },
      { label: 'p', content: "Verified against Chromium's real touch pipeline via CDP <code>Input.dispatchTouchEvent</code> rather than synthetic events: synthetic pointer events produce none of the gesture recognition, and <code>touchscreen.tap()</code> releases immediately so it can never hold long enough to trigger a long press. That harness is what surfaced the trailing-<code>click</code> dismissal — synthetic-event tests had the menu opening and staying open, which was wrong." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Add a <code>closable</code> attribute to <code>&lt;web-ui-dialog></code>. It renders a built-in close button in both content modes, and the button takes the same close path as Escape and backdrop clicks — so <code>controlled</code> applies to it identically: it only emits <code>open-change</code> with <code>open: false</code> and leaves <code>open</code> to the consumer." },
      { label: 'p', content: "The two content modes place the button differently, because the title row only exists when there is no <code>body</code> slot. Without a <code>body</code> slot the button sits in a <code>.title-row</code> flex line beside the title, leaving <code>.title</code>'s own bottom margin semantics untouched. With a <code>body</code> slot there is no title row, so the button becomes a direct child of the glass card and is absolutely positioned at its top-right corner, offset by the new <code>--wui-dialog-close-top</code> and <code>--wui-dialog-close-right</code> custom properties." },
      { label: 'p', content: "The button reuses the <code>ooui:close</code> icon already shipped for the drawer close button, so no new icon enters the package's generated icon set. Escape, backdrop click, and the new button now share one <code>_closeFromUser</code> path instead of three copies of the same controlled/uncontrolled branch; their behaviour is unchanged." },
      { label: 'p', content: "Omitting <code>closable</code> renders exactly what it did before: no button, and no extra wrapper element." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: fix(web-ui): size a size-less Iconify icon on the spec's 16×16 canvas" },
      { label: 'p', content: "<code>&lt;web-ui-icon></code> derived its <code>viewBox</code> from <code>icon.width</code>/<code>icon.height</code> and fell back to <code>24</code> when the data object declared neither. Iconify's own default canvas is 16×16 (<code>@iconify/types</code> README), so the fallback was the one value the spec does not allow: a size-less 16-unit icon was squashed into the top-left quarter of a 24-unit box instead of filling it. The fallback is now <code>16</code>, and generated assets no longer rely on it — <code>scripts/generate-icons.ts</code> resolves the merge chain (icon → icon set → spec default) before writing, so <code>@iconify-json/bi</code>, which publishes no root canvas for any of its 2084 icons, now emits <code>width: 16, height: 16</code> rather than leaving the size to the renderer." },
      { label: 'p', content: "The published behavior difference is for consumers who hand a raw <code>IconifyIcon</code> object to <code>.icon</code> and declare no canvas on it: such an icon renders at a different scale than before. Every icon object that declares its <code>width</code>/<code>height</code> renders as it did, which covers all assets exported from <code>@greypan/web-ui/icons</code> in the previous release — <code>biCheck</code> is new on this branch and had never rendered at the right scale." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: fix(web-ui): stop <code>&lt;web-ui-radio></code> and <code>&lt;web-ui-checkbox></code> from reserving space for a label they do not have" },
      { label: 'p', content: "The trigger row is an <code>inline-flex</code> with <code>gap: 10px</code>, and the host is sized by its content, so a control with nothing renderable in its default slot measured 28px for an 18px indicator: a gap only knows there is a flex item there, not that the item has no width. Every standalone control hit that, and so did the usual accessible-name workaround of slotting one visually hidden (<code>.sr-only</code>) span — that content is assigned to the slot but paints no box." },
      { label: 'p', content: "The row now collapses the gap when the label's rendered width is 0, tracked through one <code>ResizeObserver</code> shared by all selection controls rather than one per instance. Emptiness is deliberately measured instead of asked of the slot: <code>slot:empty</code> reads the slot's own child nodes, and assigned nodes are not its children, so an assigned-but-invisible label would have looked non-empty. The other candidate — hiding the label — is the wrong one, since <code>display: none</code> takes the slotted accessible name out of the accessibility tree along with the space." },
      { label: 'p', content: "A control whose label paints is unaffected: the 10px between indicator and text stays, as does hovering that gap to tint the indicator. A standalone or hidden-name-only control is now exactly <code>--wui-selection-control-size</code> wide, so it lines up with the content around it instead of trailing 10px of dead space. <code>shared/label-emptiness/__tests__/selection-label.browser.spec.ts</code> pins the host width for empty, <code>.sr-only</code>-only and labeled controls, the collapse when a label is removed at runtime, and the convergence for a control that mounts inside a <code>display: none</code> subtree." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Add a public <code>select()</code> to <code>&lt;web-ui-input></code> so callers can select the full current value through the component API instead of reaching into its shadow root or using deprecated <code>document.execCommand</code>. <code>&lt;web-ui-textarea></code> already exposed the same method; both now share an explicit <code>disabled</code> no-op and remain safe when the native control has not rendered." },
      { label: 'p', content: "The consistency review also adds <code>readonly</code> to <code>&lt;web-ui-editable-text></code>: it keeps focus, selection, and copying available while rejecting input and leaving edit mode without a <code>change</code>, matching the read-only contract of <code>&lt;web-ui-input></code> and <code>&lt;web-ui-textarea></code>. Existing <code>value</code> read/write, <code>input</code>/<code>change</code> paths, form association, and the documented non-reflected <code>value</code> attribute on <code>&lt;web-ui-editable-text></code> remain backward compatible." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: fix(web-ui): recompute <code>&lt;web-ui-textarea></code> autosize height when the value or <code>rows</code> changes" },
      { label: 'p', content: "An autosizing textarea only resized itself from its own <code>input</code> handler, so a value that arrived any other way — an attribute set by a parent, a property set from outside, a reset — left the box at the height it had for the old text. The height is now recomputed in <code>updated()</code> whenever the value changes, and the duplicate call in <code>handleInput</code> is gone. <code>rows</code> joins the same recompute: it sets the natural height that <code>height: auto</code> produces, but the inline pixel height overrode it, so a reactive <code>rows</code> binding had no effect at all. The autosize path also sets <code>resize: none</code>, because a native corner grip and script-owned height fight each other: the grip reasserts a height the next measurement immediately overwrites." },
      { label: 'p', content: "<code>rows</code> continues to act as a floor that longer content grows past, so <code>rows=\"2\"</code> renders a two-line box that expands for longer text." },
      { label: 'p', content: "Two changes here alter published defaults rather than only adding capability, which is why this is a <code>minor</code>:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>&lt;web-ui-textarea></code> with <code>autosize</code> now sets <code>resize: none</code>. The native corner grip and a script-owned height fight each other — the grip reasserts a height that the next measurement immediately overwrites. Consumers who want a resizable autosizing box should drop <code>autosize</code>. Textareas without <code>autosize</code> keep <code>resize: vertical</code>." },
        { label: 'li', content: "The <code>&lt;web-ui-layout></code> desktop sidebar collapse button renders as a <code>secondary</code> variant rather than <code>glass</code>. This is visible to every consumer of the component, not only to apps that opt in." }
        ]
      },
      { label: 'p', content: "Also here: the <code>&lt;web-ui-layout></code> sidebar resize handle takes the same 3px focus ring at <code>--wui-color-focus-ring</code> with a 2px offset that the rest of the library uses, shown alongside the accent bar that hover and dragging already had. The bar answers \"where is the hit area\", the ring answers \"where did the keyboard land\": the handle is 12px wide and full height, so a 3px bar on its own did not say enough." }
      ]
    },
    { label: 'li', content: "3c81816: Expose <code>&lt;web-ui-theme></code>'s resolved color scheme as the read-only reflected <code>resolved-appearance</code> attribute and <code>resolvedAppearance</code> property. The value is always <code>light</code> or <code>dark</code>: explicit appearances pass through, <code>system</code> follows <code>prefers-color-scheme</code> and updates live on OS flips, and a missing <code>appearance</code> reports the default <code>light</code>. The component owns and restores the attribute, so consumers can bind CSS selectors or Tailwind custom variants to it without maintaining a second theme state; existing View Transition behavior is unchanged." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Expose the nested drawer stack's reveal step as <code>--wui-drawer-nested-peek-base</code>, and grow the stack logarithmically instead of by a constant step." },
      { label: 'p', content: "The stack used to shift each layer inward by a hardcoded <code>12px</code>, so four drawers produced three identical 12px steps and a 36px total. Depth <code>d</code> now shifts by <code>A · ln(d + 1)</code>, so the total stack width is <code>A · ln(n)</code>: the first reveal is wide, each layer above it adds less, and the total no longer inflates linearly with depth. With the shipped defaults a four-layer stack of <code>320px</code> drawers reveals <code>37.43px</code> / <code>21.90px</code> / <code>15.53px</code> for a <code>74.86px</code> total on desktop, and <code>24.95px</code> / <code>14.60px</code> / <code>10.36px</code> for a <code>49.91px</code> total at <code>width &lt;= 640px</code>. A single layer is unaffected, since <code>ln(1)</code> is <code>0</code>." },
      { label: 'p', content: "<code>A</code> is a registered <code>&lt;length></code> custom property, so the desktop default is the <code>initialValue</code> the component passes to <code>CSS.registerProperty</code> and narrow viewports override the same token from a media query. Set it on the host (or any ancestor) to retune the whole stack, or to <code>0</code> to turn the reveal off; a consumer's unitless <code>0</code> is normalized to <code>0px</code> at computed-value time. The component also recomputes an open stack when the viewport crosses the breakpoint, so a stack that is already on screen does not keep offsets from the other base." },
      { label: 'p', content: "The scaling and width compensation that position the cards are unchanged, as are drag-to-close, reduced motion, headless, and inset." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Expose the desktop sidebar collapse toggle's width as <code>--wui-layout-sidebar-toggle-width</code> (default <code>44px</code>)." },
      { label: 'p', content: "<code>.sidebar-toggle</code> sets <code>--wui-button-width</code> on itself, and a declaration on the element beats an inherited value of the same name, so consumers could not resize it from the outside. Apps that shrink <code>collapsedWidth</code> were left with a toggle that no longer matched their collapsed panel. This routes the width through the variable so those apps can size it themselves: set the toggle width so that it plus its own <code>8px</code> horizontal margins fills <code>collapsedWidth</code> minus the <code>aside</code>'s <code>8px</code> left padding, which is the width of the collapsed panel. Values below <code>36px</code> are clamped by the button's own <code>--wui-control-size</code> floor." },
      { label: 'p', content: "The default is unchanged: with the variable unset the toggle is still <code>44px</code> wide." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Add two scale families to <code>&lt;web-ui-theme></code> and route component styles through them." },
      { label: 'p', content: "<strong>Typography tokens</strong> are named by the role the text plays, not by scale position, matching\nthe radius decision in ADR-0006 §6.3: <code>--wui-font-size-caption</code> (12px), <code>--wui-font-size-readout</code>\n(13px), <code>--wui-font-size</code> (14px), <code>--wui-font-size-title</code> (18px), <code>--wui-font-weight-medium</code>\n(500), <code>--wui-font-weight-semibold</code> (600), and <code>--wui-line-height-tight/snug/normal/relaxed</code>\n(1.2 / 1.4 / 1.5 / 1.6). Every <code>font-size</code>, <code>font-weight</code> and typographic <code>line-height</code> in the\ncomponent layer now resolves through a family token with a literal fallback, so the fallback path\nstill renders correctly with no theme present. <code>line-height: 1</code> and <code>0</code> and <code>font-size: 0</code> are\ndeliberately left as literals: they are single-line centering and inline-gap-collapse techniques,\nnot typographic values." },
      { label: 'p', content: "<strong>Spacing tokens</strong> are a six-step 4px scale, <code>--wui-space-1</code> through <code>--wui-space-6</code>\n(4/8/12/16/20/24px). This is a documented departure from ADR-0006 §6.3's \"no numeric scale\"\nrule: radius has a handful of strong role names, but spacing appears at more than fifty call\nsites where one 8px serves as control gap, group gap and inline padding at once — role naming\nthere would duplicate a single number into several mutually drifting tokens. The family\ndoes not replace the per-component override tokens (<code>--wui-button-px</code>, <code>--wui-dialog-padding</code>,\nand the rest); it supplies their fallback default, so each component still owns its own padding\nwhile the scale states where that value sits in the overall rhythm. Overriding a step therefore\nacts as a density lever across every migrated call site. It is a lever over rhythm only: offsets\nthat align to the viewport edge or to the host's content edge are excluded by meaning even when\nthey land on the 4px grid, and the override has to sit inside the <code>&lt;web-ui-theme></code> scope for the\ntheme host to declare the step to its own subtree. The scale deliberately omits 1px, 2px, 6px,\n7.5px, 10px and negative values: those are hairline widths, optical corrections, an off-grid half\nstep, and flex-gap cancellation respectively." },
      { label: 'p', content: "<strong>One behavior change beyond pure addition:</strong> <code>--wui-radio-group-gap</code> and\n<code>--wui-checkbox-group-gap</code> now default to <code>var(--wui-space-2)</code> instead of the literal <code>8px</code>, so\nthey are coupled to that step — overriding <code>--wui-space-2</code> on the theme host now also moves the\ngap between group members. Embedders are not broken: an explicit\n<code>--wui-radio-group-gap: 12px</code> still wins, exactly as before. The release is minor rather than\npatch because the new tokens widen the public surface; the retarget is a small, documented\ncoupling change on top of that." },
      { label: 'p', content: "<strong>No rendered change.</strong> Every migrated declaration keeps its original literal as the inner\nfallback, so computed values are identical with or without a theme ancestor; only the token\nreference is new." },
      { label: 'p', content: "Both families are appearance-independent and are declared in the theme's base <code>:host</code> block\nrather than the light or dark blocks, so switching appearance never alters type metrics or\nspacing." },
      { label: 'p', content: "<code>theme/__tests__/typography-spacing-scale.spec.ts</code> guards against drift from both directions:\ncomponent CSS may not reintroduce bare typography literals, and every token defined in either\nfamily must have at least one consumer, so adding a step nobody uses fails the build instead of\nsilently becoming dead public API." }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-34', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Fix <code>web-ui-context-menu</code> so closing it no longer steals focus back from a target the caller has already focused." },
      { label: 'p', content: "On close the menu unconditionally called <code>focus()</code> on whatever was focused when it opened, after the exit transition had finished. When a menu item's action opened something that takes focus — an inline rename editor, for example — the caller focused it in a microtask, while the unconditional restore ran later in a macro task and pulled focus back to the pre-open element. That blurred the new editor, and because <code>web-ui-editable-text</code> commits on blur, the still-unchanged value was submitted as a fresh edit." },
      { label: 'p', content: "The restore is now conditional: it runs only while the menu still holds focus. If focus has moved to a live element outside the menu, the menu leaves it alone. Ownership is read with <code>:focus-within</code> rather than <code>Node.contains(document.activeElement)</code> — the panel is mounted inside the overlay container's shadow root and menu items focus a control inside their own shadow root, so browsers report the shadow host and <code>contains</code> never matches." },
      { label: 'p', content: "Normal restore is unchanged: Escape, keyboard navigation and outside clicks that leave nothing focused all still return focus to the element that had it when the menu opened. No public API is added; the behaviour is now documented in the README." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Reconcile <code>header</code> and <code>footer</code> slot presence when a <code>&lt;web-ui-drawer></code> is reconnected." },
      { label: 'p', content: "The drawer recomputed which of its two end sections have slotted content in <code>connectedCallback</code>, but never asked for a render afterwards. Lit's <code>connectedCallback</code> only calls <code>enableUpdating(true)</code> and <code>setConnected(true)</code> — it does not schedule an update — and the section visibility is decided during render, so the recomputed value was never put to use. The two <code>slotchange</code> handlers could not cover for it either: <code>slotchange</code> fires when a slot's <em>assigned set</em> changes, and emptying the slot content between disconnect and reconnect leaves the assigned set where it was, so the event never arrives." },
      { label: 'p', content: "The result was silent. A drawer whose <code>footer</code> content was removed while it was detached from the document came back with an empty footer section still laid out. The section keeps a real height from its own padding (32px by default), so the panel grew a dead strip along its end that swallows presses without doing anything, and the drag-to-close hit zone kept yielding to it — <code>--wui-drawer-drag-zone-inset</code> staying non-zero on a drawer that, per its own documentation, has nothing left to yield to." },
      { label: 'p', content: "<code>connectedCallback</code> now requests an update whenever the reconciled presence differs from what it had, matching the discipline the <code>slotchange</code> handlers already use. The section collapses as soon as the drawer is back in the document and the drag zone returns to the panel edge." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Fix <code>web-ui-layout</code>'s <code>header-glow</code> so its feather no longer ends in a hard band in Safari." },
      { label: 'p', content: "<code>header</code> sets <code>isolation: isolate</code>, which makes it a local stacking context and a clipping boundary for its own <code>z-index: -1</code> pseudo-elements. The glow necessarily overflows that box, and <code>filter: blur()</code> extended the feather further outside the box still, where WebKit cuts it off. The result was a visible step at the bottom edge: the ramp reached a non-zero alpha and dropped straight to zero inside a single device row." },
      { label: 'p', content: "Nothing now depends on drawing outside the box, so no cut exists. The colour is painted inside the box by a <code>linear-gradient</code>, and the real blur moved to a second pseudo-element whose <code>backdrop-filter</code> is faded to zero alpha by a <code>mask</code> before it reaches any clip line. Both layers expand with a negative <code>margin</code> rather than <code>transform: scale</code>, and the mask's alpha is already zero where the blur would have spilled out. The transparent endpoint is the bare <code>transparent</code> keyword rather than <code>color-mix(in srgb, var(--wui-color-page) 100%, transparent)</code>: colour mixing is premultiplied, so that expression resolves to the fully opaque colour and leaves no fade at all." },
      { label: 'p', content: "Horizontal clipping, sticky behaviour and the glow's colour are unchanged, and the glow still follows the header's measured box, so it adapts to slot height as before." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Fix <code>web-ui-dialog</code>, <code>web-ui-drawer</code> and <code>web-ui-image-preview</code> so opening one with a double click no longer leaves a document selection behind." },
      { label: 'p', content: "<code>showModal()</code> promotes the panel into the top layer, and the browser re-resolves the still-live double-click selection against the new layout. The selection therefore landed on the dialog's or drawer's own just-mounted body text, leaving it visibly highlighted. The selection is created by the browser inside the <code>showModal()</code> call: no Selection API is invoked by script, and <code>preventDefault()</code> on <code>dblclick</code> does not stop it." },
      { label: 'p', content: "Each component now clears the document selection right after the panel is promoted. Only the selection is cleared — no <code>user-select</code> is changed — so text inside an open panel is still selectable by dragging, and the existing <code>user-select: none</code> areas are unaffected. Opening an overlay also discards a selection that existed before the open, which the modal backdrop had already made unusable." }
      ]
    },
    { label: 'li', content: "3c81816: Fix image preview staying invisible for relative image sources. Loaded images were tracked by\ntheir resolved absolute URL while the rendered <code>is-loaded</code> state was looked up by the\ncaller-supplied source string, so the two never matched for a relative <code>src</code> and the image\nremained at <code>opacity: 0</code> even though it had loaded. Images that fail to load now also fade in\nso their alt text fallback is shown." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Remove the unused <code>--wui-layer-base</code> custom property from <code>&lt;web-ui-theme></code>." },
      { label: 'p', content: "<strong>Breaking removal:</strong> <code>--wui-layer-base</code> was a public custom property. It has no consumers in this repository, and no compatibility alias is kept. External consumers that read or override the old property must remove those references before upgrading." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: fix(web-ui): let a form-associated control actually leave the disabled state" },
      { label: 'p', content: "Re-enabling a control left it looking and behaving disabled: <code>&lt;web-ui-button disabled></code> with <code>disabled</code> set back to <code>false</code> kept the shadow <code>&lt;button></code> disabled, dimmed at 40% opacity and unclickable, while the host property, the host attribute and the component's own disabled getter all read <code>false</code>. Only a forced re-render cleared it. Lit reflects <code>disabled</code> <em>after</em> it renders, and the browser delivers <code>formDisabledCallback</code> synchronously inside that reflection, so the follow-up <code>requestUpdate()</code> landed while <code>isUpdatePending</code> was still true and Lit dropped it — no second render ever came. <code>defineFormAssociation.setDisabled</code> now recognises that window and re-requests the update once the cycle ends, which covers every control that composes it (<code>web-ui-input</code>, <code>web-ui-textarea</code>, <code>web-ui-select</code>, the group controls and the rest), not just the button." },
      { label: 'p', content: "<code>web-ui-button</code> also stops mirroring the state on its own: it composes the same shared form-association lifecycle instead of holding a private <code>ElementInternals</code> and <code>_formDisabled</code> copy, so the timing rule lives in one place. Its form behaviour is unchanged — it still owns an outer form for <code>submit</code>/<code>reset</code> forwarding and contributes no value to <code>FormData</code>." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: fix(web-ui): let <code>web-ui-button</code> drive its outer native form" },
      { label: 'p', content: "<code>type=\"submit\"</code> and <code>type=\"reset\"</code> now forward through the component host's form owner after the composed <code>click</code> event finishes (on the next task), so an unprevented activation submits or resets the owning <code>&lt;form></code> while a <code>preventDefault()</code> on the click still cancels it. The host declares <code>static formAssociated = true</code> and reads its live owner from <code>ElementInternals</code>; the rendered button remains in Shadow DOM without a form owner of its own, so <code>SubmitEvent.submitter</code> is <code>null</code> and the button contributes no value to <code>FormData</code>." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Stop a tall context menu from spilling past the bottom of the viewport when it is opened near that edge. Clamping used <code>panel.getBoundingClientRect()</code>, which includes transforms, and the panel is mid-way through its enter animation <code>transform: scale(var(--wui-scale-enter, 0.95))</code> at exactly that moment. The clamp therefore sized the menu 5% smaller than it turns out to be: a 456px menu was positioned as if it were 433.2px tall, and once the animation settled back to <code>scale(1)</code> its bottom edge sat 14.8px below the viewport. The panel clips overflow and does not scroll, so the last item — often the destructive one — was cut off and could not be clicked or scrolled to." },
      { label: 'p', content: "The arithmetic clamp has since given way to Floating UI. Positioning now runs <code>computePosition</code> with the trigger point as a zero-size reference: <code>flip</code> picks between opening below the trigger point and flipping above it when there is not enough room, and <code>shift</code> clamps both axes into the viewport, clearing <code>--wui-context-menu-safe-area-bottom</code> along the bottom edge. A tall menu opened near the bottom edge therefore flips above the trigger point with its bottom edge aligned to it, and is clamped into the viewport either way, so the last item stays reachable instead of being cut off." },
      { label: 'p', content: "Sizing is still taken from untransformed dimensions. The panel is mid-way through its enter animation at exactly the moment it is positioned, and Floating UI's <code>getDimensions</code> falls back to <code>offsetWidth</code> / <code>offsetHeight</code> whenever a measured rect disagrees with them — the same protection the offset-based arithmetic gave, and still load-bearing: measuring the 95%-scaled rect would make the menu reserve less room than it ends up needing." },
      { label: 'p', content: "This corrects both axes. The same inflated rect was feeding the horizontal clamp, so a menu opened near the right edge overflowed it by the same proportion (measured at 1.2px on a 414px-wide viewport, and scaling with menu width); both axes have their own regression guards, and the horizontal guard checks that the clamp was computed from the untransformed width rather than pinning an exact distance from the viewport edge." }
      ]
    },
    { label: 'li', content: "3c81816: Fix <code>web-ui-context-menu</code> so its initial programmatic focus remains available for keyboard navigation without showing the accent focus highlight, while explicit keyboard navigation keeps the normal focus indicator." },
    { label: 'li', content: "3c81816: Fix <code>web-ui-context-menu</code> so clicks on interactive page content within its host, including list rows and checkboxes, light-dismiss the open menu while preserving the underlying interaction." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Make <code>&lt;web-ui-context-menu></code> modal while it is open, and anchor its touch menu to the bottom of the viewport." },
      { label: 'p', content: "The menu used to be an ordinary positioned element with a document-level click-outside listener. That arrangement cannot decide \"outside\" correctly when the host has its own interactive content: every row of light DOM sits outside the menu panel, so the check and the row activation were two consequences of the same <code>click</code> with nothing arbitrating between them, and the row underneath won. Right-clicking a resource row and then clicking elsewhere activated whatever was under the click — including a checkbox or a link — instead of only dismissing the menu." },
      { label: 'p', content: "The menu now opens inside a transparent <code>&lt;dialog></code> put into the top layer with <code>showModal()</code>. Modal dialogs sit above every stacking context, so the \"who has the higher z-index\" constraint disappears rather than being re-tuned, and nothing below can be hit-tested while the menu is open. A click therefore lands either on the scrim (dismiss) or on the panel (activate); a click on the page underneath does not reach it at all. The scrim stays fully transparent on purpose — it exists to absorb hits, not to dim the page, and a dimming context menu is easily confused with the dialog and drawer scrims, which are visible bordered cards. Escape still goes through the shared overlay arbiter so one keypress closes exactly one layer; the native <code>cancel</code> is swallowed so the UA cannot close the scrim behind the component's back. A modal <code>&lt;dialog></code> also restores focus to the element that had it when <code>showModal()</code> ran, so focus return is now the platform's behaviour rather than something the component reimplements." },
      { label: 'p', content: "Activating a menu item is the one case that cannot keep the scrim modal until the exit transition finishes. Item actions commonly hand focus onward — renaming a resource swaps the row for an inline editor and focuses its textarea — and a restore that lands afterwards pulls focus straight back out of that editor. Since <code>web-ui-editable-text</code> commits on blur, the still-unchanged title was submitted as a fresh edit. So an item activation releases the scrim's modality at the moment of the click, while focus is still inside the menu and the restore still lands on the opener; the action then takes focus and keeps it. Outside clicks, Escape and programmatic <code>close()</code> keep the dialog's default effect, which is the behaviour users expect there." },
      { label: 'p', content: "The scrim's <code>::backdrop</code> has to be cleared explicitly as well. <code>::backdrop</code> is an independent pseudo-element that does not inherit the element's <code>background</code>, so <code>background: transparent</code> on the scrim left the UA default <code>dialog::backdrop</code> — <code>rgba(0, 0, 0, 0.1)</code> — painting a 10% black layer over the whole page the moment <code>showModal()</code> ran. Every element-level check still read transparent, because that layer is not on the element at all. Clearing it keeps the scrim invisible while it stays in the top layer. The dialog and drawer backdrops are left alone: those are deliberate visible card scrims." },
      { label: 'p', content: "Touch long-press now opens the menu downward from the press point: its top edge sits at the press <code>y</code> and it is centred horizontally on the press <code>x</code>, matching how native iOS and Android long-press menus appear. When there is not enough room below, the panel flips above the press point instead of running off the screen, and both axes are clamped into the viewport while clearing the safe area. The safe-area inset reads <code>--wui-context-menu-safe-area-bottom</code> (default <code>env(safe-area-inset-bottom, 0px)</code>), which is overridable for notched-screen simulation." },
      { label: 'p', content: "Placement is decided by Floating UI's <code>flip</code> and <code>shift</code> middleware rather than hand-rolled arithmetic, and touch and mouse now share a single <code>computePosition</code> pass. The two inputs differ only in horizontal alignment: touch centres on the press point, while a right-click keeps the menu's top-left corner at the cursor. Centring a right-click would drop the cursor inside the panel's top edge, which both contradicts the desktop convention and leaves an item permanently under the pointer, so the split is kept — by input, not by viewport width. Near an edge the panel stays fully visible and gives up the centring; a clipped menu is worse than a non-centred one." },
      { label: 'p', content: "One visible consequence: during the ~160ms exit transition after an item activation the scrim is out of the top layer, so the page underneath becomes hit-testable again and the menu's stacking level is that of the normal flow. It is only reachable in that short tail, and only when the menu was opened over a drawer or dialog." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Make the documented <code>--wui-dialog-max-height</code> custom property actually control <code>&lt;web-ui-dialog></code>. It has been listed in both READMEs as public API, but the dialog stylesheet never referenced it and hardcoded <code>max-height: min(90vh, 90dvh)</code> instead, so every consumer override was silently discarded. Consumers currently overriding it — the <code>AddDialog</code> and <code>RestoreDialog</code> in the Interweave frontend, which declare <code>min(82vh, 560px)</code> and <code>min(90vh, 640px)</code> — will now see those dialogs render at their declared height instead of the hardcoded viewport height." },
      { label: 'p', content: "Consumers that do not set the token are unaffected: the fallback resolves to the same value as before. The <code>dvh</code> enhancement moved into an <code>@supports (height: 100dvh)</code> block rather than staying a second plain declaration. That matters because a <code>var()</code> fallback is substituted at computed-value time: on an engine without <code>dvh</code> support the substituted value would be invalid at computed-value time and <code>max-height</code> would fall back to <code>none</code>, which is worse than not having a token at all. The plain two-declaration form discarded the unsupported declaration at parse time instead." },
      { label: 'p', content: "Both READMEs also now state the real default, <code>min(90vh, 90dvh)</code>, rather than <code>90vh</code>." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Keep the drawer's drag capsule against the panel edge instead of letting the header/footer yield drag it along — and keep it grabbable while it sits there." },
      { label: 'p', content: "The capsule was a child of the drag-to-close hit zone, and the zone yields to the header (<code>placement=bottom</code>) or the footer (<code>placement=top</code>) so it does not cover that section's buttons. Because the capsule was positioned against the zone, it inherited the whole yield: with a 56px header it sat 68px below the panel edge instead of the 8px its own midline calls for — pushed away from the edge it was meant to mark, and onto the panel's content. This was a side effect of the change that taught the zone to yield; that fix was correct, but the capsule travelled with it." },
      { label: 'p', content: "The capsule and the zone are now siblings, both direct children of the dialog, so the yield stays the zone's business: the capsule is always placed against the panel edge and the zone still clears the section. The two constraints pull in opposite directions — returning the zone to <code>top: 0</code> does put the capsule back at the edge, but immediately puts the header back under the hit zone — so they are separated structurally rather than by tuning a number. The capsule keeps <code>position: absolute</code> inside the dialog's transform containing block, so it still travels with the panel during a drag." },
      { label: 'p', content: "Moving the capsule to the edge does leave it outside the zone: the two bands cannot overlap, because \"against the edge\" and \"clear of the header\" are the same axis. On its own that makes the capsule a marker you cannot grab — precisely the configuration this change targets. So <code>top</code> / <code>bottom</code> now also render a thin edge band along the grab edge (12px tall by default), whose height is derived from the capsule's own midline token. That derivation is what makes the containment structural rather than conventional: the midline is floored at half the bar thickness plus 4px, so the capsule's band can never fall outside the edge band's. Pressing the capsule starts a drag and hovering it lights it up, on every placement. The left and right placements render no edge band and are untouched — the capsule already sat inside the zone there." },
      { label: 'p', content: "The trade is explicit: the top strip of the header or footer becomes draggable rather than inert. That strip is only as wide as the capsule and centred with it — never the panel's full width — and that footprint ceiling is what keeps the built-in close button and header controls clear. The clearance follows from the band never covering more than the capsule does, measured across combinations of <code>--wui-drawer-drag-bar-thickness</code> and <code>--wui-space-4</code>, not from the close button happening to sit below the band's default height; an earlier draft of this change claimed it on that basis, and the claim did not survive a thicker handle. The close button's stacking level also moved above the band, which covers the remaining case where <code>--wui-drawer-drag-bar-length</code> is long enough for the handle to reach it. One boundary is inherent: a control placed inside the capsule's own span, whose top edge falls within the band's height, is covered by the band, because the band has to cover the capsule. <code>z-index</code> does not lift such a control clear — Chromium keeps the band above slotted content — and <code>--wui-drawer-drag-bar-length</code> is the lever, since it sets the capsule length and the band width together. The capsule stays <code>pointer-events: none</code>, so it itself never intercepts a press; that is also what keeps the hover/active and drag-close-confirm colours working, since a pointer over the capsule still hovers the surface underneath. Those three rules moved to general-sibling selectors to match the new structure — adjacent-sibling would silently stop matching the edge band — and the confirm state keeps the zone in its selector so it still outranks hover/active on specificity rather than source order." },
      { label: 'p', content: "The public tokens are unchanged, and when the drawer is nested as a lower layer both the capsule and the edge band fade out with the zone." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Stop the draw-to-close hit zone of a top or bottom drawer from covering its header or footer. The zone is an absolutely positioned sibling of the panel body, and <code>placement=bottom</code> pinned it at <code>top: 0</code> — exactly where the header starts, with a higher stacking order than the panel itself. Buttons under the header were neither clickable nor able to start a drag, and the whole header sat under a 20px transparent strip. <code>placement=top</code> was the mirror image, covering the footer rather than the header." },
      { label: 'p', content: "Both zones now yield to the section they would otherwise cover: <code>bottom</code> clears the header, <code>top</code> clears the footer. The yield is measured from that section's border-box height with a <code>ResizeObserver</code>, written to <code>--wui-internal-drawer-header-inset</code> / <code>--wui-internal-drawer-footer-inset</code>, and consumed by the two placement rules — so a header whose height is dynamic (a narrow-viewport breakpoint rewriting it, consumer padding, slotted content wrapping) is followed rather than sampled once. With no header or footer present the yield is <code>0</code> and the zone sits exactly where it did before; the left and right placements are untouched, since they hug a vertical edge where neither section lives." },
      { label: 'p', content: "The breathing gap between the zone and the section is exposed as <code>--wui-drawer-drag-zone-inset</code> (defaulting to <code>var(--wui-space-1, 4px)</code>) so it can be tuned on a device without rolling anything back." }
      ]
    },
    { label: 'li', content: "3c81816: Fix native dialog presence so closing immediately after opening still plays the exit transition instead of removing the dialog abruptly." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Make the whole header of a bottom drawer — and the whole footer of a top one — a drag-to-close starting area, and thicken the capsule's hit band." },
      { label: 'p', content: "Yielding the drag zone to the header kept the header's controls clear, but it also left that section inert: with <code>placement=bottom</code> the only draggable strips were a 12px band along the grab edge and the zone below the header, so the 48px between them could not start a drag at all. On a touch device the handle was reported as far too small to hit." },
      { label: 'p', content: "The section on the grab edge now takes the gesture itself. A press anywhere in it starts a drag, title text included. Controls are kept clear one at a time, at the event layer: a press whose composed path contains an interactive element — native <code>button</code> / <code>input</code> / <code>select</code> / <code>textarea</code> / <code>label</code> / <code>a[href]</code> / <code>summary</code>, anything <code>contenteditable</code>, an interactive ARIA <code>role</code>, or any explicit <code>tabindex</code> other than <code>-1</code> — reaches the control and starts no drag. Geometric cutting was rejected deliberately: it would have to measure each control's position, so it breaks as soon as a control moves, and it relocates the previous defect instead of removing it. A custom control that is not natively interactive needs a <code>role</code> or <code>tabindex</code> to be recognised, which is the right call for accessibility regardless." },
      { label: 'p', content: "The capsule's hit band is now at least <code>--wui-drawer-drag-edge-size</code> (default <code>20px</code>, matching the drag zone's own default, so the handle is never harder to hit than the strip beside it), floored by the capsule's own outer edge so the capsule band stays fully covered by construction. The band was 12px before, derived from the capsule's midline alone." },
      { label: 'p', content: "The drag zone still yields to the header or footer, the left and right placements are untouched, and with no header or footer present the geometry is exactly what it was. The built-in close button sits outside the capsule's span and stays clickable." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Remove the hairline dividers between a drawer's header, content, and footer. <code>.wui-drawer-header</code> carried a <code>border-bottom</code> and <code>.wui-drawer-footer</code> a <code>border-top</code>, both the hard-coded literal <code>rgb(0 0 0 / 0.06)</code> — the only two occurrences of that colour left in the package. The panel body already carries the <code>.wui-glass</code> ring and shadow, and the sections read as separate through padding and typographic hierarchy; on a translucent glass surface the extra 6% black line read as a hard seam. It also followed no token, so it was a leftover that no appearance override could move." },
      { label: 'p', content: "This is a visible change to how an open drawer looks: the two lines are gone, and header/content/footer now meet without a rule between them. Nothing about layout, sizing, or behaviour changes — the sections occupy exactly the same boxes, and the header's and footer's padding tokens are untouched." }
      ]
    },
    { label: 'li', content: "3c81816: Make dropdown hover states use the neutral border background without changing text color, keep selected and active styling unchanged, and lower the shared menu panel background opacity in light and dark themes while preserving standalone fallback parity." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Derive the focus indicator colour from the accent colour instead of hard-coding it. <code>--wui-color-focus-ring</code> was the literal expansion of the default accent (<code>rgb(0 136 255 / 0.4)</code> is <code>#08f</code> at 40% alpha), kept in sync by hand, so a consumer that overrode <code>--wui-color-accent</code> — which is the documented way to theme this package — got a focus ring that stayed the original light blue. The ring is now <code>color-mix()</code> of whatever <code>--wui-color-accent</code> currently resolves to, at 40% in light and 62% in dark; those two alphas are a tuning result and are kept distinct." },
      { label: 'p', content: "The sixteen component-level fallbacks were rewritten as a chained <code>var(--wui-color-focus-ring, color-mix(...))</code> rather than as <code>color-mix</code> literals. The value of the chained form is that the fallback derives from the same accent instead of restating one, so a literal and a theme token can no longer drift apart. Note that this is not what the token-parity guard asks for: it skips fallbacks containing <code>var(</code> (the chained form is deliberately outside its literal comparison, since a chained fallback resolves differently per theme context), so these sixteen sites are now covered by <code>focus-ring-accent.browser.spec.ts</code>, which reads the real computed style off a mounted component instead of comparing expressions. With the default accent every one of these resolves to exactly the colour it did before, so nothing changes visually until an accent is overridden — including with no <code>web-ui-theme</code> at all, where the fallback's <code>#08f</code> + 40% is the same colour as the literal it replaces. <code>--wui-color-glass-ring</code> is untouched: it is an achromatic glass-lighting token that was never meant to follow the accent. The selected-state glow on <code>web-ui-radio</code> (previously <code>0 0 4px rgb(0 136 255 / 0.3)</code>, which had no custom property at all and so was not covered by the parity guard) now derives from the accent at 30%; it is a decorative glow rather than the focus ring, which is why its alpha differs." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: feat(web-ui): add three icons to <code>@greypan/web-ui/icons</code>" },
      { label: 'p', content: "<code>biCheckLg</code>, <code>akarIconsCircleCheck</code> and <code>fluentTagSearch24Regular</code> join the generated icon\nset. All three are additive exports — nothing is renamed or removed, so existing consumers\nare unaffected." },
      { label: 'p', content: "They are the icon bodies the Interweave library surface needs: a roomier check mark for\nconfirm actions, a filled circle-check for the same action in the add dialog, and a\ntag-search glyph to prefix the tag filter input." },
      { label: 'p', content: "The new devDependency <code>@iconify-json/fluent</code> (catalog <code>^1.2.58</code>) is read only by the\ngenerator at build time. Icon bodies are inlined into the emitted modules, so no extra\ndependency reaches the published bundle." }
      ]
    },
    { label: 'li', content: "3c81816: Darken light-mode surface tokens (sidebar and dropdown panels) one step for better layering." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Stop <code>&lt;web-ui-dialog></code> and the other scroll-locking overlays from zeroing the page scroll position while they are open. <code>lockScroll()</code> pinned the body with <code>position: fixed</code> and <code>top: -scrollY</code> to suppress iOS rubber-band scrolling, which pulled the body out of the document flow: <code>documentElement.scrollHeight</code> collapsed and <code>window.scrollY</code> was reported as <code>0</code>. Anything positioning itself from the window scroll offset — a <code>@tanstack/virtual-core</code> list, for instance — then rendered the wrong rows while keeping its old offset, so a long list showed a blank screen whenever an overlay opened over it." },
      { label: 'p', content: "The lock now only sets <code>overflow</code> and <code>overscroll-behavior</code> on the document element and leaves the body in flow. <code>scrollY</code> and <code>scrollHeight</code> stay intact for the whole time an overlay is open, so scroll-positioned content keeps rendering correctly. The restored scroll offset is no longer saved and replayed with <code>scrollTo</code>, because the position is never disturbed in the first place." },
      { label: 'p', content: "This changes an observable side effect of the scroll lock: the body no longer gets <code>position</code>, <code>top</code>, or <code>width</code> written to it. Nothing in the package relied on it. It also adds <code>overscroll-behavior: none</code> while locked, which additionally suppresses pull-to-refresh and overscroll chaining — expected for a modal, but new. Refcounted nesting, the public signatures, and the non-overridden default rendering are unchanged." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Make the segmented control's indicator land on the final value instead of lagging behind rapid taps. The indicator's <code>left</code> and <code>width</code> carry a 160ms transition, so tapping through several options restarted that transition each time — the second leg began from wherever the first leg had interpolated to, and the indicator stayed half a beat behind the selection, needing another full round to come to rest after the taps stopped." },
      { label: 'p', content: "A value that now arrives while a move is still in flight lands immediately instead of queueing or restarting the interpolation. The flight window is one full <code>--wui-duration-trigger</code> from the latest change (rather than the remainder of the previous one, which would shrink with each successive landing and hand the last tap a full transition), and a request generation number discards stale expiry callbacks so an earlier window cannot clear a later landing state. A drag is not a tap sequence, so it does not open the window." },
      { label: 'p', content: "Under reduced motion this needs no separate branch: the window is derived from <code>--wui-duration-trigger</code>, which is already zeroed there, so the gate degrades to \"land every step\" — the same appearance a 0ms transition has on its own. The window is not opened by the initial positioning, which is initialization rather than a move; opening it there would make the first tap after mount land instantly instead of showing the user the indicator's first animation." },
      { label: 'p', content: "The gate turns off only the <code>left</code> and <code>width</code> transitions. It is a separate rule placed after the existing ready rule rather than a <code>:not(.is-settling)</code> added to it, because that would raise specificity from (0,3,0) to (0,4,0) and outrank the pressed-state rule that currently wins on source order — turning the press feedback's background-color from an instant switch back into an interpolated one." }
      ]
    },
    { label: 'li', content: "3c81816: Assign stable instance ids to native inputs inside form component shadows so Chrome form-field audits stop flagging them." },
    { label: 'li', content: "3c81816: Keep theme view-transition direction based on the resolved appearance. <code>appearance=\"system\"</code> now reveals with the dark direction when <code>prefers-color-scheme</code> resolves dark, while equal resolved appearances still skip the transition; explicit light/dark reveal directions are unchanged." },
    { label: 'li', content: "3c81816: Keep theme view-transition reveals running through pointer movement: only <code>pointerdown</code> and wheel call <code>skipTransition()</code>, while <code>pointermove</code> and <code>pointerup</code> no longer end the reveal. This removes the source-box and pointer-id exemptions and preserves prompt hit-test recovery for deliberate press or scroll input." },
    { label: 'li', content: "3c81816: Keep theme view-transition reveals stable when the initiating pointer emits follow-up events during the first 100ms: ignore only same-pointer movement or release inside the pointer-down target, while any genuinely new pointer or wheel input still skips the active transition and restores hit-testing promptly." },
    { label: 'li', content: "3c81816: Skip the active view transition on first pointer interaction so hit-testing stops targeting the document element during theme switch." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: fix(web-ui): stop <code>web-ui-context-menu</code> from dimming slotted content while disabled" },
      { label: 'p', content: "Setting <code>disabled</code> on <code>&lt;web-ui-context-menu></code> dropped everything a consumer put in the default slot to 40% opacity and switched the cursor to <code>not-allowed</code>. In <code>apps/interweave</code> that turned an empty library list into unreadable grey: the heading, its description and the icon wells all faded together." },
      { label: 'p', content: "<code>disabled</code> only suppresses menu behaviour — <code>contextmenu</code>, <code>openAt()</code> and the ContextMenu key all return early, so no menu is ever rendered. There is no menu surface of its own to dim, and the only thing a host-level <code>opacity</code> could reach was the consumer's own trigger content. Disabling the right-click menu is not the same as disabling the trigger, so the host rule is gone. Consumers that want a visibly disabled state now render it themselves, which both demo apps already did." }
      ]
    },
    { label: 'li', content: "3c81816: Give the drawer drag bar breathing room at the panel edge. The drag bar's visual center is still floored at half the bar thickness so it can never cross the panel's inner edge, but that floor now adds a further 4px: consumers that zero <code>--wui-drawer-content-padding</code> to fill the panel edge-to-edge previously ended up with the capsule sitting flush against the edge, which read as the handle being squeezed outside the border's shadow line. With the extra inset the capsule keeps a visible gap from the edge. The default 20px padding is unaffected, and the hit zone thickness is unchanged." },
    { label: 'li', content: "3c81816: Keep the drawer drag bar inside the panel when content padding is zero. The drag bar's visual center follows half of <code>--wui-drawer-content-padding</code>, now floored at half the bar thickness, so consumers that zero the padding to fill the panel edge-to-edge no longer push half the capsule past the panel's inner edge (where it stayed visible over the backdrop, since the dialog is <code>overflow: visible</code>). The default 20px padding is unaffected." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: fix(web-ui): widen the nested drawer reveal base at both breakpoints" },
      { label: 'p', content: "<code>--wui-drawer-nested-peek-base</code> ships at <code>54px</code> on desktop instead of <code>36px</code>, and at <code>36px</code> instead of <code>24px</code> where the viewport is <code>640px</code> or narrower. A four-layer stack of <code>320px</code> drawers now reveals <code>37.43px</code> / <code>21.90px</code> / <code>15.53px</code> per step for a <code>74.86px</code> total on desktop, and <code>24.95px</code> / <code>14.60px</code> / <code>10.36px</code> for a <code>49.91px</code> total on narrow viewports." },
      { label: 'p', content: "The log curve compresses its deepest step hardest, because the fourth layer reveals only <code>A · ln(4/3)</code>, which is <code>0.288A</code>. At <code>A = 28</code>, a value tried during the visual pass, that step was <code>8.06px</code>, and at the <code>A = 36</code> this change starts from it was <code>10.36px</code>. Both sit in the same range as the hardcoded <code>12px</code> step the token replaced, so the innermost card of a four-layer stack did not read as a layer of its own. <code>A = 54</code> lifts that step to <code>15.53px</code>, where each card's edge and shadow stay distinguishable." },
      { label: 'p', content: "Narrow viewports scale by the same <code>1.5x</code> instead of adopting the desktop value. A <code>320px</code> drawer on a <code>390px</code> viewport has only <code>390 - 8 - 320 = 62px</code> of room to its left, so a <code>74.86px</code> total stack would push the innermost layer off screen. The <code>49.91px</code> total leaves its left edge at about <code>12px</code>, on screen." },
      { label: 'p', content: "The token name, the <code>A · ln(d + 1)</code> formula, the <code>640px</code> breakpoint, the scaling and width compensation, drag-to-close, reduced motion, headless, and inset are all unchanged. Setting the token on the host or any ancestor still overrides both defaults, and <code>0</code> still turns the reveal off." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: feat(web-ui): 收窄嵌套 drawer 层间露边并把拖拽确认态改为中性灰" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>--wui-drawer-nested-peek-base</code> 桌面基准 <code>54px</code> → <code>43.2px</code>，窄视口（<code>width &lt;= 640px</code>）<code>36px</code> → <code>28.8px</code>，桌面:窄屏 3:2 比例不变。三处字面量（<code>CSS.registerProperty</code> 的 <code>initialValue</code>、媒体查询覆盖、JS 侧 jsdom 兜底常量）同步更新。" },
        { label: 'li', content: "拖拽 handle 越过关闭阈值时的确认底色从 <code>--wui-color-accent</code> 改为实心中性灰，与 hover/active 的灰阶对齐。" }
        ]
      }
      ]
    },
    { label: 'li', content: "3c81816: Flush the drawer's current layout before switching to the exit transition so WebKit reliably starts the transition when closing immediately after opening." },
    { label: 'li', content: "3c81816: Stop <code>web-ui-dropdown</code> from painting the accent <code>:focus-visible</code> highlight on its first item when opened by pointer, matching the existing context-menu behavior in WebKit. Keyboard-activated opens keep the highlight, and the first arrow keypress always restores it." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: feat(web-ui): add <code>mdiTagSearchOutline</code> to <code>@greypan/web-ui/icons</code>" },
      { label: 'p', content: "<code>mdiTagSearchOutline</code> is the Material Design Icons tag-search glyph, added for the\nInterweave library tag filter prefix. It is a new export: nothing is renamed or removed." },
      { label: 'p', content: "<code>fluentTagSearch24Regular</code> stays in the generated set. It arrived in the same unreleased\nbatch as <code>biCheckLg</code> and <code>akarIconsCircleCheck</code>, and this change leaves it without an\nin-repo consumer, so it is kept only so both tag-search glyphs stay available to choose\nfrom. Neither icon has shipped in a published version, so keeping it is not a\ncompatibility constraint." },
      { label: 'p', content: "The new devDependency <code>@iconify-json/mdi</code> (catalog <code>^1.2.3</code>) is read only by the icon\ngenerator at build time. Icon bodies are inlined into the emitted modules, so no extra\ndependency reaches the published bundle." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: fix(web-ui): move the header glow's horizontal clip off the header" },
      { label: 'p', content: "<code>web-ui-layout</code> with <code>header-glow</code> showed a hard seam at the header's bottom edge in Safari: content scrolled underneath the sticky header met a sharp cut instead of a fade." },
      { label: 'p', content: "The glow is a <code>::before</code> pseudo-element with <code>inset: 0</code> and <code>transform: translateY(-50%) scale(1.05, 2)</code>, so it deliberately extends half a header height past the header box — that overhang is what feathers into the content below. <code>header</code> carried <code>overflow-x: clip</code> to stop the glow's horizontal scale from pushing out a page scrollbar, but WebKit applies that clip to both axes, cutting the vertical overhang and with it the fade. Chrome only clips the declared axis, which is why the seam was Safari-only." },
      { label: 'p', content: "The clip now lives on <code>.layout-content</code>, which already has <code>min-width: 0</code> and is the box that actually contains the horizontal overflow; <code>header</code> keeps <code>overflow: visible</code>. <code>clip</code> does not create a scroll container, so the sticky behaviour of the header and tabbar is unchanged." },
      { label: 'p', content: "Because the clip box is now the content column rather than the header, horizontal overflow from <code>main</code> or <code>tabbar</code> slot content is clipped instead of producing a page-level horizontal scrollbar. Consumers that need wide content to stay reachable should keep it inside their own <code>overflow-x: auto</code> container." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Remove the <code>--wui-layout-header-glow-color</code> custom property from <code>&lt;web-ui-layout></code>'s <code>header-glow</code>; the glow now reads <code>--wui-color-page</code> directly." },
      { label: 'p', content: "<strong>Breaking removal:</strong> <code>--wui-layout-header-glow-color</code> was a public custom property, and no compatibility alias is kept. External consumers that set it must override <code>--wui-color-page</code> on <code>web-ui-layout</code> instead." },
      { label: 'p', content: "The property was declared on the layout's own <code>:host</code>, so it shadowed any value set on an ancestor — including <code>&lt;web-ui-theme></code>. A theme could therefore never change the glow's colour, and the only place an override worked was on the <code>web-ui-layout</code> element itself. Reading the theme token directly makes the glow follow light and dark appearance like every other semantic colour, and lets an override set at the theme, the page or the layout take effect." },
      { label: 'p', content: "Two pseudo-elements back the glow: <code>::before</code> paints the colour as a <code>linear-gradient</code> inside the header box, and <code>::after</code> adds a real <code>backdrop-filter: blur(4px)</code> layer masked to zero alpha before it reaches any clip line. Separating them means blur strength and colour strength no longer pull on each other." }
      ]
    },
    { label: 'li', content: "3c81816: Lighten the menu-family panel surface from <code>rgb(254 254 254 / 0.76)</code> to <code>rgb(250 250 250 / 0.76)</code> so select, dropdown, context-menu, popover, tooltip and autocomplete panels match the rest of the light surfaces." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "3c81816: Make the overlay surface more opaque and drop the glass ring base color on menu panels" },
      { label: 'p', content: "<code>--wui-color-surface-overlay</code> (shared by dialog, drawer and toast) moves to\n<code>rgb(248 248 248 / 0.92)</code> in light and <code>rgb(32 34 34 / 0.92)</code> in dark, so the\ncontent behind an open overlay reads less through it." },
      { label: 'p', content: "<code>--wui-color-glass-ring</code> is now overridden to <code>transparent</code> locally on the menu\npopover surfaces (popover, tooltip, select, autocomplete, dropdown and context\nmenu panels) and on the pressed/dragging state of the switch, slider and\nsegmented handles. The token definition itself is unchanged. The border ring\nfalls back to the four corner arcs drawn by its sheen and shade layers, which\nmeans wide menu panels no longer carry a straight border segment along the\nmiddle of their long edges." }
      ]
    },
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
  { label: 'h2', id: 'section-35', content: "8.1.0" },
  { label: 'h3', id: 'section-36', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "ed2652b: Add <code>--wui-button-group-divider-length</code> to <code>&lt;web-ui-button-group></code>. The divider between adjacent grouped buttons was a fixed 24px line with no way for a consumer to reach it — it lives in the child button's shadow root and that span is not exposed as a part — so the only alternative was dropping the group entirely and losing the shared glass pill." },
      { label: 'p', content: "The token sets the divider's long edge and defaults to 20px, so every grouped button pair gets a shorter rule than the 24px line it drew before; its cross axis stays 1px. Because it drives the long edge rather than a fixed axis, one value works for both <code>direction=\"horizontal\"</code> and <code>direction=\"vertical\"</code>." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ed2652b: feat(web-ui): draw the checkbox checkmark from akar-icons:check" },
      { label: 'p', content: "<code>&lt;web-ui-checkbox></code> now strokes <code>akar-icons:check</code> where it drew <code>tabler:check</code>. Both are\nround-capped 24-unit glyphs with <code>stroke-width=\"2\"</code>, so the render path is untouched; what\nchanges is the geometry — <code>m4 12l6 6L20 6</code> starts its tail a unit further left and lifts the\ntip a unit higher than <code>m5 12l5 5L20 7</code>, which reads as a longer, more open tick inside the\n18px indicator." },
      { label: 'p', content: "The swap keeps the precondition the draw animation depends on: the asset stays <code>fill: none</code> +\n<code>stroke: currentColor</code>, so <code>&lt;web-ui-svg-draw-lines></code> animates a stroke instead of revealing a\nsolid mark. <code>checkbox.motion.browser.spec.ts</code>, which pins that, still passes." },
      { label: 'p', content: "<code>@greypan/web-ui/icons</code> loses <code>tablerCheck</code> and gains <code>akarIconsCheck</code>. <code>tablerCheck</code> was added\non this unreleased line and never shipped, so no published consumer sees a removal, and\n<code>@iconify-json/tabler</code> stays a devDependency for <code>tabler:sort-ascending-letters</code>. The new\ndevDependency <code>@iconify-json/akar-icons</code> (catalog <code>^1.2.7</code>) is only read by the generator at\nbuild time — icon bodies are inlined into the emitted modules, so nothing extra lands in the\npublished bundle." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ed2652b: feat(web-ui): render the checkbox checkmark as an icon asset" },
      { label: 'p', content: "<code>&lt;web-ui-checkbox></code> drew its checkmark from a path the component carried itself. It now renders a stroked check from <code>@/icons</code> through a nested <code>&lt;web-ui-icon></code>, inside the same <code>&lt;web-ui-svg-draw-lines></code> wrapper, so the indicator is an asset like every other glyph in the library rather than a hand-held exception. The draw-in and retract, the <code>--wui-duration-trigger</code> timing and the <code>motion=\"reduced\"</code> bypass all keep working: <code>&lt;web-ui-svg-draw-lines></code> reaches geometry inside nested open shadow roots, and the check's color arrives through <code>&lt;web-ui-icon></code>'s <code>--wui-icon-color</code>, set to <code>--wui-color-on-control</code> — the token radio's dot and switch's thumb use — so it stays legible on the accent-filled indicator." },
      { label: 'p', content: "Two visible consequences. The stroke weight follows the asset (<code>stroke-width=\"2\"</code> on a 24-unit canvas, previously 3), so the check is a step thinner. And it renders at <code>&lt;web-ui-icon></code>'s own default 18px: the host cannot reach the <code>&lt;svg></code> inside the icon's shadow root, so enlarging <code>--wui-selection-control-size</code> now grows the indicator box without scaling the check inside it." },
      { label: 'p', content: "The asset has to stay stroked (<code>fill: none</code> + <code>stroke: currentColor</code>). A solid icon is a silent failure here — <code>&lt;web-ui-svg-draw-lines></code> animates <code>stroke-dashoffset</code>, which affects only stroke painting, so the animation runs to completion while the check simply appears. <code>checkbox.motion.browser.spec.ts</code> now pins <code>fill: none</code> and the on-control stroke to keep that precondition from regressing, and both checkbox motion specs observe the icon's nested shadow root, since <code>ShadowRoot.getAnimations()</code> does not cross into it." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ed2652b: fix(web-ui): size a size-less Iconify icon on the spec's 16×16 canvas" },
      { label: 'p', content: "<code>&lt;web-ui-icon></code> derived its <code>viewBox</code> from <code>icon.width</code>/<code>icon.height</code> and fell back to <code>24</code> when the data object declared neither. Iconify's own default canvas is 16×16 (<code>@iconify/types</code> README), so the fallback was the one value the spec does not allow: a size-less 16-unit icon was squashed into the top-left quarter of a 24-unit box instead of filling it. The fallback is now <code>16</code>, and generated assets no longer rely on it — <code>scripts/generate-icons.ts</code> resolves the merge chain (icon → icon set → spec default) before writing, so <code>@iconify-json/bi</code>, which publishes no root canvas for any of its 2084 icons, now emits <code>width: 16, height: 16</code> rather than leaving the size to the renderer." },
      { label: 'p', content: "The published behavior difference is for consumers who hand a raw <code>IconifyIcon</code> object to <code>.icon</code> and declare no canvas on it: such an icon renders at a different scale than before. Every icon object that declares its <code>width</code>/<code>height</code> renders as it did, which covers all assets exported from <code>@greypan/web-ui/icons</code> in the previous release — <code>biCheck</code> is new on this branch and had never rendered at the right scale." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ed2652b: fix(web-ui): stop <code>&lt;web-ui-radio></code> and <code>&lt;web-ui-checkbox></code> from reserving space for a label they do not have" },
      { label: 'p', content: "The trigger row is an <code>inline-flex</code> with <code>gap: 10px</code>, and the host is sized by its content, so a control with nothing renderable in its default slot measured 28px for an 18px indicator: a gap only knows there is a flex item there, not that the item has no width. Every standalone control hit that, and so did the usual accessible-name workaround of slotting one visually hidden (<code>.sr-only</code>) span — that content is assigned to the slot but paints no box." },
      { label: 'p', content: "The row now collapses the gap when the label's rendered width is 0, tracked through one <code>ResizeObserver</code> shared by all selection controls rather than one per instance. Emptiness is deliberately measured instead of asked of the slot: <code>slot:empty</code> reads the slot's own child nodes, and assigned nodes are not its children, so an assigned-but-invisible label would have looked non-empty. The other candidate — hiding the label — is the wrong one, since <code>display: none</code> takes the slotted accessible name out of the accessibility tree along with the space." },
      { label: 'p', content: "A control whose label paints is unaffected: the 10px between indicator and text stays, as does hovering that gap to tint the indicator. A standalone or hidden-name-only control is now exactly <code>--wui-selection-control-size</code> wide, so it lines up with the content around it instead of trailing 10px of dead space. <code>shared/label-emptiness/__tests__/selection-label.browser.spec.ts</code> pins the host width for empty, <code>.sr-only</code>-only and labeled controls, the collapse when a label is removed at runtime, and the convergence for a control that mounts inside a <code>display: none</code> subtree." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ed2652b: Add a public <code>select()</code> to <code>&lt;web-ui-input></code> so callers can select the full current value through the component API instead of reaching into its shadow root or using deprecated <code>document.execCommand</code>. <code>&lt;web-ui-textarea></code> already exposed the same method; both now share an explicit <code>disabled</code> no-op and remain safe when the native control has not rendered." },
      { label: 'p', content: "The consistency review also adds <code>readonly</code> to <code>&lt;web-ui-editable-text></code>: it keeps focus, selection, and copying available while rejecting input and leaving edit mode without a <code>change</code>, matching the read-only contract of <code>&lt;web-ui-input></code> and <code>&lt;web-ui-textarea></code>. Existing <code>value</code> read/write, <code>input</code>/<code>change</code> paths, form association, and the documented non-reflected <code>value</code> attribute on <code>&lt;web-ui-editable-text></code> remain backward compatible." }
      ]
    },
    { label: 'li', content: "ed2652b: Expose <code>&lt;web-ui-theme></code>'s resolved color scheme as the read-only reflected <code>resolved-appearance</code> attribute and <code>resolvedAppearance</code> property. The value is always <code>light</code> or <code>dark</code>: explicit appearances pass through, <code>system</code> follows <code>prefers-color-scheme</code> and updates live on OS flips, and a missing <code>appearance</code> reports the default <code>light</code>. The component owns and restores the attribute, so consumers can bind CSS selectors or Tailwind custom variants to it without maintaining a second theme state; existing View Transition behavior is unchanged." }
    ]
  },
  { label: 'h3', id: 'section-37', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "ed2652b: fix(web-ui): let a form-associated control actually leave the disabled state" },
      { label: 'p', content: "Re-enabling a control left it looking and behaving disabled: <code>&lt;web-ui-button disabled></code> with <code>disabled</code> set back to <code>false</code> kept the shadow <code>&lt;button></code> disabled, dimmed at 40% opacity and unclickable, while the host property, the host attribute and the component's own disabled getter all read <code>false</code>. Only a forced re-render cleared it. Lit reflects <code>disabled</code> <em>after</em> it renders, and the browser delivers <code>formDisabledCallback</code> synchronously inside that reflection, so the follow-up <code>requestUpdate()</code> landed while <code>isUpdatePending</code> was still true and Lit dropped it — no second render ever came. <code>defineFormAssociation.setDisabled</code> now recognises that window and re-requests the update once the cycle ends, which covers every control that composes it (<code>web-ui-input</code>, <code>web-ui-textarea</code>, <code>web-ui-select</code>, the group controls and the rest), not just the button." },
      { label: 'p', content: "<code>web-ui-button</code> also stops mirroring the state on its own: it composes the same shared form-association lifecycle instead of holding a private <code>ElementInternals</code> and <code>_formDisabled</code> copy, so the timing rule lives in one place. Its form behaviour is unchanged — it still owns an outer form for <code>submit</code>/<code>reset</code> forwarding and contributes no value to <code>FormData</code>." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ed2652b: fix(web-ui): let <code>web-ui-button</code> drive its outer native form" },
      { label: 'p', content: "<code>type=\"submit\"</code> and <code>type=\"reset\"</code> now forward through the component host's form owner after the composed <code>click</code> event finishes (on the next task), so an unprevented activation submits or resets the owning <code>&lt;form></code> while a <code>preventDefault()</code> on the click still cancels it. The host declares <code>static formAssociated = true</code> and reads its live owner from <code>ElementInternals</code>; the rendered button remains in Shadow DOM without a form owner of its own, so <code>SubmitEvent.submitter</code> is <code>null</code> and the button contributes no value to <code>FormData</code>." }
      ]
    },
    { label: 'li', content: "ed2652b: Make dropdown hover states use the neutral border background without changing text color, keep selected and active styling unchanged, and lower the shared menu panel background opacity in light and dark themes while preserving standalone fallback parity." },
    { label: 'li', content: "ed2652b: Darken light-mode surface tokens (sidebar and dropdown panels) one step for better layering." },
    { label: 'li', content: "ed2652b: Assign stable instance ids to native inputs inside form component shadows so Chrome form-field audits stop flagging them." },
    { label: 'li', content: "ed2652b: Keep theme view-transition direction based on the resolved appearance. <code>appearance=\"system\"</code> now reveals with the dark direction when <code>prefers-color-scheme</code> resolves dark, while equal resolved appearances still skip the transition; explicit light/dark reveal directions are unchanged." },
    { label: 'li', content: "ed2652b: Keep theme view-transition reveals running through pointer movement: only <code>pointerdown</code> and wheel call <code>skipTransition()</code>, while <code>pointermove</code> and <code>pointerup</code> no longer end the reveal. This removes the source-box and pointer-id exemptions and preserves prompt hit-test recovery for deliberate press or scroll input." },
    { label: 'li', content: "ed2652b: Keep theme view-transition reveals stable when the initiating pointer emits follow-up events during the first 100ms: ignore only same-pointer movement or release inside the pointer-down target, while any genuinely new pointer or wheel input still skips the active transition and restores hit-testing promptly." },
    { label: 'li', content: "ed2652b: Skip the active view transition on first pointer interaction so hit-testing stops targeting the document element during theme switch." }
    ]
  },
  { label: 'h2', id: 'section-38', content: "8.0.0" },
  { label: 'h3', id: 'section-39', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "62bdbec: Remove the <code>transition</code> prop from <code>&lt;web-ui-theme></code>; whether an appearance change plays the View Transitions reveal is now decided by the existing <code>motion</code> prop alone (issue #156)." },
      { label: 'p', content: "<strong>Breaking:</strong> the <code>transition</code> boolean attribute/property no longer exists. Writing it is a silent no-op instead of enabling the reveal, and the reveal is no longer opt-in: a theme scope animates by default now." },
      { label: 'p', content: "The three <code>motion</code> tiers own the decision:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>motion=\"full\"</code> always plays the circular reveal." },
        { label: 'li', content: "<code>motion=\"reduced\"</code> applies the new appearance immediately, with no reveal." },
        { label: 'li', content: "<code>motion=\"system\"</code> (the default) follows <code>prefers-reduced-motion</code>." }
        ]
      },
      { label: 'p', content: "Everything else about the reveal is unchanged: a root theme reveals the whole page, a nested theme reveals only its own capture box, the origin is the last pointer-down position (falling back to the theme box or viewport center), the two directions are reversed, and unsupported browsers, reduced-motion scopes, zero durations and an in-flight request still commit the new appearance immediately. The window listeners that record the reveal origin are registered for as long as a theme is connected, instead of only while <code>transition</code> was set." },
      { label: 'p', content: "Migration:" },
      { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- before: reveal opt-in through transition, motion left at its default --></span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"light\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> transition</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">3</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- after: same reveal, motion=\"system\" is now the switch --></span></span>\n<span class=\"line\"><span class=\"line-number\">4</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"light\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">5</span></span>\n<span class=\"line\"><span class=\"line-number\">6</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- before: no reveal, because transition was absent --></span></span>\n<span class=\"line\"><span class=\"line-number\">7</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"light\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">8</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- after: still no reveal, but it has to be stated --></span></span>\n<span class=\"line\"><span class=\"line-number\">9</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"light\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> motion</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"reduced\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">10</span></span>\n<span class=\"line\"><span class=\"line-number\">11</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- before: transition forced the reveal on, motion kept it out of the way --></span></span>\n<span class=\"line\"><span class=\"line-number\">12</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"light\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> transition</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> motion</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"full\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span>\n<span class=\"line\"><span class=\"line-number\">13</span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">&#x3C;!-- after: motion=\"full\" is the whole switch --></span></span>\n<span class=\"line\"><span class=\"line-number\">14</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">&#x3C;</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> appearance</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"light\"</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\"> motion</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">=</span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">\"full\"</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">>&#x3C;/</span><span style=\"--shiki-light:#22863A;--shiki-dark:#85E89D\">web-ui-theme</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">></span></span></code></pre>", lang: "html", path: './codeblock/01871218202a.html' },
      { label: 'p', content: "The one combination that loses a distinct meaning is <code>transition</code> together with <code>motion=\"reduced\"</code>: it never animated, and <code>motion=\"reduced\"</code> on its own now describes it exactly, so dropping <code>transition</code> is the whole migration there." }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-40', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "62bdbec: feat(autocomplete): add a <code>trigger</code> slot so the default input can be replaced by any editable component" },
      { label: 'p', content: "The default trigger is now an internal <code>web-ui-input</code>, following the <code>web-ui-select</code> wrapper-div pattern: the wrapper div carries the combobox ARIA, marks itself with <code>data-custom-trigger</code> when a custom trigger is present, and hosts <code>slot[name=\"trigger\"]</code>. The panel stays anchored to the trigger element, and the <code>trigger</code> slot stays on the host while options migrate into the portal panel." },
      { label: 'p', content: "Delegation is shared between the two triggers: <code>value</code>, <code>input</code>, <code>click</code>, <code>focus</code> and <code>blur</code> are read and forwarded through the trigger, so a custom trigger only needs a string <code>value</code> property and has to be focusable. <code>web-ui-input</code> and <code>web-ui-textarea</code> work as-is." },
      { label: 'p', content: "Multiline triggers (a trigger whose editable element is a <code>&lt;textarea></code>) keep Enter for newlines: Enter no longer selects the highlighted option nor commits a custom value, so close the panel with Escape or blur. Selecting an option still writes its label back to the trigger." },
      { label: 'p', content: "While the panel is open in a multiline trigger, ArrowUp/ArrowDown move the text caret instead of navigating options (same exception as Enter); with the panel closed they still open it. The trigger wrapper div is never a tab stop (<code>tabindex=\"-1\"</code>) — sequential focus belongs to the trigger itself, which has to be focusable per the documented contract." },
      { label: 'p', content: "Adds public <code>focus()</code> / <code>blur()</code> methods to <code>web-ui-autocomplete</code>: they delegate to the active trigger (the default <code>web-ui-input</code> or the custom trigger), so consumers can focus the field without reaching into internals. <code>web-ui-input</code> gains the matching public <code>focus()</code> / <code>blur()</code> — the host itself is not focusable, so <code>focus()</code> on it used to be a no-op; <code>web-ui-textarea</code> already had them." }
      ]
    },
    { label: 'li', content: "62bdbec: Add a public <code>select()</code> method to <code>&lt;web-ui-editable-text></code>: it enters edit mode with the whole content selected, and only re-selects when already editing. While <code>disabled</code> it does nothing, matching <code>focus()</code>." },
    { label: 'li', content: "62bdbec: Add <code>&lt;web-ui-editable-text></code>, an inline plain-text editor. Clicking the text edits it in place with the caret at the clicked offset, <code>Enter</code> and <code>blur</code> both commit the draft and dispatch <code>change</code> exactly once (<code>Enter</code> does not insert a newline and returns focus to the host; <code>blur</code> leaves the focus where the user moved it), and <code>Escape</code> alone cancels, restoring the value from the moment editing started and dispatching a non-bubbling <code>cancel</code>. The text layer and the editing layer share one box, so entering edit mode does not shift the rendered text by a single pixel, and the editing layer always sizes itself to its own content, so an empty or whitespace-only draft still has room for the caret even where the host itself collapses. The caret follows the shared <code>--wui-color-accent</code> semantic token by default, and both layers break a long unbroken string at the same points (<code>--wui-editable-text-overflow-wrap</code>, default <code>anywhere</code>), so a token wider than the box wraps inside the box instead of overflowing it while idle. The <code>cancel</code> event neither bubbles nor crosses shadow boundaries and is dispatched on the component itself only, so the component can sit inside an overlay such as a drawer title without its cancel reaching the overlay's native close pipeline; listen on the component itself. The component is form-associated: it submits through <code>FormData</code> and restores the declarative <code>value</code> on <code>form.reset()</code>." },
    { label: 'li', content: "62bdbec: <code>&lt;web-ui-theme></code> now mirrors the computed <code>--wui-color-page</code> of its outermost active instance onto <code>document.documentElement</code> as an inline custom property. Custom properties stop inheriting at the document element, so a consumer rule such as <code>body { background: var(--wui-color-page) }</code> colored only the scrollable area and left the canvas behind an overscroll bounce at the user-agent background; with the mirrored property the bounce area follows the theme. The value is written when a theme connects and whenever its appearance changes, including <code>appearance=\"system\"</code> following an OS light/dark flip, and it is the theme's computed value, so an override on the host is mirrored as it stands. Nested themes never write the root value; ownership follows connect order and passes to the next connected theme when the outermost one disconnects, and the value is deliberately kept rather than removed when the last theme disconnects so a page that swaps themes does not flash back to the user-agent background." }
    ]
  },
  { label: 'h3', id: 'section-41', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "62bdbec: Segmented labels stay <code>--wui-color-text-secondary</code> in both variants: the accent label coloring and the drag-time <code>is-covered</code> marking are removed, and selection is carried by the indicator alone. In light mode the inset track now matches the page background instead of the raised surface, so the thumb reads as seated in a slot." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "62bdbec: <code>&lt;web-ui-segmented></code> gains a <code>variant</code> attribute/property (<code>inset</code> | <code>raised</code>, default <code>inset</code>; illegal values fall back to <code>inset</code>):" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>inset</code> (\"sunken\") renders the track as an opaque surface (<code>--wui-color-surface-raised</code>, no backdrop filter); its 1px ring and drop shadow stay constant across rest, press and drag. The indicator rests as a solid <code>--wui-color-surface-segmented</code> pill with all glass output off." },
        { label: 'li', content: "<code>raised</code> (\"raised\") restores the classic flat <code>--wui-color-surface-segmented</code> track (no ring, no shadow) with a solid <code>--wui-color-surface-selected</code> resting indicator carrying a soft shadow." }
        ]
      },
      { label: 'p', content: "In both variants the pressed/dragged indicator is fully transparent glass — backdrop blur, ring and highlight — with a 1.5x scale, easing back to the resting surface on release. Every label keeps <code>--wui-color-text-secondary</code>, checked or not, in both variants and through a press or drag; selection is carried by the indicator alone." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "62bdbec: fix(overlay): an anchored panel now stays registered for the whole exit transition instead of dropping out of the registry the moment <code>open</code> flips to false. While it is still on screen it keeps swallowing Escape rather than letting the key fall through, and re-opening mid-exit hands arbitration to the new session. When the transition has already finished but the host still reports open, the layer hands arbitration back so Escape reaches the host's close entry instead of being swallowed by an invisible panel forever. When another overlay is open that one still takes the Escape, so one Escape still closes exactly one layer (issue #138)." },
      { label: 'p', content: "fix(overlay): open-overlay layers whose panel and host are both detached from the document are now reclaimed lazily, so a component that never releases its handle no longer pins the layer registry or the document keydown listener forever. Reclamation runs before a new layer is built rather than after, so claiming a panel that is not mounted yet no longer deletes the layer on the spot — it keeps its place and joins arbitration once attached (issue #139)." }
      ]
    },
    { label: 'li', content: "62bdbec: Dark-mode dropdown menus and the sidebar regain their translucent feel: the menu alpha drops to 0.78 and the sidebar to 0.8 while keeping the lighter surface color, so the panels read as glass one step above the page." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "62bdbec: Register the view-transition capture cleanup of <code>web-ui-theme</code> before writing <code>document.adoptedStyleSheets</code>, and let the restore step tolerate a setter that rejects the write (issue #146)." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "A synchronous throw from the <code>adoptedStyleSheets</code> setter used to reach the appearance setter's <code>.catch</code> with an undefined cleanup: the inline <code>view-transition-name</code> and <code>display</code> written for the nested-theme capture box stayed on the host and poisoned every later view transition. The cleanup is now registered before the write, so the failure path restores the capture state and still commits the final appearance." },
        { label: 'li', content: "The restore step no longer lets a rejected <code>adoptedStyleSheets</code> write abort the host inline-style recovery." },
        { label: 'li', content: "A jsdom regression test covers the throwing-setter path, including a guard that the transition really reached the write." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-42', content: "7.0.0" },
  { label: 'h3', id: 'section-43', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Replace the toast imperative API's dedup-and-drop behavior with upsert semantics, and retire <code>toast.updateMessage()</code>." },
      { label: 'p', content: "Repeated calls that pass the same <code>id</code> now converge on one toast instead of silently discarding the update: supplied fields overwrite, omitted ones keep their value, and the call returns that toast's id in both cases. <code>duration</code> restarts the countdown only when passed explicitly; changing <code>position</code> moves the element to the new container and keeps the remaining time. <code>container</code> and <code>target</code> are read from the first call only." },
      { label: 'p', content: "A toast that is already exiting, or that a host pulled out of the DOM, no longer counts as mounted: the call creates a new toast instead of patching one that is about to disappear, and the exiting element keeps its own <code>toast-close</code> bookkeeping — a late <code>toast-close</code> can never remove a toast that reused the same id." },
      { label: 'p', content: "The <code>error</code> shortcut's 5000 ms default is applied at mount instead of being injected into every call, so it no longer counts as an explicit <code>duration</code>: repeated <code>toast.error(msg, { id })</code> calls keep the running countdown. As a side effect the generic <code>toast({ type: 'error' })</code> form now defaults to 5000 ms too, which is what the option table documented all along." },
      { label: 'p', content: "<code>toast.close(id)</code> and <code>toast.clear()</code> now also cover the states before a toast becomes visible. An id still queued in the current microtask is dropped before it mounts (nothing appears, no event is emitted), and a toast that is mounted but whose <code>show()</code> has not run yet emits <code>toast-close</code> immediately instead of ignoring the call. Both windows used to swallow the request silently, so the toast appeared anyway. A toast whose auto-close countdown elapsed while the main thread was blocked also closes on resume instead of staying open forever after a <code>position</code> upsert." },
      { label: 'p', content: "The old dedup checked only mounted toasts, so two calls inside one microtask both mounted (two elements sharing one <code>toastId</code>). The second element was unreachable from the manager: <code>removeToast()</code> returned early for ids it did not know, so neither <code>close()</code>, <code>clear()</code> nor the natural timeout could remove it, and it stayed in the <code>role=\"log\"</code> container forever." },
      { label: 'p', content: "Migration:" },
      { label: 'codeblock', content: "<pre class=\"shiki shiki-themes github-light github-dark mdm-code\" style=\"--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e\" tabindex=\"0\"><code><span class=\"line\"><span class=\"line-number\">1</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">toast.</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">updateMessage</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">(id, { message: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'new message'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, heading: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'new heading'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// before</span></span>\n<span class=\"line\"><span class=\"line-number\">2</span><span style=\"--shiki-light:#6F42C1;--shiki-dark:#B392F0\">toast</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">({ id, message: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'new message'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\">, heading: </span><span style=\"--shiki-light:#032F62;--shiki-dark:#9ECBFF\">'new heading'</span><span style=\"--shiki-light:#24292E;--shiki-dark:#E1E4E8\"> }) </span><span style=\"--shiki-light:#6A737D;--shiki-dark:#6A737D\">// after</span></span></code></pre>", lang: "ts", path: './codeblock/489580adbb2f.ts' },
      { label: 'p', content: "<code>ToastMessageUpdateOptions</code> is removed." }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-44', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Align the drawer's drag-to-close decision with Base UI <code>useSwipeDismiss</code> step by step: the flick is judged by the average velocity over the whole gesture, the decision origin and clock are calibrated to the first move, and a change of mind cancels the flick — so sweeping back towards the edge no longer closes the drawer." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "The displacement origin and the decision clock both reset to the first <code>pointermove</code>, matching upstream's <code>dragStartPos</code> / <code>swipeStartTime</code> reset in the <code>trackDrag</code> branch. The gap between the press and the first move — on iOS touch the first <code>touchmove</code> already arrives offset from the <code>touchstart</code> — is absorbed instead of being cashed in on that first move as a jump. Its whole travel is discarded with it, so a gesture now needs at least two moves to accumulate any displacement." },
        { label: 'li', content: "The flick test moves from \"the 100ms sliding-window velocity at release\" to \"net displacement ÷ whole-gesture duration\", with the denominator floored at 50ms to match <code>MIN_VELOCITY_DURATION_MS</code>, and the comparison becomes <code>>= 500px/s</code> to match <code>FAST_SWIPE_VELOCITY</code>'s <code>>=</code>. A zero-length duration yields zero velocity rather than a floored divisor, matching upstream's <code>durationMs > 0 ? … : 0</code> guard, so an unmeasurable gesture is never read as a flick. A sliding window only describes the last short stretch of the trace: after dragging out past the overscroll range and sweeping quickly back, the window velocity at release is just as high, so a net displacement of barely a dozen pixels used to read as a flick and close the drawer. Under whole-gesture average velocity that same gesture cannot reach 500px/s without at least 25px of net displacement towards closed." },
        { label: 'li', content: "Any gesture whose net displacement does not point towards closed (<code>&lt;= 0</code>) rebounds, matching the <code>directionalDelta &lt;= 0</code> guard in <code>useSwipeDismiss</code>; the old <code>displacement > 8px</code> fallback is removed with it." },
        { label: 'li', content: "The change-of-mind guard is now wired up, and it is what actually stops the reverse sweep. A withdrawal of <code>10px</code> or more from the point where the close direction was confirmed marks the gesture as a change of mind and the flick branch refuses to close; displacement that has already crossed the distance threshold clears the mark again, matching upstream's cleanup condition, so a gesture that is past half way is unaffected by a small retreat. Upstream has the same guard, but its only consumer is short-circuited by <code>!hasReleaseDecision</code> and <code>DrawerViewport.onRelease</code> always returns a decision once the direction is locked, so on the drawer path it was dead code." },
        { label: 'li', content: "The distance threshold changes from one third of the drawer size to one half, via <code>max(size * 0.5, 10)</code> matching <code>getBaseSwipeThreshold()</code>'s <code>Math.max(size * 0.5, MIN_SWIPE_THRESHOLD)</code>. The 10px floor keeps the threshold non-zero when the size cannot be measured, so the drawer never closes on the slightest movement. The distance test now also measures net displacement rather than the absolute position, matching upstream's <code>directionalDelta = dragOffset − initialTransform</code>: grabbing the drawer mid-rebound and releasing without dragging further no longer counts as \"already past half way\". The trigger pill's accent confirmation follows the decision exactly — same quantity (net displacement) and same threshold — so the feedback can no longer light up on a gesture that will rebound." },
        { label: 'li', content: "Dragging in the opening direction is damped by a square root (<code>sign(d) * |d| ** 0.5</code>) instead of a linear <code>0.15</code> factor capped at <code>10%</code> of the drawer size, matching <code>applyDirectionalDamping</code>. It self-limits as the displacement grows, so no cap is needed, and it applies to the gesture's increment added on top of the offset the drag started from (<code>base + damp(delta)</code>), the way upstream adds it to the frozen initial transform rather than damping the total." },
        { label: 'li', content: "<code>DragEndInfo</code> gains a <code>duration</code> field and <code>attachDragGesture</code> a <code>calibrateOnFirstMove</code> option (both internal to the shared gesture layer, not part of the package's public export surface) so a consumer can judge intent over the whole gesture." },
        { label: 'li', content: "The backdrop-click dismissal now honors only a genuine tap chain. The browser targets the click of a press-drag-release at the common ancestor of the press and release points, so pressing on the panel content — or on the backdrop itself — dragging towards the mask and releasing there produced a click with <code>dialog</code> as its target, closing the drawer through the backdrop branch even though nothing like a tap happened. The dialog now records the <code>pointerdown</code> origin and coordinates, and a click closes only when the press started on the backdrop and the press-to-release travel stays within the tap magnitude (10px). A <code>detail</code>-0 click (keyboard activation, programmatic <code>.click()</code>) never consumes the record, matching the guards image-preview already uses. The remaining close paths are unchanged: a near-stationary tap on the mask still closes. With the backdrop press record in place the drag hit zone no longer needs to extend past the panel edge — a press landing 1–2px outside the panel belongs to the backdrop, where the tap-distance validation (not the gesture) decides whether it closes." }
        ]
      },
      { label: 'p', content: "The public API and event contract are unchanged, as are the timing and count semantics of <code>open-change</code>." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Move the drawer's post-release settle animation (rebound to open, or slide out to closed) from a JS spring driven by WAAPI <code>element.animate()</code> sampling to a CSS transition (issue #123)." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Dragging still writes an inline <code>transform</code> with <code>transition: none</code>; on release the final value is written and <code>transform</code> is handed back to CSS entirely, so the rebound is one single transition — no <code>element.animate()</code>, no <code>fill</code>, no <code>onfinish</code> anywhere in the path." },
        { label: 'li', content: "Release velocity no longer samples a spring trajectory; it only estimates the transition duration (180–420ms). The overshoot feel is approximated by easing curves matching the old spring's damping ratio: no overshoot towards closed, roughly 3% overshoot on rebound." },
        { label: 'li', content: "No JS→CSS handoff boundary is left, so the implementation is immune to Safari not honouring WAAPI fill overrides when it computes the before-change style; the reflow-baking patch introduced in r3 to work around that quirk is removed." },
        { label: 'li', content: "The public API and event contract are unchanged. Two internal variables, <code>--wui-internal-settle-duration</code> and <code>--wui-internal-settle-easing</code>, are added for the settle transition and are not part of the public token contract." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Reconcile an open dropdown when its host is re-attached, so a remount while open no longer leaves the control stuck in an un-closable open state (issue #120)." },
      { label: 'p', content: "<code>disconnectedCallback</code> tears the panel down and migrates the menu items back to the host, but <code>open</code> is a public property and is not rewritten by an unmount. Lit does not record <code>changedProperties</code> while a host is disconnected, so after a remount <code>updated()</code> never hits the <code>open</code> branch again: the host kept reflecting <code>open</code> and <code>aria-expanded=\"true\"</code> while there was no layer for Escape or an outside click to close. A framework that re-creates the host while it is open — a <code>key</code> change, a <code>v-if</code> around an already-open menu, a list re-render — landed there permanently." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Opening is now reconciled through a single entry point shared by the <code>open</code> branch of <code>updated()</code> and <code>connectedCallback()</code>, so panel, scroll lock, outside-click guard, hover bindings and menu focus converge on the same state on both paths." },
        { label: 'li', content: "On re-attach the menu only takes focus back when focus has nowhere to go — i.e. it fell back to <code>document.body</code>/<code>documentElement</code>. If the user has since focused something else, the panel is rebuilt without stealing that focus." },
        { label: 'li', content: "A closed host that is re-attached stays closed: reconciliation runs only while <code>open</code> is set, and only for a re-connect (<code>hasUpdated</code>), so the first connect remains <code>updated()</code>'s responsibility." },
        { label: 'li', content: "Only the root layer is rebuilt; submenu panels opened from it are not resurrected, matching what a fresh open does." }
        ]
      },
      { label: 'p', content: "The public API, the <code>open</code> property and the <code>open-change</code> contract are unchanged." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Escape now closes only the innermost open overlay." },
      { label: 'p', content: "Previously every overlay component listened for Escape on its own — popover on <code>document</code>, select and autocomplete on the host, dropdown and context-menu through <code>handleMenuKeyboard</code>, drawer on its native <code>&lt;dialog></code> — with no shared notion of which one was innermost. Pressing Escape with a select open inside a drawer therefore closed the <em>outer</em> drawer and left the select open: the inner panel is portalled into the drawer's <code>&lt;dialog></code>, so the host-level listener never saw the key, while the drawer's own guard only looked for <code>HTMLDialogElement</code> on the composed path and missed the portalled panel." },
      { label: 'p', content: "Escape is now arbitrated by a single shared owner:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "One <code>document</code>-level capture listener resolves the innermost open overlay and closes only that one. Because it runs in the capture phase, <code>stopPropagation()</code> keeps component-level handlers from closing a second overlay." },
        { label: 'li', content: "<code>preventDefault()</code> also suppresses the native <code>&lt;dialog></code> close request, so <code>web-ui-dialog</code> — which previously relied on the <code>cancel</code> event — is covered by the same path." },
        { label: 'li', content: "Innermost is resolved against <code>overlayComposition</code>'s logical tree, not the event path. That matters: with focus parked in the drawer while a listbox is open, the event path only reaches the drawer, and a path-based rule would again close the outer layer." },
        { label: 'li', content: "Unrelated sibling overlays (neither containing the other) fall back to open order, so the most recently opened one closes." },
        { label: 'li', content: "<code>controlled</code> and <code>no-escape-close</code> are preserved: components keep expressing their own close semantics, and <code>open-change</code> still goes through the same user-change channel." }
        ]
      },
      { label: 'p', content: "The public API and event contract are unchanged." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: <code>&lt;web-ui-radio-group></code> and <code>&lt;web-ui-checkbox-group></code> now take a <code>direction</code> property and attribute — <code>'horizontal' | 'vertical'</code>, defaulting to <code>'vertical'</code>, so a group that never sets it keeps laying its members out in a column. An invalid value falls back to the default instead of throwing. The property reflects, so every group now carries a <code>direction</code> attribute — <code>vertical</code> even when nothing sets it — which matters if you assert on rendered DOM or select on <code>[direction]</code>." },
      { label: 'p', content: "Member spacing is now per component: <code>--wui-radio-group-gap</code> and <code>--wui-checkbox-group-gap</code> replace the shared <code>--wui-selection-group-gap</code> that the unreleased selection-control change introduced, so a page can widen one group's rhythm without touching the other. Both default to <code>8px</code>, matching the previous value." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: <code>&lt;web-ui-svg-draw-lines></code> gained a second playback direction and an opt-out for playing on its own. <code>replay({ reverse: true })</code> retracts the stroke back along the same path, from fully drawn to blank — the single-direction rule was a limitation of the old implementation, not of the technique, because both directions are the same dash animation with the two endpoints swapped. A reverse run ends on \"no line at all\", so instead of restoring the consumer's inline dash styles the way a reveal run does, it leaves the stroke hidden by inline dash values that stay until the next <code>replay()</code>. That end state lives in the DOM rather than in a live animation, so moving or re-parenting the geometry cannot bring the stroke back — and a <code>replay()</code> that lands in a reduced-motion scope undoes the residue instead of animating, so a control can never be left checked but invisible. <code>no-autoplay</code> skips the automatic single playback that fires when slot content first settles, for callers that decide when to draw. The default is unchanged, so a standalone <code>&lt;web-ui-svg-draw-lines></code> still animates as soon as it renders." },
      { label: 'p', content: "<code>&lt;web-ui-checkbox></code> uses both switches. A checkbox that mounts already <code>checked</code> now shows a static checkmark instead of drawing it during the page's first frame, and unchecking retracts the check along its path instead of only fading it out. The stroke is held at full opacity for the retract so the line, not the fade, is what makes the check disappear. Inside a <code>motion=\"reduced\"</code> theme scope nothing is held: no retract runs there, and holding anyway would leave a fully drawn check on an unchecked control." },
      { label: 'p', content: "The draw and retract duration also stops being a literal in the checkbox template and follows <code>--wui-duration-trigger</code> (160ms by default), resolved from the theme on each update, so the stroke and the indicator's background transition stay on the same beat when a theme overrides that token. That literal never reached a release — the check draw itself is new in this batch — so the <code>300ms</code> written into an earlier draft of this release was never published either." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Internalize theme transitions into <code>web-ui-theme</code>." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Adds the boolean <code>transition</code> attribute; it is <code>false</code> by default and uses native HTML attribute-presence semantics." },
        { label: 'li', content: "Root themes reveal the whole page with a circular View Transition. Nested themes assign a temporary capture name and reveal only their own box." },
        { label: 'li', content: "Reads <code>--wui-theme-transition-duration</code> and <code>--wui-theme-transition-easing</code>, keeps one flight at a time, and falls back to an immediate appearance update when View Transitions or reduced-motion behavior makes animation unavailable." },
        { label: 'li', content: "Replaces the duplicated demo-side transition CSS/logic." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-45', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "5be1ee4: Lower the dialog entrance scale token default from 1.2 to 1.1 so the default no longer overhangs narrow viewports." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Bring <code>imagePreview()</code> into Escape arbitration, so it stops closing the layer underneath it." },
      { label: 'p', content: "The preview drives its own native <code>&lt;dialog></code> and relied on the <code>cancel</code> event for Escape without ever registering as an open overlay. Because Escape is arbitrated globally and the arbiter calls <code>preventDefault()</code> as soon as it resolves a registered layer, having the preview open on top of anything registered meant one Escape closed the layer <em>underneath</em> and left the preview on screen. The preview now claims its <code>&lt;dialog></code> while it is open — including a fresh claim after being reattached to the DOM — and its <code>cancel</code> handler is kept only for the top-layer guarantee." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Unlike the other overlays it carries no inert channel: <code>imagePreview()</code> has no <code>no-escape-close</code> option, so Escape always closes it." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Consolidate open-overlay ownership into a single <code>open-overlay</code> module, so \"this layer is open\" has exactly one owner." },
      { label: 'p', content: "The escape-ownership change introduced one shared arbiter, but its state was still split across three modules — <code>composition</code> (which panels are registered), <code>escape-dismiss</code> (which registered panel receives the keystroke) and <code>lifecycle</code> (when a frame transaction stops being valid). None of them owned the invariant they shared, so each overlay component re-assembled it by hand: a missed unregister, or a panel reattached to the DOM while open, could leave a visible layer the arbiter no longer knew about." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Claiming a panel now returns the handle that owns it; releasing is idempotent, and re-claiming starts a new session, which also resets the not-closable channel." },
        { label: 'li', content: "Sub-layers (second-level menus) adopt into the claiming handle, so a root that re-claims takes its still-visible sub-layers with it instead of orphaning them. A sub-menu that is still animating out stays owned until its transition ends, so a click inside it is no longer read as a click outside the menu." },
        { label: 'li', content: "A panel gives up its claim as it starts closing rather than after the exit animation, so it stops swallowing Escape while it fades out." },
        { label: 'li', content: "The public API and event contract are unchanged; <code>composition</code>, <code>escape-dismiss</code> and <code>lifecycle</code> were internal and are now removed." }
        ]
      }
      ]
    },
    { label: 'li', content: "5be1ee4: Fix modal dialog, drawer, and image preview not reconciling after being reattached to the DOM while open: the native <code>&lt;dialog></code> loses its top-layer membership when the host is detached (the <code>open</code> attribute remains, so <code>showModal</code> could never run again) and the scroll lock was not restored. Reconnecting now reconciles the native dialog presence (self-marked close + <code>showModal</code>), the scroll lock, and the nested drawer layer registration. The image preview also re-attaches its pinch-zoom gesture on remount, which was permanently lost after a detach because <code>firstUpdated</code> only runs once." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Turn the radio and checkbox host into a shared selection-control box. The host is now inline-flex with content-driven height, so the inherited page line-height can no longer inflate it or leave an uneven gap above and below the 18px indicator; radio and checkbox now sit identically next to text and to each other. Both components read one layout stylesheet (<code>src/assets/selection-control.css</code>) and share the <code>--wui-selection-control-size</code> token, while <code>&lt;web-ui-radio-group></code> and <code>&lt;web-ui-checkbox-group></code> accept <code>--wui-selection-group-gap</code> for member spacing. Checkbox also suppresses its focus ring after pointer interaction the way radio already did." },
      { label: 'p', content: "The checked states now animate: the radio dot scales from 0 to 1 (and back to 0 when the selection moves away), and the checkbox checkmark draws itself in from left to right through <code>&lt;web-ui-svg-draw-lines></code>. The checkmark is now the control's own stroked path rather than the filled <code>heroiconsCheck16Solid</code> icon, because drawing requires a stroke and the reveal starts at the path's first point, which also fixes the direction and the weight. Unchecking fades the checkmark out — <code>svg-draw-lines</code> only supports drawing on, not in reverse." },
      { label: 'p', content: "Unchecked controls gained idle hover and pressed backgrounds on the indicator. Because the label text is part of the same trigger row, hovering or pressing the text now tints the indicator exactly like hovering the indicator itself; hover is limited to fine-pointer devices, and checked or disabled controls keep their own surfaces." },
      { label: 'p', content: "The idle indicator surface moves from <code>--wui-color-surface-raised</code> to <code>--wui-color-surface-control</code>, the tier neutral buttons already use. In dark mode <code>surface-raised</code> (<code>#2c2c2e</code>) sat only ~8 luminance points above the page (<code>#242628</code>), leaving radio circles and checkbox boxes barely visible." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Fix the toast hover pause so leaving resumes the remaining time instead of restarting the full duration, and make the pause impossible to leak." },
      { label: 'p', content: "Hovering a toast used to clear the auto-close timer without recording anything, and <code>pointerleave</code> restarted the full <code>duration</code>. The two halves disagreed with each other (the element already had a real pause/resume pair for node relocation), and clearing without recording left <code>pointerleave</code> as the only way back: one missed leave — pointer dragged out of the window, element relocated or removed while hovered, layout moving the toast away from a stationary cursor — parked the toast on screen forever with no fallback." },
      { label: 'p', content: "Hover now records the remaining time and resumes it, and a document-level <code>pointerover</code>/<code>pointerout</code>/<code>pointerleave</code> fallback releases the pause when the element's own <code>pointerleave</code> never arrives. A toast that is mounted while the pointer already sits over it stays paused instead of starting a countdown under the cursor." },
      { label: 'p', content: "Passing <code>duration</code> explicitly during a hover pause no longer starts the timer: the value is recorded and the countdown runs with it once the pointer leaves, so an upsert can no longer close a toast that is still hovered. <code>duration: 0</code> keeps meaning \"never auto-close\" instead of being read as \"already expired\"." }
      ]
    },
    { label: 'li', content: "5be1ee4: Align drawer close button fallback right offset from 20px to 16px." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Harden the toast auto-close timer and correct two README claims that no longer match the code." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>resumeAutoClose()</code> now clears any timer still in flight before arming the resumed one. <code>startAutoClose()</code> already did this, and pause/resume is expected to stay strictly paired, so nothing observable changes today. If the call order is ever re-arranged, assigning <code>_closeTimer</code> over a live handle left two deadlines counting down, and the earlier one closed the toast before its remaining time was up." },
        { label: 'li', content: "The READMEs described Escape arbitration as if <code>image-preview</code> were outside it. It registers its native <code>&lt;dialog></code> with the same arbiter, so layer order decides which surface closes, and the component's <code>cancel</code> handler only vetoes the native instant close so the exit transition still plays; both files now say so." },
        { label: 'li', content: "<code>--wui-drawer-close-right</code> is documented as <code>20px</code> while the fallback has been <code>16px</code> since <code>2add3405</code>. English and Chinese tables now match <code>style.css</code>." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Finish the shared pressed composition of <code>switch</code>, <code>segmented</code> and <code>slider</code>: the pressed/dragged indicator of <code>segmented</code> and the pressed thumb of <code>slider</code> no longer paint a glass fill, so all three now render only the inset highlight stack and read as one flat lift." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "The release that flattened their pressed and dragging shadows to a single <code>0 2px 20px rgb(0 0 0 / 0.2)</code> layer described all three as sharing the same pressed composition, but <code>segmented</code> and <code>slider</code> still painted <code>background-color: var(--wui-color-surface-glass, …)</code>. Only <code>switch</code> had actually been moved to <code>transparent</code>." },
        { label: 'li', content: "With the fill gone, the enlarged <code>scale(1.5)</code> indicator is a pure glass highlight over whatever sits behind it, matching the switch thumb's press state." },
        { label: 'li', content: "CSS only; no API, token or event change." }
        ]
      }
      ]
    },
    { label: 'li', content: "5be1ee4: Radio and checkbox no longer have a pressed state. The shared selection-control shell tinted the indicator's state layer 15% while the pointer was down, on top of the 6% hover tint; that rule is gone, so pressing either control no longer changes its surface. Hover keeps its layer, still with no transition and only on <code>(hover: hover) and (pointer: fine)</code> devices, and checked and disabled controls are unaffected. Touch devices are where this reads strongest: they never matched the hover layer either, so a tap now changes the check itself and nothing else on the control. <code>--wui-color-state-layer-active</code> is untouched and still backs the pressed states of <code>button</code>, <code>input-number</code> and <code>segmented-trigger</code>." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "5be1ee4: Radio and checkbox hover and pressed feedback now switches in one frame. The shared selection-control shell transitioned the indicator's own <code>background-color</code> (and a <code>border-color</code> neither indicator ever gave a width), so the idle 6% hover and 15% pressed tints ramped in over <code>--wui-duration-focus</code> (200ms) while every other component's state layer swaps instantly — <code>button</code> has no background transition at all — and the README motion section promises \"hover/active background feedback switches instantly with no transition\". The tints move to a dedicated overlay (<code>::before</code>, clipped to the indicator radius and stacked between the control surface and the dot/checkmark), which carries no transition, so pressing and releasing read as one frame." },
      { label: 'p', content: "The indicator background keeps its own transition for the checked fill, now at <code>--wui-duration-trigger</code> (160ms) to match the radio dot and the checkbox checkmark, and it fades in <strong>and</strong> out: checking eases the circle or box up to <code>--wui-color-accent</code>, unchecking eases it back to <code>--wui-color-surface-control</code>. Previously that fade ran on the focus duration, and the two needs — instant state-layer feedback and a fading checked fill — could not both be met by one property on one element." },
      { label: 'p', content: "The checkbox checkmark now draws with the default linear easing instead of <code>ease-out</code>. The curve was the problem, not the length: <code>ease-out</code> spent most of the window on the first stroke, so the long up-stroke arrived all at once, while a constant-speed reveal spreads evenly across the whole path. The icon's own opacity fade and the unchecked fade-out stay at 160ms. Reduced-motion themes are unaffected: <code>web-ui-svg-draw-lines</code> skips playback inside a <code>motion=\"reduced\"</code> scope." }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-46', content: "6.4.0" },
  { label: 'h3', id: 'section-47', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "4151251: Align overlay motion with the platform motion language. Timing and scale defaults change visibly across anchored floating panels (popover, menu, dropdown, select, tooltip, autocomplete), the dialog and image preview." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "The dialog now enters by shrinking and exits by growing back, through a new <code>--wui-dialog-scale-enter</code> token (default <code>1.2</code>, <code>1</code> under reduced motion). It replaces the shared <code>--wui-scale-enter</code> that used to grow the dialog in from <code>0.97</code>. A resting card wider than <code>(100 / 1.2)vw ≈ 83.33vw</code> overhangs the viewport while the scale is still above <code>1</code>. With the default <code>360px</code> width that means viewports narrower than <code>432px</code>, and any card in the <code>90vw</code> branch. The exact no-overflow ceiling for <code>min(90vw, var(--wui-dialog-width))</code> is <code>1 / 0.9 ≈ 1.111</code>, because the two branches meet at a <code>400px</code> viewport (<code>0.9 × 400 = 360</code>). Lower the token to that if a hard geometric guarantee matters more than the <code>1.2</code> start. At <code>1.2</code> the overhang lasts about <code>57ms</code> of the <code>320ms</code>. The scale shares <code>--wui-ease-dialog</code> with the card's own opacity, and solving <code>cubic-bezier(0.2, 0, 0, 1)</code> numerically puts progress <code>0.4444</code> at <code>x = 0.1793</code>, so the card is never more than <code>44.4%</code> opaque while it overhangs. On a <code>390px</code> viewport the total overhang is <code>31px</code>." },
        { label: 'li', content: "The image preview's enter scale moves off the wrapper that also contains the control layer and onto the image surface alone. Scaling the wrapper dragged the edge-anchored glass chrome (counter, close, nav, toolbar) inward, on a <code>1440px</code> viewport by <code>36px</code> and <code>22px</code> from its final corner position, and drew it at a non-integer scale mid-flight. The chrome now holds its position and fades in while the image materializes. The image preview is a full-viewport surface, so <code>--wui-scale-enter</code> stays below <code>1</code> there and it can never take a shrink-in start the way the dialog does." },
        { label: 'li', content: "Anchored floating panels get a dedicated easing token, <code>--wui-ease-float</code> (<code>cubic-bezier(0.4, 0.38, 0.2, 1)</code>), shaped as a no-bounce spring (about <code>11%</code> of the progress at <code>10%</code> of the duration, <code>53%</code> at <code>30%</code>, <code>85%</code> at <code>50%</code>). They previously shared <code>--wui-ease-enter</code>, which put <code>85%</code> of the transition inside the first <code>30%</code> of the duration and read as a pop rather than an unfold. The anchor-relative <code>transform-origin</code> and the grow-in direction are unchanged." },
        { label: 'li', content: "<code>--wui-duration-float-enter</code> moves from <code>160ms</code> to <code>240ms</code> and <code>--wui-duration-float-exit</code> from <code>120ms</code> to <code>160ms</code>, keeping exit faster than enter." },
        { label: 'li', content: "<code>--wui-scale-enter</code> moves from <code>0.97</code> to <code>0.95</code> for anchored panels and image preview." }
        ]
      },
      { label: 'p', content: "Reduced-motion behavior is unchanged: durations still collapse to <code>0ms</code> and both scale tokens still resolve to <code>1</code>." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "4151251: Close the gaps a full motion review of <code>@greypan/web-ui</code> turned up. Three motion values were reachable only through a component-local literal, so they ignored the <code>motion</code> contract, and one repeating transition was never suppressed." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>--wui-duration-swipe-settle</code> (<code>220ms</code>) and <code>--wui-ease-swipe</code> (<code>cubic-bezier(0.32, 0.72, 0, 1)</code>) are now declared by the theme in addition to documenting them on <code>&lt;web-ui-image-preview></code>. They were previously referenced only through component-level fallbacks, so under <code>motion=\"reduced\"</code> the carousel settle still ran its full <code>220ms</code> transform, because the theme had no definition to zero out. Declaring them also brings both tokens under the <code>theme-token-parity</code> guard, which silently skipped them while the theme did not define them." },
        { label: 'li', content: "Icon rotation and the spinner leaf chase are now driven by <code>--wui-duration-spin</code> (<code>600ms</code>) and <code>--wui-duration-spinner</code> (<code>800ms</code>). Both are infinite loops and neither had any reduced-motion branch at all. A component-level <code>@media (prefers-reduced-motion: reduce)</code> block cannot see the <code>motion</code> attribute, and these animations read no token, so neither path could reach them. Under reduced motion they now run at <code>1600ms</code> instead of stopping, because a frozen loading indicator reads as a hung UI. The spinner's per-leaf <code>animation-delay</code> is derived from the same token, so the phase spread follows the period instead of breaking when it changes." },
        { label: 'li', content: "<code>&lt;web-ui-toast></code> enters at <code>scale(var(--wui-scale-enter, 0.95))</code> instead of a literal <code>scale(0.97)</code>. This aligns it with every other glass materialization in the library and makes the scale collapse under <code>motion=\"reduced\"</code>." },
        { label: 'li', content: "The dialog backdrop now uses <code>var(--wui-ease-dialog)</code>. Sharing the card's easing keeps the backdrop from finishing most of its fade after the card has already landed, which was the visible effect of the weak built-in <code>ease</code> it used before." },
        { label: 'li', content: "<code>&lt;web-ui-checkbox></code> and <code>&lt;web-ui-radio></code> use <code>var(--wui-duration-focus, 200ms)</code> for their background-color and border-color transitions instead of a literal <code>0.2s</code>. The focus ring on the same elements already used that token, so the two now collapse together under reduced motion. These were the last hard-coded transition durations outside the reduced-motion blocks. The anchored panel keeps a literal <code>120ms</code> fade there on purpose, because the token it would otherwise read is the one reduced motion zeroes." },
        { label: 'li', content: "A tooltip that opens while another tooltip is already showing now skips its enter animation as well as its delay. It previously set the delay to <code>0</code> but still played the <code>240ms</code> unfold, so sweeping across a row of icons replayed a full unfold per target." }
        ]
      },
      { label: 'p', content: "This amends the \"reduced-motion behavior is unchanged\" note in the accompanying motion-alignment changeset: durations still collapse to <code>0ms</code> and both scale tokens still resolve to <code>1</code>, but the two infinite loading loops are now slowed rather than left alone." }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-48', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "4151251: Flatten the pressed and dragging shadow of <code>switch</code>, <code>segmented</code> and <code>slider</code> to a single soft <code>0 2px 20px rgb(0 0 0 / 0.2)</code> layer, replacing the previous three-layer stack. All three now share the same pressed composition: <code>switch</code> and <code>slider</code> keep the rest of their values, and <code>segmented</code> picks up the inset highlight stroke the other two already had. A pressed thumb or indicator reads as one flat lift instead of a deep stack." }
    ]
  },
  { label: 'h2', id: 'section-49', content: "6.3.1" },
  { label: 'h3', id: 'section-50', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "fc05655: fix(svg-draw-lines): make the host layout-neutral — wrap an icon with no box-inflation or vertical centering shift — while keeping it a transformable element (interweave prototype scales the host)." },
      { label: 'p', content: "style: drop the hand-written <code>-webkit-</code> vendor prefixes that lightningcss auto-generates for the CSS-in-JS <code>?inline</code> pipeline; keep the non-generatable <code>-webkit-</code> transition-list entries, <code>-webkit-line-clamp</code> box technique, <code>-webkit-user-drag</code>, and <code>::-webkit-*spin-button</code> pseudo-elements." }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-51', content: "6.3.0" },
  { label: 'h3', id: 'section-52', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a00fc1b: Add a <code>peek</code> property to <code>web-ui-collapse</code> so the closed state reveals a fixed slice of the content along the animation axis instead of collapsing to zero. The revealed area ends in an alpha-gradient fade whose length is derived from <code>peek</code> (<code>calc(peek * ratio)</code>), so there is no second attribute to set — tune it via the <code>--wui-collapse-peek-edge-ratio</code> (default <code>0.4</code>), <code>--wui-collapse-peek-edge-max</code> (default <code>112px</code>), <code>--wui-collapse-peek-edge</code> (explicit length, wins over the derived value) and <code>--wui-collapse-peek-edge-color</code> CSS variables. The gradient is a four-stop ease-out curve (opaque body, 60% alpha at 30% into the band, 26% at 65%, edge color at the end) so the fade reads clearly from its start instead of only softening the last sliver. Set the ratio to <code>0</code> to disable the fade." },
    { label: 'li', content: "a00fc1b: Add presentation options to <code>imagePreview()</code>: <code>nav</code>, <code>toolbar</code>, <code>closable</code>, <code>indicator</code>, <code>swipe</code>, <code>noScrollLock</code> and <code>noBackdropClose</code>. Every presentation option defaults to <code>false</code>, so a preview renders only the image itself unless the consumer opts in. Also fix the preview closing when clicking the image itself." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "a00fc1b: Let <code>imagePreview()</code> be dragged to pan in any direction at any zoom level, and make that the stage's default drag behaviour. Previously a drag only did something while zoomed in, and the offsets were clamped to how far the image overflowed the stage — which is zero at 1x. The bound is now half the absolute size difference between the image and the stage: zoomed in it still reveals the cropped edges, at 1x it moves the image around inside the viewport, and either way the image can never be dragged out of the viewport. Holding the mouse button down and resting a single finger take the same Pointer path, so desktop and mobile behave identically." },
      { label: 'p', content: "Narrow <code>swipe</code> to own the horizontal axis only when it actually applies — 1x, with more than one image. Everything else pans, direction free, which keeps the swipe demonstrations behaving exactly as before while 1x vertical drags and every zoomed drag now pan instead of doing nothing." },
      { label: 'p', content: "Because panning also works at 1x, <code>resetZoom()</code> now has something to reset when the image is merely displaced, so the toolbar reset button is enabled whenever the image is zoomed <em>or</em> panned rather than only above 1x." }
      ]
    },
    { label: 'li', content: "a00fc1b: Anchor every <code>imagePreview()</code> zoom to a point that stays visually fixed, and add built-in pinch-to-zoom. The wheel now keeps the content under the cursor still and a pinch keeps the midpoint between the two fingers still, while the toolbar buttons, keyboard shortcuts and double-click keep expanding around the viewport center. Pinch has no option because the stage already owns pointer interaction: the first finger still drives pan/swipe, the second finger both starts the pinch and aborts any in-flight pan or swipe, and the compatibility <code>click</code> that mixed input may synthesize afterwards is swallowed instead of closing the preview. The pinch handling itself lives in the internal shared gesture layer (<code>attachPinchGesture</code>, not part of the package's export map) and reports only geometry — the distance ratio plus the midpoint and its delta — leaving the mapping to scale and translation to the component." },
    { label: 'li', content: "a00fc1b: Add an imperative <code>imagePreview()</code> image viewer. It exposes a handle-only API (<code>next</code>/<code>prev</code>/<code>goTo</code>/zoom/<code>close</code>/<code>closed</code>), renders through the native <code>&lt;dialog></code> top layer with the shared presence and scroll-lock lifecycle, and supports keyboard navigation, wheel zoom, drag-to-pan, and reduced-motion tokens." },
    { label: 'li', content: "a00fc1b: Retire <code>--wui-duration-menu-enter/exit</code> and <code>--wui-duration-overlay-enter/exit</code> in favor of dedicated motion tokens. Floating panels (popover, tooltip, select, autocomplete, menu portal) now use <code>--wui-duration-float-enter: 160ms</code> and <code>--wui-duration-float-exit: 120ms</code>; toast uses <code>--wui-duration-toast-enter: 280ms</code> and <code>--wui-duration-toast-exit: 200ms</code>. Floating-panel enter/exit motion becomes faster, so this is a minor behavior change." }
    ]
  },
  { label: 'h3', id: 'section-53', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a00fc1b: Prevent orphaned empty popover portal panels when controlled <code>open</code> changes back to <code>false</code>, or the popover is removed, before its open frame callback runs." },
    { label: 'li', content: "a00fc1b: Sync the accessible empty state when an autocomplete empty slot is removed while its portal panel is open." },
    { label: 'li', content: "a00fc1b: Add composition-aware overlay interaction ownership so nested portal panels no longer trigger parent outside-click, focusout, or scroll suppression." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "a00fc1b: Fix modal dialog positioning regression and unscaled image-preview mask." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Dialogs (dialog, image-preview, drawer) now declare <code>position: fixed</code> explicitly. The single-layer refactor had introduced <code>position: relative</code> on the dialog, overriding the UA <code>dialog:modal</code> default; a modal dialog in the top layer then laid out in document flow — rendered at the top of the page (\"ghost\" artifact) and scrolled with the page instead of staying centered. The explicit <code>fixed</code> is defensive against any future author rule overriding the UA default." },
        { label: 'li', content: "Image preview no longer scales the full-viewport mask: the enter scale (<code>scale(0.97)</code> → <code>1</code>) moved from the dialog element (which previously scaled the dedicated backdrop layer together with its content) to a new <code>.wui-image-preview-content</code> wrapper that contains the stage and the glass controls. The dialog and mask stay transform-free, so the mask fades in without scaling while the content still performs its subtle zoom-in. The dialog still never fades its own opacity, so glass control blur stays continuous." }
        ]
      }
      ]
    },
    { label: 'li', content: "a00fc1b: Split dialog-level motion into dedicated tokens: <code>--wui-duration-dialog-enter: 320ms</code>, <code>--wui-duration-dialog-exit: 260ms</code>, and <code>--wui-ease-dialog: cubic-bezier(0.2, 0, 0, 1)</code>. Dialog and image-preview enter/exit motion now use these tokens so the entrance no longer collapses into the first ~100ms; reduced-motion stays at 0ms." },
    { label: 'li', content: "a00fc1b: Add configurable dialog surface padding, title spacing, content spacing, and footer button spacing CSS custom properties." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "a00fc1b: Tune the pressed handle shadow down: <code>web-ui-switch</code> and <code>web-ui-segmented</code> keep the pressed-glass structure (solid white at rest, frosted glass + 1.5x scale + lifted shadow while pressed/dragging) but the press shadow is now slightly lighter and tighter — lower opacity on all three layers and smaller blur radii/spread. The direct-value <code>box-shadow</code> (no CSS custom-property indirection) is unchanged, so iOS Safari still transitions it reliably." },
      { label: 'p', content: "Roll the two-layer glass blur out to every component that fades opacity on or around a frosted-glass surface. The root cause is the same as the dialog fix: an element with <code>opacity &lt; 1</code> becomes a backdrop root, which disables the <code>backdrop-filter</code> of any glass element inside it (or around it) during the transition, so the blur pops in/out at the opacity endpoints instead of fading. The glass surface itself no longer transitions its own opacity and no longer carries <code>backdrop-filter</code>; a dedicated blur layer (<code>.wui-floating-panel-blur</code>, <code>.toast-blur</code>) and a content layer (<code>.wui-floating-panel-surface</code>, <code>.toast-surface</code>) each fade their own opacity, which keeps the blur continuous on every engine." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Floating panels (popover, tooltip, select, autocomplete, dropdown, context-menu via the shared menu portal): the shared <code>.wui-floating-panel</code> keeps <code>opacity: 1</code> and only animates <code>transform</code>; the two-layer structure is built by the shared overlay portal and the menu portal, so every consumer is covered." },
        { label: 'li', content: "Toast: <code>.toast</code> keeps <code>opacity: 1</code> and only animates <code>transform</code>; content and blur fade through <code>.toast-surface</code> / <code>.toast-blur</code>." },
        { label: 'li', content: "Image preview: the fullscreen dialog no longer fades its own opacity (that made the dialog a backdrop root and disabled the glass toolbar/counter blur). The scrim fades through a dedicated <code>.wui-image-preview-backdrop</code> layer, the image stage fades through <code>.wui-image-preview-surface</code>, and the glass controls (toolbar, counter, close, nav) each fade their own opacity — the counter/toolbar are the glass elements themselves, and the glass close/nav buttons fade through a newly exposed <code>part=\"button\"</code> on <code>web-ui-button</code>'s native button (the element that actually carries <code>backdrop-filter</code>), so no control sits inside an opacity-fading ancestor and their blur stays continuous while the fade-in/out is restored." },
        { label: 'li', content: "Audit-only (no discrete blur switch, left unchanged): drawer (its dialog only animates transform), and the always-on glass surfaces in avatar, button, button-group, input, input-number, textarea, layout, slider, switch, segmented and theme." }
        ]
      },
      { label: 'p', content: "Reduced-motion behavior is preserved: blur/content layers keep a short opacity fade under <code>prefers-reduced-motion: reduce</code>, and the floating-panel family keeps the same enter/exit durations from the float tokens." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "a00fc1b: Finish the two-layer glass migration: the frosted-glass <strong>background</strong> now lives on the surface layer, not on the panel itself." },
      { label: 'p', content: "Root cause (same family as the earlier blur-switch fix, confirmed by pixel sampling): the blur child layer's <code>backdrop-filter</code> samples everything painted behind it. When the panel still drew its own semi-transparent glass background, the blur layer sampled that background <em>plus</em> the page, <code>brightness(1.06)</code> brightened the composite, and the panel background never faded with the surface — leaving a white afterimage while closing. The design already required the background to live on the surface layer; this change actually moves it there:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>.wui-floating-panel</code> is now guaranteed <code>background: transparent</code>; <code>.wui-floating-panel-surface</code> carries the glass background (and <code>border-radius: inherit</code>) and fades it together with the content." },
        { label: 'li', content: "The shared overlay portal and the menu portal move the <code>wui-glass</code> class from the panel onto the surface at build time; the local (non-portal) templates of popover, tooltip, select and autocomplete do the same. Per-component background/padding rules move to the surface-scoped selector so the visual is equivalent (background covers the same rounded rect, including padding). The surface also neutralizes the <code>backdrop-filter</code> that <code>wui-glass</code> carries (same mechanism as <code>.wui-dialog-surface</code>), so the blur comes only from the blur layer instead of stacking twice and over-brightening; the panel shadow config (<code>--wui-shadow-panel</code>) is bridged on the surface scope, where the glass element can actually consume it." },
        { label: 'li', content: "Toast moves its background and padding from <code>.toast</code> to <code>.toast-surface</code>; <code>.toast</code> is transparent." },
        { label: 'li', content: "Dialog and image-preview were already correctly migrated (transparent dialog, background on <code>.wui-dialog-body</code> inside the surface; scrim/surface layers in image-preview) and are now covered by regression assertions." }
        ]
      },
      { label: 'p', content: "Tune the pressed handle shadow down to the final values (<code>web-ui-switch</code>: <code>0 1px 6px rgb(0 0 0 / 0.2)</code>, <code>0 6px 16px rgb(0 0 0 / 0.16)</code>, <code>0 14px 28px rgb(0 0 0 / 0.1)</code>; <code>web-ui-segmented</code>: <code>0 0 1px rgb(0 0 0 / 0.1)</code>, <code>0 5px 14px rgb(0 0 0 / 0.16)</code>, <code>0 12px 28px rgb(0 0 0 / 0.1)</code>). The direct-value <code>box-shadow</code> (no custom-property indirection) is unchanged, so iOS Safari still transitions it reliably." },
      { label: 'p', content: "Make carousel swipe thresholds stage-relative and robust for fast flicks: the distance threshold is now 15% of the stage width (rounded) instead of a fixed 48px, so the gesture feels consistent across screen sizes. A fast flick whose sampled velocity reaches 320px/s still commits even below that distance, and a new fallback commits when the direction is clear (a small distance) and the sampled velocity is at least half the speed threshold — real touch event streams can be merged/delayed (measured in CDP: a 40px flick spread over ~167ms is under-sampled to ~164px/s by the 100ms velocity window), which previously made quick flicks bounce back. Slow drags keep the strict distance rule. The shared drag-gesture velocity guard also stops zeroing out ultra-short flicks under 8ms." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "a00fc1b: Revert the two-layer frosted-glass structure back to a single layer with interpolated <code>backdrop-filter</code>." },
      { label: 'p', content: "Dual-engine measurement (Chrome 153 + Safari 26.5) showed that <code>backdrop-filter</code> interpolates smoothly between <code>blur(0px)</code> and <code>blur(4px)</code>; the original \"hard blur jump\" was caused by animating <code>none</code> ↔ <code>blur(...)</code>, which cannot interpolate — not by <code>backdrop-filter</code> being non-animatable. The two-layer workaround (separate blur layer + content surface) introduced its own layer-interaction problems (brightened white cast, closing afterimage, double blur, shadow inheritance scoping), so it is removed:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Floating panels (popover/tooltip/select/autocomplete/menu portal): <code>wui-glass</code> returns to the panel itself, which carries the glass background, shadow and <code>backdrop-filter</code>. Open/close now transitions <code>opacity</code> + <code>backdrop-filter</code> (<code>blur(0px)</code> ↔ <code>blur(4px)</code>) + <code>transform</code> together; <code>.wui-floating-panel-blur</code> / <code>.wui-floating-panel-surface</code> and the portal/menu-portal DOM construction and class-moving logic are deleted." },
        { label: 'li', content: "Dialog: the glass card (<code>.wui-dialog-body</code>) fades its own opacity and interpolates its own blur; the dialog element itself still avoids an opacity transition so descendant blur is never disabled by a backdrop root." },
        { label: 'li', content: "Toast: <code>.toast</code> carries the glass and transitions <code>opacity</code> + <code>backdrop-filter</code> + <code>transform</code>; <code>.toast-blur</code> / <code>.toast-surface</code> are removed." },
        { label: 'li', content: "Reduced motion shortens the durations but keeps the <code>backdrop-filter</code> interpolation (reducing motion should not reintroduce a hard blur switch)." },
        { label: 'li', content: "Image preview keeps its dedicated full-viewport structure (constant-opacity dialog + separate backdrop/surface layers and per-control opacity fades): the whole-dialog fade would move its <code>backdrop-filter</code> sampling source from dialog content to the page texture mid-transition, so it is intentionally out of scope of this single-layer change." }
        ]
      }
      ]
    },
    { label: 'li', content: "a00fc1b: Swap the <code>imagePreview()</code> reset-zoom glyph from <code>lucide:refresh-cw</code> to <code>radix-icons:reset</code>, so the toolbar button reads as \"back to 1x\" rather than \"reload\". The matching <code>radixIconsReset</code> glyph is now exported from <code>@greypan/web-ui/icons</code>." },
    { label: 'li', content: "a00fc1b: Fix iOS Safari compatibility for page backgrounds, dialog-based overlay motion, drawer close button placement, touch drag interactions, and pointer-triggered focus rings. Native dialog overlays now keep their open/close transitions on Safari, switch/segmented/slider drag gestures remain responsive on touch, and pointer-clicked controls no longer show a keyboard-style focus ring." },
    { label: 'li', content: "a00fc1b: Suppress Safari's UA focus ring on native dialog surfaces for dialog, drawer, and image-preview. The modal panel itself is not a focusable control, so keyboard focus remains on the interactive controls inside the panel." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "a00fc1b: Fix slider and segmented drag interruptions under touch input. On touch, the browser implicitly captures the pointer to the hit element (slider thumb / segmented-trigger content), and the drag gesture then transfers capture to the drag surface with <code>setPointerCapture</code>; the hit element's <code>lostpointercapture</code> was being misread as a cancel, freezing the drag after the first step. The gesture now only cancels when the capture surface itself loses capture, ignoring the implicit-capture handoff. The <code>touch-action: none</code> host declarations and the hit-test-chain <code>touchmove</code> guard are kept as defense in depth." },
      { label: 'p', content: "Fix a double rebound on Safari mobile when a draggable drawer springs back after a drag. Safari computes a CSS transition's before-change style without trusting the WAAPI fill animation's override, so the computed transform change from the drag residual (e.g. <code>translateX(-64px)</code>) to <code>0</code> at the rebound <code>onfinish</code> boundary is sampled as a transition's from-value and replays a second spring. Rewriting or clearing the inline styles cannot avoid that non-zero-to-zero sample, and deferring the <code>is-dragging</code> removal to a later animation frame is unreliable because the frame can land in the same rendering tick. The rebound finish now, while the <code>is-dragging</code> class still suppresses <code>transform</code>/<code>backdrop</code> transitions, rewrites the inline styles to the open-state terminal values and forces a synchronous style recalculation (reading <code>offsetWidth</code>) so the new <code>0</code> value is baked into Safari's transition reference, then removes <code>is-dragging</code> in the same task — the suppression is lifted only after the reference is already <code>0</code>, so no transition can start." }
      ]
    },
    { label: 'li', content: "a00fc1b: Render the layout mobile sidebar with built-in drawer chrome and map sidebar width/radius to drawer tokens." },
    { label: 'li', content: "a00fc1b: Clip the layout header glow horizontally so its decorative scale/translate no longer creates horizontal page scroll on narrow viewports." },
    { label: 'li', content: "a00fc1b: Adapt drag controls, dialogs, toasts, and form inputs for small and touch viewports." },
    { label: 'li', content: "a00fc1b: Keep the mobile layout sidebar toggle aligned to the first header row when a header slot expands to multiple rows." },
    { label: 'li', content: "a00fc1b: Slow the default full-motion overlay enter/exit durations from 180ms/140ms to 280ms/200ms. The change covers dialog, image-preview, toast, and shared floating-panel overlay motion; reduced-motion tokens stay at 0ms." },
    { label: 'li', content: "a00fc1b: Add a shared overlay lifecycle transaction so frame callbacks are invalidated on same-frame close, disconnect, and reconfigure. Temporary disconnects can resume safely on reconnect." },
    { label: 'li', content: "a00fc1b: Add stale async positioning generation guards so late floating-ui promises cannot overwrite newer overlay coordinates or width styles." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "a00fc1b: Revert the <code>web-ui-theme</code> host to <code>display: contents</code> and stop painting <code>--wui-color-page</code> on it. The block box + background painting were added in this same un-released batch as a workaround for an iOS Safari token-inheritance concern; the user verified on-device that <code>contents</code> and <code>block</code> behave identically, so the host is back to drawing nothing and the embedding application keeps full control of the surface behind the themed subtree. Custom properties still inherit into slotted content (<code>display</code> does not affect inherited custom properties)." },
      { label: 'p', content: "Fix the image-preview <code>swipe</code> carousel to a single-track layout. Previously the current image and the adjacent image were positioned independently with their own transforms, so on images with different aspect ratios they overlapped and misaligned. Now the current image and its neighbors sit in equal-size slides on one track: the stage clips the overflow, the whole track translates with the finger, and the adjacent image enters and leaves on the same baseline at the same size (with <code>loop</code> on, the wrap-around neighbor is always present beside the current image, so a drag near the end keeps following a real adjacent image instead of running into empty track). Releasing past the threshold slides the next image in; below it the strip bounces back, and at the non-looping bounds it bounces back instead of crossing the boundary." },
      { label: 'p', content: "Fix frosted-glass handles on <code>web-ui-switch</code>, <code>web-ui-slider</code> and <code>web-ui-segmented</code> flashing their blur on long-press/drag. <code>backdrop-filter</code> was already always-on, but the background still switched from opaque white to translucent glass at press — that is the property change that makes Chrome re-rasterize the backdrop region as a hard flash. The glass surface composition (<code>backdrop-filter</code> + background) is now identical across resting, pressed and dragging states; only the transform and the lifted shadow change. A dialog's own glass surface stays stable too because the handle no longer suddenly blurs the content behind it." },
      { label: 'p', content: "Deepen the pressed/dragging handle shadow on <code>web-ui-switch</code> (<code>0 2px 10px rgb(0 0 0 / 0.28), 0 10px 28px rgb(0 0 0 / 0.24), 0 18px 44px rgb(0 0 0 / 0.16)</code>) and <code>web-ui-segmented</code> (<code>0 0 1px rgb(0 0 0 / 0.12), 0 6px 18px rgb(0 0 0 / 0.22), 0 16px 36px rgb(0 0 0 / 0.16)</code>) for a stronger lifted-glass feel." },
      { label: 'p', content: "Fix draggable-drawer open/close transitions being lost after rapid taps on the drag handle. Two independent causes are addressed. First, every tap finishes through the rebound path, which wrote a <code>translateX(0px)</code> inline style (kept deliberately for the Safari double-rebound fix); that zero-value inline later overrode the closed-state CSS transform, so closing via button/backdrop/Escape stopped transitioning and reopens had no animation either. The no-animation rebound path now clears the inline drag styles instead of leaving a zero transform behind, and a close that starts while no drag animation is in flight clears any leftover drag inline styles before the exit transition is computed. Second, the native dialog <code>close</code> event is dispatched asynchronously, so a fast close→reopen can deliver the previous close session's stale <code>close</code> event after the reopen; the overlay presence now flags its own <code>dialog.close()</code>, and <code>web-ui-drawer</code> / <code>web-ui-dialog</code> swallow that event (stale or not) instead of treating it as an external close that immediately closes the freshly reopened dialog. Genuine external closes (for example a form with <code>method=\"dialog\"</code>) still close normally." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "a00fc1b: Fix the pressed/dragging handle shadow on <code>web-ui-switch</code> and <code>web-ui-segmented</code> not showing on iOS. The previous round drove the pressed <code>box-shadow</code> through a CSS custom property (<code>--wui-internal-glass-shadow</code> / a shadow-list variable); iOS Safari does not transition a property when only its custom-property input changes and can skip the discrete <code>var()</code> switch entirely, so the pressed look \"reverted\" on device. The pressed state now writes the <code>box-shadow</code> value directly in the class (regular property change, reliably transitioned everywhere), keeping the glass inset highlight, and the shadows are deepened further for a clearly lifted look: switch <code>0 2px 12px rgb(0 0 0 / 0.32), 0 14px 36px rgb(0 0 0 / 0.28), 0 28px 64px rgb(0 0 0 / 0.2)</code>, segmented <code>0 0 1px rgb(0 0 0 / 0.16), 0 10px 28px rgb(0 0 0 / 0.28), 0 24px 56px rgb(0 0 0 / 0.2)</code>." },
      { label: 'p', content: "Fix image-preview carousel neighbors \"bleeding through\" while zoomed. The swipe track keeps the two neighbors rendered beside the current image, but the shared per-image transform previously applied the zoom scale and the pan offsets to every slide, so at scale > 1 the adjacent images were scaled up too and their edges entered the viewport. Now the zoom scale (and, while zoomed, the pan offsets) apply only to the current image; the neighbor slides stay at 1x and frozen in their track positions, so panning while zoomed never brings them into the viewport. At 1x the neighbors still share the vertical pan to stay aligned during diagonal swipes, and swipe behavior is unchanged." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "a00fc1b: Restore the <code>web-ui-switch</code>, <code>web-ui-slider</code> and <code>web-ui-segmented</code> handles to their original pressed-glass structure: the resting handle is a solid white thumb / indicator, and pressing or dragging switches it to frosted glass — backdrop blur + translucent glass background + 1.5x scale + a clearly lifted shadow. The previous round made the glass composition constant (backdrop blur always on, background never changing), which hid the press transition on iOS; that was the wrong target and is reverted. The iOS-safe pressed <code>box-shadow</code> from the last round is kept: the class writes the shadow value directly (no CSS custom-property indirection, which iOS Safari does not transition)." },
      { label: 'p', content: "Make <code>web-ui-dialog</code>'s background blur continuous across every state switch. The dialog element's own <code>opacity</code> transition made the <code>dialog</code> a backdrop root while <code>opacity &lt; 1</code>, which completely disabled the glass body's <code>backdrop-filter</code> during the transition — the blur popped in/out at the opacity endpoints instead of fading (verified in a real browser: an ancestor with <code>opacity</code> or <code>filter</code> disables descendant backdrop-filter, while <code>transform</code> and the element's own opacity fade do not). The dialog now keeps <code>opacity: 1</code> on the element (only the transform scale animates there), fades the content through a <code>.wui-dialog-surface</code> wrapper, and blurs through a dedicated <code>.wui-dialog-blur</code> layer whose own opacity transition fades the blur smoothly; the body no longer carries its own <code>backdrop-filter</code>, so there is no double blur at rest." },
      { label: 'p', content: "Lock the image-preview <code>swipe</code> gesture to horizontal at 1x. While the swipe gesture applies, the vertical delta is now ignored entirely — no vertical pan and no vertical follow (previously a 1x swipe drag still panned vertically). Zoomed-in dragging is unchanged and pans on both axes." }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-54', content: "6.2.0" },
  { label: 'h3', id: 'section-55', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "e063e5e: Add a <code>peek</code> property to <code>web-ui-collapse</code> so the closed state reveals a fixed slice of the content along the animation axis instead of collapsing to zero. The revealed area ends in an alpha-gradient fade whose length is derived from <code>peek</code> (<code>calc(peek * ratio)</code>), so there is no second attribute to set — tune it via the <code>--wui-collapse-peek-edge-ratio</code> (default <code>0.4</code>), <code>--wui-collapse-peek-edge-max</code> (default <code>112px</code>), <code>--wui-collapse-peek-edge</code> (explicit length, wins over the derived value) and <code>--wui-collapse-peek-edge-color</code> CSS variables. The gradient is a four-stop ease-out curve (opaque body, 60% alpha at 30% into the band, 26% at 65%, edge color at the end) so the fade reads clearly from its start instead of only softening the last sliver. Set the ratio to <code>0</code> to disable the fade." },
    { label: 'li', content: "e063e5e: Add presentation options to <code>imagePreview()</code>: <code>nav</code>, <code>toolbar</code>, <code>closable</code>, <code>indicator</code>, <code>swipe</code>, <code>noScrollLock</code> and <code>noBackdropClose</code>. Every presentation option defaults to <code>false</code>, so a preview renders only the image itself unless the consumer opts in. Also fix the preview closing when clicking the image itself." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "e063e5e: Let <code>imagePreview()</code> be dragged to pan in any direction at any zoom level, and make that the stage's default drag behaviour. Previously a drag only did something while zoomed in, and the offsets were clamped to how far the image overflowed the stage — which is zero at 1x. The bound is now half the absolute size difference between the image and the stage: zoomed in it still reveals the cropped edges, at 1x it moves the image around inside the viewport, and either way the image can never be dragged out of the viewport. Holding the mouse button down and resting a single finger take the same Pointer path, so desktop and mobile behave identically." },
      { label: 'p', content: "Narrow <code>swipe</code> to own the horizontal axis only when it actually applies — 1x, with more than one image. Everything else pans, direction free, which keeps the swipe demonstrations behaving exactly as before while 1x vertical drags and every zoomed drag now pan instead of doing nothing." },
      { label: 'p', content: "Because panning also works at 1x, <code>resetZoom()</code> now has something to reset when the image is merely displaced, so the toolbar reset button is enabled whenever the image is zoomed <em>or</em> panned rather than only above 1x." }
      ]
    },
    { label: 'li', content: "e063e5e: Anchor every <code>imagePreview()</code> zoom to a point that stays visually fixed, and add built-in pinch-to-zoom. The wheel now keeps the content under the cursor still and a pinch keeps the midpoint between the two fingers still, while the toolbar buttons, keyboard shortcuts and double-click keep expanding around the viewport center. Pinch has no option because the stage already owns pointer interaction: the first finger still drives pan/swipe, the second finger both starts the pinch and aborts any in-flight pan or swipe, and the compatibility <code>click</code> that mixed input may synthesize afterwards is swallowed instead of closing the preview. The pinch handling itself lives in the internal shared gesture layer (<code>attachPinchGesture</code>, not part of the package's export map) and reports only geometry — the distance ratio plus the midpoint and its delta — leaving the mapping to scale and translation to the component." },
    { label: 'li', content: "e063e5e: Add an imperative <code>imagePreview()</code> image viewer. It exposes a handle-only API (<code>next</code>/<code>prev</code>/<code>goTo</code>/zoom/<code>close</code>/<code>closed</code>), renders through the native <code>&lt;dialog></code> top layer with the shared presence and scroll-lock lifecycle, and supports keyboard navigation, wheel zoom, drag-to-pan, and reduced-motion tokens." },
    { label: 'li', content: "e063e5e: Retire <code>--wui-duration-menu-enter/exit</code> and <code>--wui-duration-overlay-enter/exit</code> in favor of dedicated motion tokens. Floating panels (popover, tooltip, select, autocomplete, menu portal) now use <code>--wui-duration-float-enter: 160ms</code> and <code>--wui-duration-float-exit: 120ms</code>; toast uses <code>--wui-duration-toast-enter: 280ms</code> and <code>--wui-duration-toast-exit: 200ms</code>. Floating-panel enter/exit motion becomes faster, so this is a minor behavior change." }
    ]
  },
  { label: 'h3', id: 'section-56', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "e063e5e: Prevent orphaned empty popover portal panels when controlled <code>open</code> changes back to <code>false</code>, or the popover is removed, before its open frame callback runs." },
    { label: 'li', content: "e063e5e: Sync the accessible empty state when an autocomplete empty slot is removed while its portal panel is open." },
    { label: 'li', content: "e063e5e: Add composition-aware overlay interaction ownership so nested portal panels no longer trigger parent outside-click, focusout, or scroll suppression." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "e063e5e: Fix modal dialog positioning regression and unscaled image-preview mask." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Dialogs (dialog, image-preview, drawer) now declare <code>position: fixed</code> explicitly. The single-layer refactor had introduced <code>position: relative</code> on the dialog, overriding the UA <code>dialog:modal</code> default; a modal dialog in the top layer then laid out in document flow — rendered at the top of the page (\"ghost\" artifact) and scrolled with the page instead of staying centered. The explicit <code>fixed</code> is defensive against any future author rule overriding the UA default." },
        { label: 'li', content: "Image preview no longer scales the full-viewport mask: the enter scale (<code>scale(0.97)</code> → <code>1</code>) moved from the dialog element (which previously scaled the dedicated backdrop layer together with its content) to a new <code>.wui-image-preview-content</code> wrapper that contains the stage and the glass controls. The dialog and mask stay transform-free, so the mask fades in without scaling while the content still performs its subtle zoom-in. The dialog still never fades its own opacity, so glass control blur stays continuous." }
        ]
      }
      ]
    },
    { label: 'li', content: "e063e5e: Split dialog-level motion into dedicated tokens: <code>--wui-duration-dialog-enter: 320ms</code>, <code>--wui-duration-dialog-exit: 260ms</code>, and <code>--wui-ease-dialog: cubic-bezier(0.2, 0, 0, 1)</code>. Dialog and image-preview enter/exit motion now use these tokens so the entrance no longer collapses into the first ~100ms; reduced-motion stays at 0ms." },
    { label: 'li', content: "e063e5e: Add configurable dialog surface padding, title spacing, content spacing, and footer button spacing CSS custom properties." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "e063e5e: Tune the pressed handle shadow down: <code>web-ui-switch</code> and <code>web-ui-segmented</code> keep the pressed-glass structure (solid white at rest, frosted glass + 1.5x scale + lifted shadow while pressed/dragging) but the press shadow is now slightly lighter and tighter — lower opacity on all three layers and smaller blur radii/spread. The direct-value <code>box-shadow</code> (no CSS custom-property indirection) is unchanged, so iOS Safari still transitions it reliably." },
      { label: 'p', content: "Roll the two-layer glass blur out to every component that fades opacity on or around a frosted-glass surface. The root cause is the same as the dialog fix: an element with <code>opacity &lt; 1</code> becomes a backdrop root, which disables the <code>backdrop-filter</code> of any glass element inside it (or around it) during the transition, so the blur pops in/out at the opacity endpoints instead of fading. The glass surface itself no longer transitions its own opacity and no longer carries <code>backdrop-filter</code>; a dedicated blur layer (<code>.wui-floating-panel-blur</code>, <code>.toast-blur</code>) and a content layer (<code>.wui-floating-panel-surface</code>, <code>.toast-surface</code>) each fade their own opacity, which keeps the blur continuous on every engine." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Floating panels (popover, tooltip, select, autocomplete, dropdown, context-menu via the shared menu portal): the shared <code>.wui-floating-panel</code> keeps <code>opacity: 1</code> and only animates <code>transform</code>; the two-layer structure is built by the shared overlay portal and the menu portal, so every consumer is covered." },
        { label: 'li', content: "Toast: <code>.toast</code> keeps <code>opacity: 1</code> and only animates <code>transform</code>; content and blur fade through <code>.toast-surface</code> / <code>.toast-blur</code>." },
        { label: 'li', content: "Image preview: the fullscreen dialog no longer fades its own opacity (that made the dialog a backdrop root and disabled the glass toolbar/counter blur). The scrim fades through a dedicated <code>.wui-image-preview-backdrop</code> layer, the image stage fades through <code>.wui-image-preview-surface</code>, and the glass controls (toolbar, counter, close, nav) each fade their own opacity — the counter/toolbar are the glass elements themselves, and the glass close/nav buttons fade through a newly exposed <code>part=\"button\"</code> on <code>web-ui-button</code>'s native button (the element that actually carries <code>backdrop-filter</code>), so no control sits inside an opacity-fading ancestor and their blur stays continuous while the fade-in/out is restored." },
        { label: 'li', content: "Audit-only (no discrete blur switch, left unchanged): drawer (its dialog only animates transform), and the always-on glass surfaces in avatar, button, button-group, input, input-number, textarea, layout, slider, switch, segmented and theme." }
        ]
      },
      { label: 'p', content: "Reduced-motion behavior is preserved: blur/content layers keep a short opacity fade under <code>prefers-reduced-motion: reduce</code>, and the floating-panel family keeps the same enter/exit durations from the float tokens." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "e063e5e: Finish the two-layer glass migration: the frosted-glass <strong>background</strong> now lives on the surface layer, not on the panel itself." },
      { label: 'p', content: "Root cause (same family as the earlier blur-switch fix, confirmed by pixel sampling): the blur child layer's <code>backdrop-filter</code> samples everything painted behind it. When the panel still drew its own semi-transparent glass background, the blur layer sampled that background <em>plus</em> the page, <code>brightness(1.06)</code> brightened the composite, and the panel background never faded with the surface — leaving a white afterimage while closing. The design already required the background to live on the surface layer; this change actually moves it there:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>.wui-floating-panel</code> is now guaranteed <code>background: transparent</code>; <code>.wui-floating-panel-surface</code> carries the glass background (and <code>border-radius: inherit</code>) and fades it together with the content." },
        { label: 'li', content: "The shared overlay portal and the menu portal move the <code>wui-glass</code> class from the panel onto the surface at build time; the local (non-portal) templates of popover, tooltip, select and autocomplete do the same. Per-component background/padding rules move to the surface-scoped selector so the visual is equivalent (background covers the same rounded rect, including padding). The surface also neutralizes the <code>backdrop-filter</code> that <code>wui-glass</code> carries (same mechanism as <code>.wui-dialog-surface</code>), so the blur comes only from the blur layer instead of stacking twice and over-brightening; the panel shadow config (<code>--wui-shadow-panel</code>) is bridged on the surface scope, where the glass element can actually consume it." },
        { label: 'li', content: "Toast moves its background and padding from <code>.toast</code> to <code>.toast-surface</code>; <code>.toast</code> is transparent." },
        { label: 'li', content: "Dialog and image-preview were already correctly migrated (transparent dialog, background on <code>.wui-dialog-body</code> inside the surface; scrim/surface layers in image-preview) and are now covered by regression assertions." }
        ]
      },
      { label: 'p', content: "Tune the pressed handle shadow down to the final values (<code>web-ui-switch</code>: <code>0 1px 6px rgb(0 0 0 / 0.2)</code>, <code>0 6px 16px rgb(0 0 0 / 0.16)</code>, <code>0 14px 28px rgb(0 0 0 / 0.1)</code>; <code>web-ui-segmented</code>: <code>0 0 1px rgb(0 0 0 / 0.1)</code>, <code>0 5px 14px rgb(0 0 0 / 0.16)</code>, <code>0 12px 28px rgb(0 0 0 / 0.1)</code>). The direct-value <code>box-shadow</code> (no custom-property indirection) is unchanged, so iOS Safari still transitions it reliably." },
      { label: 'p', content: "Make carousel swipe thresholds stage-relative and robust for fast flicks: the distance threshold is now 15% of the stage width (rounded) instead of a fixed 48px, so the gesture feels consistent across screen sizes. A fast flick whose sampled velocity reaches 320px/s still commits even below that distance, and a new fallback commits when the direction is clear (a small distance) and the sampled velocity is at least half the speed threshold — real touch event streams can be merged/delayed (measured in CDP: a 40px flick spread over ~167ms is under-sampled to ~164px/s by the 100ms velocity window), which previously made quick flicks bounce back. Slow drags keep the strict distance rule. The shared drag-gesture velocity guard also stops zeroing out ultra-short flicks under 8ms." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "e063e5e: Revert the two-layer frosted-glass structure back to a single layer with interpolated <code>backdrop-filter</code>." },
      { label: 'p', content: "Dual-engine measurement (Chrome 153 + Safari 26.5) showed that <code>backdrop-filter</code> interpolates smoothly between <code>blur(0px)</code> and <code>blur(4px)</code>; the original \"hard blur jump\" was caused by animating <code>none</code> ↔ <code>blur(...)</code>, which cannot interpolate — not by <code>backdrop-filter</code> being non-animatable. The two-layer workaround (separate blur layer + content surface) introduced its own layer-interaction problems (brightened white cast, closing afterimage, double blur, shadow inheritance scoping), so it is removed:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Floating panels (popover/tooltip/select/autocomplete/menu portal): <code>wui-glass</code> returns to the panel itself, which carries the glass background, shadow and <code>backdrop-filter</code>. Open/close now transitions <code>opacity</code> + <code>backdrop-filter</code> (<code>blur(0px)</code> ↔ <code>blur(4px)</code>) + <code>transform</code> together; <code>.wui-floating-panel-blur</code> / <code>.wui-floating-panel-surface</code> and the portal/menu-portal DOM construction and class-moving logic are deleted." },
        { label: 'li', content: "Dialog: the glass card (<code>.wui-dialog-body</code>) fades its own opacity and interpolates its own blur; the dialog element itself still avoids an opacity transition so descendant blur is never disabled by a backdrop root." },
        { label: 'li', content: "Toast: <code>.toast</code> carries the glass and transitions <code>opacity</code> + <code>backdrop-filter</code> + <code>transform</code>; <code>.toast-blur</code> / <code>.toast-surface</code> are removed." },
        { label: 'li', content: "Reduced motion shortens the durations but keeps the <code>backdrop-filter</code> interpolation (reducing motion should not reintroduce a hard blur switch)." },
        { label: 'li', content: "Image preview keeps its dedicated full-viewport structure (constant-opacity dialog + separate backdrop/surface layers and per-control opacity fades): the whole-dialog fade would move its <code>backdrop-filter</code> sampling source from dialog content to the page texture mid-transition, so it is intentionally out of scope of this single-layer change." }
        ]
      }
      ]
    },
    { label: 'li', content: "e063e5e: Swap the <code>imagePreview()</code> reset-zoom glyph from <code>lucide:refresh-cw</code> to <code>radix-icons:reset</code>, so the toolbar button reads as \"back to 1x\" rather than \"reload\". The matching <code>radixIconsReset</code> glyph is now exported from <code>@greypan/web-ui/icons</code>." },
    { label: 'li', content: "e063e5e: Fix iOS Safari compatibility for page backgrounds, dialog-based overlay motion, drawer close button placement, touch drag interactions, and pointer-triggered focus rings. Native dialog overlays now keep their open/close transitions on Safari, switch/segmented/slider drag gestures remain responsive on touch, and pointer-clicked controls no longer show a keyboard-style focus ring." },
    { label: 'li', content: "e063e5e: Suppress Safari's UA focus ring on native dialog surfaces for dialog, drawer, and image-preview. The modal panel itself is not a focusable control, so keyboard focus remains on the interactive controls inside the panel." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "e063e5e: Fix slider and segmented drag interruptions under touch input. On touch, the browser implicitly captures the pointer to the hit element (slider thumb / segmented-trigger content), and the drag gesture then transfers capture to the drag surface with <code>setPointerCapture</code>; the hit element's <code>lostpointercapture</code> was being misread as a cancel, freezing the drag after the first step. The gesture now only cancels when the capture surface itself loses capture, ignoring the implicit-capture handoff. The <code>touch-action: none</code> host declarations and the hit-test-chain <code>touchmove</code> guard are kept as defense in depth." },
      { label: 'p', content: "Fix a double rebound on Safari mobile when a draggable drawer springs back after a drag. Safari computes a CSS transition's before-change style without trusting the WAAPI fill animation's override, so the computed transform change from the drag residual (e.g. <code>translateX(-64px)</code>) to <code>0</code> at the rebound <code>onfinish</code> boundary is sampled as a transition's from-value and replays a second spring. Rewriting or clearing the inline styles cannot avoid that non-zero-to-zero sample, and deferring the <code>is-dragging</code> removal to a later animation frame is unreliable because the frame can land in the same rendering tick. The rebound finish now, while the <code>is-dragging</code> class still suppresses <code>transform</code>/<code>backdrop</code> transitions, rewrites the inline styles to the open-state terminal values and forces a synchronous style recalculation (reading <code>offsetWidth</code>) so the new <code>0</code> value is baked into Safari's transition reference, then removes <code>is-dragging</code> in the same task — the suppression is lifted only after the reference is already <code>0</code>, so no transition can start." }
      ]
    },
    { label: 'li', content: "e063e5e: Render the layout mobile sidebar with built-in drawer chrome and map sidebar width/radius to drawer tokens." },
    { label: 'li', content: "e063e5e: Clip the layout header glow horizontally so its decorative scale/translate no longer creates horizontal page scroll on narrow viewports." },
    { label: 'li', content: "e063e5e: Adapt drag controls, dialogs, toasts, and form inputs for small and touch viewports." },
    { label: 'li', content: "e063e5e: Keep the mobile layout sidebar toggle aligned to the first header row when a header slot expands to multiple rows." },
    { label: 'li', content: "e063e5e: Slow the default full-motion overlay enter/exit durations from 180ms/140ms to 280ms/200ms. The change covers dialog, image-preview, toast, and shared floating-panel overlay motion; reduced-motion tokens stay at 0ms." },
    { label: 'li', content: "e063e5e: Add a shared overlay lifecycle transaction so frame callbacks are invalidated on same-frame close, disconnect, and reconfigure. Temporary disconnects can resume safely on reconnect." },
    { label: 'li', content: "e063e5e: Add stale async positioning generation guards so late floating-ui promises cannot overwrite newer overlay coordinates or width styles." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "e063e5e: Revert the <code>web-ui-theme</code> host to <code>display: contents</code> and stop painting <code>--wui-color-page</code> on it. The block box + background painting were added in this same un-released batch as a workaround for an iOS Safari token-inheritance concern; the user verified on-device that <code>contents</code> and <code>block</code> behave identically, so the host is back to drawing nothing and the embedding application keeps full control of the surface behind the themed subtree. Custom properties still inherit into slotted content (<code>display</code> does not affect inherited custom properties)." },
      { label: 'p', content: "Fix the image-preview <code>swipe</code> carousel to a single-track layout. Previously the current image and the adjacent image were positioned independently with their own transforms, so on images with different aspect ratios they overlapped and misaligned. Now the current image and its neighbors sit in equal-size slides on one track: the stage clips the overflow, the whole track translates with the finger, and the adjacent image enters and leaves on the same baseline at the same size (with <code>loop</code> on, the wrap-around neighbor is always present beside the current image, so a drag near the end keeps following a real adjacent image instead of running into empty track). Releasing past the threshold slides the next image in; below it the strip bounces back, and at the non-looping bounds it bounces back instead of crossing the boundary." },
      { label: 'p', content: "Fix frosted-glass handles on <code>web-ui-switch</code>, <code>web-ui-slider</code> and <code>web-ui-segmented</code> flashing their blur on long-press/drag. <code>backdrop-filter</code> was already always-on, but the background still switched from opaque white to translucent glass at press — that is the property change that makes Chrome re-rasterize the backdrop region as a hard flash. The glass surface composition (<code>backdrop-filter</code> + background) is now identical across resting, pressed and dragging states; only the transform and the lifted shadow change. A dialog's own glass surface stays stable too because the handle no longer suddenly blurs the content behind it." },
      { label: 'p', content: "Deepen the pressed/dragging handle shadow on <code>web-ui-switch</code> (<code>0 2px 10px rgb(0 0 0 / 0.28), 0 10px 28px rgb(0 0 0 / 0.24), 0 18px 44px rgb(0 0 0 / 0.16)</code>) and <code>web-ui-segmented</code> (<code>0 0 1px rgb(0 0 0 / 0.12), 0 6px 18px rgb(0 0 0 / 0.22), 0 16px 36px rgb(0 0 0 / 0.16)</code>) for a stronger lifted-glass feel." },
      { label: 'p', content: "Fix draggable-drawer open/close transitions being lost after rapid taps on the drag handle. Two independent causes are addressed. First, every tap finishes through the rebound path, which wrote a <code>translateX(0px)</code> inline style (kept deliberately for the Safari double-rebound fix); that zero-value inline later overrode the closed-state CSS transform, so closing via button/backdrop/Escape stopped transitioning and reopens had no animation either. The no-animation rebound path now clears the inline drag styles instead of leaving a zero transform behind, and a close that starts while no drag animation is in flight clears any leftover drag inline styles before the exit transition is computed. Second, the native dialog <code>close</code> event is dispatched asynchronously, so a fast close→reopen can deliver the previous close session's stale <code>close</code> event after the reopen; the overlay presence now flags its own <code>dialog.close()</code>, and <code>web-ui-drawer</code> / <code>web-ui-dialog</code> swallow that event (stale or not) instead of treating it as an external close that immediately closes the freshly reopened dialog. Genuine external closes (for example a form with <code>method=\"dialog\"</code>) still close normally." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "e063e5e: Fix the pressed/dragging handle shadow on <code>web-ui-switch</code> and <code>web-ui-segmented</code> not showing on iOS. The previous round drove the pressed <code>box-shadow</code> through a CSS custom property (<code>--wui-internal-glass-shadow</code> / a shadow-list variable); iOS Safari does not transition a property when only its custom-property input changes and can skip the discrete <code>var()</code> switch entirely, so the pressed look \"reverted\" on device. The pressed state now writes the <code>box-shadow</code> value directly in the class (regular property change, reliably transitioned everywhere), keeping the glass inset highlight, and the shadows are deepened further for a clearly lifted look: switch <code>0 2px 12px rgb(0 0 0 / 0.32), 0 14px 36px rgb(0 0 0 / 0.28), 0 28px 64px rgb(0 0 0 / 0.2)</code>, segmented <code>0 0 1px rgb(0 0 0 / 0.16), 0 10px 28px rgb(0 0 0 / 0.28), 0 24px 56px rgb(0 0 0 / 0.2)</code>." },
      { label: 'p', content: "Fix image-preview carousel neighbors \"bleeding through\" while zoomed. The swipe track keeps the two neighbors rendered beside the current image, but the shared per-image transform previously applied the zoom scale and the pan offsets to every slide, so at scale > 1 the adjacent images were scaled up too and their edges entered the viewport. Now the zoom scale (and, while zoomed, the pan offsets) apply only to the current image; the neighbor slides stay at 1x and frozen in their track positions, so panning while zoomed never brings them into the viewport. At 1x the neighbors still share the vertical pan to stay aligned during diagonal swipes, and swipe behavior is unchanged." }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "e063e5e: Restore the <code>web-ui-switch</code>, <code>web-ui-slider</code> and <code>web-ui-segmented</code> handles to their original pressed-glass structure: the resting handle is a solid white thumb / indicator, and pressing or dragging switches it to frosted glass — backdrop blur + translucent glass background + 1.5x scale + a clearly lifted shadow. The previous round made the glass composition constant (backdrop blur always on, background never changing), which hid the press transition on iOS; that was the wrong target and is reverted. The iOS-safe pressed <code>box-shadow</code> from the last round is kept: the class writes the shadow value directly (no CSS custom-property indirection, which iOS Safari does not transition)." },
      { label: 'p', content: "Make <code>web-ui-dialog</code>'s background blur continuous across every state switch. The dialog element's own <code>opacity</code> transition made the <code>dialog</code> a backdrop root while <code>opacity &lt; 1</code>, which completely disabled the glass body's <code>backdrop-filter</code> during the transition — the blur popped in/out at the opacity endpoints instead of fading (verified in a real browser: an ancestor with <code>opacity</code> or <code>filter</code> disables descendant backdrop-filter, while <code>transform</code> and the element's own opacity fade do not). The dialog now keeps <code>opacity: 1</code> on the element (only the transform scale animates there), fades the content through a <code>.wui-dialog-surface</code> wrapper, and blurs through a dedicated <code>.wui-dialog-blur</code> layer whose own opacity transition fades the blur smoothly; the body no longer carries its own <code>backdrop-filter</code>, so there is no double blur at rest." },
      { label: 'p', content: "Lock the image-preview <code>swipe</code> gesture to horizontal at 1x. While the swipe gesture applies, the vertical delta is now ignored entirely — no vertical pan and no vertical follow (previously a 1x swipe drag still panned vertically). Zoomed-in dragging is unchanged and pans on both axes." }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-57', content: "Unreleased" },
  { label: 'h3', id: 'section-58', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "Add <code>imagePreview()</code>, an imperative full-viewport image preview. It has no declarative tag contract: it is opened through <code>imagePreview(options)</code>, mounted into the nearest <code>web-ui-theme</code> overlay container (or an explicit <code>container</code>) and driven through the returned handle (<code>index</code>, <code>scale</code>, <code>images</code>, <code>closed</code>, <code>next</code>, <code>prev</code>, <code>goTo</code>, <code>zoomIn</code>, <code>zoomOut</code>, <code>resetZoom</code>, <code>close</code>). It shares the <code>native-dialog-presence</code> and <code>scroll-lock</code> plugins with <code>&lt;web-ui-dialog></code> rather than wrapping that component, because the preview needs a dialog that fills the viewport itself with its own pointer interaction." },
    { label: 'li', content: "Add presentation options to <code>imagePreview()</code>: <code>nav</code>, <code>toolbar</code>, <code>closable</code>, <code>indicator</code>, <code>swipe</code>, <code>noScrollLock</code> and <code>noBackdropClose</code>. Every presentation option defaults to <code>false</code>, so a preview now renders only the image itself unless the consumer opts in. <code>noScrollLock</code> and <code>noBackdropClose</code> mirror the same-named <code>&lt;web-ui-dialog></code> properties in naming and semantics." },
    { label: 'li', content: "Anchor every <code>imagePreview()</code> zoom to a point that stays visually fixed, and add built-in pinch-to-zoom. The wheel now keeps the content under the cursor still and a pinch keeps the midpoint between the two fingers still, while the toolbar buttons, keyboard shortcuts and double-click keep expanding around the viewport center. Pinch has no option because the stage already owns pointer interaction: the first finger still drives pan/swipe, the second finger both starts the pinch and aborts any in-flight pan or swipe, and the compatibility <code>click</code> that mixed input may synthesize afterwards is swallowed instead of closing the preview. The pinch handling itself lives in the internal shared gesture layer (<code>attachPinchGesture</code>, not part of the package's export map) and reports only geometry — the distance ratio plus the midpoint and its delta — leaving the mapping to scale and translation to the component." },
    { label: 'li', content: "Let <code>imagePreview()</code> be dragged to pan in any direction at any zoom level, and make that the stage's default drag behaviour. Previously a drag only did something while zoomed in, and the offsets were clamped to how far the image overflowed the stage — which is zero at 1x. The bound is now half the absolute size difference between the image and the stage: zoomed in it still reveals the cropped edges, at 1x it moves the image around inside the viewport, and either way the image can never be dragged out of the viewport. Holding the mouse button down and resting a single finger take the same Pointer path, so desktop and mobile behave identically. <code>swipe</code> is narrowed to own the horizontal axis only when it actually applies (1x, more than one image); everything else pans, direction free. Because panning also works at 1x, <code>resetZoom()</code> now has something to reset when the image is merely displaced, so the toolbar reset button is enabled whenever the image is zoomed <em>or</em> panned rather than only above 1x." },
    { label: 'li', content: "Expose drawer section padding tokens: <code>--wui-drawer-header-padding</code> (default <code>16px 20px</code>), <code>--wui-drawer-content-padding</code> (default <code>20px</code>), <code>--wui-drawer-footer-padding</code> (default <code>16px 20px</code>). The content padding token also drives the drag bar visual center via <code>calc(var(--wui-drawer-content-padding) / 2)</code>, so changing content padding automatically repositions the drag bar." }
    ]
  },
  { label: 'h3', id: 'section-59', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "Fix <code>imagePreview()</code> closing when the user clicked the image. As soon as the stage held pointer capture, the compatibility <code>click</code> event was retargeted to the stage and treated as a backdrop click; the same retargeting also broke double-click zoom while zoomed. Pan and swipe now share <code>attachDragGesture</code>, which defers pointer capture until the drag threshold is crossed, and backdrop detection relies on the (un-retargeted) <code>pointerdown</code> origin instead of the <code>click</code> target. That origin is recorded only for the primary left-button pointer and ignored for non-pointer clicks (keyboard activation, programmatic <code>.click()</code>), so a secondary touch or a synthetic click cannot close the preview by accident." },
    { label: 'li', content: "Constrain <code>imagePreview()</code> images to the viewport at 1x. The stage relied on an implicit grid row sized by its content, so <code>max-width</code> / <code>max-height: 100%</code> had no definite reference and large images were clipped by the viewport instead of contained inside it." },
    { label: 'li', content: "Align the <code>imagePreview()</code> toolbar padding with the other glass pills (<code>6px 10px</code> → <code>6px</code>)." },
    { label: 'li', content: "Use the <code>radix-icons:reset</code> glyph for the <code>imagePreview()</code> reset-zoom button instead of <code>lucide:refresh-cw</code>, so the affordance reads as \"back to 1x\" rather than \"reload\"." },
    { label: 'li', content: "Reduce drawer drag zone default from <code>32px</code> to <code>20px</code> (<code>--wui-drawer-drag-zone-size</code>). Consumer can override back to 32px+ if needed." },
    { label: 'li', content: "Reduce slider thumb default dimensions: width <code>30px</code> → <code>24px</code>, height <code>20px</code> → <code>18px</code>. Add <code>--wui-slider-thumb-radius</code> token (default <code>8px</code>) replacing the auto-derived pill shape. Glass corner radius now uses this token instead of <code>calc(min(width, height) / 2)</code>." }
    ]
  },
  { label: 'h2', id: 'section-60', content: "6.1.0" },
  { label: 'h3', id: 'section-61', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "d0a9f32: Expand drawer draggable drag zone and bar, and expose their sizes as public tokens." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Drag hit zone grows from 24px to 32px; the drag bar capsule grows from 4×48px to 4×56px and is centered 10px from the drawer's inner edge, for all four placements (<code>right</code> / <code>left</code> / <code>top</code> / <code>bottom</code>)." },
        { label: 'li', content: "New public tokens: <code>--wui-drawer-drag-zone-size</code> (default <code>32px</code>), <code>--wui-drawer-drag-bar-thickness</code> (default <code>4px</code>), <code>--wui-drawer-drag-bar-length</code> (default <code>56px</code>). The hit zone and visual bar position are independent so a wider zone does not move the capsule into drawer content." },
        { label: 'li', content: "Drawer inset, close threshold, controlled write-back and reduced-motion behavior are unchanged." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "d0a9f32: Align observable token fallbacks with the theme definitions." },
      { label: 'p', content: "These fallbacks are observable when host theme variables are absent, so the value changes ship separately from the internal consolidation patch:" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Dialog backdrop: <code>rgb(0 0 0 / 0.1)</code> → <code>rgb(0 0 0 / 0.12)</code>" },
        { label: 'li', content: "Dialog surface overlay: <code>rgb(246 246 246 / 0.88)</code> → <code>rgb(246 246 246 / 0.82)</code>" },
        { label: 'li', content: "Text tertiary (input/textarea clear color): <code>rgb(27 27 27 / 0.35)</code> → <code>color-mix(in srgb, var(--wui-color-text) 35%, transparent)</code>" },
        { label: 'li', content: "Glass border: <code>rgb(51 51 51 / 0.12)</code> → <code>transparent</code>" },
        { label: 'li', content: "Glass shade: <code>rgb(0 0 0 / 0.2)</code> → <code>rgb(0 0 0 / 0.06)</code>" }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "d0a9f32: Remove the invalid <code>./icons/*</code> subpath export." },
      { label: 'p', content: "The <code>./icons/*</code> targets never existed in <code>dist/</code>, so there was no resolvable import path and no working consumer could depend on it. It still ships as minor because contract-diff classifies any export removal as a breaking candidate, and the semver decision for a removal must be carried by this file rather than by the internal-consolidation patch changeset." }
      ]
    },
    { label: 'li', content: "d0a9f32: Add semantic radius tokens <code>--wui-radius-control</code> (pill), <code>--wui-radius-menu</code> (18px) and <code>--wui-radius-overlay</code> (28px) to <code>&lt;web-ui-theme></code>; migrate control/menu/overlay components to them. <code>--wui-drawer-radius</code> and <code>--wui-layout-sidebar-radius</code> now default to <code>--wui-radius-overlay</code> (sidebar default 24px → 28px; dialog 32px → 28px; menu panels, textarea and toast 20px → 18px). Non-pill glass surfaces drive <code>--wui-glass-corner-radius</code> from their semantic radius so border lighting follows token overrides; pill controls keep a finite physical-size-derived corner. Checkbox, avatar square and empty icon shapes stay component-internal (6/12/16px)." }
    ]
  },
  { label: 'h3', id: 'section-62', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "d0a9f32: Fix focus ring transitions for input, textarea, autocomplete and input-number. The ring now animates consistently in normal and borderless variants on a dedicated pseudo-element layer." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "d0a9f32: Consolidate shared component architecture and align semantic defaults." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Extract menu behavior, combobox lifecycle, open-change dispatch and form-association helpers." },
        { label: 'li', content: "Clean up portal nodes when hosts are removed and centralize floating placements." }
        ]
      },
      { label: 'p', content: "Observable token fallback alignment and the invalid <code>./icons/*</code> export removal are tracked in separate minor changesets." }
      ]
    },
    { label: 'li', content: "Updated dependencies [d0a9f32]" },
    { label: 'li', content: "Updated dependencies [d0a9f32]" },
    { label: 'li', content: "Updated dependencies [d0a9f32]" },
    { label: 'li', content: "Updated dependencies [d0a9f32]" },
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
  { label: 'h2', id: 'section-63', content: "6.0.0" },
  { label: 'h3', id: 'section-64', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: style(web-ui): unify sidebar overlay token" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Remove <code>--wui-layout-sidebar-bg</code>; layout sidebars use <code>--wui-color-surface-overlay</code>." },
        { label: 'li', content: "Set the dark overlay surface to <code>rgb(32 34 34 / 0.9)</code>, compositing to about <code>#202223</code> over the page background." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-65', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: Add <code>--wui-drawer-inset</code> token to control drawer floating-card viewport inset." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "New public token <code>--wui-drawer-inset</code> (default <code>8px</code>, non-headless drawers). Set to <code>0</code> for edge-to-edge geometry, typically paired with <code>--wui-drawer-radius: 0</code>." },
        { label: 'li', content: "The token is registered via <code>@property</code> as <code>&lt;length></code>, so a unitless <code>0</code> from consumers is normalized to <code>0px</code> instead of silently breaking the closed-state <code>calc(100% + 0)</code> transform (exit animation would be dropped)." },
        { label: 'li', content: "The inset is no longer a hard-coded internal value; all other floating-card behavior (drag-close distance math, controlled hover end-state) reads the same variable and follows the token automatically." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: Add Layout desktop sidebar drag-to-resize and Drawer drag-to-close features." },
      { label: 'p', content: "<strong>Layout (<code>&lt;web-ui-layout></code>):</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "New props: <code>sidebar-resizable</code>, <code>sidebar-min-width</code>, <code>sidebar-max-width</code>" },
        { label: 'li', content: "New event: <code>sidebar-width-change</code>" },
        { label: 'li', content: "Accent resize handle on right edge (hidden when collapsed); keyboard-operable (WAI-ARIA splitter: arrows step, Home/End to bounds, Enter commits, Escape reverts)" },
        { label: 'li', content: "Real-time width follow with clamping; emits on release" },
        { label: 'li', content: "Built-in hard cap: the sidebar can never exceed half the viewport width, even if <code>sidebar-max-width</code> is configured higher" }
        ]
      },
      { label: 'p', content: "<strong>Drawer (<code>&lt;web-ui-drawer></code>):</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "New prop: <code>draggable</code> (default <code>false</code>)" },
        { label: 'li', content: "Gray capsule drag bar on inner edge (placement-aware)" },
        { label: 'li', content: "Real-time follow + spring snap on release" },
        { label: 'li', content: "Closes when displacement > 1/3 of size OR flick > 500px/s; otherwise rebounds" },
        { label: 'li', content: "Native dialog renders nothing when closed ⇒ drag-to-open NOT supported" },
        { label: 'li', content: "Spring via WAAPI (no new <code>--wui-*</code> tokens)" },
        { label: 'li', content: "<code>prefers-reduced-motion</code> snaps instantly" },
        { label: 'li', content: "<code>controlled</code> mode: user close actions only emit <code>open-change(false)</code> with writeback await + timeout rebound" },
        { label: 'li', content: "Declarative nested drawer stacking: open drawers below the top layer automatically scale down (0.95^depth) and shift towards the inner side to expose card edges; Escape and backdrop clicks dismiss only the topmost layer" }
        ]
      },
      { label: 'p', content: "<strong>Drawer visual language (breaking visual, no API change):</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Non-headless drawers now render as floating rounded cards inset 8px from all viewport edges; elastic drag distances read as margin changes instead of gaps" },
        { label: 'li', content: "New token <code>--wui-drawer-radius</code> (default <code>28px</code>); closed-state transforms compensate the inset so the drawer always exits the viewport fully" },
        { label: 'li', content: "<code>headless</code> geometry unchanged (consumer-owned visuals)" }
        ]
      },
      { label: 'p', content: "<strong>Glass variable isolation (bug fix):</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>.wui-glass</code> now declares its own <code>--wui-internal-glass-shadow</code> / <code>--wui-internal-glass-focus-ring</code> defaults, cutting the flattened-tree inheritance path from ancestor glass containers (drawer/dialog bodies, overlay panels) into slotted content. Previously a glass-variant button or input inside a drawer/dialog silently picked up the huge overlay shadow instead of the soft glass fallback." },
        { label: 'li', content: "Headless drawers explicitly zero <code>--wui-internal-drawer-inset</code> on their dialog: a headless drawer nested inside a non-headless one used to inherit the 8px inset, breaking the drag-close distance / controlled hover end-state math for edge-to-edge geometry." },
        { label: 'li', content: "<strong>Breaking visual:</strong> <code>&lt;web-ui-back-top></code>'s default glass button now uses the glass fallback shadow (<code>--wui-shadow-glass</code>) instead of the small panel shadow (<code>--wui-shadow-panel</code>). The old <code>:host</code>-level <code>--wui-internal-glass-shadow</code> config could no longer reach the inner glass element under the new isolation and was removed; pass <code>--wui-shadow-glass</code> on the element if the previous look is required." }
        ]
      },
      { label: 'p', content: "<strong>Controlled mode rename (was <code>request-only</code>) + dialog support:</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>web-ui-drawer</code>: prop <code>request-only</code> (attribute) / <code>requestOnly</code> (property) is renamed to <code>controlled</code> / <code>controlled</code> (same semantics — user close actions only emit <code>open-change(false)</code>; the consumer writes <code>open</code> back; programmatic <code>show()</code>/<code>close()</code> stay direct). No alias is kept." },
        { label: 'li', content: "<code>web-ui-dialog</code>: new <code>controlled</code> prop with the same contract (Escape and backdrop only request; native dialog closure while controlled is restored to the open state and re-emits the request)." }
        ]
      },
      { label: 'p', content: "<strong>Switch, Segmented &amp; Slider Gesture Enhancements (<code>&lt;web-ui-switch></code>, <code>&lt;web-ui-segmented></code>, <code>&lt;web-ui-slider></code>):</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>Switch</code>: Full-track draggable gesture with real-time capsule glass thumb following, 6px intent deadzone against vertical scrolling, <code>scale(1.2)</code> press/drag micro-interaction, toggle commit on >50% travel (12px total travel) or flick velocity (>300px/s), with instant tap toggling preserved." },
        { label: 'li', content: "<code>Segmented</code>: Active indicator smooth drag tracking (initiated by pressing on the currently active trigger), <code>scale(1.2)</code> press/drag micro-interaction with glass visual, snap to nearest non-disabled trigger on release, and flick gesture support." },
        { label: 'li', content: "<code>Slider</code>: Refactored internal pointer handling to adopt unified <code>shared/gesture/</code> (<code>attachDragGesture</code> + <code>clamp</code>), with <code>scale(1.2)</code> drag micro-interaction and translucent glass thumb when dragging." },
        { label: 'li', content: "<code>Gesture Utilities</code>: Added <code>snapToNearest</code> and <code>normalizeProgress</code> helper functions in <code>packages/web-ui/src/shared/gesture/physics.ts</code>." }
        ]
      }
      ]
    },
    { label: 'li', content: "c310d9f: feat(autocomplete): add allow-custom-value for explicit custom value commits" },
    { label: 'li', content: "c310d9f: feat(autocomplete): add empty state slot" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: feat(web-ui): redefine borderless inputs as ghost form with normal-variant focus ring" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>borderless</code> on input, textarea, and autocomplete now removes only surface decoration (border, glass background/blur, shadow, and glass outline ring) while keeping padding, height metrics, and the focus ring." },
        { label: 'li', content: "The borderless focus ring is the same double box-shadow as the normal variant (1px inset accent + focus-ring halo, 200ms transition) and shows on mouse and programmatic focus as well as keyboard focus; the previous <code>:focus-visible</code>-gated outline is removed." },
        { label: 'li', content: "Compatibility note: consumers that suppressed the focus ring with <code>[--wui-color-focus-ring:transparent]</code> now only hide the outer halo — the 1px inset accent line remains visible on focus." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: Redesign collapse as a single element with two slots: trigger via the default slot, content via <code>slot=\"content\"</code>. The <code>web-ui-collapse-trigger</code> and <code>web-ui-collapse-content</code> elements are removed before first release." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Interaction semantics come from the slotted trigger element (native <code>&lt;button></code>, <code>&lt;web-ui-button></code>, etc.); the collapse writes <code>aria-expanded</code>/<code>aria-controls</code>/<code>aria-disabled</code> onto the first assigned trigger element. A plain-text trigger has no keyboard/focus semantics (documented limitation)." },
        { label: 'li', content: "Strictly controlled <code>open</code> contract unchanged: <code>open-change</code> (<code>CustomEvent&lt;{ open: boolean }></code>) fires only on user-originated toggles; <code>show()</code>/<code>close()</code>/<code>toggle()</code> and programmatic writes never emit." },
        { label: 'li', content: "Height/width animation via CSS grid <code>0fr ↔ 1fr</code> transition — content-adaptive, zero JS measurement, interruptible (grid-transition selection carried over from the collapse design iteration; API shape superseded by the single-element form). <code>horizontal</code> switches the axis (default vertical)." },
        { label: 'li', content: "Three-state closed semantics; consumer light DOM is never moved: default closed state sets <code>hidden</code> on the internal content container, <code>keep-mounted</code> (now on the root element) keeps content measurable inside the collapsed track with <code>inert</code> (scroll position preserved)." },
        { label: 'li', content: "Headless kernel: the component carries no visual styling beyond the animation structure; trigger and content typography come from the consumer." },
        { label: 'li', content: "Unchanged tokens <code>--wui-duration-collapse-enter: 200ms</code> / <code>--wui-duration-collapse-exit: 160ms</code>, included in the reduced-motion zeroing lists." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: feat(overlay): support dropdown size variables in portal and keep borderless keyboard focus rings" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Portal panels now mirror <code>--wui-overlay-min-width</code>, <code>--wui-autocomplete-max-width</code>/<code>--wui-autocomplete-max-height</code> and <code>--wui-select-max-width</code>/<code>--wui-select-max-height</code> from the host at portal creation." },
        { label: 'li', content: "Select/Autocomplete dropdown default scroll max-height reduced from 320px to 200px; override via <code>--wui-autocomplete-max-height</code> / <code>--wui-select-max-height</code>." },
        { label: 'li', content: "Borderless <code>input</code>, <code>textarea</code> and <code>autocomplete</code> keep a keyboard focus ring via <code>:focus-visible</code>; pointer focus stays borderless." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: feat(layout): add mobile toggle inset variable and glass variant" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "The mobile header toggle renders as a glass button and gains an 8px left inset by default, so it no longer sits flush against the viewport edge." },
        { label: 'li', content: "Consumers can align the toggle with their own header padding via <code>--wui-layout-mobile-toggle-inset</code>." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-66', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c310d9f: fix(autocomplete): anchor non-portal panel to its inner wrapper so it stays aligned inside positioned ancestors" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: fix(web-ui): preserve grouped button colors and refine dark surface hierarchy" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Preserve the danger variant and consumer <code>--wui-button-color</code> overrides inside groups." },
        { label: 'li', content: "Refine dark page, text, control, overlay, and menu surface hierarchy." },
        { label: 'li', content: "Add a lightweight glass border ring using <code>--wui-color-glass-border</code>; make light mode transparent and dark mode subtler." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: fix(web-ui): align control baseline to 36px" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Move the shared <code>--wui-control-size</code> baseline from 40px to 36px across buttons, inputs, selects, autocomplete, textarea, segmented, and related demos/docs." },
        { label: 'li', content: "Reduce switch track/thumb to 40x20/16x16 and adjust drag travel constants." },
        { label: 'li', content: "Set slider thumb to 30x20, align segmented/textarea geometry, and keep marks consistent across axes." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: fix(web-ui): replace icon button content while loading" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Render only the loading spinner when <code>icon</code> and <code>loading</code> are set." },
        { label: 'li', content: "Keep the default slot icon unprojected while loading and restore projection when <code>loading</code> returns to <code>false</code>." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: fix(web-ui): darken primary and secondary state colors" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Derive primary and secondary hover/active backgrounds toward black." },
        { label: 'li', content: "Preserve the existing tonal danger state ramp." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: fix(web-ui): align cursor behavior with Tailwind v4 and gesture states" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Use default cursors for action, selection, and gesture-control hover and pressed states." },
        { label: 'li', content: "Switch slider, switch, and segmented cursors to grabbing only after dragging starts." },
        { label: 'li', content: "Align slider with switch and segmented gesture intent thresholds." },
        { label: 'li', content: "Propagate segmented gesture cursors through the trigger shadow boundary." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: style(web-ui): refine dark glass controls" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Remove the glass background gradient highlight." },
        { label: 'li', content: "Add <code>--wui-glass-brightness</code> and lower dark backdrop brightness to <code>1.02</code>." },
        { label: 'li', content: "Deepen the dark page background." },
        { label: 'li', content: "Make the dark overlay shadow slightly more visible." },
        { label: 'li', content: "Align the select trigger with the button glass border." }
        ]
      }
      ]
    },
    { label: 'li', content: "c310d9f: fix(dialog): ignore cancel events bubbled from child controls such as file inputs" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: Fix drawer drag rebound firing twice on release below the close threshold." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "The rebound spring's WAAPI animation now uses <code>fill: 'both'</code>. Without it, the animation stopped applying at its end while the inline drag transform was still present: any frame rendered between the animation's finish and the <code>onfinish</code> cleanup (main-thread congestion, compositor scheduling) painted a jump back to the drag position, and the subsequent inline-style cleanup then triggered the 280ms CSS enter transition from that position — visible as a second rebound." },
        { label: 'li', content: "<code>_springToClose()</code> gets the same <code>fill: 'both'</code> for the symmetric window (spring end → close pipeline takeover), keeping both gesture springs consistent." },
        { label: 'li', content: "Regression tests assert exactly one <code>animate()</code> call per gesture (pointerup and pointercancel) with <code>fill: 'both'</code>, and that the final close offset settles below 0.5px with no remaining animations." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: fix(web-ui): make hover/active background feedback instant" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Remove background-color transitions driven by :hover/:active from button, select, input-number, segmented-trigger, option, dropdown-item, and drawer drag bar." },
        { label: 'li', content: "Keep transitions for checked/pressed/focus states and overlay enter/exit animations unchanged." }
        ]
      }
      ]
    },
    { label: 'li', content: "c310d9f: fix(overlay): avoid reopening autocomplete and tooltip from pointer-initiated focus restoration" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: fix(web-ui): resolve overlays inside an open native dialog into that dialog" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Keep dropdown, context-menu, popover, tooltip, select and autocomplete panels above drawer or dialog content by joining the browser top layer." },
        { label: 'li', content: "Bundle menu panel styles so panels render correctly when the dialog has no pre-injected overlay styles." },
        { label: 'li', content: "Position context menus with a Floating UI virtual anchor so transformed dialog containing blocks keep viewport coordinates." },
        { label: 'li', content: "Preserve fixed menu positioning when a global glass rule would otherwise reset it to relative." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "c310d9f: fix(web-ui): resolve nested portal overlays inside dialogs and support live framework rendering in open panels" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Portal container resolution now crosses shadow boundaries when walking up from the anchor, so a portal overlay hosted inside migrated panel content (e.g. a tooltip inside an open portal select/popover) resolves into an enclosing open native dialog's top layer instead of falling back to the document-level overlay root where it would be hidden behind the dialog." },
        { label: 'li', content: "Portal panels now support live framework rendering while open (Vue <code>v-if</code>, Lit child-part conditionals, React children inside a stable wrapper): content added to the host while the panel is open migrates into the panel automatically in template order (popover, tooltip, dropdown; select/autocomplete already reconciled via their option portal). Framework comment anchors stay in the host so subsequent patches keep working; markers removed by a framework's clear logic (lit-html <code>_$clear</code> walks host marker neighborhoods) are recognized as framework deletion and the stranded panel content is dropped instead of resurrecting on close. Boundary: splicing or reordering a keyed <code>v-for</code> list while a panel is open is unsupported — Vue's keyed children diff resolves anchors against migrated nodes and items can be lost, regardless of compilation path. Apply such updates while the panel is closed and stick to tail appends/removals while open. React removals of bare conditional children remain unsupported (see README); the stable wrapper pattern keeps React additions and removals working while open." },
        { label: 'li', content: "Popover and tooltip portal panels untrack nodes that the framework physically removes while the overlay is open, so closing no longer restores deleted nodes back into the host light DOM. As a portal-level invariant, the conditional placeholder comment the framework inserts into the panel content during that same removal (Vue's block patch re-derives its container from the removed node's actual parent) is returned to the host at the removed node's skeleton position — covering popover, tooltip, and the select/autocomplete option content inside nested panel containers — so container-level <code>v-if</code> content now survives any open → close → reopen cycle instead of being inserted into the disposed panel on reopen." },
        { label: 'li', content: "Portal content is restored to its recorded original position (parent + following sibling) instead of being appended to the host, keeping framework fragment anchors intact for subsequent conditional rendering." },
        { label: 'li', content: "Compatibility note: React-conditional children inside portal panel content remain unsupported for removal (React deletes nodes through its recorded insertion parent); see the React section of the README." }
        ]
      }
      ]
    },
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
  { label: 'h2', id: 'section-67', content: "5.0.0" },
  { label: 'h3', id: 'section-68', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: style(web-ui): unify sidebar overlay token" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Remove <code>--wui-layout-sidebar-bg</code>; layout sidebars use <code>--wui-color-surface-overlay</code>." },
        { label: 'li', content: "Set the dark overlay surface to <code>rgb(32 34 34 / 0.9)</code>, compositing to about <code>#202223</code> over the page background." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-69', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: Add <code>--wui-drawer-inset</code> token to control drawer floating-card viewport inset." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "New public token <code>--wui-drawer-inset</code> (default <code>8px</code>, non-headless drawers). Set to <code>0</code> for edge-to-edge geometry, typically paired with <code>--wui-drawer-radius: 0</code>." },
        { label: 'li', content: "The token is registered via <code>@property</code> as <code>&lt;length></code>, so a unitless <code>0</code> from consumers is normalized to <code>0px</code> instead of silently breaking the closed-state <code>calc(100% + 0)</code> transform (exit animation would be dropped)." },
        { label: 'li', content: "The inset is no longer a hard-coded internal value; all other floating-card behavior (drag-close distance math, controlled hover end-state) reads the same variable and follows the token automatically." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: Add Layout desktop sidebar drag-to-resize and Drawer drag-to-close features." },
      { label: 'p', content: "<strong>Layout (<code>&lt;web-ui-layout></code>):</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "New props: <code>sidebar-resizable</code>, <code>sidebar-min-width</code>, <code>sidebar-max-width</code>" },
        { label: 'li', content: "New event: <code>sidebar-width-change</code>" },
        { label: 'li', content: "Accent resize handle on right edge (hidden when collapsed); keyboard-operable (WAI-ARIA splitter: arrows step, Home/End to bounds, Enter commits, Escape reverts)" },
        { label: 'li', content: "Real-time width follow with clamping; emits on release" },
        { label: 'li', content: "Built-in hard cap: the sidebar can never exceed half the viewport width, even if <code>sidebar-max-width</code> is configured higher" }
        ]
      },
      { label: 'p', content: "<strong>Drawer (<code>&lt;web-ui-drawer></code>):</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "New prop: <code>draggable</code> (default <code>false</code>)" },
        { label: 'li', content: "Gray capsule drag bar on inner edge (placement-aware)" },
        { label: 'li', content: "Real-time follow + spring snap on release" },
        { label: 'li', content: "Closes when displacement > 1/3 of size OR flick > 500px/s; otherwise rebounds" },
        { label: 'li', content: "Native dialog renders nothing when closed ⇒ drag-to-open NOT supported" },
        { label: 'li', content: "Spring via WAAPI (no new <code>--wui-*</code> tokens)" },
        { label: 'li', content: "<code>prefers-reduced-motion</code> snaps instantly" },
        { label: 'li', content: "<code>controlled</code> mode: user close actions only emit <code>open-change(false)</code> with writeback await + timeout rebound" },
        { label: 'li', content: "Declarative nested drawer stacking: open drawers below the top layer automatically scale down (0.95^depth) and shift towards the inner side to expose card edges; Escape and backdrop clicks dismiss only the topmost layer" }
        ]
      },
      { label: 'p', content: "<strong>Drawer visual language (breaking visual, no API change):</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Non-headless drawers now render as floating rounded cards inset 8px from all viewport edges; elastic drag distances read as margin changes instead of gaps" },
        { label: 'li', content: "New token <code>--wui-drawer-radius</code> (default <code>28px</code>); closed-state transforms compensate the inset so the drawer always exits the viewport fully" },
        { label: 'li', content: "<code>headless</code> geometry unchanged (consumer-owned visuals)" }
        ]
      },
      { label: 'p', content: "<strong>Glass variable isolation (bug fix):</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>.wui-glass</code> now declares its own <code>--wui-internal-glass-shadow</code> / <code>--wui-internal-glass-focus-ring</code> defaults, cutting the flattened-tree inheritance path from ancestor glass containers (drawer/dialog bodies, overlay panels) into slotted content. Previously a glass-variant button or input inside a drawer/dialog silently picked up the huge overlay shadow instead of the soft glass fallback." },
        { label: 'li', content: "Headless drawers explicitly zero <code>--wui-internal-drawer-inset</code> on their dialog: a headless drawer nested inside a non-headless one used to inherit the 8px inset, breaking the drag-close distance / controlled hover end-state math for edge-to-edge geometry." },
        { label: 'li', content: "<strong>Breaking visual:</strong> <code>&lt;web-ui-back-top></code>'s default glass button now uses the glass fallback shadow (<code>--wui-shadow-glass</code>) instead of the small panel shadow (<code>--wui-shadow-panel</code>). The old <code>:host</code>-level <code>--wui-internal-glass-shadow</code> config could no longer reach the inner glass element under the new isolation and was removed; pass <code>--wui-shadow-glass</code> on the element if the previous look is required." }
        ]
      },
      { label: 'p', content: "<strong>Controlled mode rename (was <code>request-only</code>) + dialog support:</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>web-ui-drawer</code>: prop <code>request-only</code> (attribute) / <code>requestOnly</code> (property) is renamed to <code>controlled</code> / <code>controlled</code> (same semantics — user close actions only emit <code>open-change(false)</code>; the consumer writes <code>open</code> back; programmatic <code>show()</code>/<code>close()</code> stay direct). No alias is kept." },
        { label: 'li', content: "<code>web-ui-dialog</code>: new <code>controlled</code> prop with the same contract (Escape and backdrop only request; native dialog closure while controlled is restored to the open state and re-emits the request)." }
        ]
      },
      { label: 'p', content: "<strong>Switch, Segmented &amp; Slider Gesture Enhancements (<code>&lt;web-ui-switch></code>, <code>&lt;web-ui-segmented></code>, <code>&lt;web-ui-slider></code>):</strong>" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>Switch</code>: Full-track draggable gesture with real-time capsule glass thumb following, 6px intent deadzone against vertical scrolling, <code>scale(1.2)</code> press/drag micro-interaction, toggle commit on >50% travel (12px total travel) or flick velocity (>300px/s), with instant tap toggling preserved." },
        { label: 'li', content: "<code>Segmented</code>: Active indicator smooth drag tracking (initiated by pressing on the currently active trigger), <code>scale(1.2)</code> press/drag micro-interaction with glass visual, snap to nearest non-disabled trigger on release, and flick gesture support." },
        { label: 'li', content: "<code>Slider</code>: Refactored internal pointer handling to adopt unified <code>shared/gesture/</code> (<code>attachDragGesture</code> + <code>clamp</code>), with <code>scale(1.2)</code> drag micro-interaction and translucent glass thumb when dragging." },
        { label: 'li', content: "<code>Gesture Utilities</code>: Added <code>snapToNearest</code> and <code>normalizeProgress</code> helper functions in <code>packages/web-ui/src/shared/gesture/physics.ts</code>." }
        ]
      }
      ]
    },
    { label: 'li', content: "ab8dfb7: feat(autocomplete): add allow-custom-value for explicit custom value commits" },
    { label: 'li', content: "ab8dfb7: feat(autocomplete): add empty state slot" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: feat(web-ui): redefine borderless inputs as ghost form with normal-variant focus ring" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>borderless</code> on input, textarea, and autocomplete now removes only surface decoration (border, glass background/blur, shadow, and glass outline ring) while keeping padding, height metrics, and the focus ring." },
        { label: 'li', content: "The borderless focus ring is the same double box-shadow as the normal variant (1px inset accent + focus-ring halo, 200ms transition) and shows on mouse and programmatic focus as well as keyboard focus; the previous <code>:focus-visible</code>-gated outline is removed." },
        { label: 'li', content: "Compatibility note: consumers that suppressed the focus ring with <code>[--wui-color-focus-ring:transparent]</code> now only hide the outer halo — the 1px inset accent line remains visible on focus." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: Redesign collapse as a single element with two slots: trigger via the default slot, content via <code>slot=\"content\"</code>. The <code>web-ui-collapse-trigger</code> and <code>web-ui-collapse-content</code> elements are removed before first release." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Interaction semantics come from the slotted trigger element (native <code>&lt;button></code>, <code>&lt;web-ui-button></code>, etc.); the collapse writes <code>aria-expanded</code>/<code>aria-controls</code>/<code>aria-disabled</code> onto the first assigned trigger element. A plain-text trigger has no keyboard/focus semantics (documented limitation)." },
        { label: 'li', content: "Strictly controlled <code>open</code> contract unchanged: <code>open-change</code> (<code>CustomEvent&lt;{ open: boolean }></code>) fires only on user-originated toggles; <code>show()</code>/<code>close()</code>/<code>toggle()</code> and programmatic writes never emit." },
        { label: 'li', content: "Height/width animation via CSS grid <code>0fr ↔ 1fr</code> transition — content-adaptive, zero JS measurement, interruptible (grid-transition selection carried over from the collapse design iteration; API shape superseded by the single-element form). <code>horizontal</code> switches the axis (default vertical)." },
        { label: 'li', content: "Three-state closed semantics; consumer light DOM is never moved: default closed state sets <code>hidden</code> on the internal content container, <code>keep-mounted</code> (now on the root element) keeps content measurable inside the collapsed track with <code>inert</code> (scroll position preserved)." },
        { label: 'li', content: "Headless kernel: the component carries no visual styling beyond the animation structure; trigger and content typography come from the consumer." },
        { label: 'li', content: "Unchanged tokens <code>--wui-duration-collapse-enter: 200ms</code> / <code>--wui-duration-collapse-exit: 160ms</code>, included in the reduced-motion zeroing lists." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: feat(overlay): support dropdown size variables in portal and keep borderless keyboard focus rings" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Portal panels now mirror <code>--wui-overlay-min-width</code>, <code>--wui-autocomplete-max-width</code>/<code>--wui-autocomplete-max-height</code> and <code>--wui-select-max-width</code>/<code>--wui-select-max-height</code> from the host at portal creation." },
        { label: 'li', content: "Select/Autocomplete dropdown default scroll max-height reduced from 320px to 200px; override via <code>--wui-autocomplete-max-height</code> / <code>--wui-select-max-height</code>." },
        { label: 'li', content: "Borderless <code>input</code>, <code>textarea</code> and <code>autocomplete</code> keep a keyboard focus ring via <code>:focus-visible</code>; pointer focus stays borderless." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: feat(layout): add mobile toggle inset variable and glass variant" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "The mobile header toggle renders as a glass button and gains an 8px left inset by default, so it no longer sits flush against the viewport edge." },
        { label: 'li', content: "Consumers can align the toggle with their own header padding via <code>--wui-layout-mobile-toggle-inset</code>." }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-70', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "ab8dfb7: fix(autocomplete): anchor non-portal panel to its inner wrapper so it stays aligned inside positioned ancestors" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: fix(web-ui): preserve grouped button colors and refine dark surface hierarchy" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Preserve the danger variant and consumer <code>--wui-button-color</code> overrides inside groups." },
        { label: 'li', content: "Refine dark page, text, control, overlay, and menu surface hierarchy." },
        { label: 'li', content: "Add a lightweight glass border ring using <code>--wui-color-glass-border</code>; make light mode transparent and dark mode subtler." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: fix(web-ui): align control baseline to 36px" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Move the shared <code>--wui-control-size</code> baseline from 40px to 36px across buttons, inputs, selects, autocomplete, textarea, segmented, and related demos/docs." },
        { label: 'li', content: "Reduce switch track/thumb to 40x20/16x16 and adjust drag travel constants." },
        { label: 'li', content: "Set slider thumb to 30x20, align segmented/textarea geometry, and keep marks consistent across axes." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: fix(web-ui): replace icon button content while loading" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Render only the loading spinner when <code>icon</code> and <code>loading</code> are set." },
        { label: 'li', content: "Keep the default slot icon unprojected while loading and restore projection when <code>loading</code> returns to <code>false</code>." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: fix(web-ui): darken primary and secondary state colors" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Derive primary and secondary hover/active backgrounds toward black." },
        { label: 'li', content: "Preserve the existing tonal danger state ramp." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: fix(web-ui): align cursor behavior with Tailwind v4 and gesture states" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Use default cursors for action, selection, and gesture-control hover and pressed states." },
        { label: 'li', content: "Switch slider, switch, and segmented cursors to grabbing only after dragging starts." },
        { label: 'li', content: "Align slider with switch and segmented gesture intent thresholds." },
        { label: 'li', content: "Propagate segmented gesture cursors through the trigger shadow boundary." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: style(web-ui): refine dark glass controls" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Remove the glass background gradient highlight." },
        { label: 'li', content: "Add <code>--wui-glass-brightness</code> and lower dark backdrop brightness to <code>1.02</code>." },
        { label: 'li', content: "Deepen the dark page background." },
        { label: 'li', content: "Make the dark overlay shadow slightly more visible." },
        { label: 'li', content: "Align the select trigger with the button glass border." }
        ]
      }
      ]
    },
    { label: 'li', content: "ab8dfb7: fix(dialog): ignore cancel events bubbled from child controls such as file inputs" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: Fix drawer drag rebound firing twice on release below the close threshold." },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "The rebound spring's WAAPI animation now uses <code>fill: 'both'</code>. Without it, the animation stopped applying at its end while the inline drag transform was still present: any frame rendered between the animation's finish and the <code>onfinish</code> cleanup (main-thread congestion, compositor scheduling) painted a jump back to the drag position, and the subsequent inline-style cleanup then triggered the 280ms CSS enter transition from that position — visible as a second rebound." },
        { label: 'li', content: "<code>_springToClose()</code> gets the same <code>fill: 'both'</code> for the symmetric window (spring end → close pipeline takeover), keeping both gesture springs consistent." },
        { label: 'li', content: "Regression tests assert exactly one <code>animate()</code> call per gesture (pointerup and pointercancel) with <code>fill: 'both'</code>, and that the final close offset settles below 0.5px with no remaining animations." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: fix(web-ui): make hover/active background feedback instant" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Remove background-color transitions driven by :hover/:active from button, select, input-number, segmented-trigger, option, dropdown-item, and drawer drag bar." },
        { label: 'li', content: "Keep transitions for checked/pressed/focus states and overlay enter/exit animations unchanged." }
        ]
      }
      ]
    },
    { label: 'li', content: "ab8dfb7: fix(overlay): avoid reopening autocomplete and tooltip from pointer-initiated focus restoration" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "ab8dfb7: fix(web-ui): resolve overlays inside an open native dialog into that dialog" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "Keep dropdown, context-menu, popover, tooltip, select and autocomplete panels above drawer or dialog content by joining the browser top layer." },
        { label: 'li', content: "Bundle menu panel styles so panels render correctly when the dialog has no pre-injected overlay styles." },
        { label: 'li', content: "Position context menus with a Floating UI virtual anchor so transformed dialog containing blocks keep viewport coordinates." },
        { label: 'li', content: "Preserve fixed menu positioning when a global glass rule would otherwise reset it to relative." }
        ]
      }
      ]
    },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [ab8dfb7]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@2.1.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-71', content: "4.0.0" },
  { label: 'h3', id: 'section-72', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "1e52bc4: 重构 Web UI CSS token 契约：文本层级改为 <code>secondary/tertiary/disabled</code>，focus indicator 拆分为 <code>--wui-color-focus-ring</code> 和 <code>--wui-focus-ring-width</code>，并删除 <code>--wui-color-border-strong</code>。同时将 control surface、track、panel shadow、control size、layout duration 和 back-top 变量统一到语义化命名。" },
      { label: 'p', content: "本次不保留旧名兼容别名。需要迁移的主要映射：" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>--wui-color-text-muted</code> → <code>--wui-color-text-secondary</code>" },
        { label: 'li', content: "<code>--wui-color-text-faint</code> → <code>--wui-color-text-tertiary</code>" },
        { label: 'li', content: "<code>--wui-color-border-strong</code> → focused 输入边框改用 <code>--wui-color-accent</code>" },
        { label: 'li', content: "<code>--wui-focus-ring</code> → <code>--wui-color-focus-ring</code> + <code>--wui-focus-ring-width</code>" },
        { label: 'li', content: "<code>--wui-button-size</code> → <code>--wui-control-size</code>" },
        { label: 'li', content: "<code>--wui-color-surface-raised-mid</code> → <code>--wui-color-surface-control</code>" },
        { label: 'li', content: "<code>--wui-color-surface-raised-deep</code> → <code>--wui-color-surface-track</code>" },
        { label: 'li', content: "<code>--wui-shadow-pop</code> → <code>--wui-shadow-panel</code>" },
        { label: 'li', content: "<code>--web-ui-back-top-*</code> → <code>--wui-back-top-*</code>" },
        { label: 'li', content: "<code>--wui-duration-regular</code> → <code>--wui-duration-layout</code>" },
        { label: 'li', content: "<code>--wui-ease-out</code> → <code>--wui-ease-enter</code>" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-73', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "1e52bc4: 统一表单关联控件的原生生命周期：<code>form.reset()</code> 会恢复首次连接时声明式初始化后的默认值，并为所有表单控件提供浏览器表单状态恢复支持；被 group 管理的 checkbox/radio 子项仍由父 group 统一管理。" },
    { label: 'li', content: "1e52bc4: 将 <code>web-ui-button-group</code> 的子 button group 态改为内部派生的视觉上下文。<code>group</code>、<code>last</code> 与 <code>direction</code> 不再注入到子 button；请仅依赖 button group 的可见布局，不要读取这些实现属性。" },
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
  { label: 'h2', id: 'section-74', content: "3.0.1" },
  { label: 'h3', id: 'section-75', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "b9faa2c: enhance monorepo agent capabilities" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [b9faa2c]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.7.8" },
        { label: 'li', content: "@greypan/js-kit@1.6.7" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-76', content: "3.0.0" },
  { label: 'h3', id: 'section-77', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "28a8dc5: 框架类型适配收窄：移除 Vue 全局 <code>ComponentCustomProps extends HTMLAttributes</code>（不再污染所有 Vue 组件），React 移除 lowercase <code>oninput</code>/<code>onchange</code> 事件别名，<code>$events</code> 只声明事件本体、宿主 target 由适配层统一注入（<code>WithHost</code> 注入 readonly <code>target</code>/<code>currentTarget</code>），<code>WebUiElementMap</code> 成为组件 tag 单一来源。peer 基线收窄：<code>@types/react >= 19</code>、<code>vue >= 3.5</code>。Vue <code>@input</code>/<code>@change</code> 的 <code>$event.target</code> 现为组件实例（cast-free），新增 <code>WebUiEvent&lt;Component, EventName></code> 供命名 handler 使用。" },
      { label: 'p', content: "运行时契约收敛：<code>checkbox-group</code>/<code>radio-group</code>/<code>segmented</code> 管理的子项（checkbox/radio/segmented-trigger）不再把同名 <code>input</code>/<code>change</code> 冒泡到 group 外——子项自身派发事件（<code>bubbles: false, composed: false</code>），group 以 capture 相位监听并只派发一次自己的 <code>input</code>/<code>change</code>，两者 <code>target</code>/<code>currentTarget</code> 均为 group。独立使用子控件时保持 <code>bubbles: true, composed: true</code>。group 上的消费端事件监听不再重复触发。" },
      { label: 'p', content: "详见 <code>docs/adr/0005-web-ui-component-architecture.md</code>。" }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-78', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "28a8dc5: <code>web-ui-input</code>、<code>web-ui-input-number</code>、<code>web-ui-autocomplete</code> 新增 <code>readonly</code> 只读状态属性，补齐与 <code>web-ui-textarea</code> 的 API 一致性：值照常提交表单、控件可聚焦选中复制，但不可编辑。只读时隐藏清除 button、禁用 input-number 步进 button 并阻止 autocomplete 展开下拉，同时跳过必填校验（原生 barred-from-validation 语义）。" },
      { label: 'p', content: "同时修复 <code>web-ui-input</code>、<code>web-ui-textarea</code>、<code>web-ui-input-number</code> 的公共 <code>change</code> 事件：原生 change 事件不 composed，无法穿透 Shadow DOM，此前声明的 change 在真实用户交互中从不触发宿主监听器；现在组件捕获原生 change 后补发 composed 事件，与 <code>$events</code>/README 声明一致。" },
      { label: 'p', content: "<code>web-ui-input-number</code> 提交空输入或 <code>-</code> 时保持原值、不补发 change（与既有键入行为一致），已在 README 明确「空输入视为无效、不提交」。" }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-79', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "28a8dc5: 修复 Select、Autocomplete 和 Dropdown overlay 的宽度计算，以及 menu overlay 在主题作用域内的挂载行为，避免长 option 文本裁切和主题样式失效。同步优化 Overlay、Portal 与 Scroll Lock 的共享实现，统一生命周期工厂模式并整理测试目录。" }
    ]
  },
  { label: 'h2', id: 'section-80', content: "2.1.8" },
  { label: 'h3', id: 'section-81', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "7c06580: try workflows" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [7c06580]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.7.7" },
        { label: 'li', content: "@greypan/js-kit@1.6.6" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-82', content: "2.1.7" },
  { label: 'h3', id: 'section-83', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "fa0f989: fix(select): portal 模式未打开时 trigger 显示已选值" }
    ]
  },
  { label: 'h2', id: 'section-84', content: "2.1.6" },
  { label: 'h3', id: 'section-85', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8d9d809: fix web-ui css token" }
    ]
  },
  { label: 'h2', id: 'section-86', content: "2.1.5" },
  { label: 'h3', id: 'section-87', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [32d3366]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.7.6" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-88', content: "2.1.4" },
  { label: 'h3', id: 'section-89', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "cdc5cf7: Release pipeline validation: bump all public packages for trusted publishing verification." },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [cdc5cf7]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.6.5" },
        { label: 'li', content: "@greypan/browser-kit@1.7.5" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-90', content: "2.1.3" },
  { label: 'h3', id: 'section-91', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "5c70639: provide back-top position css var" }
    ]
  },
  { label: 'h2', id: 'section-92', content: "2.1.2" },
  { label: 'h3', id: 'section-93', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "7db6d3e: Standardize Custom Element boolean attributes and replace default-true properties with semantic opt-out attributes." }
    ]
  },
  { label: 'h2', id: 'section-94', content: "2.1.1" },
  { label: 'h3', id: 'section-95', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "45a2f38: udpate readme" }
    ]
  },
  { label: 'h2', id: 'section-96', content: "2.1.0" },
  { label: 'h3', id: 'section-97', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "fff1c60: Correct React Custom Element event typings to use exact JSX keys such as <code>onopen-change</code> and <code>ontoast-close</code>.\nThe previously generated camel-cased keys such as <code>onOpenChange</code> did not match the event dispatched at runtime." }
    ]
  },
  { label: 'h3', id: 'section-98', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "fff1c60: Make Checkbox Group, Radio Group, and Segmented disabled state inherited without changing child <code>disabled</code> properties. Effective disabled child controls now expose <code>aria-disabled</code> and leave the tab sequence." }
    ]
  },
  { label: 'h2', id: 'section-99', content: "2.0.2" },
  { label: 'h3', id: 'section-100', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "384c683: some components add user select none" }
    ]
  },
  { label: 'h2', id: 'section-101', content: "2.0.1" },
  { label: 'h3', id: 'section-102', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8768a2b: some components add user select none" }
    ]
  },
  { label: 'h2', id: 'section-103', content: "2.0.0" },
  { label: 'h3', id: 'section-104', content: "Major Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "0a50d35: 全量契约收敛：统一 Pointer Events、公开事件模型、原生表单关联、公开契约测试。" },
      { label: 'h2', id: 'section-105', content: "破坏性变更" },
      { label: 'h3', id: 'section-106', content: "属性重命名" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<strong>Switch</strong>: <code>open</code> 属性更名为 <code>checked</code>（表示 switch 状态，不再是可见性）" }
        ]
      },
      { label: 'h3', id: 'section-107', content: "事件变更" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<strong>Switch</strong>: 移除 <code>open-change</code>，用户交互改派发 <code>input</code> + <code>change</code>" },
        { label: 'li', content: "<strong>Checkbox</strong>: 移除 <code>update:checked</code>（Vue 实现泄露），改派发 <code>input</code> + <code>change</code>" },
        { label: 'li', content: "<strong>CheckboxGroup</strong>: 移除 <code>value-changed</code>，改派发 <code>input</code> + <code>change</code>" },
        { label: 'li', content: "<strong>BackTop</strong>: 移除 <code>visible-change</code>（scroll 驱动可见性是内部行为）" }
        ]
      },
      { label: 'h3', id: 'section-108', content: "方法移除" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<strong>Switch</strong>: 移除 <code>show()</code>、<code>close()</code> 方法（不再有可见性概念）" }
        ]
      },
      { label: 'h3', id: 'section-109', content: "Pointer Events 迁移" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<strong>Tooltip, Popover, DropdownMenu, ContextMenu</strong>: <code>mouseenter</code>/<code>mouseleave</code> 替换为 <code>pointerenter</code>/<code>pointerleave</code>" },
        { label: 'li', content: "<strong>Input, Slider</strong>: <code>mousedown</code> 替换为 <code>pointerdown</code>" }
        ]
      },
      { label: 'h3', id: 'section-110', content: "新增表单行为" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "10 个表单控件新增 <code>static formAssociated = true</code> 和 ElementInternals 实现" },
        { label: 'li', content: "新增 <code>name</code>、<code>required</code> 属性（input, textarea, input-number, select, slider, checkbox, radio, switch, segmented, checkbox-group, radio-group）" }
        ]
      },
      { label: 'h3', id: 'section-111', content: "类型变更" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "React/Vue 包装类型从新的 <code>$events</code> 接口推导" },
        { label: 'li', content: "移除 <code>onUpdateChecked</code>、<code>onValueChanged</code>、<code>onVisibleChange</code> 事件监听器类型" }
        ]
      },
      { label: 'h3', id: 'section-112', content: "运行时规范化" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "字面量属性在运行时校验非法输入并回退到文档化默认值" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-113', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "26ca421: fix context-menu click-outside test for jsdom 30 compatibility" }
    ]
  },
  { label: 'h2', id: 'section-114', content: "1.4.2" },
  { label: 'h3', id: 'section-115', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "57f9984: fix mardkwon table format" },
    { label: 'li', content: "57f9984: fix npm readme cn link" },
    { label: 'li', content: "Updated dependencies [57f9984]" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [57f9984]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.7.4" },
        { label: 'li', content: "@greypan/js-kit@1.6.4" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-116', content: "1.4.1" },
  { label: 'h3', id: 'section-117', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "734dea6: fix npm readme cn link" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [734dea6]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.7.3" },
        { label: 'li', content: "@greypan/js-kit@1.6.3" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-118', content: "1.4.0" },
  { label: 'h3', id: 'section-119', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "be4008b: Standardize externalization to regex patterns for workspace deps; move msw to package-level devDependencies" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "<code>vite.config.ts</code> for <code>js-kit</code>, <code>browser-kit</code>, <code>web-ui</code>: replace hardcoded workspace dep names with <code>/^@greypan\\//</code> regex; add missing external deps (<code>nanoid</code>, <code>msw</code>)" },
        { label: 'li', content: "<code>browser-kit</code>: move <code>msw</code> from peerDependencies to devDependencies" },
        { label: 'li', content: "<code>test-kit</code>: add <code>msw</code> to devDependencies for local type checking" },
        { label: 'li', content: "<code>web-ui</code>: replace <code>react</code> peer dep with <code>@types/react</code>; add React/Vue usage documentation to README" },
        { label: 'li', content: "<code>unplugin-web-components</code>: fix README import path to use <code>/vite</code> sub-path export" },
        { label: 'li', content: "Fix documentation in READMEs and AGENTS.md to reflect current externalization rules" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h3', id: 'section-120', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
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
  { label: 'h2', id: 'section-121', content: "1.3.1" },
  { label: 'h3', id: 'section-122', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "c56dd3e: add tsconfig package" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [c56dd3e]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.7.1" },
        { label: 'li', content: "@greypan/js-kit@1.6.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-123', content: "1.3.0" },
  { label: 'h3', id: 'section-124', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a4e7f9b: vp monorepo standardization" }
    ]
  },
  { label: 'h3', id: 'section-125', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [a4e7f9b]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.7.0" },
        { label: 'li', content: "@greypan/js-kit@1.6.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-126', content: "1.2.4" },
  { label: 'h3', id: 'section-127', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8f4643d: Audit and reorganize devDependencies/peerDependencies across all packages" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [8f4643d]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.6.1" },
        { label: 'li', content: "@greypan/js-kit@1.5.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-128', content: "1.2.3" },
  { label: 'h3', id: 'section-129', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "a06335a: upgrade agents doc" },
    { label: 'li', content: "Updated dependencies [a06335a]" },
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [a06335a]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.6.0" },
        { label: 'li', content: "@greypan/js-kit@1.5.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-130', content: "1.2.2" },
  { label: 'h3', id: 'section-131', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [874638d]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.5.0" },
        { label: 'li', content: "@greypan/js-kit@1.4.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-132', content: "1.2.1" },
  { label: 'h3', id: 'section-133', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [13802c0]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.4.0" },
        { label: 'li', content: "@greypan/js-kit@1.3.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-134', content: "1.2.0" },
  { label: 'h3', id: 'section-135', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "8944472: Improve engineering structures" }
    ]
  },
  { label: 'h3', id: 'section-136', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [8944472]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.3.0" },
        { label: 'li', content: "@greypan/js-kit@1.2.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-137', content: "1.1.1" },
  { label: 'h3', id: 'section-138', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [ec36e92]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/js-kit@1.1.1" },
        { label: 'li', content: "@greypan/browser-kit@1.2.1" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-139', content: "1.1.0" },
  { label: 'h3', id: 'section-140', content: "Minor Changes" },
  {
    label: 'ul',
    children: [
    { label: 'li', content: "4dfde81: 完善子包依赖，修复依赖缺失" }
    ]
  },
  { label: 'h3', id: 'section-141', content: "Patch Changes" },
  {
    label: 'ul',
    children: [
    {
      label: 'li',
      children: [
      { label: 'p', content: "Updated dependencies [4dfde81]" },
      {
        label: 'ul',
        children: [
        { label: 'li', content: "@greypan/browser-kit@1.2.0" },
        { label: 'li', content: "@greypan/js-kit@1.1.0" }
        ]
      }
      ]
    }
    ]
  },
  { label: 'h2', id: 'section-142', content: "1.0.1" },
  { label: 'h3', id: 'section-143', content: "Patch Changes" },
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
        { label: 'li', content: "@greypan/browser-kit@1.1.0" }
        ]
      }
      ]
    }
    ]
  }
]

export default meta
