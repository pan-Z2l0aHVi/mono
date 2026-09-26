export type NavDrawKey = 'library' | 'map'

/*
 * 跨 AppNav 实例的画线交接。
 *
 * /library 带 meta.immersive，自己渲染一整套 layout 和自己的 AppNav；AppLayout 对 immersive
 * 页面不套 shell。所以跨 /library ↔ /map 时整个 sidebar 连 AppNav 一起被销毁重建，出发实例上
 * 打的 replay() 会随 disconnect 被 web-ui-svg-draw-lines 的 cancelAll() 掐掉。点击因此只记下
 * 目标 key，由接管路由的新实例在挂载时消费并播放。
 *
 * 必须是模块级状态：<script setup> 的顶层会被编译进 setup()，每个实例各有一份，交接不过去。
 */
let pending: NavDrawKey | null = null

export function requestNavDraw(key: NavDrawKey) {
  pending = key
}

/**
 * 取出并清空待播的 key，返回它是否就是当前路由要播的那一项。
 *
 * 无论是否匹配都清空：挂载意味着已经落在某个路由上，一次被中断的导航不该让意图残留到下一次
 * 挂载（那会让直接访问或刷新也播出来）。
 */
export function consumeNavDraw(key: NavDrawKey | undefined): key is NavDrawKey {
  const matched = key !== undefined && pending === key
  pending = null
  return matched
}
