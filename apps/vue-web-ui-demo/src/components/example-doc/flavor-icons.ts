/*
 * 框架切换用的品牌标记。两枚的取色方式不同：Vue 是官方双色标，保留 `#41b883` / `#35495e` 两个字面
 * 量；React 标本来就是单色的，所以画成 `currentColor`，由宿主按外观给色——浅色 `#087eae`、深色
 * 官方 `#61dafb`。类名写在两端工具条的 `FLAVOR_ICON_CLASS` 里，不在这里拼进 body，因为颜色是宿主
 * 的事，图标形状才是这里的事。
 * 它们只是文档示例工具条的装饰，不是组件库要提供的资产，因此留在 app 内，不进
 * `icons.used.json`——那会往 `@greypan/web-ui/icons` 的公共 barrel 上加两个没有消费者的导出。
 * 形状按 `web-ui-icon` 认识的 Iconify 形状内联（`{ body, width, height }`，负坐标交给 `left` /
 * `top` 拼 viewBox），不值得为两枚装饰图标新增一条依赖。
 * 浅色下官方 `#61dafb` 压在凹变种 chip（#dfdfdf）上只有 1.22:1、压在 track 白底上是 1.62:1，读不出
 * 形状；`#087eae` 同色相压到 3.42 / 4.56。深色反过来：`#087eae` 压在 indicator（#3a3a3c）只剩
 * 2.49，而官方蓝有 6.99，所以两档必须分开设，不能给一枚固定色。
 * 深色下 Vue 的深靛半身在它真正的底色上只有 1.50:1（未选中时压在凹变种 track #2c2c2e），选中时
 * 压在 indicator（#3a3a3c）上更只剩 1.22:1：官方双色标本来就没有深色版，把靛蓝换成白就不是官方标了，
 * 所以这里保留官方配色，靠绿色半身（同底 5.58 / 4.54）保住形状。
 */
export const vueIcon = {
  body: '<path d="M161.096.001l-30.225 52.351L100.647.001H-.005l130.877 226.688L261.749.001z" fill="#41b883"/><path d="M161.096.001l-30.225 52.351L100.647.001H50.423l80.449 139.55L211.322.001z" fill="#35495e"/>',
  width: 261.76,
  height: 226.69
}

export const reactIcon = {
  body: '<circle cx="0" cy="0" r="2.05" fill="currentColor"/><g stroke="currentColor" stroke-width="1" fill="none"><ellipse cx="0" cy="0" rx="11" ry="4.2"/><ellipse cx="0" cy="0" rx="11" ry="4.2" transform="rotate(60)"/><ellipse cx="0" cy="0" rx="11" ry="4.2" transform="rotate(120)"/></g>',
  left: -11.5,
  top: -10.23174,
  width: 23,
  height: 20.46348
}
