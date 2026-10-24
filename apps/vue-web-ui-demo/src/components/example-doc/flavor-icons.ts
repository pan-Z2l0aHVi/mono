/*
 * 框架切换用的品牌标记：官方彩色标（Vue 的 #41b883 / #35495e，React 的 #61dafb）。它们是彩色
 * 资产，底色不跟 currentColor，所以不再随文字色走。
 * 它们只是文档示例工具条的装饰，不是组件库要提供的资产，因此留在 app 内，不进
 * `icons.used.json`——那会往 `@greypan/web-ui/icons` 的公共 barrel 上加两个没有消费者的导出。
 * 形状按 `web-ui-icon` 认识的 Iconify 形状内联（`{ body, width, height }`，负坐标交给 `left` /
 * `top` 拼 viewBox），不值得为两枚装饰图标新增一条依赖。
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
  body: '<circle cx="0" cy="0" r="2.05" fill="#61dafb"/><g stroke="#61dafb" stroke-width="1" fill="none"><ellipse cx="0" cy="0" rx="11" ry="4.2"/><ellipse cx="0" cy="0" rx="11" ry="4.2" transform="rotate(60)"/><ellipse cx="0" cy="0" rx="11" ry="4.2" transform="rotate(120)"/></g>',
  left: -11.5,
  top: -10.23174,
  width: 23,
  height: 20.46348
}
