/**
 * 标记下一次响应式状态更新是否由用户交互引起。
 *
 * Lit 更新是异步的：赋值后立即复位的布尔标记会在 `updated()` 运行前丢失。
 * 组件用这个小控制器保证 `*-change` 事件只由用户交互触发。
 */
export class UserChangeController {
  private pending = false

  mark() {
    this.pending = true
  }

  consume(): boolean {
    const pending = this.pending
    this.pending = false
    return pending
  }
}
